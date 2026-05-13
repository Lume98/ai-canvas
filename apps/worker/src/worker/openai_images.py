import base64
import binascii
from io import BytesIO

from openai import APIConnectionError, APIStatusError, APITimeoutError, OpenAI
from openai import OpenAIError as OpenAISDKError

from .validation import DEFAULT_OPENAI_BASE_URL, DrawTaskInput


class ImageGenerationError(Exception):
    def __init__(self, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.status_code = status_code


def generate_openai_image(
    task_input: DrawTaskInput,
    api_key: str,
    base_url: str | None,
    source_image_bytes: bytes | None = None,
) -> list[bytes]:
    if not api_key:
        raise ImageGenerationError("缺少 OpenAI API Key，请先在页面左侧配置。", 401)

    try:
        client = OpenAI(
            api_key=api_key,
            base_url=resolve_base_url(base_url),
            timeout=110,
        )
        if source_image_bytes is None:
            response = client.images.generate(
                model=task_input.model,
                prompt=task_input.prompt,
                n=task_input.output_count,
                size=task_input.size,
                quality=task_input.quality,
                output_format="png",
                response_format="b64_json",
            )
        else:
            response = client.images.edit(
                model=task_input.model,
                image=to_uploadable_image(source_image_bytes),
                prompt=task_input.prompt,
                n=task_input.output_count,
                size=task_input.size,
                quality=task_input.quality,
                output_format="png",
                response_format="b64_json",
            )
    except APIStatusError as error:
        raise ImageGenerationError(
            extract_openai_error_message(error),
            error.status_code,
        ) from error
    except APITimeoutError as error:
        raise ImageGenerationError("OpenAI 图像生成超时，请稍后重试。") from error
    except APIConnectionError as error:
        raise ImageGenerationError(f"调用 OpenAI 图像接口失败：{error}") from error
    except OpenAISDKError as error:
        raise ImageGenerationError(f"调用 OpenAI 图像接口失败：{error}") from error

    if not response.data:
        raise ImageGenerationError("OpenAI 响应中没有图像数据。")

    images: list[bytes] = []

    for item in response.data:
        image = item.b64_json

        if not image:
            raise ImageGenerationError("OpenAI 响应中没有图像数据。")

        try:
            image_bytes = base64.b64decode(image, validate=True)
        except binascii.Error as error:
            raise ImageGenerationError("OpenAI 响应中的图像数据不是有效 base64。") from error

        if not image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            raise ImageGenerationError("OpenAI 响应中的图像不是 PNG 格式。")

        images.append(image_bytes)

    return images


def to_uploadable_image(image_bytes: bytes) -> tuple[str, BytesIO, str]:
    if not image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ImageGenerationError("来源图片不是有效 PNG，暂不支持继续生成。", 400)

    return ("source.png", BytesIO(image_bytes), "image/png")


def resolve_base_url(base_url: str | None) -> str:
    normalized_base_url = (base_url or DEFAULT_OPENAI_BASE_URL).strip().rstrip("/")

    if not normalized_base_url.startswith(("http://", "https://")):
        raise ImageGenerationError("Base URL 无效，仅支持 http 或 https 地址。", 400)

    return normalized_base_url


def extract_openai_error_message(error: APIStatusError) -> str:
    try:
        response_payload = error.response.json()
    except ValueError:
        return f"OpenAI 接口返回 {error.status_code}。"

    if isinstance(response_payload, dict):
        error_payload = response_payload.get("error")

        if isinstance(error_payload, dict):
            message = error_payload.get("message")

            if isinstance(message, str) and message:
                return message

    return f"OpenAI 接口返回 {error.status_code}。"
