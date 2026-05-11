from pathlib import Path

from ..image_storage import GeneratedImageStore
from ..openai_images import generate_openai_image
from ..task import GeneratedImage
from ..validation import DrawTaskInput
from .provider_config import ProviderConfigService


class ImageGenerationService:
    def __init__(
        self,
        provider_config: ProviderConfigService,
        image_store: GeneratedImageStore,
    ) -> None:
        self._provider_config = provider_config
        self._image_store = image_store

    def generate_images(self, task_input: DrawTaskInput) -> tuple[GeneratedImage, ...]:
        provider_config = self._provider_config.get_config()
        image_bytes_list = generate_openai_image(
            task_input,
            provider_config["apiKey"],
            provider_config["baseUrl"],
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
