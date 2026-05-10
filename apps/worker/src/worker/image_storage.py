import uuid
from dataclasses import dataclass
from pathlib import Path


GENERATED_IMAGE_ROUTE_PREFIX = "/v1/generated-images/"
PNG_CONTENT_TYPE = "image/png"


class ImageStorageError(Exception):
    def __init__(self, message: str, status_code: int = 500) -> None:
        super().__init__(message)
        self.status_code = status_code


@dataclass(frozen=True)
class StoredImage:
    filename: str
    path: Path
    public_path: str


class GeneratedImageStore:
    def __init__(self, directory: Path) -> None:
        self._directory = directory

    def init_storage(self) -> None:
        try:
            self._directory.mkdir(parents=True, exist_ok=True)
        except OSError as error:
            raise ImageStorageError("无法创建生成图片目录，请检查目录权限。") from error

    def save_png(self, image_bytes: bytes) -> StoredImage:
        self.init_storage()

        for _ in range(5):
            filename = f"{uuid.uuid4().hex}.png"
            path = self._directory / filename

            try:
                with path.open("xb") as image_file:
                    image_file.write(image_bytes)
            except FileExistsError:
                continue
            except OSError as error:
                raise ImageStorageError("图片保存失败，请检查生成图片目录权限。") from error

            return StoredImage(
                filename=filename,
                path=path,
                public_path=f"{GENERATED_IMAGE_ROUTE_PREFIX}{filename}",
            )

        raise ImageStorageError("无法生成唯一图片文件名。")

    def resolve_png(self, filename: str) -> Path | None:
        if not is_generated_png_filename(filename):
            return None

        path = (self._directory / filename).resolve()
        directory = self._directory.resolve()

        if path.parent != directory or not path.is_file():
            return None

        return path


def is_generated_png_filename(filename: str) -> bool:
    if not filename.endswith(".png"):
        return False

    stem = filename.removesuffix(".png")
    return len(stem) == 32 and all(character in "0123456789abcdef" for character in stem)
