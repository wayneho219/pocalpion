# Screenshot Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to paste a Nintendo Switch battle selection screenshot (Ctrl+V); the app identifies each Pokemon via type-badge color detection + dHash sprite matching and shows them in persistent floating side panels that auto-fill fields on speed, survival, and home pages.

**Architecture:** Backend exposes a one-time `/api/sprites/hashes` endpoint (Pillow-based dHash, cached in memory); frontend loads this ~120KB DB into localStorage and does all real-time processing in the browser using Canvas API crop → grayscale dHash → Hamming distance ranking. Global React context (mounted at layout level) holds identified slots and page-level handlers; a floating ScreenshotPanel renders on every page.

**Tech Stack:** Python + Pillow (backend hash generation), TypeScript + Canvas API + BigInt (frontend hashing), React Context (global state), Next.js App Router (layout integration).

---

## File Map

**Backend — new/modified:**
- Create: `backend/application/sprite_hash_service.py` — dHash computation + in-memory cache
- Modify: `backend/interfaces/api/schemas.py` — add `MegaHashOut`, `SpriteHashOut`
- Create: `backend/interfaces/api/routers/sprites.py` — `GET /api/sprites/hashes`
- Modify: `backend/interfaces/api/main.py` — register sprites router
- Modify: `backend/requirements.txt` — add `Pillow>=10.0`
- Create: `backend/tests/application/test_sprite_hash_service.py`

**Frontend — new/modified:**
- Create: `frontend/lib/screenshot/dhash.ts` — pure dHash + Hamming functions + DOM wrapper
- Create: `frontend/lib/screenshot/matcher.ts` — type filter + Hamming distance ranking
- Create: `frontend/lib/screenshot/regions.ts` — relative crop coordinates for 12 slots
- Create: `frontend/lib/screenshot/type-detect.ts` — type badge RGB color detection
- Create: `frontend/lib/screenshot/index.ts` — pipeline entry point
- Modify: `frontend/lib/api.ts` — add `getSpritesHashes()`
- Create: `frontend/lib/screenshot-context.tsx` — global context + localStorage DB caching
- Create: `frontend/components/ClientWrapper.tsx` — client provider + paste listener
- Modify: `frontend/app/layout.tsx` — wrap children with ClientWrapper
- Create: `frontend/components/ScreenshotPanel.tsx` — floating side panels
- Modify: `frontend/components/PokemonSelector.tsx` — add optional `value` prop
- Modify: `frontend/app/speed/page.tsx` — register context handlers
- Modify: `frontend/app/survival/page.tsx` — register context handlers
- Modify: `frontend/app/page.tsx` — register context handlers
- Create: `frontend/__tests__/screenshot/dhash.test.ts`
- Create: `frontend/__tests__/screenshot/matcher.test.ts`

---

## Task 1: Backend — Pillow + SpriteHashService

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/application/sprite_hash_service.py`
- Create: `backend/tests/application/test_sprite_hash_service.py`

- [ ] **Step 1: Add Pillow to requirements**

In `backend/requirements.txt`, append:
```
Pillow>=10.0
```

Install: `cd backend && pip install Pillow`

- [ ] **Step 2: Write failing tests**

Create `backend/tests/application/test_sprite_hash_service.py`:
```python
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
```

- [ ] **Step 3: Run tests — expect failure**

```bash
cd /Users/wayneho/poke-calc/backend && python -m pytest tests/application/test_sprite_hash_service.py -v
```
Expected: `ModuleNotFoundError: No module named 'application.sprite_hash_service'`

- [ ] **Step 4: Implement SpriteHashService**

Create `backend/application/sprite_hash_service.py`:
```python
from pathlib import Path
from PIL import Image
from shared.config import SPRITES_DIR, MEGA_SPRITES_DIR
from shared.exceptions import PokemonNotFoundError

HASH_SIZE = 8
_cache: list[dict] | None = None


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
```

- [ ] **Step 5: Run tests — expect pass**

```bash
cd /Users/wayneho/poke-calc/backend && python -m pytest tests/application/test_sprite_hash_service.py -v
```
Expected: all 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/requirements.txt backend/application/sprite_hash_service.py backend/tests/application/test_sprite_hash_service.py
git commit -m "feat(backend): add SpriteHashService for dHash sprite fingerprinting"
```

---

## Task 2: Backend — sprites router + schema

**Files:**
- Modify: `backend/interfaces/api/schemas.py`
- Create: `backend/interfaces/api/routers/sprites.py`
- Modify: `backend/interfaces/api/main.py`

- [ ] **Step 1: Add schemas**

In `backend/interfaces/api/schemas.py`, append:
```python
class MegaHashOut(BaseModel):
    suffix: str
    hash: str


class SpriteHashOut(BaseModel):
    id: int
    name_en: str
    name_zh: str
    name_ja: str
    types: list[str]
    hash: str
    mega: list[MegaHashOut]
```

- [ ] **Step 2: Create sprites router**

Create `backend/interfaces/api/routers/sprites.py`:
```python
from fastapi import APIRouter
from interfaces.api.deps import get_services
from interfaces.api.schemas import SpriteHashOut
from application.sprite_hash_service import get_hashes

router = APIRouter()


@router.get("/hashes", response_model=list[SpriteHashOut])
def sprite_hashes():
    svc = get_services()
    return get_hashes(svc["repo"])
```

- [ ] **Step 3: Register router in main.py**

In `backend/interfaces/api/main.py`, add the import and `include_router` call:
```python
# Add to imports:
from interfaces.api.routers import pokemon, speed, survival, admin, sprites

# Add after the existing include_router calls:
app.include_router(sprites.router, prefix="/api/sprites", tags=["sprites"])
```

- [ ] **Step 4: Smoke-test the endpoint**

Start the backend: `cd /Users/wayneho/poke-calc/backend && uvicorn interfaces.api.main:app --reload`

In another terminal:
```bash
curl -s http://localhost:8000/api/sprites/hashes | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d), 'entries'); print(d[0])"
```
Expected: prints entry count and first entry with `id`, `name_en`, `hash`, `types`, `mega` fields.

- [ ] **Step 5: Commit**

```bash
git add backend/interfaces/api/schemas.py backend/interfaces/api/routers/sprites.py backend/interfaces/api/main.py
git commit -m "feat(backend): expose GET /api/sprites/hashes endpoint"
```

---

## Task 3: Frontend — dHash utility

**Files:**
- Create: `frontend/lib/screenshot/dhash.ts`
- Create: `frontend/__tests__/screenshot/dhash.test.ts`
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/__tests__/screenshot/dhash.test.ts`:
```typescript
import { dhashFromPixels, hammingDistance } from "@/lib/screenshot/dhash";

describe("dhashFromPixels", () => {
  it("returns 16-char hex string", () => {
    const pixels = new Uint8Array(9 * 8).fill(128);
    expect(dhashFromPixels(pixels, 9)).toMatch(/^[0-9a-f]{16}$/);
  });

  it("uniform pixels yield all-zero hash (no gradients)", () => {
    const pixels = new Uint8Array(9 * 8).fill(200);
    expect(dhashFromPixels(pixels, 9)).toBe("0000000000000000");
  });

  it("strictly decreasing row yields all-ones hash", () => {
    // Each row: col 0=255, col 1=245, ..., col 8=175 → every left > right
    const pixels = new Uint8Array(9 * 8);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 9; col++) {
        pixels[row * 9 + col] = 255 - col * 10;
      }
    }
    expect(dhashFromPixels(pixels, 9)).toBe("ffffffffffffffff");
  });
});

describe("hammingDistance", () => {
  it("identical strings → 0", () => {
    expect(hammingDistance("a1b2c3d4e5f60708", "a1b2c3d4e5f60708")).toBe(0);
  });

  it("all bits flipped → 64", () => {
    expect(hammingDistance("0000000000000000", "ffffffffffffffff")).toBe(64);
  });

  it("single bit difference → 1", () => {
    expect(hammingDistance("0000000000000001", "0000000000000000")).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd /Users/wayneho/poke-calc/frontend && npx jest __tests__/screenshot/dhash.test.ts
```
Expected: `Cannot find module '@/lib/screenshot/dhash'`

- [ ] **Step 3: Implement dhash.ts**

Create `frontend/lib/screenshot/dhash.ts`:
```typescript
const HASH_SIZE = 8;

/** Pure function — testable without DOM. stride = pixels per row (= HASH_SIZE + 1 for dHash). */
export function dhashFromPixels(grayPixels: Uint8Array, stride: number): string {
  let bits = 0n;
  for (let row = 0; row < HASH_SIZE; row++) {
    for (let col = 0; col < HASH_SIZE; col++) {
      bits <<= 1n;
      if (grayPixels[row * stride + col] > grayPixels[row * stride + col + 1]) {
        bits |= 1n;
      }
    }
  }
  return bits.toString(16).padStart(16, "0");
}

export function hammingDistance(a: string, b: string): number {
  let xor = BigInt("0x" + a) ^ BigInt("0x" + b);
  let dist = 0;
  while (xor > 0n) {
    if (xor & 1n) dist++;
    xor >>= 1n;
  }
  return dist;
}

/** DOM wrapper — not unit tested. Resizes imageData to (HASH_SIZE+1)×HASH_SIZE, converts to grayscale. */
export function dhash(imageData: ImageData): string {
  return dhashFromPixels(_toGrayscaleResized(imageData, HASH_SIZE + 1, HASH_SIZE), HASH_SIZE + 1);
}

function _toGrayscaleResized(src: ImageData, w: number, h: number): Uint8Array {
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = src.width;
  srcCanvas.height = src.height;
  srcCanvas.getContext("2d")!.putImageData(src, 0, 0);

  const dst = document.createElement("canvas");
  dst.width = w;
  dst.height = h;
  const ctx = dst.getContext("2d")!;
  ctx.drawImage(srcCanvas, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
  }
  return gray;
}
```

- [ ] **Step 4: Add getSpritesHashes to api.ts**

In `frontend/lib/api.ts`, add the type import and method. Add after the existing imports:
```typescript
import type { PokemonSearchResult, PokemonDetail, SpeedResult, SurvivalResult, SpriteHashEntry } from "./types";
```

Add to the `api` object:
```typescript
  getSpritesHashes: () =>
    request<SpriteHashEntry[]>("/api/sprites/hashes"),
```

- [ ] **Step 5: Add SpriteHashEntry to types.ts**

In `frontend/lib/types.ts`, append:
```typescript
export interface MegaHashEntry {
  suffix: string;
  hash: string;
}

export interface SpriteHashEntry {
  id: number;
  name_en: string;
  name_zh: string;
  name_ja: string;
  types: string[];
  hash: string;
  mega: MegaHashEntry[];
}
```

- [ ] **Step 6: Run tests — expect pass**

```bash
cd /Users/wayneho/poke-calc/frontend && npx jest __tests__/screenshot/dhash.test.ts
```
Expected: all 6 tests PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/lib/screenshot/dhash.ts frontend/__tests__/screenshot/dhash.test.ts frontend/lib/api.ts frontend/lib/types.ts
git commit -m "feat(frontend): add dHash utility and SpriteHashEntry type"
```

---

## Task 4: Frontend — matcher

**Files:**
- Create: `frontend/lib/screenshot/matcher.ts`
- Create: `frontend/__tests__/screenshot/matcher.test.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/__tests__/screenshot/matcher.test.ts`:
```typescript
import { rankCandidates } from "@/lib/screenshot/matcher";
import type { SpriteHashEntry } from "@/lib/types";

const DB: SpriteHashEntry[] = [
  { id: 1,  name_en: "Bulbasaur",  name_zh: "妙蛙種子", name_ja: "フシギダネ", types: ["grass","poison"], hash: "0000000000000000", mega: [] },
  { id: 4,  name_en: "Charmander", name_zh: "小火龍",   name_ja: "ヒトカゲ",   types: ["fire"],           hash: "ffffffffffffffff", mega: [] },
  { id: 7,  name_en: "Squirtle",   name_zh: "傑尼龜",   name_ja: "ゼニガメ",   types: ["water"],          hash: "5555555555555555", mega: [] },
  { id: 9,  name_en: "Blastoise",  name_zh: "水箭龜",   name_ja: "カメックス", types: ["water"],          hash: "aaaaaaaaaaaaaaaa",
    mega: [{ suffix: "mega", hash: "cccccccccccccccc" }] },
];

describe("rankCandidates", () => {
  it("returns best match first (confidence = 1 for exact hash)", () => {
    const r = rankCandidates("0000000000000000", [], DB);
    expect(r[0].id).toBe(1);
    expect(r[0].confidence).toBe(1);
  });

  it("filters by detected types when provided", () => {
    const r = rankCandidates("0000000000000000", ["fire"], DB);
    expect(r.every(c => c.types.includes("fire"))).toBe(true);
  });

  it("falls back to full DB if no entry matches detected type", () => {
    const r = rankCandidates("0000000000000000", ["dragon"], DB);
    expect(r.length).toBeGreaterThan(0);
  });

  it("includes mega forms as candidates", () => {
    const r = rankCandidates("cccccccccccccccc", [], DB);
    expect(r[0].name_en).toContain("mega");
    expect(r[0].id).toBe(9);
    expect(r[0].confidence).toBe(1);
  });

  it("respects topN limit", () => {
    expect(rankCandidates("0000000000000000", [], DB, 2)).toHaveLength(2);
  });

  it("confidence is between 0 and 1", () => {
    rankCandidates("0000000000000000", [], DB).forEach(c => {
      expect(c.confidence).toBeGreaterThanOrEqual(0);
      expect(c.confidence).toBeLessThanOrEqual(1);
    });
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd /Users/wayneho/poke-calc/frontend && npx jest __tests__/screenshot/matcher.test.ts
```
Expected: `Cannot find module '@/lib/screenshot/matcher'`

- [ ] **Step 3: Implement matcher.ts**

Create `frontend/lib/screenshot/matcher.ts`:
```typescript
import { hammingDistance } from "./dhash";
import type { SpriteHashEntry } from "@/lib/types";

export interface Candidate {
  id: number;
  name_en: string;
  name_zh: string;
  name_ja: string;
  types: string[];
  confidence: number;
}

export function rankCandidates(
  hash: string,
  detectedTypes: string[],
  db: SpriteHashEntry[],
  topN = 5,
): Candidate[] {
  const filtered =
    detectedTypes.length > 0
      ? db.filter(e => detectedTypes.some(t => e.types.includes(t)))
      : db;
  const pool = filtered.length > 0 ? filtered : db;

  const entries: { id: number; name_en: string; name_zh: string; name_ja: string; types: string[]; hash: string }[] = [];
  for (const e of pool) {
    entries.push({ id: e.id, name_en: e.name_en, name_zh: e.name_zh, name_ja: e.name_ja, types: e.types, hash: e.hash });
    for (const m of e.mega) {
      entries.push({
        id: e.id,
        name_en: `${e.name_en} (${m.suffix})`,
        name_zh: `${e.name_zh} (${m.suffix})`,
        name_ja: `${e.name_ja} (${m.suffix})`,
        types: e.types,
        hash: m.hash,
      });
    }
  }

  return entries
    .map(e => ({ ...e, confidence: 1 - hammingDistance(hash, e.hash) / 64 }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, topN);
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd /Users/wayneho/poke-calc/frontend && npx jest __tests__/screenshot/matcher.test.ts
```
Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/screenshot/matcher.ts frontend/__tests__/screenshot/matcher.test.ts
git commit -m "feat(frontend): add candidate matcher with type-filter and Hamming ranking"
```

---

## Task 5: Frontend — crop regions + type detection

**Files:**
- Create: `frontend/lib/screenshot/regions.ts`
- Create: `frontend/lib/screenshot/type-detect.ts`

- [ ] **Step 1: Create regions.ts**

These coordinates are tuned for Nintendo Switch battle selection screens (1280×720 or 1920×1080). Adjust `ROW_STARTS` / `RIGHT_ROW_STARTS` if the layout differs on your screenshots.

Create `frontend/lib/screenshot/regions.ts`:
```typescript
export interface CropRect {
  xFrac: number;
  yFrac: number;
  wFrac: number;
  hFrac: number;
}

export interface SlotRegion {
  sprite: CropRect;
  badge?: CropRect;
}

// Left side (player's Pokemon) — sprite at right end of each row card
const LEFT_SPRITE_X = 0.215;
const LEFT_SPRITE_W = 0.075;
const LEFT_ROW_STARTS = [0.115, 0.228, 0.341, 0.454, 0.567, 0.680] as const;
const LEFT_ROW_H = 0.108;

export const LEFT_REGIONS: SlotRegion[] = LEFT_ROW_STARTS.map(y => ({
  sprite: { xFrac: LEFT_SPRITE_X, yFrac: y, wFrac: LEFT_SPRITE_W, hFrac: LEFT_ROW_H },
}));

// Right side (opponent's Pokemon) — thumbnail + type badge to its right
const RIGHT_SPRITE_X = 0.678;
const RIGHT_SPRITE_W = 0.098;
const RIGHT_BADGE_X  = 0.778;
const RIGHT_BADGE_W  = 0.048;
const RIGHT_ROW_STARTS = [0.072, 0.205, 0.338, 0.471, 0.604, 0.737] as const;
const RIGHT_ROW_H = 0.122;

export const RIGHT_REGIONS: SlotRegion[] = RIGHT_ROW_STARTS.map(y => ({
  sprite: { xFrac: RIGHT_SPRITE_X, yFrac: y, wFrac: RIGHT_SPRITE_W, hFrac: RIGHT_ROW_H },
  badge:  { xFrac: RIGHT_BADGE_X,  yFrac: y, wFrac: RIGHT_BADGE_W,  hFrac: RIGHT_ROW_H },
}));

export function cropToImageData(canvas: HTMLCanvasElement, rect: CropRect): ImageData {
  const x = Math.round(rect.xFrac * canvas.width);
  const y = Math.round(rect.yFrac * canvas.height);
  const w = Math.max(1, Math.round(rect.wFrac * canvas.width));
  const h = Math.max(1, Math.round(rect.hFrac * canvas.height));
  return canvas.getContext("2d")!.getImageData(x, y, w, h);
}
```

- [ ] **Step 2: Create type-detect.ts**

Create `frontend/lib/screenshot/type-detect.ts`:
```typescript
export type PokemonType =
  | "normal" | "fire" | "water" | "electric" | "grass" | "ice"
  | "fighting" | "poison" | "ground" | "flying" | "psychic" | "bug"
  | "rock" | "ghost" | "dragon" | "dark" | "steel" | "fairy";

interface TypeColor { type: PokemonType; r: [number,number]; g: [number,number]; b: [number,number] }

const TYPE_RANGES: TypeColor[] = [
  { type: "fire",      r: [195, 255], g: [80,  165], b: [0,   85]  },
  { type: "water",     r: [40,  120], g: [120, 200], b: [175, 255] },
  { type: "grass",     r: [75,  155], g: [155, 225], b: [55,  130] },
  { type: "electric",  r: [195, 255], g: [195, 255], b: [0,   100] },
  { type: "ice",       r: [125, 200], g: [200, 255], b: [200, 255] },
  { type: "fighting",  r: [145, 220], g: [55,  130], b: [55,  120] },
  { type: "poison",    r: [125, 200], g: [55,  130], b: [140, 215] },
  { type: "ground",    r: [175, 240], g: [145, 210], b: [75,  145] },
  { type: "flying",    r: [135, 200], g: [155, 220], b: [205, 255] },
  { type: "psychic",   r: [205, 255], g: [75,  150], b: [115, 190] },
  { type: "bug",       r: [115, 190], g: [175, 240], b: [35,  115] },
  { type: "rock",      r: [145, 210], g: [125, 190], b: [75,  145] },
  { type: "ghost",     r: [75,  140], g: [75,  140], b: [135, 200] },
  { type: "dragon",    r: [55,  130], g: [75,  150], b: [175, 255] },
  { type: "dark",      r: [55,  120], g: [45,  110], b: [55,  120] },
  { type: "steel",     r: [145, 210], g: [155, 220], b: [165, 230] },
  { type: "fairy",     r: [205, 255], g: [145, 210], b: [175, 240] },
  { type: "normal",    r: [145, 210], g: [145, 210], b: [135, 200] },
];

export function detectTypes(imageData: ImageData): PokemonType[] {
  let r = 0, g = 0, b = 0;
  const n = imageData.width * imageData.height;
  for (let i = 0; i < n; i++) {
    r += imageData.data[i * 4];
    g += imageData.data[i * 4 + 1];
    b += imageData.data[i * 4 + 2];
  }
  r /= n; g /= n; b /= n;
  return TYPE_RANGES
    .filter(tc => r >= tc.r[0] && r <= tc.r[1] && g >= tc.g[0] && g <= tc.g[1] && b >= tc.b[0] && b <= tc.b[1])
    .map(tc => tc.type);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/screenshot/regions.ts frontend/lib/screenshot/type-detect.ts
git commit -m "feat(frontend): add crop region definitions and type badge color detection"
```

---

## Task 6: Frontend — screenshot pipeline

**Files:**
- Create: `frontend/lib/screenshot/index.ts`

- [ ] **Step 1: Create pipeline entry point**

Create `frontend/lib/screenshot/index.ts`:
```typescript
import { dhash } from "./dhash";
import { detectTypes } from "./type-detect";
import { cropToImageData, LEFT_REGIONS, RIGHT_REGIONS } from "./regions";
import { rankCandidates } from "./matcher";
import type { Candidate } from "./matcher";
import type { SpriteHashEntry } from "@/lib/types";

export type SlotCandidates = Candidate[];

export interface AnalysisResult {
  left: SlotCandidates[];
  right: SlotCandidates[];
}

export function analyzeScreenshot(
  canvas: HTMLCanvasElement,
  db: SpriteHashEntry[],
): AnalysisResult {
  const processSlot = (spriteData: ImageData, badgeData?: ImageData): SlotCandidates => {
    const hash = dhash(spriteData);
    const types = badgeData ? detectTypes(badgeData) : [];
    return rankCandidates(hash, types, db);
  };

  const left = LEFT_REGIONS.map(r =>
    processSlot(cropToImageData(canvas, r.sprite))
  );
  const right = RIGHT_REGIONS.map(r =>
    processSlot(
      cropToImageData(canvas, r.sprite),
      r.badge ? cropToImageData(canvas, r.badge) : undefined,
    )
  );

  return { left, right };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/screenshot/index.ts
git commit -m "feat(frontend): add screenshot analysis pipeline"
```

---

## Task 7: Frontend — ScreenshotContext

**Files:**
- Create: `frontend/lib/screenshot-context.tsx`

- [ ] **Step 1: Create context**

Create `frontend/lib/screenshot-context.tsx`:
```typescript
"use client";
import React, { createContext, useCallback, useContext, useState } from "react";
import type { Candidate } from "./screenshot/matcher";
import type { SpriteHashEntry } from "./types";

export type SlotCandidates = Candidate[];

interface ScreenshotContextValue {
  left: SlotCandidates[];
  right: SlotCandidates[];
  isProcessing: boolean;
  onSelectLeft: ((c: Candidate) => void) | null;
  onSelectRight: ((c: Candidate) => void) | null;
  registerHandlers: (
    left: ((c: Candidate) => void) | null,
    right: ((c: Candidate) => void) | null,
  ) => void;
  processScreenshot: (canvas: HTMLCanvasElement) => Promise<void>;
}

const ScreenshotContext = createContext<ScreenshotContextValue | null>(null);

const HASH_DB_KEY = "poke_hash_db_v1";

async function loadHashDB(): Promise<SpriteHashEntry[]> {
  const cached = localStorage.getItem(HASH_DB_KEY);
  if (cached) return JSON.parse(cached) as SpriteHashEntry[];
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const res = await fetch(`${base}/api/sprites/hashes`);
  if (!res.ok) throw new Error("Failed to load sprite hash DB");
  const data = await res.json() as SpriteHashEntry[];
  localStorage.setItem(HASH_DB_KEY, JSON.stringify(data));
  return data;
}

export function ScreenshotProvider({ children }: { children: React.ReactNode }) {
  const [left,  setLeft]  = useState<SlotCandidates[]>([]);
  const [right, setRight] = useState<SlotCandidates[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [onSelectLeft,  setOnSelectLeft]  = useState<((c: Candidate) => void) | null>(null);
  const [onSelectRight, setOnSelectRight] = useState<((c: Candidate) => void) | null>(null);

  const registerHandlers = useCallback(
    (l: ((c: Candidate) => void) | null, r: ((c: Candidate) => void) | null) => {
      setOnSelectLeft(() => l);
      setOnSelectRight(() => r);
    },
    [],
  );

  const processScreenshot = useCallback(async (canvas: HTMLCanvasElement) => {
    setIsProcessing(true);
    try {
      const db = await loadHashDB();
      const { analyzeScreenshot } = await import("./screenshot/index");
      const result = analyzeScreenshot(canvas, db);
      setLeft(result.left);
      setRight(result.right);
    } catch (err) {
      console.error("Screenshot analysis failed:", err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return (
    <ScreenshotContext.Provider value={{
      left, right, isProcessing, onSelectLeft, onSelectRight, registerHandlers, processScreenshot,
    }}>
      {children}
    </ScreenshotContext.Provider>
  );
}

export function useScreenshot(): ScreenshotContextValue {
  const ctx = useContext(ScreenshotContext);
  if (!ctx) throw new Error("useScreenshot must be used within ScreenshotProvider");
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/screenshot-context.tsx
git commit -m "feat(frontend): add ScreenshotContext with paste-triggered analysis and page handlers"
```

---

## Task 8: Frontend — ClientWrapper + layout integration

**Files:**
- Create: `frontend/components/ClientWrapper.tsx`
- Modify: `frontend/app/layout.tsx`

- [ ] **Step 1: Create ClientWrapper**

Create `frontend/components/ClientWrapper.tsx`:
```typescript
"use client";
import { useEffect } from "react";
import { ScreenshotProvider, useScreenshot } from "@/lib/screenshot-context";
import { ScreenshotPanel } from "@/components/ScreenshotPanel";

function PasteListener() {
  const { processScreenshot } = useScreenshot();

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (!item.type.startsWith("image/")) continue;
        const blob = item.getAsFile();
        if (!blob) continue;
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width  = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d")!.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          processScreenshot(canvas);
        };
        img.src = url;
        break;
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [processScreenshot]);

  return null;
}

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ScreenshotProvider>
      <PasteListener />
      <ScreenshotPanel />
      {children}
    </ScreenshotProvider>
  );
}
```

- [ ] **Step 2: Update layout.tsx**

Replace `frontend/app/layout.tsx` with:
```typescript
import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";
import { Nav } from "@/components/Nav";
import { ClientWrapper } from "@/components/ClientWrapper";

export const metadata: Metadata = {
  title: "Pokémon Calc",
  description: "Pokémon stat calculator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>
        <LangProvider>
          <ClientWrapper>
            <Nav />
            <main className="relative z-[1]">{children}</main>
          </ClientWrapper>
        </LangProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/ClientWrapper.tsx frontend/app/layout.tsx
git commit -m "feat(frontend): add ClientWrapper with paste listener and screenshot context"
```

---

## Task 9: Frontend — ScreenshotPanel component

**Files:**
- Create: `frontend/components/ScreenshotPanel.tsx`

- [ ] **Step 1: Create ScreenshotPanel**

Create `frontend/components/ScreenshotPanel.tsx`:
```typescript
"use client";
import { useState } from "react";
import { useScreenshot } from "@/lib/screenshot-context";
import type { Candidate } from "@/lib/screenshot/matcher";
import type { SlotCandidates } from "@/lib/screenshot-context";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function PokemonSlot({ slot, onSelect }: { slot: SlotCandidates; onSelect: (c: Candidate) => void }) {
  const [expanded, setExpanded] = useState(false);
  const top = slot[0];
  if (!top) return <div className="h-9 rounded-lg bg-white/5" />;

  const lowConf = top.confidence < 0.80;

  return (
    <div>
      <button
        onClick={() => lowConf ? setExpanded(p => !p) : onSelect(top)}
        className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors text-left"
      >
        <img
          src={`${API}/sprites/${top.id}.png`}
          alt={top.name_en}
          className="w-8 h-8 object-contain shrink-0"
        />
        <span className="text-xs text-white/80 truncate flex-1">{top.name_en}</span>
        <div
          className="w-1.5 h-5 rounded-full shrink-0"
          style={{ background: `hsl(${Math.round(top.confidence * 120)},70%,50%)` }}
        />
      </button>
      {expanded && (
        <ul className="ml-2 mt-0.5 bg-black/50 rounded-lg overflow-hidden">
          {slot.slice(0, 3).map(c => (
            <li key={`${c.id}-${c.name_en}`}>
              <button
                onClick={() => { onSelect(c); setExpanded(false); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/10 text-xs text-white/70 text-left"
              >
                <img src={`${API}/sprites/${c.id}.png`} alt={c.name_en} className="w-5 h-5 object-contain shrink-0" />
                <span className="truncate flex-1">{c.name_en}</span>
                <span className="text-white/40 shrink-0">{Math.round(c.confidence * 100)}%</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SidePanel({
  side, slots, onSelect,
}: {
  side: "left" | "right";
  slots: SlotCandidates[];
  onSelect: ((c: Candidate) => void) | null;
}) {
  const isLeft = side === "left";
  if (slots.length === 0) return null;

  return (
    <div className={`fixed top-1/2 -translate-y-1/2 z-50 ${isLeft ? "left-0" : "right-0"}`}>
      <div
        className={`bg-[#0d1320]/90 border border-white/10 backdrop-blur-md
          ${isLeft ? "rounded-r-2xl" : "rounded-l-2xl"} p-2 w-44`}
      >
        <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2 px-1">
          {isLeft ? "我方" : "對手"}
        </div>
        <div className="flex flex-col gap-1">
          {slots.map((slot, i) => (
            <PokemonSlot key={i} slot={slot} onSelect={onSelect ?? (() => {})} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ScreenshotPanel() {
  const { left, right, isProcessing, onSelectLeft, onSelectRight } = useScreenshot();

  return (
    <>
      {isProcessing && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-black/80 backdrop-blur
          text-white/70 text-xs px-4 py-1.5 rounded-full pointer-events-none">
          辨識截圖中…
        </div>
      )}
      <SidePanel side="left"  slots={left}  onSelect={onSelectLeft}  />
      <SidePanel side="right" slots={right} onSelect={onSelectRight} />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/ScreenshotPanel.tsx
git commit -m "feat(frontend): add floating ScreenshotPanel with confidence-gated candidate picker"
```

---

## Task 10: Frontend — PokemonSelector value prop + page integration

**Files:**
- Modify: `frontend/components/PokemonSelector.tsx`
- Modify: `frontend/app/speed/page.tsx`
- Modify: `frontend/app/survival/page.tsx`
- Modify: `frontend/app/page.tsx`

- [ ] **Step 1: Add value prop to PokemonSelector**

In `frontend/components/PokemonSelector.tsx`:

Change the interface:
```typescript
interface PokemonSelectorProps {
  id: string;
  label: string;
  lang: Lang;
  onSelect: (p: PokemonSearchResult) => void;
  value?: PokemonSearchResult | null;
}
```

Add after the `nameKey` line (before the `return`):
```typescript
useEffect(() => {
  if (value) setQuery(value[nameKey] as string);
  else setQuery("");
}, [value, nameKey]);
```

Update the function signature to destructure `value`:
```typescript
export function PokemonSelector({ id, label, lang, onSelect, value }: PokemonSelectorProps) {
```

- [ ] **Step 2: Integrate speed page**

In `frontend/app/speed/page.tsx`, add to imports:
```typescript
import { useScreenshot } from "@/lib/screenshot-context";
import type { Candidate } from "@/lib/screenshot/matcher";
import type { PokemonSearchResult } from "@/lib/types";
```

Inside the `SpeedPage` component, add after the existing `useState` declarations:
```typescript
const { registerHandlers } = useScreenshot();
useEffect(() => {
  const toResult = (c: Candidate): PokemonSearchResult => ({
    id: c.id, name_en: c.name_en, name_zh: c.name_zh, name_ja: c.name_ja, types: c.types,
  });
  registerHandlers(
    (c) => { setMyMon(toResult(c)); setMyMegaIdx(null); },
    (c) => { setTgtMon(toResult(c)); setTgtMegaIdx(null); },
  );
  return () => registerHandlers(null, null);
}, [registerHandlers]);
```

Add `value={myMon}` to the first `PokemonSelector` and `value={tgtMon}` to the second.

- [ ] **Step 3: Integrate survival page**

In `frontend/app/survival/page.tsx`, add to imports:
```typescript
import { useScreenshot } from "@/lib/screenshot-context";
import type { Candidate } from "@/lib/screenshot/matcher";
import type { PokemonSearchResult } from "@/lib/types";
```

Inside the `SurvivalPage` component, add after the existing `useState` declarations:
```typescript
const { registerHandlers } = useScreenshot();
useEffect(() => {
  const toResult = (c: Candidate): PokemonSearchResult => ({
    id: c.id, name_en: c.name_en, name_zh: c.name_zh, name_ja: c.name_ja, types: c.types,
  });
  registerHandlers((c) => setMon(toResult(c)), null);
  return () => registerHandlers(null, null);
}, [registerHandlers]);
```

Add `value={mon}` to the `PokemonSelector` in the survival page.

- [ ] **Step 4: Integrate home/search page**

In `frontend/app/page.tsx`, add to imports:
```typescript
import { useScreenshot } from "@/lib/screenshot-context";
import type { Candidate } from "@/lib/screenshot/matcher";
import type { PokemonSearchResult } from "@/lib/types";
```

Inside `SearchPage`, add after the existing `useState` declarations:
```typescript
const { registerHandlers } = useScreenshot();
useEffect(() => {
  const toResult = (c: Candidate): PokemonSearchResult => ({
    id: c.id, name_en: c.name_en, name_zh: c.name_zh, name_ja: c.name_ja, types: c.types,
  });
  registerHandlers(
    (c) => handleSelect(toResult(c)),
    (c) => handleSelect(toResult(c)),
  );
  return () => registerHandlers(null, null);
}, [registerHandlers]);
```

Add `value={pokemon ? { id: pokemon.id, name_en: pokemon.name_en, name_zh: pokemon.name_zh, name_ja: pokemon.name_ja, types: [] } : null}` to the `PokemonSelector` in `page.tsx`.

- [ ] **Step 5: Run full frontend test suite**

```bash
cd /Users/wayneho/poke-calc/frontend && npx jest
```
Expected: all tests PASS (no regressions)

- [ ] **Step 6: Start dev server and smoke-test the feature**

```bash
cd /Users/wayneho/poke-calc/frontend && npm run dev
```

Manual test checklist:
- [ ] Open http://localhost:3000
- [ ] Take a Switch battle selection screenshot, copy to clipboard
- [ ] Paste with Ctrl+V — "辨識截圖中…" toast appears briefly
- [ ] Two floating panels appear (left = 我方, right = 對手) with 6 slots each
- [ ] Navigate to /speed — panels persist; click a right-panel Pokemon → fills "opponent" selector
- [ ] Navigate to /survival — click a left-panel Pokemon → fills the selector
- [ ] For low-confidence slots: clicking expands a 3-candidate picker

- [ ] **Step 7: Commit**

```bash
git add frontend/components/PokemonSelector.tsx frontend/app/speed/page.tsx frontend/app/survival/page.tsx frontend/app/page.tsx
git commit -m "feat(frontend): integrate screenshot panels with speed, survival, and search pages"
```
