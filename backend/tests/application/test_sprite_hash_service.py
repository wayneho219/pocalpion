from pathlib import Path
from unittest.mock import MagicMock
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


class TestGetHashes:
    def setup_method(self):
        # Reset module cache between tests
        import application.sprite_hash_service as svc
        svc._cache = None

    def test_returns_expected_keys(self, tmp_path, monkeypatch):
        import application.sprite_hash_service as svc
        # Create a fake sprite
        sprite = tmp_path / "1.png"
        _make_png(sprite, lambda x, y: (100, 100, 100))
        monkeypatch.setattr(svc, "SPRITES_DIR", tmp_path)
        monkeypatch.setattr(svc, "MEGA_SPRITES_DIR", tmp_path / "mega")
        (tmp_path / "mega").mkdir()

        mock_pokemon = MagicMock()
        mock_pokemon.id = 1
        mock_pokemon.name_en = "Bulbasaur"
        mock_pokemon.name_zh = "妙蛙種子"
        mock_pokemon.name_ja = "フシギダネ"
        mock_pokemon.types = ["grass", "poison"]
        mock_pokemon.is_final_evolution = True
        repo = MagicMock()
        repo.get_by_id.return_value = mock_pokemon

        result = svc.get_hashes(repo)
        assert len(result) == 1
        entry = result[0]
        for key in ("id", "name_en", "name_zh", "name_ja", "types", "hash", "mega", "is_final_evolution"):
            assert key in entry
        assert entry["id"] == 1
        assert len(entry["hash"]) == 16
        assert entry["is_final_evolution"] is True

    def test_cache_returns_same_object(self, tmp_path, monkeypatch):
        import application.sprite_hash_service as svc
        sprite = tmp_path / "1.png"
        _make_png(sprite, lambda x, y: (100, 100, 100))
        monkeypatch.setattr(svc, "SPRITES_DIR", tmp_path)
        monkeypatch.setattr(svc, "MEGA_SPRITES_DIR", tmp_path / "mega")
        (tmp_path / "mega").mkdir()

        mock_pokemon = MagicMock()
        mock_pokemon.id = 1
        mock_pokemon.name_en = "Bulbasaur"
        mock_pokemon.name_zh = "妙蛙種子"
        mock_pokemon.name_ja = "フシギダネ"
        mock_pokemon.types = ["grass", "poison"]
        repo = MagicMock()
        repo.get_by_id.return_value = mock_pokemon

        r1 = svc.get_hashes(repo)
        r2 = svc.get_hashes(repo)
        assert r1 is r2  # same cached object

    def test_skips_pokemon_not_found(self, tmp_path, monkeypatch):
        import application.sprite_hash_service as svc
        from shared.exceptions import PokemonNotFoundError
        sprite = tmp_path / "9999.png"
        _make_png(sprite, lambda x, y: (100, 100, 100))
        monkeypatch.setattr(svc, "SPRITES_DIR", tmp_path)
        monkeypatch.setattr(svc, "MEGA_SPRITES_DIR", tmp_path / "mega")
        (tmp_path / "mega").mkdir()

        repo = MagicMock()
        repo.get_by_id.side_effect = PokemonNotFoundError("not found")

        result = svc.get_hashes(repo)
        assert result == []
