from typing import Any

from ..store import SQLiteDrawTaskStore
from ..validation import ProviderConfigInput


class ProviderConfigService:
    def __init__(self, store: SQLiteDrawTaskStore) -> None:
        self._store = store

    def get_config(self) -> dict[str, Any]:
        return self._store.get_provider_config()

    def save_config(self, config: ProviderConfigInput) -> dict[str, Any]:
        return self._store.save_provider_config(config)

    def clear_config(self) -> dict[str, Any]:
        return self._store.clear_provider_config()
