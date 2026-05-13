from pydantic import BaseModel, ConfigDict, Field

from worker.validation import (
    ALLOWED_MODELS,
    ALLOWED_QUALITIES,
    ALLOWED_SIZES,
    DEFAULT_OPENAI_BASE_URL,
    DrawTaskInput,
    ProviderConfigInput,
    validate_conversation_draw_task_input,
    validate_draw_task_input,
    validate_provider_config_input,
)


class ImageGenerationRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "prompt": "A quiet product photo",
                "model": "gpt-image-2",
                "size": "1024x1024",
                "quality": "auto",
            }
        }
    )

    prompt: str = Field(min_length=1, max_length=2400)
    model: str = Field(
        default="gpt-image-2",
        json_schema_extra={"enum": sorted(ALLOWED_MODELS)},
    )
    size: str = Field(
        default="1024x1024",
        json_schema_extra={"enum": sorted(ALLOWED_SIZES)},
    )
    quality: str = Field(
        default="auto",
        json_schema_extra={"enum": sorted(ALLOWED_QUALITIES)},
    )

    def to_domain_input(self) -> tuple[DrawTaskInput | None, str | None]:
        return validate_draw_task_input(self.model_dump())


class DrawTaskRequest(ImageGenerationRequest):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "conversationId": "conversation_123",
                "prompt": "A quiet product photo",
                "model": "gpt-image-2",
                "size": "1024x1024",
                "quality": "auto",
                "outputCount": 1,
            }
        }
    )

    conversation_id: str = Field(min_length=1, alias="conversationId")
    output_count: int = Field(default=1, alias="outputCount")
    branch_mode: str | None = Field(default=None, alias="branchMode")
    parent_asset_id: str | None = Field(default=None, alias="parentAssetId")

    def to_domain_input(self) -> tuple[DrawTaskInput | None, str | None]:
        return validate_conversation_draw_task_input(self.model_dump(by_alias=True))


class ProviderConfigRequest(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "apiKey": "sk-...",
                "baseUrl": DEFAULT_OPENAI_BASE_URL,
            }
        },
    )

    api_key: str = Field(min_length=1, alias="apiKey")
    base_url: str = Field(default=DEFAULT_OPENAI_BASE_URL, alias="baseUrl")

    def to_domain_input(self) -> tuple[ProviderConfigInput | None, str | None]:
        return validate_provider_config_input(self.model_dump(by_alias=True))
