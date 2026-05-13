from pathlib import Path

from ..branching import compile_branch_prompt
from ..image_storage import GeneratedImageStore
from ..openai_images import ImageGenerationError, generate_openai_image
from ..task import GeneratedImage
from ..validation import DrawTaskInput
from .provider_config import ProviderConfigService
from ..store import SQLiteDrawTaskStore


class ImageGenerationService:
    def __init__(
        self,
        provider_config: ProviderConfigService,
        image_store: GeneratedImageStore,
        task_store: SQLiteDrawTaskStore,
    ) -> None:
        self._provider_config = provider_config
        self._image_store = image_store
        self._task_store = task_store

    def generate_images(self, task_input: DrawTaskInput) -> tuple[GeneratedImage, ...]:
        provider_config = self._provider_config.get_config()
        source_image_bytes = self._read_source_image_bytes(task_input.parent_asset_id)
        execution_prompt = compile_branch_prompt(task_input.prompt, task_input.branch_mode)
        image_bytes_list = generate_openai_image(
            DrawTaskInput(
                prompt=execution_prompt,
                model=task_input.model,
                size=task_input.size,
                quality=task_input.quality,
                output_count=task_input.output_count,
                conversation_id=task_input.conversation_id,
                branch_mode=task_input.branch_mode,
                parent_asset_id=task_input.parent_asset_id,
            ),
            provider_config["apiKey"],
            provider_config["baseUrl"],
            source_image_bytes=source_image_bytes,
        )
        images = tuple(
            GeneratedImage(
                filename=stored_image.filename,
                width=stored_image.width,
                height=stored_image.height,
            )
            for stored_image in (
                self._image_store.save_png(image_bytes)
                for image_bytes in image_bytes_list
            )
        )

        return images

    def generate_image(self, task_input: DrawTaskInput) -> str:
        images = self.generate_images(task_input)

        if not images:
            raise RuntimeError("未生成任何图片。")

        return images[0].filename

    def resolve_generated_image(self, filename: str) -> Path | None:
        return self._image_store.resolve_png(filename)

    def _read_source_image_bytes(self, parent_asset_id: str | None) -> bytes | None:
        if not parent_asset_id:
            return None

        asset = self._task_store.get_asset(parent_asset_id)

        if asset is None:
            raise ImageGenerationError("来源图片不存在，无法继续生成。", 404)

        filename = asset.get("filename")

        if not isinstance(filename, str) or not filename:
            raise ImageGenerationError("来源图片缺少文件名，无法继续生成。", 500)

        source_path = self._image_store.resolve_png(filename)

        if source_path is None:
            raise ImageGenerationError("来源图片文件不存在，无法继续生成。", 404)

        try:
            return source_path.read_bytes()
        except OSError as error:
            raise ImageGenerationError("来源图片读取失败，无法继续生成。", 500) from error
