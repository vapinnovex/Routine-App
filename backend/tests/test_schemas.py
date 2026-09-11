import pytest
from pydantic import ValidationError

from app.schemas.data import ActiveTimer, AppData, Task


def test_invalid_timer_state():
    with pytest.raises(ValidationError):
        ActiveTimer(sessionId="quick-timer", sessionName="Quick", sections=[
            {"id": "s", "title": "Focus", "durationSeconds": 10, "order": 0}
        ], currentIndex=4, status="running", startedAt=10, completedSectionCount=0)


def test_server_owned_fields_and_unknown_fields_are_rejected():
    with pytest.raises(ValidationError):
        AppData(profile={"name": "User", "id": "another-user"})
    with pytest.raises(ValidationError):
        Task(title="Task", date="2026-09-12", owner_id="someone-else")


def test_invalid_time_and_negative_duration():
    with pytest.raises(ValidationError):
        Task(title="Task", date="2026-09-12", time="25:70")
    with pytest.raises(ValidationError):
        Task(title="Task", date="2026-09-12", estimatedDurationMinutes=-5)
