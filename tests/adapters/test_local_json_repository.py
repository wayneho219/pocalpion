import pytest
from pathlib import Path
from adapters.local_json_repository import LocalJsonRepository
from shared.exceptions import PokemonNotFoundError

FIXTURE = Path(__file__).parent / "fixtures" / "test_pokemon_data.json"


@pytest.fixture
def repo():
    return LocalJsonRepository(FIXTURE)


class TestGetById:
    def test_known_id_returns_pokemon(self, repo):
        p = repo.get_by_id(445)
        assert p.name_en == "garchomp"
        assert p.base_stats.speed == 102

    def test_unknown_id_raises(self, repo):
        with pytest.raises(PokemonNotFoundError):
            repo.get_by_id(999)


class TestGetByName:
    def test_english_lowercase(self, repo):
        assert repo.get_by_name("garchomp").id == 445

    def test_english_mixed_case(self, repo):
        assert repo.get_by_name("Garchomp").id == 445

    def test_chinese(self, repo):
        assert repo.get_by_name("烈咬陸鯊").id == 445

    def test_japanese(self, repo):
        assert repo.get_by_name("ガブリアス").id == 445

    def test_unknown_raises(self, repo):
        with pytest.raises(PokemonNotFoundError):
            repo.get_by_name("mewtwo")


class TestFuzzyMatch:
    def test_partial_english(self, repo):
        ids = [p.id for p in repo.fuzzy_match("chomp")]
        assert 445 in ids

    def test_partial_chinese(self, repo):
        ids = [p.id for p in repo.fuzzy_match("皮")]
        assert 25 in ids

    def test_partial_japanese(self, repo):
        ids = [p.id for p in repo.fuzzy_match("ピカ")]
        assert 25 in ids

    def test_no_match_returns_empty(self, repo):
        assert repo.fuzzy_match("xyzzy") == []

    def test_empty_query_returns_empty(self, repo):
        assert repo.fuzzy_match("") == []

    def test_search_delegates_to_fuzzy_match(self, repo):
        assert repo.search("pikachu") == repo.fuzzy_match("pikachu")

    def test_whitespace_only_query_returns_empty(self, repo):
        assert repo.fuzzy_match("   ") == []


class TestEdgeCases:
    def test_get_by_name_strips_whitespace(self, repo):
        assert repo.get_by_name("  garchomp  ").id == 445

    def test_missing_sprite_path_defaults_to_empty_string(self):
        import json, tempfile
        from pathlib import Path
        data = [{"id": 1, "name_en": "bulbasaur", "name_zh": "妙蛙種子", "name_ja": "フシギダネ",
                 "types": ["grass"], "base_stats": {"hp": 45, "attack": 49, "defense": 49,
                 "sp_attack": 65, "sp_defense": 65, "speed": 45}}]
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(data, f)
            tmp = Path(f.name)
        repo = LocalJsonRepository(tmp)
        assert repo.get_by_id(1).sprite_url == ""
        tmp.unlink()
