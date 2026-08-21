from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from urllib.parse import quote

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
GALLERY_DIR = ROOT / "assets" / "gallery"
THUMB_DIR = GALLERY_DIR / "thumbs"
MANIFEST = GALLERY_DIR / "gallery.json"

ALLOWED = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
THUMB_SIZE = (640, 640)
WEBP_QUALITY = 82


def natural_key(path: Path):
    return [int(part) if part.isdigit() else part.casefold()
            for part in re.split(r"(\d+)", path.name)]


def url_path(path: Path) -> str:
    relative = path.relative_to(ROOT).as_posix()
    return quote(relative, safe="/._-~")


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()[:12]


def make_thumb(source: Path, destination: Path):
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image)

        if image.mode in ("RGBA", "LA") or "transparency" in image.info:
            image = image.convert("RGBA")
        else:
            image = image.convert("RGB")

        thumb = ImageOps.fit(
            image,
            THUMB_SIZE,
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )
        thumb.save(
            destination,
            "WEBP",
            quality=WEBP_QUALITY,
            method=6,
        )


def main():
    GALLERY_DIR.mkdir(parents=True, exist_ok=True)
    THUMB_DIR.mkdir(parents=True, exist_ok=True)

    originals = sorted(
        (
            p for p in GALLERY_DIR.iterdir()
            if p.is_file() and p.suffix.lower() in ALLOWED
        ),
        key=natural_key,
    )

    expected_thumbs = set()
    manifest = []

    for source in originals:
        version = digest(source)
        thumb_name = f"{source.stem}.webp"
        thumb_path = THUMB_DIR / thumb_name
        expected_thumbs.add(thumb_path.name)

        # Thumbnail mevcut değilse veya orijinal daha yeniyse yeniden üret.
        if (not thumb_path.exists()) or source.stat().st_mtime_ns > thumb_path.stat().st_mtime_ns:
            make_thumb(source, thumb_path)

        manifest.append({
            "thumb": f"{url_path(thumb_path)}?v={version}",
            "full": f"{url_path(source)}?v={version}",
        })

    # Silinen orijinallere ait eski thumbnail'ları da otomatik temizle.
    for thumb in THUMB_DIR.glob("*.webp"):
        if thumb.name not in expected_thumbs:
            thumb.unlink()

    MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"{len(originals)} galeri görseli işlendi.")
    print(f"Manifest: {MANIFEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
