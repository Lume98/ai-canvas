from collections.abc import Callable

from .task import DrawTask, DrawTaskResult, DrawTaskStatus, GeneratedImage


DrawExecutor = Callable[[DrawTask], tuple[GeneratedImage, ...]]


class DrawTaskRunner:
    def __init__(self, executor: DrawExecutor) -> None:
        self._executor = executor

    def run(self, task: DrawTask) -> DrawTaskResult:
        try:
            images = self._executor(task)
        except Exception as error:
            return DrawTaskResult(
                task_id=task.id,
                status=DrawTaskStatus.FAILED,
                error_message=str(error),
            )

        return DrawTaskResult(
            task_id=task.id,
            status=DrawTaskStatus.SUCCEEDED,
            images=images,
        )
