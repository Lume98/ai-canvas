from typing import Any

from .paths import generated_image_public_path


def with_public_result_urls(task: dict[str, Any]) -> dict[str, Any]:
    result_filename = task.get("resultFilename")
    assets = task.get("assets")

    public_task = without_internal_result_filename(task)
    public_assets = (
        [with_public_asset_url(asset) for asset in assets]
        if isinstance(assets, list)
        else []
    )

    if not isinstance(result_filename, str):
        return {**public_task, "resultUrl": None, "assets": public_assets}

    if is_public_url(result_filename):
        return {**public_task, "resultUrl": result_filename, "assets": public_assets}

    return {
        **public_task,
        "resultUrl": generated_image_public_path(result_filename),
        "assets": public_assets,
    }


def with_public_message_assets(message: dict[str, Any]) -> dict[str, Any]:
    assets = message.get("assets")
    task = message.get("task")

    public_assets = (
        [with_public_asset_url(asset) for asset in assets]
        if isinstance(assets, list)
        else []
    )
    public_task = with_public_result_urls(task) if isinstance(task, dict) else task

    return {
        **message,
        "assets": public_assets,
        "task": public_task,
    }


def without_internal_result_filename(task: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in task.items()
        if key != "resultFilename"
    }


def with_public_asset_url(asset: dict[str, Any]) -> dict[str, Any]:
    filename = asset.get("filename")

    if not isinstance(filename, str):
        return {**asset, "url": None}

    if is_public_url(filename):
        return {**asset, "url": filename}

    return {**asset, "url": generated_image_public_path(filename)}


def is_public_url(value: str) -> bool:
    return value.startswith("/") or value.startswith(("http://", "https://"))
