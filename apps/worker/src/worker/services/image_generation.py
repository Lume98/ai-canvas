from pathlib import Path

from ..image_storage import GeneratedImageStore
from ..openai_images import generate_openai_image
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

    def generate_image(self, task_input: DrawTaskInput) -> str:
        provider_config = self._provider_config.get_config()
        image_bytes = generate_openai_image(
            task_input,
            provider_config["apiKey"],
            provider_config["baseUrl"],
        )
        image = self._image_store.save_png(image_bytes)

        return image.filename

    def resolve_generated_image(self, filename: str) -> Path | None:
        return self._image_store.resolve_png(filename)
