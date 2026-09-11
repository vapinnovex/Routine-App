from datetime import date, datetime
from typing import Annotated, Literal
from uuid import uuid4

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator

Identifier = Annotated[str, StringConstraints(min_length=1, max_length=150, pattern=r"^[A-Za-z0-9_:\-]+$")]
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=250)]
DateKey = Annotated[str, StringConstraints(pattern=r"^\d{4}-\d{2}-\d{2}$")]


def valid_timestamp(value: str) -> str:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Timestamp must include a timezone")
    return value


Timestamp = Annotated[str, AfterValidator(valid_timestamp)]


def now_iso() -> str:
    return datetime.now().astimezone().isoformat()


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Preferences(Model):
    theme: Literal["system", "light", "dark"] = "system"
    notificationsEnabled: bool = True
    taskRemindersEnabled: bool = True
    timerNotificationsEnabled: bool = True
    soundEnabled: bool = True
    hapticsEnabled: bool = True


class ProfileData(Model):
    name: Title
    onboardingComplete: bool = True
    sampleDataInstalled: bool = False
    preferences: Preferences = Field(default_factory=Preferences)


class Profile(ProfileData):
    id: str
    email: str
    createdAt: Timestamp


class Recurrence(Model):
    frequency: Literal["none", "daily", "weekly", "weekdays", "monthly", "custom"] = "none"
    weekdays: list[Annotated[int, Field(ge=0, le=6)]] | None = Field(default=None, max_length=7)
    interval: int | None = Field(default=None, ge=1, le=365)
    endDate: DateKey | None = None

    @field_validator("endDate")
    @classmethod
    def valid_end_date(cls, value):
        if value is not None:
            date.fromisoformat(value)
        return value


class Subtask(Model):
    id: Identifier = Field(default_factory=lambda: str(uuid4()))
    title: Title
    completed: bool = False
    completedAt: Timestamp | None = None


class Task(Model):
    id: Identifier = Field(default_factory=lambda: str(uuid4()))
    title: Title
    category: Annotated[str, Field(max_length=100)] | None = None
    date: DateKey
    time: Annotated[str, Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")] | None = None
    recurrence: Recurrence = Field(default_factory=Recurrence)
    priority: Literal["low", "medium", "high"] = "medium"
    estimatedDurationMinutes: int | None = Field(default=None, ge=1, le=525600)
    linkedTimerSessionId: Identifier | None = None
    createdAt: Timestamp = Field(default_factory=now_iso)
    updatedAt: Timestamp = Field(default_factory=now_iso)
    archived: bool = False
    subtasks: list[Subtask] = Field(default_factory=list, max_length=200)

    @field_validator("date")
    @classmethod
    def valid_date(cls, value):
        date.fromisoformat(value)
        return value

    @model_validator(mode="after")
    def valid_subtasks(self):
        if len({s.id for s in self.subtasks}) != len(self.subtasks):
            raise ValueError("Subtask IDs must be unique")
        return self


class SubtaskCompletion(Model):
    completed: bool
    completedAt: Timestamp | None = None


class Occurrence(Model):
    id: Identifier
    taskId: Identifier
    date: DateKey
    status: Literal["pending", "completed", "skipped"] = "pending"
    completedAt: Timestamp | None = None
    subtaskCompletions: dict[Identifier, SubtaskCompletion] = Field(default_factory=dict)
    parentManuallyCompleted: bool = False

    @model_validator(mode="after")
    def valid_identity(self):
        date.fromisoformat(self.date)
        if self.id != f"{self.taskId}:{self.date}":
            raise ValueError("Occurrence ID must be taskId:date")
        return self


class TimerSection(Model):
    id: Identifier = Field(default_factory=lambda: str(uuid4()))
    title: Title
    type: Literal["activity", "break"] = "activity"
    durationSeconds: int = Field(ge=1, le=604800)
    order: int = Field(ge=0)


class TimerSession(Model):
    id: Identifier = Field(default_factory=lambda: str(uuid4()))
    name: Title
    category: Annotated[str, Field(max_length=100)] | None = None
    createdAt: Timestamp = Field(default_factory=now_iso)
    updatedAt: Timestamp = Field(default_factory=now_iso)
    lastUsedAt: Timestamp | None = None
    sections: list[TimerSection] = Field(min_length=1, max_length=200)

    @field_validator("sections")
    @classmethod
    def unique_sections(cls, sections):
        if len({s.id for s in sections}) != len(sections):
            raise ValueError("Section IDs must be unique")
        if sorted(s.order for s in sections) != list(range(len(sections))):
            raise ValueError("Section order must be contiguous starting at zero")
        return sections


class ActiveTimer(Model):
    sessionId: Identifier
    sessionName: Title
    sections: list[TimerSection] = Field(min_length=1, max_length=200)
    currentIndex: int = Field(ge=0)
    status: Literal["idle", "running", "paused", "completed"]
    sectionEndsAt: int | None = Field(default=None, ge=0)
    remainingMsWhenPaused: int | None = Field(default=None, ge=0)
    startedAt: int = Field(ge=0)
    completedSectionCount: int = Field(ge=0)
    taskId: Identifier | None = None
    taskDate: DateKey | None = None

    @model_validator(mode="after")
    def valid_state(self):
        if self.currentIndex >= len(self.sections) or self.completedSectionCount > len(self.sections):
            raise ValueError("Timer index or completion count exceeds section count")
        if self.status == "running" and self.sectionEndsAt is None:
            raise ValueError("Running timers require sectionEndsAt")
        if self.status == "paused" and self.remainingMsWhenPaused is None:
            raise ValueError("Paused timers require remainingMsWhenPaused")
        if (self.taskId is None) != (self.taskDate is None):
            raise ValueError("taskId and taskDate must be supplied together")
        if self.taskDate:
            date.fromisoformat(self.taskDate)
        return self


class HistoryEntry(Model):
    id: Identifier = Field(default_factory=lambda: str(uuid4()))
    sessionId: Identifier
    sessionName: Title
    taskId: Identifier | None = None
    taskDate: DateKey | None = None
    startedAt: Timestamp
    completedAt: Timestamp
    durationSeconds: int = Field(ge=0)
    completedSectionCount: int = Field(ge=0)


class AppData(Model):
    profile: ProfileData
    tasks: list[Task] = Field(default_factory=list, max_length=2000)
    occurrences: dict[Identifier, Occurrence] = Field(default_factory=dict)
    sessions: list[TimerSession] = Field(default_factory=list, max_length=2000)
    activeTimer: ActiveTimer | None = None
    lastCompletedTimer: ActiveTimer | None = None
    history: list[HistoryEntry] = Field(default_factory=list)
    taskChanges: bool = False
    sessionChanges: bool = False

    @model_validator(mode="after")
    def validate_references(self):
        for items in (self.tasks, self.sessions, self.history):
            if len({item.id for item in items}) != len(items):
                raise ValueError("Resource IDs must be unique")
        task_ids = {task.id for task in self.tasks}
        session_ids = {session.id for session in self.sessions}
        for task in self.tasks:
            if task.linkedTimerSessionId and task.linkedTimerSessionId not in session_ids:
                raise ValueError("Linked timer session does not exist")
        for key, occurrence in self.occurrences.items():
            if key != occurrence.id or occurrence.taskId not in task_ids:
                raise ValueError("Occurrence must reference an existing task and match its key")
        # Active/history entries are snapshots: deleting a template must not erase a run.
        return self


class DataEnvelope(Model):
    revision: int = Field(ge=0)
    data: AppData


class DataWrite(DataEnvelope):
    mutationId: Identifier
