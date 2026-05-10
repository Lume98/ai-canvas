from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response

from ..services import DrawTaskService, DrawTaskServiceError
from .constants import API_PREFIX
from .schemas import DrawTaskRequest
from .utils import error_response, parse_request_model, request_body_schema


def register_draw_task_routes(app: FastAPI, draw_tasks: DrawTaskService) -> None:
    @app.get(f"{API_PREFIX}/draw-tasks", tags=["Draw Tasks"])
    def list_draw_tasks() -> dict[str, Any]:
        return {"tasks": draw_tasks.list_tasks()}

    @app.post(
        f"{API_PREFIX}/draw-tasks",
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
            return error_response(str(error), 500)

        return JSONResponse({"task": task}, status_code=201)

    @app.get(
        f"{API_PREFIX}/draw-tasks/{{task_id}}",
        tags=["Draw Tasks"],
        response_model=None,
    )
    def get_draw_task(task_id: str) -> Response:
        task = draw_tasks.get_task(task_id)

        if not task:
            return error_response("任务不存在。", 404)

        return JSONResponse({"task": task})
