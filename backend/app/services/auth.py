from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import HTTPException, Request, Response
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from starlette.concurrency import run_in_threadpool

from app.api.dependencies import COOKIE_NAME
from app.core.security import DUMMY_HASH, new_token, password_hasher, token_digest
from app.repositories.data import DataRepository
from app.schemas.data import Profile


async def rate_limit(request: Request):
    now = datetime.now(timezone.utc)
    bucket = int(now.timestamp()) // 900
    address = request.client.host if request.client else "unknown"
    key = token_digest(f"{address}:{bucket}")
    record = await request.app.state.db.auth_attempts.find_one_and_update(
        {"_id": key},
        {"$inc": {"count": 1}, "$setOnInsert": {"expires_at": now + timedelta(minutes=30)}},
        upsert=True, return_document=ReturnDocument.AFTER,
    )
    if record["count"] > 30:
        raise HTTPException(429, "Too many sign-in attempts. Try again in 15 minutes.", headers={"Retry-After": "900"})


async def register(db, payload):
    user = {
        "_id": str(uuid4()), "email": str(payload.email), "name": payload.name,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "password_hash": await run_in_threadpool(password_hasher.hash, payload.password),
    }
    try:
        await db.users.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(409, "An account with this email already exists") from None
    return user


async def authenticate(db, payload):
    user = await db.users.find_one({"email": str(payload.email)})
    valid = await run_in_threadpool(password_hasher.verify, payload.password, user["password_hash"] if user else DUMMY_HASH)
    if not user or not valid:
        raise HTTPException(401, "Incorrect email or password")
    return user


async def profile(db, user):
    doc = await DataRepository(db).get(user)
    return Profile(**doc["data"]["profile"], id=user["_id"], email=user["email"], createdAt=user["createdAt"])


async def issue_session(request: Request, response: Response, user):
    settings = request.app.state.settings
    token = new_token()
    expiry = datetime.now(timezone.utc) + timedelta(days=settings.session_days)
    await request.app.state.db.sessions.insert_one({
        "_id": token_digest(token), "user_id": user["_id"], "expires_at": expiry,
    })
    response.set_cookie(COOKIE_NAME, token, httponly=True, secure=settings.cookie_secure,
                        samesite=settings.cookie_samesite, max_age=settings.session_days * 86400, path="/api/v1")
    response.headers["Cache-Control"] = "no-store"
    return {"accessToken": token, "expiresAt": expiry.isoformat(), "user": await profile(request.app.state.db, user)}
