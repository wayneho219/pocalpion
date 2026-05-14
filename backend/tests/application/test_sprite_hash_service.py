from pathlib import Path
from PIL import Image
from application.sprite_hash_service import _dhash


def _make_png(path: Path, pixel_fn, size=(64, 64)):
    img = Image.new("RGB", size)
    img.putdata([pixel_fn(x, y) for y in range(size[1]) for x in range(size[0])])
    img.save(path, "PNG")


class TestDHash:
    def test_hash_is_16_hex_chars(self, tmp_path):
        p = tmp_path / "t.png"
        _make_png(p, lambda x, y: (128, 128, 128))
        h = _dhash(p)
        assert len(h) == 16
        assert all(c in "0123456789abcdef" for c in h)

    def test_same_image_produces_same_hash(self, tmp_path):
        p = tmp_path / "t.png"
        _make_png(p, lambda x, y: (x * 4 % 256,) * 3)
        assert _dhash(p) == _dhash(p)

    def test_grayscale_insensitive_to_hue(self, tmp_path):
        """Same luminance structure but different hue → identical hash (shiny-safe)."""
        lum = lambda x, y: (x * 4) % 256
        p1, p2 = tmp_path / "warm.png", tmp_path / "cool.png"
        _make_png(p1, lambda x, y: (lum(x, y), lum(x, y) // 2, lum(x, y) // 4))
        _make_png(p2, lambda x, y: (lum(x, y) // 4, lum(x, y) // 2, lum(x, y)))
        assert _dhash(p1) == _dhash(p2)
