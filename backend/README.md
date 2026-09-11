# Routine API

Python 3.10+ with FastAPI, PyMongo's asynchronous driver, and MongoDB 6+. All routes
use the `/api/v1` prefix. Interactive OpenAPI documentation is at `/docs`.

## Run locally (PowerShell)

Start your local MongoDB service, or use a MongoDB Atlas connection URI. Then, from
the repository root:

```powershell
cd backend
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.venv/Scripts/python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

On macOS/Linux use `.venv/bin/python` and `cp .env.example .env`.
Check `http://localhost:8000/api/v1/health` and `http://localhost:8000/docs`.
Startup verifies MongoDB connectivity and creates unique email and session expiry indexes.

## Configuration

| Variable | Default / purpose |
| --- | --- |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017`; supports Atlas URIs |
| `MONGODB_DATABASE` | `routine` |
| `CORS_ORIGINS` | JSON array of exact frontend origins, initially localhost and 127.0.0.1 on port 8081 |
| `SESSION_DAYS` | 30; allowed range 1–90 |
| `COOKIE_SECURE` | `false` for local HTTP; use `true` with production HTTPS |
| `COOKIE_SAMESITE` | `lax`; use `none` plus secure cookies for a cross-site frontend/API |

Use the same hostname for local web and API (localhost with localhost). For production,
prefer a same-site API domain or `/api` reverse proxy because browsers can restrict
third-party cookies. Add the deployed web origin to `CORS_ORIGINS`; wildcards are rejected.
Keep MongoDB credentials in the backend environment only, never in `EXPO_PUBLIC_*` variables.
The authentication rate limiter allows 30 attempts per client IP per 15-minute bucket.
Configure Uvicorn's trusted proxy addresses explicitly when deploying behind a proxy;
untrusted forwarded addresses must not control the limiter's client IP.

## Modules

```text
app/
  main.py             App factory, lifecycle, CORS, CSRF and error handling
  core/               Environment configuration, Mongo connection, password/token primitives
  schemas/            Validated auth and application data contracts
  repositories/       Account data persistence and atomic revision checks
  services/           Registration, credential verification, session issuance and rate limiting
  api/                Authentication dependencies and versioned resource routers
tests/                Real MongoDB API integration and schema tests
```

MongoDB collections are `users`, `sessions`, `app_data`, and `auth_attempts`. Passwords
use Argon2id. Session tokens are random opaque bearer tokens; only their SHA-256 digests
are stored in MongoDB. Expiry is checked on every request and TTL indexes clean up old
sessions. Logout immediately revokes the current session. Responses never expose password
hashes or database internals.

Each account's application data is one MongoDB aggregate. A single atomic update stores
related task completion, timer history, ordering, and profile changes together, including
on standalone MongoDB without replica-set transactions. Account data is limited to 12 MiB,
2,000 tasks, and 2,000 timer templates; exceeding a limit fails explicitly, without truncating
history. This is intended for a personal routine app. Larger deployments should partition
history and occurrences into separate collections with pagination and transactional updates.

## API

| Method | Route (after `/api/v1`) | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | `{name, email, password}`; creates account and session (201) |
| POST | `/auth/login` | `{email, password}`; creates session |
| POST | `/auth/logout` | Revokes current session (204) |
| GET / PUT | `/users/me` | Read profile / replace editable profile fields |
| GET / PUT / DELETE | `/users/me/data` | Read, atomically synchronize, or reset account data |
| GET / POST | `/tasks` | List / create tasks |
| GET / PUT / DELETE | `/tasks/{id}` | Read / replace / delete a task and its occurrences |
| GET / POST | `/timer-sessions` | List / create timer templates |
| GET / PUT / DELETE | `/timer-sessions/{id}` | Read / replace / delete a template |
| GET | `/task-occurrences` | List completion records; optional `task_id` filter |
| PUT | `/task-occurrences/{taskId:date}` | Set a task's completion record for a date |
| GET / PUT | `/active-timer` | Read / replace active timer; JSON `null` clears it |
| GET / POST | `/timer-history` | List / create completed runs |
| GET / PUT / DELETE | `/timer-history/{id}` | Read / replace / remove a history entry |
| GET | `/health` | MongoDB readiness |

Collection reads support `offset` (default 0) and `limit` (default 100, maximum 500).
Resource reads/writes return `ETag` with the account revision. Resource writes and data
reset require `If-Match: <revision>`; missing preconditions return 422. Snapshot writes
instead supply `revision` in the body. Stale writes return 409, missing resources 404,
invalid input 422, expired/missing sessions 401, and database failures 503.

Payload fields use camelCase to match the existing TypeScript contracts; URL resources
use plural nouns and kebab-case. All ownership comes from the authenticated session.
A caller cannot supply another user's ID to read or change their resources.

### Authentication

```http
POST /api/v1/auth/register
Content-Type: application/json
X-Routine-Client: 1

{"name":"Alex","email":"alex@example.com","password":"a-long-unique-password"}
```

The response contains `accessToken`, `tokenType`, `expiresAt`, and `user`, and sets an
HttpOnly session cookie. Native/API clients send `Authorization: Bearer <accessToken>`.
Web clients use `credentials: "include"`. Cookie-authenticated writes and unauthenticated
auth requests require `X-Routine-Client: 1` for CSRF protection. Browser write origins
must also match the CORS allowlist. In Swagger, register with a client first, then use
the **Authorize** button with the returned bearer token.

### Atomic frontend synchronization

`GET /users/me/data` returns `{revision, data}`. To save, send:

```json
{
  "revision": 0,
  "mutationId": "unique-request-uuid",
  "data": {
    "profile": {"name": "Alex", "onboardingComplete": true, "sampleDataInstalled": false,
      "preferences": {"theme": "system", "notificationsEnabled": true, "taskRemindersEnabled": true,
        "timerNotificationsEnabled": true, "soundEnabled": true, "hapticsEnabled": true}},
    "tasks": [], "occurrences": {}, "sessions": [], "activeTimer": null,
    "lastCompletedTimer": null, "history": [], "taskChanges": false, "sessionChanges": false
  }
}
```

The frontend sends complete snapshots to preserve linked changes and list order. Retries
reuse the exact mutation ID and body; a lost-response retry of the most recent mutation
returns its saved revision. A concurrent later write returns 409 instead of overwriting.
Writes are serialized and coalesced in the frontend. There is no offline persistent queue:
unsaved changes stay in memory, an error panel offers retry or explicit discard/reload,
and the browser warns before leaving while changes are pending. Use Settings → Refresh
from server to load changes made elsewhere. This is not a real-time collaborative sync service.

## Tests

```powershell
.venv/Scripts/python.exe -m pip install -r requirements-dev.txt
.venv/Scripts/python.exe -m pytest -q
```

Tests start an isolated `mongod` on an ephemeral loopback port if it is on PATH. Alternatively
set `TEST_MONGODB_URI`. Each test uses a unique `routine_test_*` database and removes only
that database. No production database is dropped. Integration tests skip when neither
`mongod` nor `TEST_MONGODB_URI` is available.

Implementation references: [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/),
[PyMongo asynchronous connections](https://www.mongodb.com/docs/languages/python/pymongo-driver/current/connect/mongoclient/),
[Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/).
