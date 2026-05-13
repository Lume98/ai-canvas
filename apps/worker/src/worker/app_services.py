from dataclasses import dataclass, field

from .image_storage import GeneratedImageStore
from .services import DrawTaskService, ImageGenerationService, ProviderConfigService
from .store import SQLiteDrawTaskStore


@dataclass(frozen=True)
class WorkerServices:
    provider_config: ProviderConfigService
    image_generation: ImageGenerationService
    draw_tasks: DrawTaskService


@dataclass
class WorkerRuntime:
    store: SQLiteDrawTaskStore
    image_store: GeneratedImageStore
    services: WorkerServices
    _initialized: bool = field(default=False, init=False, repr=False)

    def initialize(self) -> None:
        if self._initialized:
            return

        self.store.init_schema()
        self.image_store.init_storage()
        self._initialized = True


def create_worker_runtime(
    store: SQLiteDrawTaskStore,
    image_store: GeneratedImageStore,
) -> WorkerRuntime:
    return WorkerRuntime(
        store=store,
        image_store=image_store,
        services=create_worker_services(store, image_store),
    )


def create_worker_services(
    store: SQLiteDrawTaskStore,
    image_store: GeneratedImageStore,
) -> WorkerServices:
    provider_config = ProviderConfigService(store)
    image_generation = ImageGenerationService(provider_config, image_store, store)
    draw_tasks = DrawTaskService(store, image_generation)

    return WorkerServices(
        provider_config=provider_config,
        image_generation=image_generation,
        draw_tasks=draw_tasks,
    )
