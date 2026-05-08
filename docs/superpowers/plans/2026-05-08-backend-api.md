# Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將現有 Python 程式搬移至 `backend/`，並以 FastAPI 取代 Streamlit 介面，暴露 REST API 給前端呼叫。

**Architecture:** 現有 Clean Architecture（domain / application / adapters / shared）保持不動，僅新增 `interfaces/api/` 作為 HTTP 介面層。所有業務邏輯零改動，router 只做 HTTP 轉換。

**Tech Stack:** FastAPI, Uvicorn, Pydantic v2, pytest, httpx（TestClient）

---

## File Map

**移動（git mv）：**
```
domain/          → backend/domain/
application/     → backend/application/
adapters/        → backend/adapters/
shared/          → backend/shared/
data/            → backend/data/
scripts/         → backend/scripts/
tests/           → backend/tests/
pyproject.toml   → backend/pyproject.toml
requirements.txt → backend/requirements.txt
interfaces/      → backend/interfaces/   (含 streamlit，之後移除)
```

**新建：**
```
backend/interfaces/api/__init__.py
backend/interfaces/api/main.py         # FastAPI app、CORS、StaticFiles
backend/interfaces/api/deps.py         # lru_cache service factory
backend/interfaces/api/schemas.py      # Pydantic request/response 型別
backend/interfaces/api/routers/__init__.py
backend/interfaces/api/routers/pokemon.py
backend/interfaces/api/routers/speed.py
backend/interfaces/api/routers/survival.py
backend/interfaces/api/routers/admin.py
backend/tests/interfaces/__init__.py
backend/tests/interfaces/test_pokemon_api.py
backend/tests/interfaces/test_speed_api.py
backend/tests/interfaces/test_survival_api.py
```

**修改：**
```
backend/requirements.txt   # 新增 fastapi, uvicorn[standard], httpx
backend/pyproject.toml     # 移除 streamlit, plotly 依賴
.gitignore                 # 新增 backend/.venv
```

---

## Task 1: 移動 Python 程式到 `backend/`

**Files:**
- Move: 所有根目錄 Python 資料夾 → `backend/`

- [ ] **Step 1: 用 git mv 移動所有 Python 目錄**

```bash
git mv domain backend/domain
git mv application backend/application
git mv adapters backend/adapters
git mv shared backend/shared
git mv data backend/data
git mv scripts backend/scripts
git mv tests backend/tests
git mv interfaces backend/interfaces
git mv pyproject.toml backend/pyproject.toml
git mv requirements.txt backend/requirements.txt
```

- [ ] **Step 2: 確認目錄結構正確**

```bash
ls backend/
```
Expected output 包含：`domain  application  adapters  shared  data  scripts  tests  interfaces  pyproject.toml  requirements.txt`

- [ ] **Step 3: 在 `backend/pyproject.toml` 確認 pythonpath 設定**

確認 `[tool.pytest.ini_options]` 包含 `pythonpath = ["."]`（`.` 代表 `backend/`）。內容應為：

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
```

- [ ] **Step 4: 從 `backend/` 執行現有測試，確認全部通過**

```bash
cd backend && python -m pytest tests/ -v
```
Expected: 全部 PASS（移動後 import 路徑不變）

- [ ] **Step 5: Commit**

```bash
cd ..
git add backend/
git commit -m "refactor: move Python project into backend/"
```

---

## Task 2: 更新 requirements.txt，安裝 FastAPI

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1: 更新 `backend/requirements.txt`**

```
fastapi>=0.111
uvicorn[standard]>=0.29
httpx>=0.27
requests>=2.31
pytest>=8.0
pytest-mock>=3.12
```

（移除 streamlit；plotly 在前端重新安裝，後端不需要）

- [ ] **Step 2: 安裝依賴**

```bash
cd backend && pip install -r requirements.txt
```
Expected: Successfully installed fastapi ... uvicorn ...

- [ ] **Step 3: 確認 fastapi 可 import**

```bash
cd backend && python -c "import fastapi; print(fastapi.__version__)"
```
Expected: 0.111.x 或更高

- [ ] **Step 4: Commit**

```bash
git add backend/requirements.txt
git commit -m "chore(backend): add fastapi uvicorn httpx to requirements"
```

---

## Task 3: 建立 Pydantic schemas

**Files:**
- Create: `backend/interfaces/api/__init__.py`
- Create: `backend/interfaces/api/schemas.py`

- [ ] **Step 1: 建立 `backend/interfaces/api/__init__.py`（空檔）**

```bash
touch backend/interfaces/api/__init__.py
touch backend/interfaces/api/routers/__init__.py
mkdir -p backend/interfaces/api/routers
```

- [ ] **Step 2: 寫 failing test 確認 schema import**

建立 `backend/tests/interfaces/__init__.py`（空）與 `backend/tests/interfaces/test_schemas.py`：

```python
# backend/tests/interfaces/test_schemas.py
from interfaces.api.schemas import (
    PokemonSearchOut, PokemonDetailOut, SpeedIn, SpeedOut,
    SurvivalIn, SurvivalOut, RebuildOut,
)

def test_pokemon_search_out_fields():
    obj = PokemonSearchOut(
        id=6, name_zh="噴火龍", name_en="charizard",
        name_ja="リザードン", types=["fire", "flying"],
    )
    assert obj.id == 6
    assert obj.types == ["fire", "flying"]

def test_speed_in_defaults():
    obj = SpeedIn(
        my_pokemon_id=1, my_nature="Hardy", my_modifier_mult=1.0,
        tgt_pokemon_id=2, tgt_nature="Hardy",
    )
    assert obj.tgt_sp == 0
    assert obj.tgt_modifier_mult == 1.0
```

- [ ] **Step 3: 執行測試確認 FAIL（schemas 尚不存在）**

```bash
cd backend && python -m pytest tests/interfaces/test_schemas.py -v
```
Expected: ImportError

- [ ] **Step 4: 建立 `backend/interfaces/api/schemas.py`**

```python
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class StatSetOut(BaseModel):
    hp: int
    attack: int
    defense: int
    sp_attack: int
    sp_defense: int
    speed: int


class TypeMatchupEntry(BaseModel):
    type: str
    multiplier: float


class TypeMatchupOut(BaseModel):
    weaknesses: list[TypeMatchupEntry]
    resistances: list[TypeMatchupEntry]
    immunities: list[str]


class PokemonSearchOut(BaseModel):
    id: int
    name_zh: str
    name_en: str
    name_ja: str
    types: list[str]


class PokemonDetailOut(BaseModel):
    id: int
    name_zh: str
    name_en: str
    name_ja: str
    types: list[str]
    base_stats: StatSetOut
    abilities: list[dict]
    dream_ability: Optional[dict]
    mega_forms: list[dict]
    type_matchup: TypeMatchupOut


class SpeedIn(BaseModel):
    my_pokemon_id: int
    my_nature: str
    my_modifier_mult: float = 1.0
    tgt_pokemon_id: int
    tgt_nature: str
    tgt_modifier_mult: float = 1.0
    tgt_sp: int = 0


class SpeedOut(BaseModel):
    sp_needed: int
    my_speed: int
    target_speed: int


class SurvivalIn(BaseModel):
    pokemon_id: int
    nature: str
    power: int
    attacker_atk: int
    is_physical: bool
    type_multiplier: float


class SurvivalResultOut(BaseModel):
    sp_hp: int
    sp_def: int
    total_sp: int
    final_hp: int
    final_def: int
    survived: bool


class SurvivalOut(BaseModel):
    prefer_hp: SurvivalResultOut
    prefer_def: SurvivalResultOut


class RebuildOut(BaseModel):
    count: int
```

- [ ] **Step 5: 執行測試確認 PASS**

```bash
cd backend && python -m pytest tests/interfaces/test_schemas.py -v
```
Expected: 2 passed

- [ ] **Step 6: Commit**

```bash
git add backend/interfaces/api/ backend/tests/interfaces/
git commit -m "feat(api): add Pydantic schemas for all endpoints"
```

---

## Task 4: 建立 deps.py 與 main.py

**Files:**
- Create: `backend/interfaces/api/deps.py`
- Create: `backend/interfaces/api/main.py`

- [ ] **Step 1: 建立 `backend/interfaces/api/deps.py`**

```python
from functools import lru_cache
from adapters.local_json_repository import LocalJsonRepository
from adapters.csv_name_provider import CsvNameProvider
from application.calculator import StatCalculator
from application.speed_service import SpeedService
from application.survival_service import SurvivalService
from application.search_service import SearchService
from shared.config import DATA_JSON_PATH, CSV_PATH


@lru_cache(maxsize=1)
def get_repo() -> LocalJsonRepository:
    return LocalJsonRepository(DATA_JSON_PATH)


@lru_cache(maxsize=1)
def get_services() -> dict:
    calc = StatCalculator()
    repo = get_repo()
    csv_provider = CsvNameProvider(CSV_PATH)
    return {
        "calc": calc,
        "repo": repo,
        "search": SearchService(repo, csv_provider),
        "speed": SpeedService(calc),
        "survival": SurvivalService(calc),
    }


def clear_cache() -> None:
    get_repo.cache_clear()
    get_services.cache_clear()
```

- [ ] **Step 2: 建立 `backend/interfaces/api/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from interfaces.api.routers import pokemon, speed, survival, admin
from shared.config import SPRITES_DIR

app = FastAPI(title="PokéCalc API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if SPRITES_DIR.exists():
    app.mount("/sprites", StaticFiles(directory=str(SPRITES_DIR)), name="sprites")

app.include_router(pokemon.router, prefix="/api/pokemon", tags=["pokemon"])
app.include_router(speed.router, prefix="/api/speed", tags=["speed"])
app.include_router(survival.router, prefix="/api/survival", tags=["survival"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
```

注意：`main.py` 的 router import 在 Task 5–8 建立後才能正常執行，目前先建立空 router 讓 import 不報錯。

- [ ] **Step 3: 建立空 router 存根讓 main.py 可 import**

```bash
cat > backend/interfaces/api/routers/pokemon.py << 'EOF'
from fastapi import APIRouter
router = APIRouter()
EOF

cat > backend/interfaces/api/routers/speed.py << 'EOF'
from fastapi import APIRouter
router = APIRouter()
EOF

cat > backend/interfaces/api/routers/survival.py << 'EOF'
from fastapi import APIRouter
router = APIRouter()
EOF

cat > backend/interfaces/api/routers/admin.py << 'EOF'
from fastapi import APIRouter
router = APIRouter()
EOF
```

- [ ] **Step 4: 確認 app 可啟動**

```bash
cd backend && python -c "from interfaces.api.main import app; print('OK')"
```
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add backend/interfaces/api/
git commit -m "feat(api): add FastAPI main app with CORS and service deps"
```

---

## Task 5: Pokemon Router（搜尋 + 詳情）

**Files:**
- Modify: `backend/interfaces/api/routers/pokemon.py`
- Create: `backend/tests/interfaces/test_pokemon_api.py`

- [ ] **Step 1: 寫 failing tests**

```python
# backend/tests/interfaces/test_pokemon_api.py
import pytest
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
```

- [ ] **Step 2: 執行確認 FAIL（router 為空存根）**

```bash
cd backend && python -m pytest tests/interfaces/test_pokemon_api.py -v
```
Expected: FAIL（search 返回 404 或空資料）

- [ ] **Step 3: 實作 `backend/interfaces/api/routers/pokemon.py`**

```python
from fastapi import APIRouter, Query, HTTPException
from interfaces.api.deps import get_services
from interfaces.api.schemas import (
    PokemonSearchOut, PokemonDetailOut, StatSetOut,
    TypeMatchupOut, TypeMatchupEntry,
)
from shared.type_chart import get_matchups

router = APIRouter()


def _build_matchup(types: list[str]) -> TypeMatchupOut:
    matchups = get_matchups(types)
    weaknesses = sorted(
        [TypeMatchupEntry(type=t, multiplier=v) for t, v in matchups.items() if v > 1],
        key=lambda x: -x.multiplier,
    )
    resistances = sorted(
        [TypeMatchupEntry(type=t, multiplier=v) for t, v in matchups.items() if 0 < v < 1],
        key=lambda x: x.multiplier,
    )
    immunities = [t for t, v in matchups.items() if v == 0]
    return TypeMatchupOut(weaknesses=weaknesses, resistances=resistances, immunities=immunities)


@router.get("/search", response_model=list[PokemonSearchOut])
def search(q: str = Query(..., min_length=1)):
    svc = get_services()
    results = svc["search"].search(q)
    return [
        PokemonSearchOut(
            id=p.id,
            name_zh=p.name_zh,
            name_en=p.name_en,
            name_ja=p.name_ja,
            types=list(p.types),
        )
        for p in results[:20]
    ]


@router.get("/{pokemon_id}", response_model=PokemonDetailOut)
def detail(pokemon_id: int):
    svc = get_services()
    try:
        p = svc["repo"].get_by_id(pokemon_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Pokemon not found")
    return PokemonDetailOut(
        id=p.id,
        name_zh=p.name_zh,
        name_en=p.name_en,
        name_ja=p.name_ja,
        types=list(p.types),
        base_stats=StatSetOut(
            hp=p.base_stats.hp,
            attack=p.base_stats.attack,
            defense=p.base_stats.defense,
            sp_attack=p.base_stats.sp_attack,
            sp_defense=p.base_stats.sp_defense,
            speed=p.base_stats.speed,
        ),
        abilities=p.abilities,
        dream_ability=p.dream_ability,
        mega_forms=p.mega_forms,
        type_matchup=_build_matchup(list(p.types)),
    )
```

- [ ] **Step 4: 執行確認 PASS**

```bash
cd backend && python -m pytest tests/interfaces/test_pokemon_api.py -v
```
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add backend/interfaces/api/routers/pokemon.py backend/tests/interfaces/test_pokemon_api.py
git commit -m "feat(api): implement pokemon search and detail endpoints"
```

---

## Task 6: Speed Router

**Files:**
- Modify: `backend/interfaces/api/routers/speed.py`
- Create: `backend/tests/interfaces/test_speed_api.py`

- [ ] **Step 1: 寫 failing tests**

```python
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
```

- [ ] **Step 2: 執行確認 FAIL**

```bash
cd backend && python -m pytest tests/interfaces/test_speed_api.py -v
```
Expected: FAIL

- [ ] **Step 3: 實作 `backend/interfaces/api/routers/speed.py`**

```python
import dataclasses
from typing import Optional
from fastapi import APIRouter, HTTPException
from interfaces.api.deps import get_services
from interfaces.api.schemas import SpeedIn, SpeedOut
from domain.models.nature import NatureRegistry

router = APIRouter()


@router.post("", response_model=Optional[SpeedOut])
def calc_speed(body: SpeedIn):
    svc = get_services()
    try:
        my_nature = NatureRegistry.get_by_name(body.my_nature)
        tgt_nature = NatureRegistry.get_by_name(body.tgt_nature)
        my_mon = svc["repo"].get_by_id(body.my_pokemon_id)
        tgt_mon = svc["repo"].get_by_id(body.tgt_pokemon_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

    my_mon = dataclasses.replace(my_mon, nature=my_nature)
    tgt_mon = dataclasses.replace(tgt_mon, nature=tgt_nature)

    result = svc["speed"].min_sp_to_outspeed(
        my_mon, tgt_mon,
        target_sp=body.tgt_sp,
        my_mult=body.my_modifier_mult,
        tgt_mult=body.tgt_modifier_mult,
    )
    if result is None:
        return None
    return SpeedOut(
        sp_needed=result.sp_needed,
        my_speed=result.my_speed,
        target_speed=result.target_speed,
    )
```

- [ ] **Step 4: 執行確認 PASS**

```bash
cd backend && python -m pytest tests/interfaces/test_speed_api.py -v
```
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add backend/interfaces/api/routers/speed.py backend/tests/interfaces/test_speed_api.py
git commit -m "feat(api): implement speed calculation endpoint"
```

---

## Task 7: Survival Router

**Files:**
- Modify: `backend/interfaces/api/routers/survival.py`
- Create: `backend/tests/interfaces/test_survival_api.py`

- [ ] **Step 1: 寫 failing tests**

```python
# backend/tests/interfaces/test_survival_api.py
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
```

- [ ] **Step 2: 執行確認 FAIL**

```bash
cd backend && python -m pytest tests/interfaces/test_survival_api.py -v
```
Expected: FAIL

- [ ] **Step 3: 實作 `backend/interfaces/api/routers/survival.py`**

```python
import dataclasses
from fastapi import APIRouter, HTTPException
from interfaces.api.deps import get_services
from interfaces.api.schemas import SurvivalIn, SurvivalOut, SurvivalResultOut
from domain.models.nature import NatureRegistry
from application.survival_service import AttackInput

router = APIRouter()


def _to_out(r) -> SurvivalResultOut:
    return SurvivalResultOut(
        sp_hp=r.sp_hp,
        sp_def=r.sp_def,
        total_sp=r.total_sp,
        final_hp=r.final_hp,
        final_def=r.final_def,
        survived=r.survived,
    )


@router.post("", response_model=SurvivalOut)
def calc_survival(body: SurvivalIn):
    svc = get_services()
    try:
        nature = NatureRegistry.get_by_name(body.nature)
        mon = svc["repo"].get_by_id(body.pokemon_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

    mon = dataclasses.replace(mon, nature=nature)
    attack = AttackInput(
        power=body.power,
        attacker_atk=body.attacker_atk,
        is_physical=body.is_physical,
        type_multiplier=body.type_multiplier,
    )
    prefer_hp, prefer_def = svc["survival"].optimize(mon, attack)
    return SurvivalOut(prefer_hp=_to_out(prefer_hp), prefer_def=_to_out(prefer_def))
```

- [ ] **Step 4: 執行確認 PASS**

```bash
cd backend && python -m pytest tests/interfaces/test_survival_api.py -v
```
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add backend/interfaces/api/routers/survival.py backend/tests/interfaces/test_survival_api.py
git commit -m "feat(api): implement survival calculation endpoint"
```

---

## Task 8: Admin Router（資料重建）

**Files:**
- Modify: `backend/interfaces/api/routers/admin.py`

- [ ] **Step 1: 實作 `backend/interfaces/api/routers/admin.py`**

```python
from fastapi import APIRouter
from interfaces.api.deps import clear_cache
from interfaces.api.schemas import RebuildOut
from scripts.build_data import build

router = APIRouter()


@router.post("/rebuild", response_model=RebuildOut)
def rebuild():
    count = build()
    clear_cache()
    return RebuildOut(count=count)
```

- [ ] **Step 2: 確認全部測試通過**

```bash
cd backend && python -m pytest tests/ -v
```
Expected: 全部 PASS（含原有 tests/ 下的測試）

- [ ] **Step 3: 手動確認 API 可啟動並看到文件**

```bash
cd backend && uvicorn interfaces.api.main:app --reload --port 8000
```
開啟瀏覽器 `http://localhost:8000/docs`，確認顯示 Swagger UI 並有四組路由（pokemon / speed / survival / admin）。

- [ ] **Step 4: Commit**

```bash
git add backend/interfaces/api/routers/admin.py
git commit -m "feat(api): implement admin rebuild endpoint"
```

---

## Task 9: 清理並更新 .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: 在 `.gitignore` 新增後端相關排除**

在 `.gitignore` 末尾加入：

```
# Backend
backend/.venv/
backend/__pycache__/
backend/**/__pycache__/
backend/.pytest_cache/
```

- [ ] **Step 2: Streamlit 介面已無作用，可選擇性移除**

```bash
git rm -r backend/interfaces/streamlit/
```

- [ ] **Step 3: 最終全套測試**

```bash
cd backend && python -m pytest tests/ -v --tb=short
```
Expected: 全部 PASS

- [ ] **Step 4: Commit**

```bash
cd ..
git add .gitignore
git commit -m "chore: update gitignore for backend; remove streamlit interface"
```

---

## 完成驗收

後端 API 完成後，以下指令應全部成功：

```bash
# 啟動
cd backend && uvicorn interfaces.api.main:app --port 8000

# 搜尋
curl "http://localhost:8000/api/pokemon/search?q=pikachu"

# 詳情
curl "http://localhost:8000/api/pokemon/25"

# 速度計算
curl -X POST "http://localhost:8000/api/speed" \
  -H "Content-Type: application/json" \
  -d '{"my_pokemon_id":149,"my_nature":"Hardy","my_modifier_mult":1.0,"tgt_pokemon_id":9,"tgt_nature":"Hardy","tgt_modifier_mult":1.0,"tgt_sp":0}'

# Swagger UI
open http://localhost:8000/docs
```
