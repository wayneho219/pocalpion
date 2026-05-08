# Frontend Redesign — 前後端分離設計規格

**日期**：2026-05-08  
**狀態**：已核准，待實作  

---

## 目標

將現有 Streamlit 單體應用改為前後端分離架構：
- **後端**：Python FastAPI，暴露 REST API，保留現有 Clean Architecture 所有層
- **前端**：Next.js 14（App Router），全新視覺設計，參考 Pokémon Champions 官方美術風格

---

## 目錄結構

```
poke-calc/
├── backend/
│   ├── domain/              # 不動（Pokemon, Nature, Stats, Move）
│   ├── application/         # 不動（Calculator, SearchService, SpeedService, SurvivalService）
│   ├── adapters/            # 不動（LocalJsonRepository, PokeApiRepository）
│   ├── shared/              # 不動（i18n, type_chart, config）
│   ├── data/                # 不動（pokemon_data.json, sprites/）
│   ├── interfaces/
│   │   └── api/
│   │       ├── main.py          # FastAPI app 進入點
│   │       ├── routers/
│   │       │   ├── pokemon.py   # 搜尋、詳情
│   │       │   ├── speed.py     # 速度計算
│   │       │   └── survival.py  # 生存計算
│   │       └── schemas.py       # Pydantic request/response 型別
│   ├── scripts/             # 不動
│   ├── tests/               # 不動
│   └── requirements.txt     # 新增 fastapi, uvicorn
│
└── frontend/
    ├── app/
    │   ├── layout.tsx        # 根 layout（Nav、語言 context）
    │   ├── page.tsx          # 搜尋頁（/）
    │   ├── speed/page.tsx    # 速度頁（/speed）
    │   └── survival/page.tsx # 生存頁（/survival）
    ├── components/
    │   ├── TypeBadge.tsx     # 屬性標籤（官方配色、多語言）
    │   ├── StatBar.tsx       # 能力值長條
    │   ├── PokemonSelector.tsx
    │   ├── NatureSelector.tsx
    │   └── RadarChart.tsx    # recharts 雷達圖
    ├── lib/
    │   ├── api.ts            # fetch wrapper（指向後端）
    │   └── i18n.ts           # 語言 context + 翻譯 hook
    └── package.json
```

現有 `interfaces/streamlit/` 在遷移完成後移除。

---

## 技術棧

| 層級 | 技術 |
|------|------|
| 後端框架 | FastAPI + Uvicorn |
| 後端語言 | Python 3.x（不變） |
| 前端框架 | Next.js 14 App Router |
| 樣式 | Tailwind CSS |
| 圖表 | recharts（雷達圖） |
| 狀態管理 | React `useState`（不需要 Zustand，計算器規模） |
| 語言 | TypeScript |

---

## API Contract

所有端點掛於 `/api/` 前綴，CORS 開放前端 origin。

### GET `/api/pokemon/search`

```
Query: q={string}&lang={zh|en|ja}
Response: [
  { id, name_zh, name_en, name_ja, types: string[], sprite_path }
]
```

### GET `/api/pokemon/{id}`

```
Query: lang={zh|en|ja}
Response: {
  id, name_zh, name_en, name_ja,
  types: string[],
  base_stats: { hp, attack, defense, sp_attack, sp_defense, speed },
  abilities: [{ name_zh, name_en, name_ja, desc_zh, desc_en, desc_ja }],
  dream_ability: { ... } | null,
  mega_forms: [...],
  type_matchup: {
    weaknesses:  [{ type, multiplier }],
    resistances: [{ type, multiplier }],
    immunities:  [{ type }]
  }
}
```

### POST `/api/speed`

```
Body: {
  my:  { pokemon_id, nature, modifier_mult },
  tgt: { pokemon_id, nature, modifier_mult, sp }
}
Response: { sp_needed, my_speed, target_speed } | null
```

### POST `/api/survival`

```
Body: {
  pokemon_id, nature,
  attack: { power, attacker_atk, is_physical, type_multiplier }
}
Response: {
  prefer_hp:  { sp_hp, sp_def, final_hp, final_def, total_sp, survived },
  prefer_def: { sp_hp, sp_def, final_hp, final_def, total_sp, survived }
}
```

### POST `/api/admin/rebuild`

```
Response: { count }
```

---

## 前端元件樹

```
app/layout.tsx
└── <LangProvider>
    └── <Nav />              # 頁籤導覽 + 語言切換（zh/en/ja）
        └── {children}

app/page.tsx（搜尋頁）
├── <PokemonSelector />      # debounce 300ms，GET /api/pokemon/search
└── 選到後：
    ├── sprite <img>
    ├── 名稱（三語言）
    ├── <TypeBadge /> ×N
    ├── 特性按鈕列（點擊顯示說明）
    ├── <StatBar /> ×6
    ├── <RadarChart />        # 可疊加 Mega 覆蓋線
    ├── 屬性相性（4×/2×/½×/0×）
    │   └── <TypeBadge /> ×N
    └── Mega 展開區

app/speed/page.tsx
├── 左欄：<PokemonSelector /> + <NatureSelector /> + 修正選單
├── 右欄：<PokemonSelector /> + <NatureSelector /> + 修正選單 + 努力值輸入
└── 結果卡（POST /api/speed，輸入變動即觸發 debounce）

app/survival/page.tsx
├── 左欄：<PokemonSelector /> + <NatureSelector />
├── 右欄：攻擊參數（威力、攻擊值、物理/特殊、屬性倍率）
└── 結果：優先 HP 方案 vs 優先防禦方案（按下計算才送出）
```

---

## 視覺設計規格

**整體風格**：Pokémon Champions 官方暗色系

| 設計元素 | 規格 |
|---------|------|
| 背景色 | `#0a0e1a` 深海軍藍 |
| 光暈效果 | 左下藍 `rgba(59,130,246,0.08)` + 右上紅 `rgba(220,38,38,0.10)` |
| 卡片背景 | `rgba(255,255,255,0.04)` + `1px solid rgba(255,255,255,0.08)` |
| 主文字 | `#e8eaf0` |
| Logo | 紅→橙漸層 `#ef4444 → #f59e0b` |

**屬性標籤（TypeBadge）**：純色矩形 + 白色粗體文字，`white-space: nowrap`，支援 zh/en/ja 不跑版。

| 屬性 | 背景色 |
|------|--------|
| 一般 Normal | `#9A9A70` |
| 格鬥 Fighting | `#9D2721` |
| 飛行 Flying | `#7A6FD0` |
| 毒 Poison | `#8A3D9F` |
| 地面 Ground | `#A88520` |
| 岩石 Rock | `#8A7418` |
| 蟲 Bug | `#6E8510` |
| 幽靈 Ghost | `#6A4E96` |
| 鋼 Steel | `#7878A0` |
| 火 Fire | `#E56B2C` |
| 水 Water | `#4A6FD0` |
| 草 Grass | `#4A9A38` |
| 電 Electric | `#A87E00` |
| 超能力 Psychic | `#D03060` |
| 冰 Ice | `#3A9898` |
| 龍 Dragon | `#5020D8` |
| 惡 Dark | `#5A3A2A` |
| 妖精 Fairy | `#C0607A` |

---

## i18n

- **後端**：`backend/shared/i18n/` 現有三份 JSON 不動，API response 帶三語言欄位
- **前端**：`frontend/lib/i18n/zh.json / en.json / ja.json` 管 UI 用語
- 語言偏好儲存於 `localStorage` + URL query param `?lang=zh`
- `useLang()` hook 提供 `t("key")` 取字串

---

## 錯誤處理

| 情況 | 行為 |
|------|------|
| API 請求失敗 | inline error banner，不 crash 整頁 |
| 搜尋無結果 | 空狀態提示 |
| 速度計算無法超越 | 顯示「無法超越」提示 |
| 生存計算無解 | 顯示「無法生存」提示 |

---

## 開發啟動

```bash
# 後端（port 8000）
cd backend && uvicorn interfaces.api.main:app --reload --port 8000

# 前端（port 3000）
cd frontend && npm run dev
```

前端透過 `NEXT_PUBLIC_API_URL` 環境變數指向後端，開發時預設 `http://localhost:8000`。

---

## 靜態資源（Sprite 圖片）

FastAPI 透過 `StaticFiles` mount 提供寶可夢精靈圖：

```python
app.mount("/sprites", StaticFiles(directory="data/sprites"), name="sprites")
```

前端直接使用 `<img src={`${API_URL}/sprites/${id}.png`} />` 載入。

---

## 遷移說明

1. 現有 Python 檔案整體移入 `backend/`（`import` 路徑需對應調整）
2. `interfaces/streamlit/` 在前端驗收後移除
3. 後端 `tests/` 不動，遷移後需確認全部通過
4. `.gitignore` 加入 `frontend/.next/`、`frontend/node_modules/`
