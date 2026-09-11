from pymongo import AsyncMongoClient

from app.core.config import Settings


async def connect_database(settings: Settings):
    client = AsyncMongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000, tz_aware=True)
    try:
        await client.admin.command("ping")
        db = client[settings.mongodb_database]
        await db.users.create_index("email", unique=True)
        await db.sessions.create_index("expires_at", expireAfterSeconds=0)
        await db.sessions.create_index("user_id")
        await db.auth_attempts.create_index("expires_at", expireAfterSeconds=0)
        return client, db
    except Exception:
        await client.close()
        raise
