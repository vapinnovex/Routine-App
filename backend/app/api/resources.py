from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import ValidationError

from app.api.dependencies import current_user, database
from app.api.users import expected_revision
from app.repositories.data import DataRepository
from app.schemas.data import ActiveTimer, AppData, HistoryEntry, Occurrence, ProfileData, Task, TimerSession, now_iso


async def commit(repo, user, revision, data, response):
    try:
        validated = AppData.model_validate(data)
    except ValidationError as exc:
        raise HTTPException(422, "Invalid resource references or data") from exc
    result = await repo.replace(user, revision, validated, str(uuid4()))
    response.headers["ETag"] = f'"{result["revision"]}"'
    return result


def collection_router(path, field, model, tag):
    """Shared account-scoped CRUD; all writes use an atomic revision check."""
    router = APIRouter(prefix=path, tags=[tag])

    @router.get("", response_model=list[model], name=f"list_{field}")
    async def list_items(response: Response, offset: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500),
                         user=Depends(current_user), db=Depends(database)):
        doc = await DataRepository(db).get(user)
        response.headers["ETag"] = f'"{doc["revision"]}"'
        return doc["data"][field][offset:offset + limit]

    @router.get("/{item_id}", response_model=model, name=f"get_{field}")
    async def get_item(item_id: str, response: Response, user=Depends(current_user), db=Depends(database)):
        doc = await DataRepository(db).get(user)
        response.headers["ETag"] = f'"{doc["revision"]}"'
        return next((item for item in doc["data"][field] if item["id"] == item_id), None) or missing()

    @router.post("", response_model=model, status_code=201, name=f"create_{field}")
    async def create_item(payload: model, response: Response, revision: int = Depends(expected_revision),
                          user=Depends(current_user), db=Depends(database)):
        repo = DataRepository(db)
        doc = await repo.get(user)
        if any(item["id"] == payload.id for item in doc["data"][field]):
            raise HTTPException(409, "Resource ID already exists")
        item = payload.model_dump(mode="json")
        if field != "history":
            item["createdAt"] = item["updatedAt"] = now_iso()
        doc["data"][field].insert(0, item)
        await commit(repo, user, revision, doc["data"], response)
        return item

    @router.put("/{item_id}", response_model=model, name=f"replace_{field}")
    async def replace_item(item_id: str, payload: model, response: Response, revision: int = Depends(expected_revision),
                           user=Depends(current_user), db=Depends(database)):
        if item_id != payload.id:
            raise HTTPException(422, "Body ID must match path ID")
        repo = DataRepository(db)
        doc = await repo.get(user)
        items = doc["data"][field]
        index = next((i for i, item in enumerate(items) if item["id"] == item_id), None)
        if index is None:
            missing()
        item = payload.model_dump(mode="json")
        if field != "history":
            item["createdAt"] = items[index]["createdAt"]
            item["updatedAt"] = now_iso()
        items[index] = item
        await commit(repo, user, revision, doc["data"], response)
        return item

    @router.delete("/{item_id}", status_code=204, name=f"delete_{field}")
    async def delete_item(item_id: str, response: Response, revision: int = Depends(expected_revision),
                          user=Depends(current_user), db=Depends(database)):
        repo = DataRepository(db)
        doc = await repo.get(user)
        data = doc["data"]
        if not any(item["id"] == item_id for item in data[field]):
            missing()
        if field == "sessions" and any(t["linkedTimerSessionId"] == item_id for t in data["tasks"]):
            raise HTTPException(409, "Session is linked to a task; unlink it first")
        data[field] = [item for item in data[field] if item["id"] != item_id]
        if field == "tasks":
            data["occurrences"] = {key: value for key, value in data["occurrences"].items() if value["taskId"] != item_id}
        await commit(repo, user, revision, data, response)

    return router


def missing():
    raise HTTPException(404, "Resource not found")


router = APIRouter()
router.include_router(collection_router("/tasks", "tasks", Task, "Tasks"))
router.include_router(collection_router("/timer-sessions", "sessions", TimerSession, "Timer sessions"))
router.include_router(collection_router("/timer-history", "history", HistoryEntry, "Timer history"))


@router.put("/users/me", response_model=ProfileData, tags=["Account"])
async def replace_profile(payload: ProfileData, response: Response, revision: int = Depends(expected_revision),
                          user=Depends(current_user), db=Depends(database)):
    repo = DataRepository(db)
    doc = await repo.get(user)
    doc["data"]["profile"] = payload.model_dump(mode="json")
    await commit(repo, user, revision, doc["data"], response)
    return payload


@router.get("/task-occurrences", response_model=list[Occurrence], tags=["Task occurrences"])
async def list_occurrences(response: Response, task_id: str | None = None, offset: int = Query(0, ge=0),
                           limit: int = Query(100, ge=1, le=500), user=Depends(current_user), db=Depends(database)):
    doc = await DataRepository(db).get(user)
    response.headers["ETag"] = f'"{doc["revision"]}"'
    items = [item for item in doc["data"]["occurrences"].values() if task_id is None or item["taskId"] == task_id]
    return items[offset:offset + limit]


@router.put("/task-occurrences/{occurrence_id}", response_model=Occurrence, tags=["Task occurrences"])
async def put_occurrence(occurrence_id: str, payload: Occurrence, response: Response,
                         revision: int = Depends(expected_revision), user=Depends(current_user), db=Depends(database)):
    if payload.id != occurrence_id:
        raise HTTPException(422, "Body ID must match path ID")
    repo = DataRepository(db)
    doc = await repo.get(user)
    doc["data"]["occurrences"][occurrence_id] = payload.model_dump(mode="json")
    await commit(repo, user, revision, doc["data"], response)
    return payload


@router.get("/active-timer", response_model=ActiveTimer | None, tags=["Timer state"])
async def get_active_timer(response: Response, user=Depends(current_user), db=Depends(database)):
    doc = await DataRepository(db).get(user)
    response.headers["ETag"] = f'"{doc["revision"]}"'
    return doc["data"]["activeTimer"]


@router.put("/active-timer", response_model=ActiveTimer | None, tags=["Timer state"])
async def put_active_timer(response: Response, payload: ActiveTimer | None = None,
                           revision: int = Depends(expected_revision), user=Depends(current_user), db=Depends(database)):
    repo = DataRepository(db)
    doc = await repo.get(user)
    doc["data"]["activeTimer"] = payload.model_dump(mode="json") if payload else None
    await commit(repo, user, revision, doc["data"], response)
    return payload
