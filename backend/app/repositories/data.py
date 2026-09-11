import hashlib
import json

from bson import BSON
from fastapi import HTTPException
from pymongo import ReturnDocument

from app.schemas.data import AppData, ProfileData


class DataRepository:
    """One atomic aggregate per account keeps linked edits and timer completion consistent."""

    def __init__(self, db):
        self.collection = db.app_data

    async def get(self, user):
        await self.collection.update_one(
            {"_id": user["_id"]},
            {"$setOnInsert": {
                "revision": 0,
                "data": AppData(profile=ProfileData(name=user["name"])).model_dump(mode="json"),
            }},
            upsert=True,
        )
        return await self.collection.find_one({"_id": user["_id"]})

    async def replace(self, user, revision: int, data: AppData, mutation_id: str, request_data=None):
        payload = data.model_dump(mode="json")
        request_hash = hashlib.sha256(json.dumps(
            request_data if request_data is not None else payload, sort_keys=True, separators=(",", ":")
        ).encode()).hexdigest()
        if len(BSON.encode({"data": payload})) > 12 * 1024 * 1024:
            raise HTTPException(413, "Account data exceeds the 12 MiB storage limit; export and reduce history")
        result = await self.collection.find_one_and_update(
            {"_id": user["_id"], "revision": revision},
            {"$set": {"data": payload, "last_mutation": mutation_id, "request_hash": request_hash}, "$inc": {"revision": 1}},
            return_document=ReturnDocument.AFTER,
        )
        if result is None:
            current = await self.get(user)
            # A retry after a lost response is safe, including after a connection timeout.
            if (current.get("last_mutation") == mutation_id
                    and current["revision"] == revision + 1 and current.get("request_hash") == request_hash):
                return current
            raise HTTPException(409, "Data changed on another device. Reload before editing again.")
        return result
