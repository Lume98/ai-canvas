from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response

from worker.api import error_response, parse_request_model, request_body_schema
from worker.api.schemas import DrawTaskRequest
from worker.services import DrawTaskService, DrawTaskServiceError

from .public_urls import with_public_result_urls

CONVERSATION_NOT_FOUND_CODE = "CONVERSATION_NOT_FOUND"


def register_draw_task_routes(router: APIRouter, draw_tasks: DrawTaskService) -> None:
    @router.get("/draw-tasks", tags=["Draw Tasks"])
    def list_draw_tasks() -> dict[str, Any]:
        return {
            "tasks": [
                with_public_result_urls(task)
                for task in draw_tasks.list_tasks()
            ]
        }

    @router.post(
        "/draw-tasks",
        tags=["Draw Tasks"],
        response_model=None,
        status_code=201,
        openapi_extra=request_body_schema(DrawTaskRequest),
    )
    async def create_draw_task(request: Request) -> Response:
        payload = await parse_request_model(request, DrawTaskRequest)

        if isinstance(payload, JSONResponse):
            return payload

        task_input, error = payload.to_domain_input()

        if error or task_input is None:
            return error_response(error, 400)

        try:
            task = draw_tasks.create_task_record(task_input)
        except DrawTaskServiceError as error:
            if str(error) == "会话不存在。":
                return error_response(str(error), 404, CONVERSATION_NOT_FOUND_CODE)

            return error_response(str(error), 500)

        return JSONResponse({"task": with_public_result_urls(task)}, status_code=201)

    @router.get(
        "/draw-tasks/{task_id}",
        tags=["Draw Tasks"],
        response_model=None,
    )
    def get_draw_task(task_id: str) -> Response:
        task = draw_tasks.get_task(task_id)

        if not task:
            return error_response("任务不存在。", 404)

        return JSONResponse({"task": with_public_result_urls(task)})
