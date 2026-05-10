from typing import Any

from fastapi import FastAPI
from fastapi.openapi.docs import get_swagger_ui_html

from .constants import API_PREFIX


def register_system_routes(app: FastAPI) -> None:
    @app.get("/swagger", include_in_schema=False)
    def swagger_docs() -> Any:
        return get_swagger_ui_html(
            openapi_url=app.openapi_url or "/openapi.json",
            title="AI Canvas Worker API Docs",
        )

    @app.get(f"{API_PREFIX}/health", tags=["System"])
    def get_health() -> dict[str, bool]:
        return {"ok": True}
