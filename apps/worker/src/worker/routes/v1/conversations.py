from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response

from worker.api import error_response
from worker.services import DrawTaskService, DrawTaskServiceError


def register_conversation_routes(
    router: APIRouter,
    draw_tasks: DrawTaskService,
) -> None:
    @router.post("/conversations", tags=["Conversations"])
    async def create_conversation(request: Request) -> Response:
        title = await read_optional_title(request)

        try:
            conversation = draw_tasks.create_conversation(title)
        except DrawTaskServiceError as error:
            return error_response(str(error), 500)

        return JSONResponse({"conversation": conversation}, status_code=201)

    @router.get("/conversations/{conversation_id}", tags=["Conversations"])
    def get_conversation(conversation_id: str) -> Response:
        conversation = draw_tasks.get_conversation(conversation_id)

        if not conversation:
            return error_response("会话不存在。", 404)

        return JSONResponse({"conversation": conversation})


async def read_optional_title(request: Request) -> str | None:
    if request.headers.get("content-type") != "application/json":
        return None

    try:
        payload = await request.json()
    except ValueError:
        return None

    if not isinstance(payload, dict):
        return None

    title = payload.get("title")

    return title.strip() if isinstance(title, str) and title.strip() else None
