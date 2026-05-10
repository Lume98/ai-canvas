from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, Response

from ..image_storage import PNG_CONTENT_TYPE
from ..services import ImageGenerationError, ImageGenerationService, ImageStorageError
from .constants import API_PREFIX
from .schemas import DrawTaskRequest
from .utils import error_response, parse_request_model, request_body_schema


def register_image_routes(
    app: FastAPI,
    image_generation: ImageGenerationService,
) -> None:
    @app.post(
        f"{API_PREFIX}/images/generate",
        tags=["Images"],
        response_model=None,
        openapi_extra=request_body_schema(DrawTaskRequest),
    )
    async def generate_image(request: Request) -> Response:
        payload = await parse_request_model(request, DrawTaskRequest)

        if isinstance(payload, JSONResponse):
            return payload

        task_input, error = payload.to_domain_input()

        if error or task_input is None:
            return error_response(error, 400)

        try:
            image_url = image_generation.generate_image(task_input)
        except (ImageGenerationError, ImageStorageError) as generation_error:
            return error_response(
                str(generation_error),
                generation_error.status_code,
            )

        return JSONResponse({"image": image_url})

    @app.get(
        f"{API_PREFIX}/generated-images/{{filename}}",
        tags=["Images"],
        response_model=None,
        response_class=FileResponse,
        responses={
            200: {
                "description": "PNG image file.",
                "content": {
                    PNG_CONTENT_TYPE: {
                        "schema": {
                            "type": "string",
                            "format": "binary",
                        }
                    }
                },
            },
            404: {"description": "Image not found."},
        },
    )
    def get_generated_image(filename: str) -> Response:
        image_path = image_generation.resolve_generated_image(filename)

        if image_path is None:
            return error_response("图片不存在。", 404)

        return FileResponse(
            image_path,
            media_type=PNG_CONTENT_TYPE,
            headers={
                "Cache-Control": "public, max-age=31536000, immutable",
                "X-Content-Type-Options": "nosniff",
            },
        )
