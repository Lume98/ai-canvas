from fastapi import APIRouter
from fastapi.responses import JSONResponse, Response

from worker.api import error_response
from worker.services import DrawTaskService

from .public_urls import with_public_message_assets

CONVERSATION_NOT_FOUND_CODE = "CONVERSATION_NOT_FOUND"


def register_message_routes(
    router: APIRouter,
    draw_tasks: DrawTaskService,
) -> None:
    @router.get("/conversations/{conversation_id}/messages", tags=["Messages"])
    def list_conversation_messages(conversation_id: str) -> Response:
        conversation = draw_tasks.get_conversation(conversation_id)

        if not conversation:
            return error_response(
                "会话不存在。",
                404,
                CONVERSATION_NOT_FOUND_CODE,
            )

        messages = [
            with_public_message_assets(message)
            for message in draw_tasks.list_conversation_messages(conversation_id)
        ]
        return JSONResponse({"messages": messages})
