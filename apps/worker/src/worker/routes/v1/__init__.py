from fastapi import APIRouter, FastAPI

from worker.services import DrawTaskService, ImageGenerationService, ProviderConfigService

from .draw_tasks import register_draw_task_routes
from .images import register_image_routes
from .paths import V1_PREFIX
from .provider_config import register_provider_config_routes
from .system import register_system_routes, register_swagger_route


def register_v1_routes(
    app: FastAPI,
    provider_config: ProviderConfigService,
    draw_tasks: DrawTaskService,
    image_generation: ImageGenerationService,
) -> None:
    router = APIRouter(prefix=V1_PREFIX)

    register_system_routes(router)
    register_provider_config_routes(router, provider_config)
    register_draw_task_routes(router, draw_tasks)
    register_image_routes(router, image_generation)

    register_swagger_route(app)
    app.include_router(router)


__all__ = ["register_v1_routes"]
