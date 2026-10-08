"""Phase 2 contracts; publication and scoring routes remain disabled.

Public question models deliberately exclude answer keys. Personal account
snapshots cannot supply leaderboard scores or challenge submissions.
"""
from datetime import date, datetime
from typing import Annotated, Literal
from pydantic import Field, model_validator
from app.schemas.data import DateKey, Identifier, Model, Timestamp, Title


class QuestionOption(Model):
    id: Identifier
    text: Title


class DailyQuestion(Model):
    id: Identifier
    version: int = Field(ge=1)
    day: DateKey
    prompt: Annotated[str, Field(min_length=1, max_length=2000)]
    options: list[QuestionOption] = Field(min_length=2, max_length=6)
    opensAt: Timestamp
    closesAt: Timestamp

    @model_validator(mode="after")
    def valid_question(self):
        date.fromisoformat(self.day)
        if len({option.id for option in self.options}) != len(self.options):
            raise ValueError("Option IDs must be unique")
        if datetime.fromisoformat(self.closesAt.replace("Z", "+00:00")) <= datetime.fromisoformat(self.opensAt.replace("Z", "+00:00")):
            raise ValueError("Question must close after opening")
        return self


class AnswerSubmission(Model):
    questionId: Identifier
    questionVersion: int = Field(ge=1)
    optionId: Identifier
    mutationId: Identifier
    # User ID, time, correctness and points are assigned by the server.


class LeaderboardEntry(Model):
    rank: int = Field(ge=1)
    displayName: Title
    points: int = Field(ge=0)
    # Never expose emails, account IDs or health responses in public rankings.


class Capabilities(Model):
    apiVersion: Literal["v1"] = "v1"
    accountSchemaVersion: Literal[1] = 1
    dailyQuestions: bool = False
    leaderboard: bool = False
