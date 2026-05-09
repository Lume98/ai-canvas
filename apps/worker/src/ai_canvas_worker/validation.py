from dataclasses import dataclass
from typing import Any


ALLOWED_MODELS = {"gpt-image-2", "gpt-image-1.5", "gpt-image-1"}
ALLOWED_SIZES = {"1024x1024", "1536x1024", "1024x1536", "auto"}
ALLOWED_QUALITIES = {"auto", "high", "medium", "low"}
DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1"


@dataclass(frozen=True)
class DrawTaskInput:
    prompt: str
    model: str
    size: str
    quality: str


@dataclass(frozen=True)
class ProviderConfigInput:
    api_key: str
    base_url: str


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
