from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import token_digest

bearer = HTTPBearer(auto_error=False)
COOKIE_NAME = "routine_session"


def database(request: Request):
    return request.app.state.db


async def current_user(request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    token = credentials.credentials if credentials else request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(401, "Sign in to continue", headers={"WWW-Authenticate": "Bearer"})
    session = await request.app.state.db.sessions.find_one({
        "_id": token_digest(token), "expires_at": {"$gt": datetime.now(timezone.utc)},
    })
    if not session:
        raise HTTPException(401, "Session expired. Please sign in again.", headers={"WWW-Authenticate": "Bearer"})
    user = await request.app.state.db.users.find_one({"_id": session["user_id"]})
    if not user:
        raise HTTPException(401, "Account no longer exists")
    request.state.session_id = session["_id"]
    return user
