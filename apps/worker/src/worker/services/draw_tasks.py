import uuid
from typing import Any

from ..store import SQLiteDrawTaskStore
from ..task import DrawTask, GeneratedImage
from ..validation import DrawTaskInput
from .image_generation import ImageGenerationService


class DrawTaskServiceError(Exception):
    pass


class DrawTaskService:
    def __init__(
        self,
        store: SQLiteDrawTaskStore,
        image_generation: ImageGenerationService,
    ) -> None:
        self._store = store
        self._image_generation = image_generation

    def create_conversation(self, title: str | None = None) -> dict[str, Any]:
        conversation_id = build_prefixed_id("conversation")
        normalized_title = (title or "").strip() or "新的绘图会话"
        self._store.create_conversation(conversation_id, normalized_title)
        conversation = self._store.get_conversation(conversation_id)

        if conversation is None:
            raise DrawTaskServiceError("会话创建后无法读取。")

        return conversation

    def get_conversation(self, conversation_id: str) -> dict[str, Any] | None:
        return self._store.get_conversation(conversation_id)

    def list_conversation_messages(self, conversation_id: str) -> list[dict[str, Any]]:
        return self._store.list_conversation_messages(conversation_id)

    def list_tasks(self) -> list[dict[str, Any]]:
        return self._store.list_tasks()

    def create_task(
        self,
        task_input: DrawTaskInput,
        task_id: str | None = None,
    ) -> DrawTask:
        task = self.build_task(task_input, task_id)
        self._store.create_task_turn(task)

        return task

    def build_task(
        self,
        task_input: DrawTaskInput,
        task_id: str | None = None,
    ) -> DrawTask:
        if not task_input.conversation_id:
            raise DrawTaskServiceError("缺少 conversationId。")

        return DrawTask(
            id=task_id or str(uuid.uuid4()),
            conversation_id=task_input.conversation_id,
            request_message_id=build_prefixed_id("message"),
            reply_message_id=build_prefixed_id("message"),
            prompt=task_input.prompt,
            model=task_input.model,
            size=task_input.size,
            quality=task_input.quality,
            output_count=task_input.output_count,
            branch_mode=task_input.branch_mode,
            parent_asset_id=task_input.parent_asset_id,
        )

    def create_task_record(
        self,
        task_input: DrawTaskInput,
        task_id: str | None = None,
    ) -> dict[str, Any]:
        conversation_id = task_input.conversation_id

        if not conversation_id:
            raise DrawTaskServiceError("缺少 conversationId。")

        if self._store.get_conversation(conversation_id) is None:
            raise DrawTaskServiceError("会话不存在。")

        task = self.create_task(task_input, task_id)
        created_task = self._store.get_task(task.id)

        if created_task is None:
            raise DrawTaskServiceError("任务创建后无法读取。")

        return created_task

    def get_task(self, task_id: str) -> dict[str, Any] | None:
        return self._store.get_task(task_id)

    def claim_next_task(self) -> DrawTask | None:
        return self._store.claim_next_task()

    def generate_task_image(self, task: DrawTask) -> tuple[GeneratedImage, ...]:
        return self._image_generation.generate_images(
            DrawTaskInput(
                prompt=task.prompt,
                model=task.model,
                size=task.size,
                quality=task.quality,
                output_count=task.output_count,
                branch_mode=task.branch_mode,
                parent_asset_id=task.parent_asset_id,
            )
        )

    def mark_succeeded(self, task_id: str, images: tuple[GeneratedImage, ...]) -> None:
        self._store.mark_succeeded(task_id, images)

    def mark_failed(self, task_id: str, error_message: str) -> None:
        self._store.mark_failed(task_id, error_message)


def build_prefixed_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"
