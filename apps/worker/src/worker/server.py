import threading
import time

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .app_services import WorkerRuntime, create_worker_runtime
from .api import error_response
from .image_storage import GeneratedImageStore
from .runner import DrawTaskRunner
from .routes import register_routes
from .store import SQLiteDrawTaskStore


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
        self._run_background_worker = run_background_worker
        self._runtime = create_worker_runtime(store, image_store)

    @classmethod
    def from_runtime(
        cls,
        host: str,
        port: int,
        runtime: WorkerRuntime,
        run_background_worker: bool = True,
    ) -> "WorkerServer":
        server = cls.__new__(cls)
        server._host = host
        server._port = port
        server._run_background_worker = run_background_worker
        server._runtime = runtime
        return server

    def serve_forever(self) -> None:
        self._runtime.initialize()

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

        services = self._runtime.services
        register_routes(
            app,
            services.provider_config,
            services.draw_tasks,
            services.image_generation,
        )
        return app

    def _work_forever(self) -> None:
        draw_tasks = self._runtime.services.draw_tasks
        runner = DrawTaskRunner(executor=draw_tasks.generate_task_image)

        while True:
            task = draw_tasks.claim_next_task()

            if task is None:
                time.sleep(2)
                continue

            result = runner.run(task)

            if result.result_filename:
                draw_tasks.mark_succeeded(task.id, result.result_filename)
            else:
                draw_tasks.mark_failed(
                    task.id,
                    result.error_message or "Unknown worker error.",
                )
