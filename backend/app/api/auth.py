from fastapi import APIRouter, Depends, Request, Response

from app.api.dependencies import COOKIE_NAME, current_user, database
from app.schemas.auth import AuthResponse, Login, Registration
from app.services import auth

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=AuthResponse, status_code=201, dependencies=[Depends(auth.rate_limit)])
async def register(payload: Registration, request: Request, response: Response, db=Depends(database)):
    user = await auth.register(db, payload)
    return await auth.issue_session(request, response, user)


@router.post("/login", response_model=AuthResponse, dependencies=[Depends(auth.rate_limit)])
async def login(payload: Login, request: Request, response: Response, db=Depends(database)):
    user = await auth.authenticate(db, payload)
    return await auth.issue_session(request, response, user)


@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response, user=Depends(current_user), db=Depends(database)):
    await db.sessions.delete_one({"_id": request.state.session_id})
    settings = request.app.state.settings
    response.delete_cookie(COOKIE_NAME, path="/api/v1", secure=settings.cookie_secure,
                           httponly=True, samesite=settings.cookie_samesite)
