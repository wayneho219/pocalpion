# backend/tests/interfaces/test_pokemon_api.py
from fastapi.testclient import TestClient
from interfaces.api.main import app

client = TestClient(app)


def test_search_returns_results():
    r = client.get("/api/pokemon/search?q=charizard")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert "id" in first
    assert "name_zh" in first
    assert "name_en" in first
    assert "name_ja" in first
    assert "types" in first


def test_search_empty_query_rejected():
    r = client.get("/api/pokemon/search?q=")
    assert r.status_code == 422


def test_search_no_match_returns_empty():
    r = client.get("/api/pokemon/search?q=zzznomatch999")
    assert r.status_code == 200
    assert r.json() == []


def test_detail_charizard():
    r = client.get("/api/pokemon/6")
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == 6
    assert "fire" in data["types"]
    assert "base_stats" in data
    assert data["base_stats"]["speed"] == 100
    assert "type_matchup" in data
    matchup = data["type_matchup"]
    assert any(e["type"] == "rock" for e in matchup["weaknesses"])


def test_detail_not_found():
    r = client.get("/api/pokemon/99999")
    assert r.status_code == 404
