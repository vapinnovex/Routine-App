from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from pymongo import MongoClient

from app.core.security import token_digest
from app.main import create_app

PREFIX = "/api/v1"


def state(client):
    response = client.get(PREFIX + "/users/me/data")
    assert response.status_code == 200, response.text
    return response.json()


def write(client, envelope):
    return client.put(PREFIX + "/users/me/data", json={**envelope, "mutationId": str(uuid4())})


def task(identifier="task-1"):
    return {"id": identifier, "title": "Morning walk", "date": "2026-09-12"}


def session():
    return {"id": "session-1", "name": "Focus", "sections": [
        {"id": "section-1", "title": "Focus", "durationSeconds": 60, "order": 0}
    ]}


def test_authentication_and_password_storage(client, account, settings):
    assert account["user"]["email"] == "test@example.com"
    assert "password" not in str(account["user"])
    with MongoClient(settings.mongodb_uri) as mongo:
        db = mongo[settings.mongodb_database]
        user = db.users.find_one({"email": "test@example.com"})
        assert user["password_hash"].startswith("$argon2id$")
        assert db.sessions.find_one({"_id": token_digest(account["accessToken"])})
        assert db.sessions.find_one({"_id": account["accessToken"]}) is None
    assert client.post(PREFIX + "/auth/register", json={"name": "Again", "email": "TEST@example.com", "password": "correct-password-123"}).status_code == 409
    assert client.post(PREFIX + "/auth/login", json={"email": "test@example.com", "password": "wrong"}).status_code == 401
    assert client.post(PREFIX + "/auth/logout").status_code == 204
    assert client.get(PREFIX + "/users/me").status_code == 401
    assert client.get(PREFIX + "/users/me", headers={"Authorization": "Bearer " + account["accessToken"]}).status_code == 401
    login = client.post(PREFIX + "/auth/login", json={"email": "TEST@example.com", "password": "correct-password-123"})
    assert login.status_code == 200
    assert "HttpOnly" in login.headers["set-cookie"]


def test_validation_does_not_echo_passwords(client):
    response = client.post(PREFIX + "/auth/register", json={"name": "X", "email": "bad", "password": "secret"})
    assert response.status_code == 422
    assert "secret" not in response.text


def test_unauthorized_routes_and_expiry(client, account, settings):
    with MongoClient(settings.mongodb_uri) as mongo:
        mongo[settings.mongodb_database].sessions.update_one(
            {"_id": token_digest(account["accessToken"])}, {"$set": {"expires_at": datetime.now(timezone.utc) - timedelta(seconds=1)}})
    for path in ("/users/me/data", "/tasks", "/timer-sessions", "/task-occurrences", "/timer-history", "/active-timer"):
        assert client.get(PREFIX + path).status_code == 401


def test_cors_and_csrf(client, account):
    allowed = client.options(PREFIX + "/tasks", headers={"Origin": "http://localhost:8081", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,x-routine-client,if-match"})
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:8081"
    assert allowed.headers["access-control-allow-credentials"] == "true"
    assert client.options(PREFIX + "/tasks", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"}).status_code == 400
    assert client.post(PREFIX + "/auth/logout", headers={"Origin": "https://evil.example"}).status_code == 403
    assert client.post(PREFIX + "/auth/logout", headers={"X-Routine-Client": ""}).status_code == 403


def test_atomic_snapshot_roundtrip_idempotency_and_conflict(client, account):
    before = state(client)
    data = before["data"]
    data["tasks"] = [task()]
    data["sessions"] = [session()]
    data["tasks"][0]["linkedTimerSessionId"] = "session-1"
    data["occurrences"] = {"task-1:2026-09-12": {
        "id": "task-1:2026-09-12", "taskId": "task-1", "date": "2026-09-12", "status": "completed",
    }}
    data["profile"]["preferences"]["theme"] = "dark"
    data["history"] = [{"id": "history-1", "sessionId": "session-1", "sessionName": "Focus", "startedAt": "2026-09-12T01:00:00Z", "completedAt": "2026-09-12T01:01:00Z", "durationSeconds": 60, "completedSectionCount": 1}]
    data["activeTimer"] = {"sessionId": "session-1", "sessionName": "Focus", "sections": session()["sections"], "currentIndex": 0, "status": "paused", "remainingMsWhenPaused": 30000, "startedAt": 1789185600000, "completedSectionCount": 0}
    payload = {**before, "mutationId": "mutation-1"}
    response = client.put(PREFIX + "/users/me/data", json=payload)
    assert response.status_code == 200, response.text
    assert response.json()["revision"] == 1
    # Defaults may be generated during validation; retry the exact original input.
    retry = client.put(PREFIX + "/users/me/data", json=payload)
    assert retry.status_code == 200, retry.text
    assert retry.json()["revision"] == 1
    changed_retry = {**payload, "data": {**payload["data"], "taskChanges": True}}
    assert client.put(PREFIX + "/users/me/data", json=changed_retry).status_code == 409
    assert write(client, before).status_code == 409
    saved = state(client)["data"]
    assert saved["profile"]["preferences"]["theme"] == "dark"
    assert saved["activeTimer"]["remainingMsWhenPaused"] == 30000
    assert len(saved["history"]) == 1
    assert saved["occurrences"]["task-1:2026-09-12"]["status"] == "completed"


def test_account_isolation_and_resource_crud(client, account):
    alice_token = account["accessToken"]
    created = client.post(PREFIX + "/tasks", json=task(), headers={"If-Match": "0"})
    assert created.status_code == 201, created.text
    assert created.headers["etag"] == '"1"'
    other = client.post(PREFIX + "/auth/register", json={"name": "Other", "email": "other@example.com", "password": "correct-password-123"})
    assert other.status_code == 201
    assert client.get(PREFIX + "/tasks/task-1").status_code == 404
    assert client.get(PREFIX + "/tasks").json() == []
    assert client.delete(PREFIX + "/tasks/task-1", headers={"If-Match": "0"}).status_code == 404
    client.headers["Authorization"] = "Bearer " + alice_token
    updated = {**created.json(), "title": "Updated"}
    result = client.put(PREFIX + "/tasks/task-1", json=updated, headers={"If-Match": "1"})
    assert result.status_code == 200
    assert client.get(PREFIX + "/tasks/task-1").json()["title"] == "Updated"
    assert client.delete(PREFIX + "/tasks/task-1", headers={"If-Match": "2"}).status_code == 204


def test_invalid_data_and_linked_session_deletion(client, account):
    current = state(client)
    current["data"]["tasks"] = [task()]
    current["data"]["tasks"][0]["date"] = "2026-02-31"
    assert write(client, current).status_code == 422
    current["data"]["tasks"] = [task(), task()]
    assert write(client, current).status_code == 422
    current["data"]["tasks"] = [{**task(), "linkedTimerSessionId": "someone-elses-session"}]
    assert write(client, current).status_code == 422
    assert state(client)["revision"] == 0
    current["data"]["sessions"] = [session()]
    current["data"]["tasks"][0]["linkedTimerSessionId"] = "session-1"
    assert write(client, current).status_code == 200
    assert client.delete(PREFIX + "/timer-sessions/session-1", headers={"If-Match": "1"}).status_code == 409


def test_reset_preserves_account_and_requires_revision(client, account):
    assert client.post(PREFIX + "/tasks", json=task(), headers={"If-Match": "0"}).status_code == 201
    assert client.delete(PREFIX + "/users/me/data").status_code == 422
    assert client.delete(PREFIX + "/users/me/data", headers={"If-Match": "0"}).status_code == 409
    response = client.delete(PREFIX + "/users/me/data", headers={"If-Match": "1"})
    assert response.status_code == 200
    assert response.json()["data"]["tasks"] == []
    assert client.get(PREFIX + "/users/me").json()["email"] == "test@example.com"


def test_persists_across_application_restart(settings):
    with TestClient(create_app(settings), headers={"X-Routine-Client": "1"}) as first:
        registered = first.post(PREFIX + "/auth/register", json={"name": "Persistent", "email": "persist@example.com", "password": "correct-password-123"})
        token = registered.json()["accessToken"]
        assert first.post(PREFIX + "/tasks", json=task(), headers={"If-Match": "0"}).status_code == 201
    with TestClient(create_app(settings), headers={"Authorization": "Bearer " + token}) as second:
        assert second.get(PREFIX + "/tasks/task-1").json()["title"] == "Morning walk"


def test_rate_limit(client):
    for _ in range(30):
        response = client.post(PREFIX + "/auth/login", json={"email": "missing@example.com", "password": "wrong"})
        assert response.status_code == 401
    assert client.post(PREFIX + "/auth/login", json={"email": "missing@example.com", "password": "wrong"}).status_code == 429
