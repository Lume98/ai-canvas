from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response

from worker.api import error_response, parse_request_model, request_body_schema
from worker.api.schemas import ProviderConfigRequest
from worker.services import ProviderConfigService


def register_provider_config_routes(
    router: APIRouter,
    provider_config_service: ProviderConfigService,
) -> None:
    @router.get("/provider-config", tags=["Provider Config"])
    def get_provider_config() -> dict[str, Any]:
        return {"config": provider_config_service.get_config()}

    @router.post(
        "/provider-config",
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

    @router.delete("/provider-config", tags=["Provider Config"])
    def clear_provider_config() -> dict[str, Any]:
        return {"config": provider_config_service.clear_config()}
