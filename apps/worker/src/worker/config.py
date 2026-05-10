import os
from pathlib import Path


DEFAULT_WORKER_HOST = "127.0.0.1"
DEFAULT_WORKER_PORT = 8766


def resolve_database_path() -> Path:
    configured_path = os.environ.get("AI_CANVAS_DATABASE_PATH")

    if configured_path:
        return Path(configured_path).expanduser().resolve()

    return (Path.cwd() / ".data" / "ai-canvas.sqlite").resolve()


def resolve_generated_images_dir(database_path: Path | None = None) -> Path:
    configured_path = os.environ.get("AI_CANVAS_GENERATED_IMAGES_DIR")

    if configured_path:
        return Path(configured_path).expanduser().resolve()

    if database_path:
        return (database_path.parent / "generated-images").resolve()

    return (Path.cwd() / ".data" / "generated-images").resolve()


def resolve_worker_host() -> str:
    return os.environ.get("AI_CANVAS_WORKER_HOST", DEFAULT_WORKER_HOST)


def resolve_worker_port() -> int:
    configured_port = os.environ.get("AI_CANVAS_WORKER_PORT")

    if not configured_port:
        return DEFAULT_WORKER_PORT

    return int(configured_port)
