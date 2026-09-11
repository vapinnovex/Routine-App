import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError

from app.api import auth, resources, users
from app.core.config import Settings, get_settings
from app.core.database import connect_database


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app):
        client, db = await connect_database(settings)
        app.state.db = db
        try:
            yield
        finally:
            await client.close()

    app = FastAPI(title="Routine API", version="1.0.0", lifespan=lifespan)
    app.state.settings = settings

    @app.middleware("http")
    async def protect_browser_requests(request: Request, call_next):
        # CORS alone doesn't prevent CSRF: require a custom header on cookie writes,
        # and reject browser requests from origins outside the configured allowlist.
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            origin = request.headers.get("origin")
            if origin and origin not in settings.cors_origins:
                return JSONResponse({"detail": "Origin is not allowed"}, status_code=403)
            if not request.headers.get("authorization") and request.headers.get("x-routine-client") != "1":
                return JSONResponse({"detail": "X-Routine-Client: 1 header is required"}, status_code=403)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True,
                       allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                       allow_headers=["Authorization", "Content-Type", "If-Match", "X-Routine-Client"],
                       expose_headers=["ETag", "Retry-After"])

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        # Do not echo input fields (especially passwords) in validation errors.
        return JSONResponse(status_code=422, content={"detail": [
            {"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in exc.errors()
        ]})

    @app.exception_handler(PyMongoError)
    async def database_error(request, exc):
        logging.getLogger(__name__).error("Database request failed: %s", type(exc).__name__)
        return JSONResponse(status_code=503, content={"detail": "Database unavailable. Please try again."})

    @app.get("/api/v1/health", tags=["Health"])
    async def health(request: Request):
        await request.app.state.db.command("ping")
        return {"status": "ok"}

    for router in (auth.router, users.router, resources.router):
        app.include_router(router, prefix="/api/v1")
    return app


app = create_app()
