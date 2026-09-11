import os
import shutil
import socket
import subprocess
import time
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture(scope="session")
def mongo_uri(tmp_path_factory):
    configured = os.getenv("TEST_MONGODB_URI")
    if configured:
        yield configured
        return
    executable = shutil.which("mongod")
    if not executable:
        pytest.skip("Install mongod or set TEST_MONGODB_URI for real MongoDB integration tests")
    directory = tmp_path_factory.mktemp("routine_mongo")
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    process = subprocess.Popen(
        [executable, "--dbpath", str(directory), "--bind_ip", "127.0.0.1", "--port", str(port),
         "--logpath", str(directory / "mongo.log")],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )
    uri = f"mongodb://127.0.0.1:{port}"
    client = MongoClient(uri, serverSelectionTimeoutMS=500)
    try:
        for _ in range(60):
            try:
                client.admin.command("ping")
                break
            except Exception:
                if process.poll() is not None:
                    pytest.fail("Test MongoDB failed to start: " + (directory / "mongo.log").read_text())
                time.sleep(0.2)
        else:
            pytest.fail("Timed out starting test MongoDB")
        yield uri
    finally:
        client.close()
        process.terminate()
        process.wait(timeout=15)


@pytest.fixture
def settings(mongo_uri):
    settings = Settings(mongodb_uri=mongo_uri, mongodb_database="routine_test_" + uuid4().hex, _env_file=None)
    yield settings
    # Never drop a database supplied by the user: only this test's unique name.
    assert settings.mongodb_database.startswith("routine_test_")
    with MongoClient(mongo_uri) as client:
        client.drop_database(settings.mongodb_database)


@pytest.fixture
def client(settings):
    with TestClient(create_app(settings), headers={"X-Routine-Client": "1"}) as client:
        yield client


@pytest.fixture
def account(client):
    result = client.post("/api/v1/auth/register", json={"name": "Test User", "email": "test@example.com", "password": "correct-password-123"})
    assert result.status_code == 201, result.text
    return result.json()
