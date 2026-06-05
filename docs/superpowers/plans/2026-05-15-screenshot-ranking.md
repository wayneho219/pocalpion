# Screenshot Ranking Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve screenshot Pokémon detection by filtering to final evolutions only, removing mega forms from candidates, and blending VGC competitive usage weights into the ranking score.

**Architecture:** Three-layer change — backend exposes `is_final_evolution` in the sprite hash endpoint; frontend stores a static `vgc_usage.json`; `rankByHash` merges both signals into `score = dhash×0.7 + usage×0.3`.

**Tech Stack:** Python/FastAPI (backend), TypeScript/Next.js (frontend), Jest (frontend tests), pytest (backend tests)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `backend/interfaces/api/schemas.py` | Modify | Add `is_final_evolution: bool` to `SpriteHashOut` |
| `backend/application/sprite_hash_service.py` | Modify | Include `is_final_evolution` in hash entry dict |
| `backend/tests/application/test_sprite_hash_service.py` | Modify | Fix mock to include `is_final_evolution`; assert key present |
| `frontend/lib/types.ts` | Modify | Add `is_final_evolution: boolean` to `SpriteHashEntry` |
| `frontend/lib/data/vgc_usage.json` | Create | Static VGC usage weights (name_en lowercase → 0–1) |
| `frontend/lib/screenshot/matcher.ts` | Modify | `rankByHash` filters finals, drops mega, blends usage weight |
| `frontend/lib/screenshot/index.ts` | Modify | Import and pass `vgc_usage.json` to `rankByHash` |
| `frontend/lib/screenshot-context.tsx` | Modify | Bump localStorage cache key to `poke_hash_db_v2` |
| `frontend/__tests__/screenshot/matcher.test.ts` | Modify | Update DB fixture with `is_final_evolution`; add usage-weight tests |

---

## Task 1: Backend — add `is_final_evolution` to sprite hash endpoint

**Files:**
- Modify: `backend/interfaces/api/schemas.py`
- Modify: `backend/application/sprite_hash_service.py`
- Modify: `backend/tests/application/test_sprite_hash_service.py`

- [ ] **Step 1: Write the failing test**

In `backend/tests/application/test_sprite_hash_service.py`, update the mock in `test_returns_expected_keys` to set `is_final_evolution` and assert the key appears in the result:

```python
# in class TestGetHashes, method test_returns_expected_keys
mock_pokemon.is_final_evolution = True   # ADD THIS LINE

# change the assertion from:
for key in ("id", "name_en", "name_zh", "name_ja", "types", "hash", "mega"):
    assert key in entry
# to:
for key in ("id", "name_en", "name_zh", "name_ja", "types", "hash", "mega", "is_final_evolution"):
    assert key in entry
assert entry["is_final_evolution"] is True
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd /Users/wayneho/poke-calc/backend
python -m pytest tests/application/test_sprite_hash_service.py::TestGetHashes::test_returns_expected_keys -v
```

Expected: FAIL — `AssertionError: assert 'is_final_evolution' in {...}`

- [ ] **Step 3: Update `SpriteHashOut` schema**

In `backend/interfaces/api/schemas.py`, add one field to `SpriteHashOut`:

```python
class SpriteHashOut(BaseModel):
    id: int
    name_en: str
    name_zh: str
    name_ja: str
    types: list[str]
    hash: str
    mega: list[MegaHashOut]
    is_final_evolution: bool          # ADD THIS
```

- [ ] **Step 4: Update `sprite_hash_service.py` to include the field**

In `backend/application/sprite_hash_service.py`, update the `entry` dict inside `_build()`:

```python
entry: dict = {
    "id": p.id,
    "name_en": p.name_en,
    "name_zh": p.name_zh,
    "name_ja": p.name_ja,
    "types": list(p.types),
    "hash": _dhash(sprite_file),
    "mega": [],
    "is_final_evolution": p.is_final_evolution,   # ADD THIS
}
```

- [ ] **Step 5: Run all backend sprite hash tests**

```bash
cd /Users/wayneho/poke-calc/backend
python -m pytest tests/application/test_sprite_hash_service.py -v
```

Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add backend/interfaces/api/schemas.py backend/application/sprite_hash_service.py backend/tests/application/test_sprite_hash_service.py
git commit -m "feat(backend): expose is_final_evolution in sprite hash endpoint"
```

---

## Task 2: Frontend types + cache key bump

**Files:**
- Modify: `frontend/lib/types.ts`
- Modify: `frontend/lib/screenshot-context.tsx`

- [ ] **Step 1: Add `is_final_evolution` to `SpriteHashEntry`**

In `frontend/lib/types.ts`, update `SpriteHashEntry`:

```typescript
export interface SpriteHashEntry {
  id: number;
  name_en: string;
  name_zh: string;
  name_ja: string;
  types: string[];
  hash: string;
  mega: MegaHashEntry[];
  is_final_evolution: boolean;        // ADD THIS
}
```

- [ ] **Step 2: Bump localStorage cache key**

In `frontend/lib/screenshot-context.tsx`, change:

```typescript
const HASH_DB_KEY = "poke_hash_db_v2";   // was v1
```

This forces a fresh fetch so existing caches without `is_final_evolution` are discarded.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/types.ts frontend/lib/screenshot-context.tsx
git commit -m "feat(frontend): add is_final_evolution to SpriteHashEntry, bump cache key"
```

---

## Task 3: Create VGC usage weights JSON

**Files:**
- Create: `frontend/lib/data/vgc_usage.json`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p /Users/wayneho/poke-calc/frontend/lib/data
```

- [ ] **Step 2: Write `vgc_usage.json`**

Create `frontend/lib/data/vgc_usage.json` with the following content (weights reflect Pokémon Champions VGC competitive usage, top-tier = 1.0, rarely used = 0.1, unlisted = 0.0):

```json
{
  "incineroar": 1.0,
  "urshifu": 0.95,
  "rillaboom": 0.90,
  "flutter mane": 0.90,
  "iron hands": 0.88,
  "tornadus": 0.85,
  "amoonguss": 0.85,
  "grimmsnarl": 0.82,
  "landorus": 0.80,
  "chien-pao": 0.78,
  "calyrex": 0.78,
  "miraidon": 0.75,
  "koraidon": 0.75,
  "iron bundle": 0.72,
  "gouging fire": 0.72,
  "walking wake": 0.70,
  "kingambit": 0.68,
  "garchomp": 0.65,
  "palafin": 0.65,
  "gholdengo": 0.62,
  "annihilape": 0.62,
  "ursaluna": 0.60,
  "dragonite": 0.58,
  "wo-chien": 0.55,
  "chi-yu": 0.55,
  "ting-lu": 0.55,
  "roaring moon": 0.52,
  "iron valiant": 0.52,
  "clodsire": 0.50,
  "farigiraf": 0.50,
  "gardevoir": 0.48,
  "gengar": 0.48,
  "togekiss": 0.48,
  "baxcalibur": 0.45,
  "great tusk": 0.45,
  "iron moth": 0.45,
  "scream tail": 0.42,
  "salamence": 0.42,
  "metagross": 0.42,
  "tyranitar": 0.40,
  "arcanine": 0.40,
  "excadrill": 0.40,
  "whimsicott": 0.40,
  "sylveon": 0.38,
  "milotic": 0.38,
  "gyarados": 0.38,
  "azumarill": 0.38,
  "empoleon": 0.35,
  "hatterene": 0.35,
  "blastoise": 0.32,
  "ceruledge": 0.32,
  "armarouge": 0.32,
  "talonflame": 0.30,
  "snorlax": 0.30,
  "chansey": 0.28,
  "porygon2": 0.28,
  "clefable": 0.25,
  "pelipper": 0.25,
  "politoed": 0.25,
  "ninetales": 0.25,
  "mamoswine": 0.22,
  "weavile": 0.22,
  "lilligant": 0.22,
  "torkoal": 0.20,
  "venusaur": 0.20,
  "charizard": 0.20,
  "maushold": 0.18,
  "murkrow": 0.18,
  "indeedee": 0.18,
  "brute bonnet": 0.15,
  "iron treads": 0.15,
  "slowbro": 0.15,
  "conkeldurr": 0.12,
  "hawlucha": 0.12,
  "dusclops": 0.10,
  "scizor": 0.10
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/data/vgc_usage.json
git commit -m "feat(frontend): add VGC competitive usage weights JSON"
```

---

## Task 4: Update `rankByHash` — finals filter, no mega, usage blend

**Files:**
- Modify: `frontend/lib/screenshot/matcher.ts`
- Modify: `frontend/__tests__/screenshot/matcher.test.ts`

- [ ] **Step 1: Write failing tests**

**Replace the entire contents** of `frontend/__tests__/screenshot/matcher.test.ts` with the following. The DB fixture gains `is_final_evolution`; non-final Pokémon are added (Bulbasaur, Charmander, Squirtle); all `rankByHash` tests are rewritten to only expect finals; `rankCandidates` tests are kept but now use a DB that includes both finals and non-finals.

```typescript
import { rankCandidates, rankByHash } from "@/lib/screenshot/matcher";
import type { SpriteHashEntry } from "@/lib/types";

const DB: SpriteHashEntry[] = [
  { id: 1,  name_en: "Bulbasaur",  name_zh: "妙蛙種子", name_ja: "フシギダネ", types: ["grass","poison"], hash: "0000000000000000", mega: [], is_final_evolution: false },
  { id: 3,  name_en: "Venusaur",   name_zh: "妙蛙花",   name_ja: "フシギバナ", types: ["grass","poison"], hash: "1111111111111111", mega: [], is_final_evolution: true  },
  { id: 4,  name_en: "Charmander", name_zh: "小火龍",   name_ja: "ヒトカゲ",   types: ["fire"],           hash: "ffffffffffffffff", mega: [], is_final_evolution: false },
  { id: 6,  name_en: "Charizard",  name_zh: "噴火龍",   name_ja: "リザードン", types: ["fire","flying"],  hash: "eeeeeeeeeeeeeeee", mega: [], is_final_evolution: true  },
  { id: 7,  name_en: "Squirtle",   name_zh: "傑尼龜",   name_ja: "ゼニガメ",   types: ["water"],          hash: "5555555555555555", mega: [], is_final_evolution: false },
  { id: 9,  name_en: "Blastoise",  name_zh: "水箭龜",   name_ja: "カメックス", types: ["water"],          hash: "aaaaaaaaaaaaaaaa",
    mega: [{ suffix: "mega", hash: "cccccccccccccccc" }], is_final_evolution: true },
];

describe("rankByHash", () => {
  it("returns closest final-evolution hash match first", () => {
    // Venusaur (1111, final) is closer to 0000 than Charizard (eeee) or Blastoise (aaaa)
    const r = rankByHash("0000000000000000", DB);
    expect(r[0].name_en).toBe("Venusaur");
  });

  it("confidence is 1 for identical hash", () => {
    const r = rankByHash("eeeeeeeeeeeeeeee", DB);
    const match = r.find(c => c.name_en === "Charizard")!;
    expect(match).toBeDefined();
    expect(match.confidence).toBeCloseTo(1.0);
  });

  it("excludes non-final evolutions from results", () => {
    const r = rankByHash("0000000000000000", DB);
    const names = r.map(c => c.name_en);
    expect(names).not.toContain("Bulbasaur");
    expect(names).not.toContain("Charmander");
    expect(names).not.toContain("Squirtle");
  });

  it("never includes mega forms", () => {
    // Even though Blastoise has a mega entry, rankByHash must not return it
    const r = rankByHash("cccccccccccccccc", DB);
    expect(r.every(c => !c.name_en.includes("mega"))).toBe(true);
  });

  it("respects topN limit", () => {
    expect(rankByHash("0000000000000000", DB, [], 2)).toHaveLength(2);
  });

  it("typeHints pre-filters to matching finals, falls back to all finals if empty pool", () => {
    // Water finals: Blastoise only (Squirtle is not final)
    const r = rankByHash("aaaaaaaaaaaaaaaa", DB, ["water"]);
    expect(r.every(c => c.types.includes("water"))).toBe(true);
    expect(r.every(c => !c.name_en.includes("Squirtle"))).toBe(true);
  });

  it("falls back to all finals when typeHints match nothing", () => {
    const r = rankByHash("0000000000000000", DB, ["dragon"]);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every(c => !["Bulbasaur","Charmander","Squirtle"].includes(c.name_en))).toBe(true);
  });

  it("usage weights can flip ranking order", () => {
    // Query = aaaa (Blastoise hash). Without weights, Blastoise ranks first (dist=0, score=0.7).
    // Charizard hash = eeee; aaaa XOR eeee → 1 bit per hex digit → dist=16 → dhashConf=0.75.
    // With charizard usage=1.0: score = 0.75*0.7 + 1.0*0.3 = 0.825 > Blastoise 0.7 → Charizard flips to first.
    const noWeights = rankByHash("aaaaaaaaaaaaaaaa", DB);
    expect(noWeights[0].name_en).toBe("Blastoise");
    const withWeights = rankByHash("aaaaaaaaaaaaaaaa", DB, [], 6, { "charizard": 1.0 });
    expect(withWeights[0].name_en).toBe("Charizard");
  });
});

describe("rankCandidates", () => {
  it("returns all entries sorted alphabetically when no types given", () => {
    const r = rankCandidates([], DB);
    expect(r.length).toBeGreaterThan(0);
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].name_en.localeCompare(r[i].name_en)).toBeLessThanOrEqual(0);
    }
  });

  it("filters by detected types when provided", () => {
    const r = rankCandidates(["fire"], DB);
    expect(r.every(c => c.types.includes("fire"))).toBe(true);
  });

  it("falls back to full DB if no entry matches detected type", () => {
    const r = rankCandidates(["dragon"], DB);
    expect(r.length).toBeGreaterThan(0);
  });

  it("includes mega forms as candidates", () => {
    const r = rankCandidates(["water"], DB);
    const mega = r.find(c => c.name_en.includes("mega"));
    expect(mega).toBeDefined();
    expect(mega!.id).toBe(9);
  });

  it("respects topN limit", () => {
    expect(rankCandidates([], DB, 2)).toHaveLength(2);
  });

  it("multi-type filter includes entries matching any type", () => {
    const r = rankCandidates(["grass", "water"], DB);
    expect(r.some(c => c.types.includes("grass"))).toBe(true);
    expect(r.some(c => c.types.includes("water"))).toBe(true);
    expect(r.every(c => c.types.includes("fire"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd /Users/wayneho/poke-calc/frontend
npx jest --testPathPatterns="screenshot/matcher" --no-coverage 2>&1
```

Expected: FAIL — tests about non-final evolution exclusion and mega exclusion will fail because the current implementation doesn't filter.

- [ ] **Step 3: Update `rankByHash` in `matcher.ts`**

Replace the `rankByHash` function with this implementation:

```typescript
export function rankByHash(
  queryHash: string,
  db: SpriteHashEntry[],
  typeHints: string[] = [],
  topN = 6,
  usageWeights: Record<string, number> = {},
): Candidate[] {
  const pool = typeHints.length > 0
    ? db.filter(e => e.is_final_evolution && typeHints.some(t => e.types.includes(t)))
    : db.filter(e => e.is_final_evolution);
  const source = pool.length > 0 ? pool : db.filter(e => e.is_final_evolution);

  const scored: { c: Candidate; score: number }[] = [];
  for (const e of source) {
    const dist = hammingDistance(queryHash, e.hash);
    const dhashConf = 1 - dist / 64;
    const usage = usageWeights[e.name_en.toLowerCase()] ?? 0;
    const score = dhashConf * 0.7 + usage * 0.3;
    scored.push({
      c: { id: e.id, name_en: e.name_en, name_zh: e.name_zh, name_ja: e.name_ja, types: e.types, confidence: score },
      score,
    });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map(s => s.c);
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/wayneho/poke-calc/frontend
npx jest --testPathPatterns="screenshot/matcher" --no-coverage 2>&1
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/screenshot/matcher.ts frontend/__tests__/screenshot/matcher.test.ts
git commit -m "feat(frontend): rankByHash filters finals only, drops mega, blends VGC usage weights"
```

---

## Task 5: Wire usage weights into `analyzeScreenshot`

**Files:**
- Modify: `frontend/lib/screenshot/index.ts`

- [ ] **Step 1: Update `index.ts` to import and pass usage weights**

Replace the entire content of `frontend/lib/screenshot/index.ts` with:

```typescript
import { detectTypes } from "./type-detect";
import { cropToImageData, LEFT_REGIONS, RIGHT_REGIONS } from "./regions";
import { rankByHash } from "./matcher";
import { dhash } from "./dhash";
import usageWeights from "@/lib/data/vgc_usage.json";
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
  const weights = usageWeights as Record<string, number>;
  const left = LEFT_REGIONS.map(r => {
    const h = dhash(cropToImageData(canvas, r.sprite));
    return rankByHash(h, db, [], 6, weights);
  });
  const right = RIGHT_REGIONS.map(r => {
    const types = r.badge ? detectTypes(cropToImageData(canvas, r.badge)) : [];
    const h = dhash(cropToImageData(canvas, r.sprite));
    return rankByHash(h, db, types, 6, weights);
  });
  return { left, right };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/wayneho/poke-calc/frontend
npx tsc --noEmit 2>&1
```

Expected: no output (zero errors). If you see `Cannot find module '@/lib/data/vgc_usage.json'`, add `"resolveJsonModule": true` to `tsconfig.json` under `compilerOptions`.

- [ ] **Step 3: Run full frontend test suite**

```bash
cd /Users/wayneho/poke-calc/frontend
npx jest --no-coverage 2>&1
```

Expected: all PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/screenshot/index.ts
git commit -m "feat(frontend): wire VGC usage weights into analyzeScreenshot"
```

---

## Task 6: Verify end-to-end in browser

- [ ] **Step 1: Start backend**

```bash
cd /Users/wayneho/poke-calc/backend
uvicorn interfaces.api.main:app --reload --port 8000
```

- [ ] **Step 2: Clear localStorage and start frontend**

In a new terminal:

```bash
cd /Users/wayneho/poke-calc/frontend
npm run dev
```

- [ ] **Step 3: Test with the battle selection screenshot**

1. Open `http://localhost:3001/speed`
2. Open browser DevTools → Application → Local Storage → delete `poke_hash_db_v2` if it exists (forces fresh fetch with new schema)
3. Paste the Switch battle selection screenshot (Ctrl+V)
4. Verify: left panel shows Gardevoir, Empoleon, Gengar, Tyranitar, Garchomp, Milotic as top candidates (or close to them)
5. Verify: no baby Pokémon or mid-evolutions appear in the top candidates
6. Verify: no mega forms appear anywhere in the candidate lists

- [ ] **Step 4: Check browser console for errors**

No errors should appear. If `is_final_evolution` is `undefined` for any entry, the localStorage cache is stale — clear it and reload.
