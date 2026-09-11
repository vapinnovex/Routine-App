from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException

from app.api.dependencies import current_user, database
from app.repositories.data import DataRepository
from app.schemas.data import AppData, DataEnvelope, DataWrite, Profile, ProfileData
from app.services.auth import profile

router = APIRouter(prefix="/users/me", tags=["Account"])


@router.get("", response_model=Profile)
async def get_profile(user=Depends(current_user), db=Depends(database)):
    return await profile(db, user)


@router.get("/data", response_model=DataEnvelope)
async def get_data(user=Depends(current_user), db=Depends(database)):
    doc = await DataRepository(db).get(user)
    return {"revision": doc["revision"], "data": doc["data"]}


@router.put("/data", response_model=DataEnvelope)
async def put_data(payload: DataWrite, user=Depends(current_user), db=Depends(database)):
    doc = await DataRepository(db).replace(user, payload.revision, payload.data, payload.mutationId,
                                         payload.data.model_dump(mode="json", exclude_unset=True))
    return {"revision": doc["revision"], "data": doc["data"]}


def expected_revision(if_match: str = Header(...)) -> int:
    try:
        value = int(if_match.strip('"'))
        if value < 0:
            raise ValueError
        return value
    except ValueError:
        raise HTTPException(400, "If-Match must contain the current data revision") from None


@router.delete("/data", response_model=DataEnvelope)
async def clear_data(revision: int = Depends(expected_revision), user=Depends(current_user), db=Depends(database)):
    repo = DataRepository(db)
    doc = await repo.get(user)
    previous = ProfileData.model_validate(doc["data"]["profile"])
    previous.sampleDataInstalled = False
    result = await repo.replace(user, revision, AppData(profile=previous), str(uuid4()))
    return {"revision": result["revision"], "data": result["data"]}
