from fastapi import FastAPI

from ..services import DrawTaskService, ImageGenerationService, ProviderConfigService
from .v1 import register_v1_routes


def register_routes(
    app: FastAPI,
    provider_config: ProviderConfigService,
    draw_tasks: DrawTaskService,
    image_generation: ImageGenerationService,
) -> None:
    register_v1_routes(app, provider_config, draw_tasks, image_generation)

__all__ = ["register_routes"]
