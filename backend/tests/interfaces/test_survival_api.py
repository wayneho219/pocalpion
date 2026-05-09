from fastapi.testclient import TestClient
from interfaces.api.main import app

client = TestClient(app)


def test_survival_returns_two_plans():
    # 噴火龍(id=6) 面對 120 威力物理攻擊，攻擊方攻擊200，屬性倍率1.0
    r = client.post("/api/survival", json={
        "pokemon_id": 6,
        "nature": "Hardy",
        "power": 120,
        "attacker_atk": 200,
        "is_physical": True,
        "type_multiplier": 1.0,
    })
    assert r.status_code == 200
    data = r.json()
    assert "prefer_hp" in data
    assert "prefer_def" in data
    ph = data["prefer_hp"]
    assert "sp_hp" in ph
    assert "sp_def" in ph
    assert "survived" in ph


def test_survival_impossible_attack():
    # 攻擊方攻擊9999，屬性4倍，任何努力值分配都撐不住
    r = client.post("/api/survival", json={
        "pokemon_id": 6,
        "nature": "Hardy",
        "power": 250,
        "attacker_atk": 9999,
        "is_physical": True,
        "type_multiplier": 4.0,
    })
    assert r.status_code == 200
    data = r.json()
    assert data["prefer_hp"]["survived"] is False
    assert data["prefer_def"]["survived"] is False


def test_survival_invalid_pokemon():
    r = client.post("/api/survival", json={
        "pokemon_id": 99999,
        "nature": "Hardy",
        "power": 80,
        "attacker_atk": 150,
        "is_physical": True,
        "type_multiplier": 1.0,
    })
    assert r.status_code == 404
