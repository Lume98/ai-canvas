from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response

from ..services import ProviderConfigService
from .constants import API_PREFIX
from .schemas import ProviderConfigRequest
from .utils import error_response, parse_request_model, request_body_schema


def register_provider_config_routes(
    app: FastAPI,
    provider_config_service: ProviderConfigService,
) -> None:
    @app.get(f"{API_PREFIX}/provider-config", tags=["Provider Config"])
    def get_provider_config() -> dict[str, Any]:
        return {"config": provider_config_service.get_config()}

    @app.post(
        f"{API_PREFIX}/provider-config",
        tags=["Provider Config"],
        response_model=None,
        openapi_extra=request_body_schema(ProviderConfigRequest),
    )
    async def save_provider_config(request: Request) -> Response:
        payload = await parse_request_model(request, ProviderConfigRequest)

        if isinstance(payload, JSONResponse):
            return payload

        config_input, error = payload.to_domain_input()

        if error or config_input is None:
            return error_response(error, 400)

        return JSONResponse({"config": provider_config_service.save_config(config_input)})

    @app.delete(f"{API_PREFIX}/provider-config", tags=["Provider Config"])
    def clear_provider_config() -> dict[str, Any]:
        return {"config": provider_config_service.clear_config()}
