import json
import threading
import time
import uuid
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

from ai_canvas_worker.image_storage import (
    PNG_CONTENT_TYPE,
    GeneratedImageStore,
    ImageStorageError,
)
from ai_canvas_worker.openai_images import ImageGenerationError, generate_openai_image
from ai_canvas_worker.runner import DrawTaskRunner
from ai_canvas_worker.store import SQLiteDrawTaskStore
from ai_canvas_worker.task import DrawTask
from ai_canvas_worker.validation import (
    DrawTaskInput,
    validate_draw_task_input,
    validate_provider_config_input,
)


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

        server = ThreadingHTTPServer(
            (self._host, self._port),
            self._build_handler(),
        )
        print(f"Worker listening on http://{self._host}:{self._port}")
        server.serve_forever()

    def _build_handler(self) -> type[BaseHTTPRequestHandler]:
        store = self._store
        image_store = self._image_store

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self) -> None:
                parsed_url = urlparse(self.path)

                if parsed_url.path == "/health":
                    self._send_json({"ok": True})
                    return

                if parsed_url.path == "/provider-config":
                    self._send_json({"config": store.get_provider_config()})
                    return

                if parsed_url.path == "/draw-tasks":
                    self._send_json({"tasks": store.list_tasks()})
                    return

                task_id = self._match_draw_task_id(parsed_url.path)

                if task_id:
                    task = store.get_task(task_id)

                    if not task:
                        self._send_json({"error": "任务不存在。"}, HTTPStatus.NOT_FOUND)
                        return

                    self._send_json({"task": task})
                    return

                image_filename = self._match_generated_image_filename(parsed_url.path)

                if image_filename:
                    self._send_generated_image(image_filename)
                    return

                self._send_json({"error": "接口不存在。"}, HTTPStatus.NOT_FOUND)

            def do_POST(self) -> None:
                parsed_url = urlparse(self.path)

                if parsed_url.path == "/draw-tasks":
                    payload = self._read_json()

                    if payload is None:
                        return

                    task_input, error = validate_draw_task_input(payload)

                    if error or task_input is None:
                        self._send_json({"error": error}, HTTPStatus.BAD_REQUEST)
                        return

                    task = DrawTask(
                        id=str(uuid.uuid4()),
                        prompt=task_input.prompt,
                        model=task_input.model,
                        size=task_input.size,
                        quality=task_input.quality,
                    )
                    store.create_task(task)
                    self._send_json({"task": store.get_task(task.id)}, HTTPStatus.CREATED)
                    return

                if parsed_url.path == "/images/generate":
                    payload = self._read_json()

                    if payload is None:
                        return

                    task_input, error = validate_draw_task_input(payload)

                    if error or task_input is None:
                        self._send_json({"error": error}, HTTPStatus.BAD_REQUEST)
                        return

                    try:
                        provider_config = store.get_provider_config()
                        image_bytes = generate_openai_image(
                            task_input,
                            provider_config["apiKey"],
                            provider_config["baseUrl"],
                        )
                        image = image_store.save_png(image_bytes)
                    except (ImageGenerationError, ImageStorageError) as generation_error:
                        self._send_json(
                            {"error": str(generation_error)},
                            generation_error.status_code,
                        )
                        return

                    self._send_json({"image": image.public_path})
                    return

                if parsed_url.path == "/provider-config":
                    payload = self._read_json()

                    if payload is None:
                        return

                    provider_config, error = validate_provider_config_input(payload)

                    if error or provider_config is None:
                        self._send_json({"error": error}, HTTPStatus.BAD_REQUEST)
                        return

                    self._send_json(
                        {"config": store.save_provider_config(provider_config)},
                        HTTPStatus.OK,
                    )
                    return

                self._send_json({"error": "接口不存在。"}, HTTPStatus.NOT_FOUND)

            def do_DELETE(self) -> None:
                parsed_url = urlparse(self.path)

                if parsed_url.path == "/provider-config":
                    self._send_json({"config": store.clear_provider_config()})
                    return

                self._send_json({"error": "接口不存在。"}, HTTPStatus.NOT_FOUND)

            def log_message(self, format: str, *args: object) -> None:
                print(f"{self.address_string()} - {format % args}")

            def _read_json(self) -> object | None:
                content_length = int(self.headers.get("content-length", "0"))
                raw_body = self.rfile.read(content_length)

                try:
                    return json.loads(raw_body.decode("utf-8"))
                except (json.JSONDecodeError, UnicodeDecodeError):
                    self._send_json({"error": "请求体不是有效 JSON。"}, HTTPStatus.BAD_REQUEST)
                    return None

            def _send_json(
                self,
                payload: object,
                status: int | HTTPStatus = HTTPStatus.OK,
            ) -> None:
                body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
                self.send_response(int(status))
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def _send_generated_image(self, filename: str) -> None:
                image_path = image_store.resolve_png(filename)

                if image_path is None:
                    self._send_json({"error": "图片不存在。"}, HTTPStatus.NOT_FOUND)
                    return

                try:
                    body = image_path.read_bytes()
                except OSError:
                    self._send_json({"error": "图片读取失败。"}, HTTPStatus.NOT_FOUND)
                    return

                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", PNG_CONTENT_TYPE)
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "public, max-age=31536000, immutable")
                self.send_header("X-Content-Type-Options", "nosniff")
                self.end_headers()
                self.wfile.write(body)

            def _match_draw_task_id(self, path: str) -> str | None:
                prefix = "/draw-tasks/"

                if not path.startswith(prefix):
                    return None

                task_id = path[len(prefix) :].strip("/")
                return task_id or None

            def _match_generated_image_filename(self, path: str) -> str | None:
                prefix = "/generated-images/"

                if not path.startswith(prefix):
                    return None

                filename = unquote(path[len(prefix) :]).strip("/")
                return filename or None

        return Handler

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
