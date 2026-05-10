import argparse
import time
from argparse import Namespace
from pathlib import Path

from .app_services import WorkerRuntime, create_worker_runtime
from .config import (
    resolve_database_path,
    resolve_generated_images_dir,
    resolve_worker_host,
    resolve_worker_port,
)
from .image_storage import GeneratedImageStore
from .runner import DrawTaskRunner
from .server import WorkerServer
from .store import SQLiteDrawTaskStore
from .validation import DrawTaskInput


def build_parser() -> argparse.ArgumentParser:
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

    return parser


def create_runtime() -> tuple[WorkerRuntime, Path]:
    database_path = resolve_database_path()
    image_store = GeneratedImageStore(resolve_generated_images_dir(database_path))
    store = SQLiteDrawTaskStore(database_path)
    runtime = create_worker_runtime(store, image_store)

    return runtime, database_path


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    runtime, database_path = create_runtime()
    runtime.initialize()

    if args.command == "init-db":
        handle_init_db(database_path)
        return

    if args.command == "enqueue":
        handle_enqueue(args, runtime)
        return

    if args.command == "serve":
        handle_serve(args, runtime)
        return

    handle_work(args, runtime)


def handle_init_db(database_path: Path) -> None:
    print(f"Initialized {database_path}")
    print(f"Generated images directory: {resolve_generated_images_dir(database_path)}")


def handle_enqueue(args: Namespace, runtime: WorkerRuntime) -> None:
    task = runtime.services.draw_tasks.create_task(
        DrawTaskInput(
            prompt=args.prompt,
            model=args.model,
            size=args.size,
            quality=args.quality,
        ),
        task_id=args.task_id,
    )
    print(task)


def handle_serve(args: Namespace, runtime: WorkerRuntime) -> None:
    WorkerServer.from_runtime(
        host=args.host,
        port=args.port,
        runtime=runtime,
        run_background_worker=not args.no_worker,
    ).serve_forever()


def handle_work(args: Namespace, runtime: WorkerRuntime) -> None:
    draw_tasks = runtime.services.draw_tasks
    runner = DrawTaskRunner(executor=draw_tasks.generate_task_image)

    while True:
        task = draw_tasks.claim_next_task()

        if task is None:
            if args.once:
                print("No queued task.")
                return

            time.sleep(args.idle_seconds)
            continue

        result = runner.run(task)

        if result.result_url:
            draw_tasks.mark_succeeded(task.id, result.result_url)
        else:
            draw_tasks.mark_failed(task.id, result.error_message or "Unknown worker error.")

        print(result)

        if args.once:
            return
