import threading
import time
import uuid
from typing import Any

import uvicorn
from fastapi import FastAPI, Request
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from .image_storage import (
    PNG_CONTENT_TYPE,
    GeneratedImageStore,
    ImageStorageError,
)
from .openai_images import ImageGenerationError, generate_openai_image
from .runner import DrawTaskRunner
from .store import SQLiteDrawTaskStore
from .task import DrawTask
from .validation import (
    ALLOWED_MODELS,
    ALLOWED_QUALITIES,
    ALLOWED_SIZES,
    DEFAULT_OPENAI_BASE_URL,
    DrawTaskInput,
    ProviderConfigInput,
    validate_draw_task_input,
    validate_provider_config_input,
)


API_PREFIX = "/v1"


class DrawTaskRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "prompt": "A quiet product photo",
                "model": "gpt-image-2",
                "size": "1024x1024",
                "quality": "auto",
            }
        }
    )

    prompt: str = Field(min_length=1, max_length=2400)
    model: str = Field(
        default="gpt-image-2",
        json_schema_extra={"enum": sorted(ALLOWED_MODELS)},
    )
    size: str = Field(
        default="1024x1024",
        json_schema_extra={"enum": sorted(ALLOWED_SIZES)},
    )
    quality: str = Field(
        default="auto",
        json_schema_extra={"enum": sorted(ALLOWED_QUALITIES)},
    )

    def to_domain_input(self) -> tuple[DrawTaskInput | None, str | None]:
        return validate_draw_task_input(self.model_dump())


class ProviderConfigRequest(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "apiKey": "sk-...",
                "baseUrl": DEFAULT_OPENAI_BASE_URL,
            }
        }
    )

    api_key: str = Field(min_length=1, alias="apiKey")
    base_url: str = Field(default=DEFAULT_OPENAI_BASE_URL, alias="baseUrl")

    def to_domain_input(self) -> tuple[ProviderConfigInput | None, str | None]:
        return validate_provider_config_input(self.model_dump(by_alias=True))


def error_response(message: str | None, status_code: int) -> JSONResponse:
    return JSONResponse({"error": message or "请求失败。"}, status_code=status_code)


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


class WorkerServer:
    def __init__(
        self,
        host: str,
        port: int,
        store: SQLiteDrawTaskStore,
        image_store: GeneratedImageStore,
        run_background_worker: bool = True,
    ) -> None:
        self._host = host
        self._port = port
        self._store = store
        self._image_store = image_store
        self._run_background_worker = run_background_worker

    def serve_forever(self) -> None:
        self._store.init_schema()
        self._image_store.init_storage()

        if self._run_background_worker:
            thread = threading.Thread(target=self._work_forever, daemon=True)
            thread.start()

        print(f"Worker listening on http://{self._host}:{self._port}")
        uvicorn.run(
            self.create_app(),
            host=self._host,
            port=self._port,
            log_level="info",
        )

    def create_app(self) -> FastAPI:
        store = self._store
        image_store = self._image_store

        app = FastAPI(
            title="AI Canvas Worker API",
            version="0.0.1",
            description="HTTP API for provider configuration, drawing tasks, synchronous image generation, and generated image files.",
        )

        @app.exception_handler(StarletteHTTPException)
        async def http_exception_handler(
            request: Request,
            error: StarletteHTTPException,
        ) -> JSONResponse:
            if error.status_code == 404:
                return error_response("接口不存在。", 404)

            return error_response(str(error.detail), error.status_code)

        @app.get("/swagger", include_in_schema=False)
        def swagger_docs() -> Any:
            return get_swagger_ui_html(
                openapi_url=app.openapi_url or "/openapi.json",
                title="AI Canvas Worker API Docs",
            )

        @app.get(f"{API_PREFIX}/health", tags=["System"])
        def get_health() -> dict[str, bool]:
            return {"ok": True}

        @app.get(f"{API_PREFIX}/provider-config", tags=["Provider Config"])
        def get_provider_config() -> dict[str, Any]:
            return {"config": store.get_provider_config()}

        @app.post(
            f"{API_PREFIX}/provider-config",
            tags=["Provider Config"],
            response_model=None,
            openapi_extra=request_body_schema(ProviderConfigRequest),
        )
        async def save_provider_config(request: Request) -> Response:
            payload = await self._parse_request_model(request, ProviderConfigRequest)

            if isinstance(payload, JSONResponse):
                return payload

            provider_config, error = payload.to_domain_input()

            if error or provider_config is None:
                return error_response(error, 400)

            return JSONResponse({"config": store.save_provider_config(provider_config)})

        @app.delete(f"{API_PREFIX}/provider-config", tags=["Provider Config"])
        def clear_provider_config() -> dict[str, Any]:
            return {"config": store.clear_provider_config()}

        @app.get(f"{API_PREFIX}/draw-tasks", tags=["Draw Tasks"])
        def list_draw_tasks() -> dict[str, Any]:
            return {"tasks": store.list_tasks()}

        @app.post(
            f"{API_PREFIX}/draw-tasks",
            tags=["Draw Tasks"],
            response_model=None,
            status_code=201,
            openapi_extra=request_body_schema(DrawTaskRequest),
        )
        async def create_draw_task(request: Request) -> Response:
            payload = await self._parse_request_model(request, DrawTaskRequest)

            if isinstance(payload, JSONResponse):
                return payload

            task_input, error = payload.to_domain_input()

            if error or task_input is None:
                return error_response(error, 400)

            task = DrawTask(
                id=str(uuid.uuid4()),
                prompt=task_input.prompt,
                model=task_input.model,
                size=task_input.size,
                quality=task_input.quality,
            )
            store.create_task(task)

            return JSONResponse({"task": store.get_task(task.id)}, status_code=201)

        @app.get(
            f"{API_PREFIX}/draw-tasks/{{task_id}}",
            tags=["Draw Tasks"],
            response_model=None,
        )
        def get_draw_task(task_id: str) -> Response:
            task = store.get_task(task_id)

            if not task:
                return error_response("任务不存在。", 404)

            return JSONResponse({"task": task})

        @app.post(
            f"{API_PREFIX}/images/generate",
            tags=["Images"],
            response_model=None,
            openapi_extra=request_body_schema(DrawTaskRequest),
        )
        async def generate_image(request: Request) -> Response:
            payload = await self._parse_request_model(request, DrawTaskRequest)

            if isinstance(payload, JSONResponse):
                return payload

            task_input, error = payload.to_domain_input()

            if error or task_input is None:
                return error_response(error, 400)

            try:
                provider_config = store.get_provider_config()
                image_bytes = generate_openai_image(
                    task_input,
                    provider_config["apiKey"],
                    provider_config["baseUrl"],
                )
                image = image_store.save_png(image_bytes)
            except (ImageGenerationError, ImageStorageError) as generation_error:
                return error_response(
                    str(generation_error),
                    generation_error.status_code,
                )

            return JSONResponse({"image": image.public_path})

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
            image_path = image_store.resolve_png(filename)

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

        return app

    async def _parse_request_model(
        self,
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
            return error_response(self._extract_request_error_message(request_model, payload), 400)

    def _extract_request_error_message(
        self,
        request_model: type[BaseModel],
        payload: dict[str, Any],
    ) -> str:
        if request_model is DrawTaskRequest:
            return validate_draw_task_input(payload)[1] or "绘图任务参数无效。"

        return validate_provider_config_input(payload)[1] or "Provider 配置无效。"

    def _work_forever(self) -> None:
        runner = DrawTaskRunner(executor=self._generate_task_image)

        while True:
            task = self._store.claim_next_task()

            if task is None:
                time.sleep(2)
                continue

            result = runner.run(task)

            if result.result_url:
                self._store.mark_succeeded(task.id, result.result_url)
            else:
                self._store.mark_failed(task.id, result.error_message or "Unknown worker error.")

    def _generate_task_image(self, task: DrawTask) -> str:
        provider_config = self._store.get_provider_config()

        image_bytes = generate_openai_image(
            DrawTaskInput(
                prompt=task.prompt,
                model=task.model,
                size=task.size,
                quality=task.quality,
            ),
            provider_config["apiKey"],
            provider_config["baseUrl"],
        )
        image = self._image_store.save_png(image_bytes)

        return image.public_path
