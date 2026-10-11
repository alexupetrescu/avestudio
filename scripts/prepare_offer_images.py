#!/usr/bin/env python3
"""
Prepare product mockups for the school offer pages.

Reads the design exports from designs/ (gitignored, large PNGs) and writes
web-optimised WebP files into frontend/public/oferta/ (committed).

Usage:
    venv/Scripts/python scripts/prepare_offer_images.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
DESIGNS = ROOT / "designs"
OUT = ROOT / "frontend" / "public" / "oferta"

MAX_SIDE = 1400
QUALITY = 82

# source filename -> output name
FILES = {
    "Calendar 1 pagina.png": "calendar.webp",
    "Felicitare 1 15x21.png": "felicitare-15x21.webp",
    "Felicitare 2 21x15.png": "felicitare-21x15.webp",
    "Poza 1 20x30.png": "poza-20x30.webp",
    "Poza 2 15x20.png": "poza-15x20.webp",
    "Poza retro 10x12.png": "poza-retro-10x12.webp",
    "extras/breloc 7x5 40 lei.png": "breloc.webp",
    "extras/magnet cauciuc frigider 6.5x6.5 25 lei.jpg": "magnet.webp",
    "extras/puzzle 45 bucati 105 lei.jpg": "puzzle.webp",
}


def convert(src: Path, dst: Path) -> tuple[int, int]:
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
        im.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst, "WEBP", quality=QUALITY, method=6)
        return im.size


def main() -> int:
    if not DESIGNS.is_dir():
        print(f"designs folder not found: {DESIGNS}", file=sys.stderr)
        return 1
    missing = 0
    for rel, name in FILES.items():
        src = DESIGNS / rel
        if not src.exists():
            print(f"  missing: {src.name}", file=sys.stderr)
            missing += 1
            continue
        w, h = convert(src, OUT / name)
        size_kb = (OUT / name).stat().st_size // 1024
        print(f"  {name:28s} {w}x{h}  {size_kb} KB")
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
