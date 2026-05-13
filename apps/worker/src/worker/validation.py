from dataclasses import dataclass
from typing import Any

from .task import BranchMode


ALLOWED_MODELS = {"gpt-image-2", "gpt-image-1.5", "gpt-image-1"}
ALLOWED_SIZES = {"1024x1024", "1536x1024", "1024x1536", "auto"}
ALLOWED_QUALITIES = {"auto", "high", "medium", "low"}
ALLOWED_BRANCH_MODES = {mode.value for mode in BranchMode}
BRANCH_SOURCE_COMPATIBLE_MODELS = {"gpt-image-1.5", "gpt-image-1"}
DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1"


@dataclass(frozen=True)
class DrawTaskInput:
    prompt: str
    model: str
    size: str
    quality: str
    output_count: int = 1
    conversation_id: str | None = None
    branch_mode: BranchMode | None = None
    parent_asset_id: str | None = None


@dataclass(frozen=True)
class ProviderConfigInput:
    api_key: str
    base_url: str


def validate_conversation_id(value: Any) -> str | None:
    if not isinstance(value, str):
        return None

    conversation_id = value.strip()

    return conversation_id or None


def validate_output_count(value: Any) -> tuple[int | None, str | None]:
    if value is None:
        return 1, None

    if isinstance(value, bool) or not isinstance(value, int):
        return None, "输出图片数量无效。"

    if value < 1 or value > 4:
        return None, "输出图片数量仅支持 1 到 4。"

    return value, None


def validate_draw_task_input(payload: Any) -> tuple[DrawTaskInput | None, str | None]:
    if not isinstance(payload, dict):
        return None, "请求体不是有效对象。"

    prompt = payload.get("prompt")
    model = payload.get("model", "gpt-image-2")
    size = payload.get("size", "1024x1024")
    quality = payload.get("quality", "auto")

    prompt = prompt.strip() if isinstance(prompt, str) else ""

    if not prompt:
        return None, "提示词不能为空。"

    if len(prompt) > 2400:
        return None, "提示词过长，请控制在 2400 个字符以内。"

    if not isinstance(model, str) or model not in ALLOWED_MODELS:
        return None, "不支持的图像模型。"

    if not isinstance(size, str) or size not in ALLOWED_SIZES:
        return None, "不支持的图像尺寸。"

    if not isinstance(quality, str) or quality not in ALLOWED_QUALITIES:
        return None, "不支持的图像质量。"

    return DrawTaskInput(prompt=prompt, model=model, size=size, quality=quality), None


def validate_branch_mode(value: Any) -> tuple[BranchMode | None, str | None]:
    if value is None:
        return None, None

    if not isinstance(value, str) or value not in ALLOWED_BRANCH_MODES:
        return None, "不支持的分支模式。"

    return BranchMode(value), None


def validate_conversation_draw_task_input(
    payload: Any,
) -> tuple[DrawTaskInput | None, str | None]:
    task_input, error = validate_draw_task_input(payload)

    if error or task_input is None:
        return None, error

    conversation_id = validate_conversation_id(payload.get("conversationId"))

    if not conversation_id:
        return None, "conversationId 不能为空。"

    output_count, output_count_error = validate_output_count(payload.get("outputCount"))

    if output_count_error or output_count is None:
        return None, output_count_error

    branch_mode, branch_mode_error = validate_branch_mode(payload.get("branchMode"))

    if branch_mode_error:
        return None, branch_mode_error

    parent_asset_id = payload.get("parentAssetId")
    normalized_parent_asset_id = (
        parent_asset_id.strip()
        if isinstance(parent_asset_id, str) and parent_asset_id.strip()
        else None
    )

    if normalized_parent_asset_id is None:
        branch_mode = None
    elif task_input.model not in BRANCH_SOURCE_COMPATIBLE_MODELS:
        return None, "当前模型不支持基于来源图继续生成，请切换到 GPT Image 1.5 或 GPT Image 1。"

    return (
        DrawTaskInput(
            prompt=task_input.prompt,
            model=task_input.model,
            size=task_input.size,
            quality=task_input.quality,
            output_count=output_count,
            conversation_id=conversation_id,
            branch_mode=branch_mode,
            parent_asset_id=normalized_parent_asset_id,
        ),
        None,
    )


def validate_provider_config_input(
    payload: Any,
) -> tuple[ProviderConfigInput | None, str | None]:
    if not isinstance(payload, dict):
        return None, "请求体不是有效对象。"

    api_key = payload.get("apiKey")
    base_url = payload.get("baseUrl", DEFAULT_OPENAI_BASE_URL)

    api_key = api_key.strip() if isinstance(api_key, str) else ""
    base_url = base_url.strip().rstrip("/") if isinstance(base_url, str) else ""

    if not api_key:
        return None, "API Key 不能为空。"

    if not base_url:
        base_url = DEFAULT_OPENAI_BASE_URL

    if not base_url.startswith(("http://", "https://")):
        return None, "Base URL 无效，仅支持 http 或 https 地址。"

    return ProviderConfigInput(api_key=api_key, base_url=base_url), None
