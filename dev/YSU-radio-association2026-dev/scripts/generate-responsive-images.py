"""Generate responsive WebP assets from non-public source images."""

from __future__ import annotations

import json
import re
from pathlib import Path

from PIL import Image, ImageOps


REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
SOURCE_ROOT = REPOSITORY_ROOT / "source-assets" / "image-originals"
OUTPUT_ROOT = REPOSITORY_ROOT / "public" / "image"
MANIFEST_PATH = REPOSITORY_ROOT / "public" / "html" / "image-assets.js"
PHOTO_WIDTHS = (800, 1200, 1600)
DOCUMENT_WIDTHS = (1200, 1600, 2000)
GENERATED_NAME = re.compile(r".+-\d+\.webp$", re.IGNORECASE)
SOURCE_SUFFIXES = {".jpg", ".jpeg", ".png"}


def candidate_widths(source_width: int, preferred_widths: tuple[int, ...]) -> list[int]:
    widths = [width for width in preferred_widths if width <= source_width]
    largest_preferred = preferred_widths[-1]
    if not widths or (source_width < largest_preferred and widths[-1] != source_width):
        widths.append(source_width)
    return sorted(set(widths))


def web_path(path: Path) -> str:
    return "/" + path.relative_to(REPOSITORY_ROOT / "public").as_posix()


def source_key(relative_path: Path) -> str:
    return "/image/" + relative_path.as_posix()


def remove_previous_outputs() -> None:
    if not OUTPUT_ROOT.exists():
        return
    for path in OUTPUT_ROOT.rglob("*.webp"):
        if GENERATED_NAME.fullmatch(path.name):
            path.unlink()


def save_webp(image: Image.Image, output_path: Path, width: int, quality: int) -> None:
    height = round(image.height * width / image.width)
    resized = image if width == image.width else image.resize((width, height), Image.Resampling.LANCZOS)
    if resized.mode not in {"RGB", "RGBA"}:
        resized = resized.convert("RGBA" if "A" in resized.getbands() else "RGB")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    save_options: dict[str, object] = {
        "format": "WEBP",
        "quality": quality,
        "method": 6,
    }
    icc_profile = image.info.get("icc_profile")
    if icc_profile:
        save_options["icc_profile"] = icc_profile
    resized.save(output_path, **save_options)


def build_assets() -> dict[str, dict[str, object]]:
    if not SOURCE_ROOT.is_dir():
        raise SystemExit(f"原图目录不存在：{SOURCE_ROOT}")

    remove_previous_outputs()
    manifest: dict[str, dict[str, object]] = {}

    for source_path in sorted(SOURCE_ROOT.rglob("*")):
        if source_path.suffix.lower() not in SOURCE_SUFFIXES:
            continue

        relative_path = source_path.relative_to(SOURCE_ROOT)
        if relative_path.parts[0].lower() == "pending":
            continue

        is_document = relative_path.parts[0].lower() == "honors"
        preferred_widths = DOCUMENT_WIDTHS if is_document else PHOTO_WIDTHS
        quality = 90 if is_document else 84

        with Image.open(source_path) as opened:
            image = ImageOps.exif_transpose(opened)
            widths = candidate_widths(image.width, preferred_widths)
            variants = []
            for width in widths:
                output_name = f"{source_path.stem}-{width}.webp"
                output_path = OUTPUT_ROOT / relative_path.parent / output_name
                save_webp(image, output_path, width, quality)
                variants.append(
                    {
                        "src": web_path(output_path),
                        "width": width,
                    }
                )

            manifest[source_key(relative_path)] = {
                "width": image.width,
                "height": image.height,
                "variants": variants,
            }

    return manifest


def write_manifest(manifest: dict[str, dict[str, object]]) -> None:
    payload = json.dumps(manifest, ensure_ascii=False, separators=(",", ":"))
    content = (
        "// 此文件由 scripts/generate-responsive-images.py 自动生成，请勿手工修改。\n"
        f"window.RESPONSIVE_IMAGE_ASSETS = Object.freeze({payload});\n"
    )
    MANIFEST_PATH.write_text(content, encoding="utf-8", newline="\n")


def main() -> None:
    manifest = build_assets()
    write_manifest(manifest)
    variants = sum(len(asset["variants"]) for asset in manifest.values())
    print(f"已生成 {len(manifest)} 组响应式图片，共 {variants} 个 WebP 文件。")


if __name__ == "__main__":
    main()
