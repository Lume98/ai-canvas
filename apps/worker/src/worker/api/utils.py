from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError

from worker.validation import (
    validate_conversation_draw_task_input,
    validate_draw_task_input,
    validate_provider_config_input,
)
from .schemas import DrawTaskRequest, ImageGenerationRequest


async def parse_request_model(
    request: Request,
    request_model: type[BaseModel],
) -> BaseModel | JSONResponse:
    try:
        payload = await request.json()
    except ValueError:
        return error_response("请求体不是有效 JSON。", 400)

    if not isinstance(payload, dict):
        return error_response("请求体不是有效对象。", 400)

    try:
        return request_model.model_validate(payload)
    except ValidationError:
        return error_response(extract_request_error_message(request_model, payload), 400)


def extract_request_error_message(
    request_model: type[BaseModel],
    payload: dict[str, Any],
) -> str:
    if request_model is DrawTaskRequest:
        return validate_conversation_draw_task_input(payload)[1] or "绘图任务参数无效。"

    if request_model is ImageGenerationRequest:
        return validate_draw_task_input(payload)[1] or "绘图任务参数无效。"

    return validate_provider_config_input(payload)[1] or "Provider 配置无效。"


def error_response(
    message: str | None,
    status_code: int,
    code: str | None = None,
) -> JSONResponse:
    payload = {"error": message or "请求失败。"}

    if code:
        payload["code"] = code

    return JSONResponse(payload, status_code=status_code)


def request_body_schema(request_model: type[BaseModel]) -> dict[str, Any]:
    return {
        "requestBody": {
            "required": True,
            "content": {
                "application/json": {
                    "schema": request_model.model_json_schema(by_alias=True)
                }
            },
        }
    }
