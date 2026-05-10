from fastapi import FastAPI

from ..services import DrawTaskService, ImageGenerationService, ProviderConfigService
from .draw_tasks import register_draw_task_routes
from .images import register_image_routes
from .provider_config import register_provider_config_routes
from .system import register_system_routes
from .utils import error_response


def register_routes(
    app: FastAPI,
    provider_config: ProviderConfigService,
    draw_tasks: DrawTaskService,
    image_generation: ImageGenerationService,
) -> None:
    register_system_routes(app)
    register_provider_config_routes(app, provider_config)
    register_draw_task_routes(app, draw_tasks)
    register_image_routes(app, image_generation)

__all__ = ["error_response", "register_routes"]
