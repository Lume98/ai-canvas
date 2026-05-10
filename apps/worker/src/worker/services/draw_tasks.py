import uuid
from typing import Any

from ..store import SQLiteDrawTaskStore
from ..task import DrawTask
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

    def list_tasks(self) -> list[dict[str, Any]]:
        return self._store.list_tasks()

    def create_task(
        self,
        task_input: DrawTaskInput,
        task_id: str | None = None,
    ) -> DrawTask:
        task = self.build_task(task_input, task_id)
        self._store.create_task(task)

        return task

    def build_task(
        self,
        task_input: DrawTaskInput,
        task_id: str | None = None,
    ) -> DrawTask:
        return DrawTask(
            id=task_id or str(uuid.uuid4()),
            prompt=task_input.prompt,
            model=task_input.model,
            size=task_input.size,
            quality=task_input.quality,
        )

    def create_task_record(
        self,
        task_input: DrawTaskInput,
        task_id: str | None = None,
    ) -> dict[str, Any]:
        task = self.create_task(task_input, task_id)
        created_task = self._store.get_task(task.id)

        if created_task is None:
            raise DrawTaskServiceError("任务创建后无法读取。")

        return created_task

    def get_task(self, task_id: str) -> dict[str, Any] | None:
        return self._store.get_task(task_id)

    def claim_next_task(self) -> DrawTask | None:
        return self._store.claim_next_task()

    def generate_task_image(self, task: DrawTask) -> str:
        return self._image_generation.generate_image(
            DrawTaskInput(
                prompt=task.prompt,
                model=task.model,
                size=task.size,
                quality=task.quality,
            )
        )

    def mark_succeeded(self, task_id: str, result_url: str) -> None:
        self._store.mark_succeeded(task_id, result_url)

    def mark_failed(self, task_id: str, error_message: str) -> None:
        self._store.mark_failed(task_id, error_message)
