from collections.abc import Callable

from ai_canvas_worker.task import DrawTask, DrawTaskResult, DrawTaskStatus


DrawExecutor = Callable[[DrawTask], str]


class DrawTaskRunner:
    def __init__(self, executor: DrawExecutor) -> None:
        self._executor = executor

    def run(self, task: DrawTask) -> DrawTaskResult:
        try:
            result_url = self._executor(task)
        except Exception as error:
            return DrawTaskResult(
                task_id=task.id,
                status=DrawTaskStatus.FAILED,
                error_message=str(error),
            )

        return DrawTaskResult(
            task_id=task.id,
            status=DrawTaskStatus.SUCCEEDED,
            result_url=result_url,
        )
