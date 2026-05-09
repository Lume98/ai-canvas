import argparse
import time
import uuid

from ai_canvas_worker.config import (
    resolve_database_path,
    resolve_generated_images_dir,
    resolve_worker_host,
    resolve_worker_port,
)
from ai_canvas_worker.image_storage import GeneratedImageStore
from ai_canvas_worker.openai_images import generate_openai_image
from ai_canvas_worker.runner import DrawTaskRunner
from ai_canvas_worker.server import WorkerServer
from ai_canvas_worker.store import SQLiteDrawTaskStore
from ai_canvas_worker.task import DrawTask
from ai_canvas_worker.validation import DrawTaskInput


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the AI Canvas worker.")
    subcommands = parser.add_subparsers(dest="command", required=True)

    subcommands.add_parser("init-db")

    enqueue_parser = subcommands.add_parser("enqueue")
    enqueue_parser.add_argument("--task-id", default=None)
    enqueue_parser.add_argument("--prompt", required=True)
    enqueue_parser.add_argument("--model", default="gpt-image-2")
    enqueue_parser.add_argument("--size", default="1024x1024")
    enqueue_parser.add_argument("--quality", default="auto")

    work_parser = subcommands.add_parser("work")
    work_parser.add_argument("--once", action="store_true")
    work_parser.add_argument("--idle-seconds", type=float, default=2.0)

    serve_parser = subcommands.add_parser("serve")
    serve_parser.add_argument("--host", default=resolve_worker_host())
    serve_parser.add_argument("--port", type=int, default=resolve_worker_port())
    serve_parser.add_argument("--no-worker", action="store_true")

    args = parser.parse_args()

    database_path = resolve_database_path()
    image_store = GeneratedImageStore(resolve_generated_images_dir(database_path))
    store = SQLiteDrawTaskStore(database_path)
    store.init_schema()
    image_store.init_storage()

    if args.command == "init-db":
        print(f"Initialized {database_path}")
        print(f"Generated images directory: {resolve_generated_images_dir(database_path)}")
        return

    if args.command == "enqueue":
        task = DrawTask(
            id=args.task_id or str(uuid.uuid4()),
            prompt=args.prompt,
            model=args.model,
            size=args.size,
            quality=args.quality,
        )
        store.create_task(task)
        print(task)
        return

    if args.command == "serve":
        WorkerServer(
            host=args.host,
            port=args.port,
            store=store,
            image_store=image_store,
            run_background_worker=not args.no_worker,
        ).serve_forever()
        return

    def generate_task_image(task: DrawTask) -> str:
        provider_config = store.get_provider_config()

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
        image = image_store.save_png(image_bytes)

        return image.public_path

    runner = DrawTaskRunner(executor=generate_task_image)

    while True:
        task = store.claim_next_task()

        if task is None:
            if args.once:
                print("No queued task.")
                return

            time.sleep(args.idle_seconds)
            continue

        result = runner.run(task)

        if result.result_url:
            store.mark_succeeded(task.id, result.result_url)
        else:
            store.mark_failed(task.id, result.error_message or "Unknown worker error.")

        print(result)

        if args.once:
            return
