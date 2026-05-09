# backend/tests/interfaces/test_speed_api.py
from fastapi.testclient import TestClient
from interfaces.api.main import app

client = TestClient(app)


def test_speed_returns_result():
    # 快龍(id=149, base speed 80) vs 水箭龜(id=9, base speed 58)
    r = client.post("/api/speed", json={
        "my_pokemon_id": 149,
        "my_nature": "Hardy",
        "my_modifier_mult": 1.0,
        "tgt_pokemon_id": 9,
        "tgt_nature": "Hardy",
        "tgt_modifier_mult": 1.0,
        "tgt_sp": 0,
    })
    assert r.status_code == 200
    data = r.json()
    assert data is not None
    assert "sp_needed" in data
    assert "my_speed" in data
    assert "target_speed" in data
    assert data["my_speed"] > data["target_speed"]


def test_speed_cannot_outspeed_returns_null():
    # 慢速 vs 速攻圍巾：我方 id=143(卡比獸, speed 30) 無法超越圍巾快龍
    r = client.post("/api/speed", json={
        "my_pokemon_id": 143,
        "my_nature": "Hardy",
        "my_modifier_mult": 1.0,
        "tgt_pokemon_id": 149,
        "tgt_nature": "Hardy",
        "tgt_modifier_mult": 1.5,
        "tgt_sp": 32,
    })
    assert r.status_code == 200
    assert r.json() is None


def test_speed_invalid_nature_returns_404():
    r = client.post("/api/speed", json={
        "my_pokemon_id": 1,
        "my_nature": "NotANature",
        "my_modifier_mult": 1.0,
        "tgt_pokemon_id": 2,
        "tgt_nature": "Hardy",
    })
    assert r.status_code == 404


def test_speed_pokemon_not_found_returns_404():
    r = client.post("/api/speed", json={
        "my_pokemon_id": 99999,
        "my_nature": "Hardy",
        "my_modifier_mult": 1.0,
        "tgt_pokemon_id": 9,
        "tgt_nature": "Hardy",
    })
    assert r.status_code == 404
