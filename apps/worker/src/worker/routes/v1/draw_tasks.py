from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response

from worker.api import error_response, parse_request_model, request_body_schema
from worker.api.schemas import DrawTaskRequest
from worker.services import DrawTaskService, DrawTaskServiceError

from .paths import generated_image_public_path


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
                return error_response(str(error), 404)

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


def with_public_result_urls(task: dict[str, Any]) -> dict[str, Any]:
    result_filename = task.get("resultFilename")
    assets = task.get("assets")

    public_task = without_internal_result_filename(task)
    public_assets = (
        [with_public_asset_url(asset) for asset in assets]
        if isinstance(assets, list)
        else []
    )

    if not isinstance(result_filename, str):
        return {**public_task, "resultUrl": None, "assets": public_assets}

    if is_public_url(result_filename):
        return {**public_task, "resultUrl": result_filename, "assets": public_assets}

    return {
        **public_task,
        "resultUrl": generated_image_public_path(result_filename),
        "assets": public_assets,
    }


def without_internal_result_filename(task: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in task.items()
        if key != "resultFilename"
    }


def with_public_asset_url(asset: dict[str, Any]) -> dict[str, Any]:
    filename = asset.get("filename")

    if not isinstance(filename, str):
        return {**asset, "url": None}

    if is_public_url(filename):
        return {**asset, "url": filename}

    return {**asset, "url": generated_image_public_path(filename)}


def is_public_url(value: str) -> bool:
    return value.startswith("/") or value.startswith(("http://", "https://"))
