from __future__ import annotations

from pathlib import Path
from typing import Optional
from PIL import Image
from shared.config import SPRITES_DIR, MEGA_SPRITES_DIR
from shared.exceptions import PokemonNotFoundError

HASH_SIZE = 8
_cache: Optional[list[dict]] = None


def _dhash(path: Path) -> str:
    with Image.open(path) as img:
        gray = img.convert("L").resize((HASH_SIZE + 1, HASH_SIZE), Image.LANCZOS)
    pixels = list(gray.getdata())
    bits = 0
    for row in range(HASH_SIZE):
        for col in range(HASH_SIZE):
            left  = pixels[row * (HASH_SIZE + 1) + col]
            right = pixels[row * (HASH_SIZE + 1) + col + 1]
            bits = (bits << 1) | (1 if left > right else 0)
    return format(bits, "016x")


def get_hashes(repo) -> list[dict]:
    global _cache
    if _cache is None:
        _cache = _build(repo)
    return _cache


def _build(repo) -> list[dict]:
    entries = []
    for sprite_file in sorted(SPRITES_DIR.glob("*.png"), key=lambda p: int(p.stem)):
        try:
            pokemon_id = int(sprite_file.stem)
        except ValueError:
            continue
        try:
            p = repo.get_by_id(pokemon_id)
        except PokemonNotFoundError:
            continue
        entry: dict = {
            "id": p.id,
            "name_en": p.name_en,
            "name_zh": p.name_zh,
            "name_ja": p.name_ja,
            "types": list(p.types),
            "hash": _dhash(sprite_file),
            "mega": [],
        }
        for mega_file in sorted(MEGA_SPRITES_DIR.glob(f"{pokemon_id}-*.png")):
            suffix = mega_file.stem.split("-", 1)[1]
            entry["mega"].append({"suffix": suffix, "hash": _dhash(mega_file)})
        entries.append(entry)
    return entries
