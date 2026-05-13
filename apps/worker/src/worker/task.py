from dataclasses import dataclass
from enum import StrEnum


class DrawTaskStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"


class BranchMode(StrEnum):
    EVOLVE = "evolve"
    PRESERVE = "preserve"
    TRANSFORM = "transform"


@dataclass(frozen=True)
class DrawTask:
    id: str
    conversation_id: str
    request_message_id: str
    reply_message_id: str
    prompt: str
    model: str = "gpt-image-2"
    size: str = "1024x1024"
    quality: str = "auto"
    output_count: int = 1
    branch_mode: BranchMode | None = None
    parent_asset_id: str | None = None
    attempts: int = 0


@dataclass(frozen=True)
class GeneratedImage:
    filename: str
    width: int
    height: int


@dataclass(frozen=True)
class DrawTaskResult:
    task_id: str
    status: DrawTaskStatus
    images: tuple[GeneratedImage, ...] = ()
    error_message: str | None = None
