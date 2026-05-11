from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, JSONResponse, Response

from worker.api import error_response, parse_request_model, request_body_schema
from worker.api.schemas import ImageGenerationRequest
from worker.image_storage import PNG_CONTENT_TYPE
from worker.services import ImageGenerationError, ImageGenerationService, ImageStorageError

from .paths import GENERATED_IMAGES_PATH, generated_image_public_path


def register_image_routes(
    router: APIRouter,
    image_generation: ImageGenerationService,
) -> None:
    @router.post(
        "/images/generate",
        tags=["Images"],
        response_model=None,
        openapi_extra=request_body_schema(ImageGenerationRequest),
    )
    async def generate_image(request: Request) -> Response:
        payload = await parse_request_model(request, ImageGenerationRequest)

        if isinstance(payload, JSONResponse):
            return payload

        task_input, error = payload.to_domain_input()

        if error or task_input is None:
            return error_response(error, 400)

        try:
            image_filename = image_generation.generate_image(task_input)
        except (ImageGenerationError, ImageStorageError) as generation_error:
            return error_response(
                str(generation_error),
                generation_error.status_code,
            )

        return JSONResponse({"image": generated_image_public_path(image_filename)})

    @router.get(
        f"{GENERATED_IMAGES_PATH}/{{filename}}",
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
