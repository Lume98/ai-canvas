GENERATED_IMAGES_PATH = "/generated-images"
V1_PREFIX = "/v1"


def generated_image_public_path(filename: str) -> str:
    return f"{V1_PREFIX}{GENERATED_IMAGES_PATH}/{filename}"
