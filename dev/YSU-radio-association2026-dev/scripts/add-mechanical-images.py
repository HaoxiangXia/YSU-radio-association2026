"""将真实照片生成 WebP 响应式变体并更新 manifest"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageOps

REPO = Path(r"e:\YSU-radio-association2026-dev")
SRC_DIR = REPO / "source-assets" / "image-originals" / "departments" / "mechanical"
OUT_DIR = REPO / "public" / "image" / "departments" / "mechanical"
MANIFEST = REPO / "public" / "html" / "image-assets.js"

NAMES = ["project-05", "project-06", "project-07", "project-08"]
PHOTO_WIDTHS = (800, 1200, 1600)

for name in NAMES:
    src_path = SRC_DIR / f"{name}.jpg"
    with Image.open(src_path) as opened:
        img = ImageOps.exif_transpose(opened)
        for w in PHOTO_WIDTHS:
            if w > img.width:
                continue
            h = round(img.height * w / img.width)
            resized = img if w == img.width else img.resize((w, h), Image.Resampling.LANCZOS)
            out = OUT_DIR / f"{name}-{w}.webp"
            resized.save(out, "WEBP", quality=84, method=6)
            print(f"已生成: {out}")

print("更新 manifest...")
text = MANIFEST.read_text(encoding="utf-8")
start = text.index("{")
end = text.rindex("}") + 1
manifest = json.loads(text[start:end])

for name in NAMES:
    src_path = SRC_DIR / f"{name}.jpg"
    with Image.open(src_path) as img:
        entry = {
            "width": img.width,
            "height": img.height,
            "variants": [
                {"src": f"/image/departments/mechanical/{name}-800.webp", "width": 800},
                {"src": f"/image/departments/mechanical/{name}-1200.webp", "width": 1200},
                {"src": f"/image/departments/mechanical/{name}-1600.webp", "width": 1600},
            ],
        }
        manifest[f"/image/departments/mechanical/{name}.jpg"] = entry
        print(f"已更新 manifest: {name}.jpg ({img.width}x{img.height})")

payload = json.dumps(manifest, ensure_ascii=False, separators=(",", ":"))
content = f"// 此文件由 scripts/generate-responsive-images.py 自动生成，请勿手工修改。\nwindow.RESPONSIVE_IMAGE_ASSETS = Object.freeze({payload});\n"
MANIFEST.write_text(content, encoding="utf-8", newline="\n")
print("完成！")