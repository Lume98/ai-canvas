from dataclasses import dataclass
from enum import StrEnum


class DrawTaskStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"


@dataclass(frozen=True)
class DrawTask:
    id: str
    prompt: str
    model: str = "gpt-image-2"
    size: str = "1024x1024"
    quality: str = "auto"
    attempts: int = 0


@dataclass(frozen=True)
class DrawTaskResult:
    task_id: str
    status: DrawTaskStatus
    result_filename: str | None = None
    error_message: str | None = None
