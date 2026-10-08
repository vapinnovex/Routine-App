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


def test_invalid_recurrence_rules():
    with pytest.raises(ValidationError):
        Task(title="Task", date="2026-09-12", recurrence={"frequency": "weekdays", "weekdays": []})
    with pytest.raises(ValidationError):
        Task(title="Task", date="2026-09-12", recurrence={"frequency": "daily", "endDate": "2026-09-01"})


def test_snapshot_version_is_backward_compatible_but_rejects_unknown_versions():
    assert AppData(profile={"name": "User"}).schemaVersion == 1
    with pytest.raises(ValidationError):
        AppData(profile={"name": "User"}, schemaVersion=2)


def test_phase_two_answers_cannot_supply_identity_or_points():
    from app.schemas.challenges import AnswerSubmission, DailyQuestion
    payload = dict(questionId="q1", questionVersion=1, optionId="a", mutationId="m1")
    assert AnswerSubmission(**payload).questionVersion == 1
    for extra in ({"points": 100}, {"userId": "other"}, {"correct": True}):
        with pytest.raises(ValidationError):
            AnswerSubmission(**payload, **extra)
    with pytest.raises(ValidationError):
        DailyQuestion(id="q1", version=1, day="2026-10-07", prompt="Question",
                      options=[{"id": "a", "text": "One"}, {"id": "a", "text": "Two"}],
                      opensAt="2026-10-07T00:00:00Z", closesAt="2026-10-08T00:00:00Z")
