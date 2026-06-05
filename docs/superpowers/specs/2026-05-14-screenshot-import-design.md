# Screenshot Import Design

**Date:** 2026-05-14
**Status:** Approved

## Overview

Allow users to paste a Nintendo Switch ranked battle selection screenshot (Ctrl+V). The app identifies each Pokemon on both sides using type badge color detection + dHash sprite matching — no external API. Results appear in persistent floating side panels; clicking a Pokemon auto-fills the relevant field on the current page.

---

## Constraints

- No external API (all processing local)
- Must handle shiny Pokemon (color variants) → grayscale hash eliminates color dependency
- Pokemon may have custom nicknames → text OCR is not the primary identifier; sprite matching is used for both sides
- Target accuracy: 80–90% (user can manually select from top-5 candidates on misses)
- Screenshot format: Nintendo Switch battle selection screen (1280×720 or 1920×1080)
- Mobile game layout support deferred to a future iteration

---

## Data Flow

```
User pastes screenshot (Ctrl+V)
        ↓
Layout-level global paste listener
        ↓
Canvas: crop 12 sprite regions (6 left, 6 right) using relative coordinates
        ↓
Type badge color detection → filter hashDB to ≤50 candidates per slot
        ↓
dHash computation (grayscale 9×9 → 64-bit) + Hamming distance ranking
        ↓
Update global context: leftPokemon[], rightPokemon[] (top-5 candidates each)
        ↓
Floating panels render; user clicks slot → auto-fill current page field
```

Hash DB lifecycle:
- First use → `GET /api/sprites/hashes` → backend computes & in-memory caches → frontend stores in `localStorage`
- Subsequent uses → read directly from `localStorage`

---

## Backend Changes

### New endpoint: `GET /api/sprites/hashes`

Response (~120KB JSON):
```json
[
  {
    "id": 282,
    "name": "gardevoir",
    "types": ["psychic", "fairy"],
    "hash": "a3f2...",
    "mega": [
      { "suffix": "mega", "hash": "b1c4..." }
    ]
  }
]
```

Implementation (Python + Pillow):
1. Scan all sprite files: `/sprites/{id}.png` and `/sprites/mega/{id}-{suffix}.png`
2. Per image: grayscale → resize 9×9 → compute dHash (64-bit)
3. Join with Pokemon `types` from existing DB
4. Compute once on first call, cache in memory thereafter

No other backend changes required.

---

## Frontend Changes

### Global State — `lib/screenshot-context.tsx`

```ts
type Candidate = { id: number; name: string; types: string[]; confidence: number }
type SlotCandidates = Candidate[]  // top 5; index 0 = best guess

interface ScreenshotContext {
  left: SlotCandidates[]   // up to 6 slots, player side
  right: SlotCandidates[]  // up to 6 slots, opponent side
  isProcessing: boolean
  setLeft: (slots: SlotCandidates[]) => void
  setRight: (slots: SlotCandidates[]) => void
}
```

- Context mounted at `app/layout.tsx`; persists across page navigation
- Global `paste` event listener in `useEffect` — reads `image/*` blob from clipboard, renders to `HTMLCanvasElement`, triggers pipeline
- State overwritten on each new paste

### Screenshot Pipeline — `lib/screenshot/`

```
lib/screenshot/
  index.ts       ← analyzeScreenshot(canvas): Promise<{ left, right }>
  regions.ts     ← relative crop coordinates for 12 slots
  type-detect.ts ← type badge RGB sampling (18 type color ranges)
  dhash.ts       ← grayscale dHash computation
  matcher.ts     ← type filter + Hamming distance ranking
```

**Step 1 — Crop regions** (`regions.ts`)
- Coordinates defined as relative ratios (supports 720p and 1080p)
- Left side: sprite column within each of the 6 list rows
- Right side: 6 sprite thumbnails in vertical column

**Step 2 — Type detection** (`type-detect.ts`)
- Sample pixel clusters in the type badge area of each crop
- Compare against 18 predefined type RGB ranges
- Output: 1–2 types per slot (used as filter, not hard constraint)

**Step 3 — dHash** (`dhash.ts`)
- Grayscale → resize 9×9 → horizontal gradient diff → 64-bit hash
- Shiny-safe: color information discarded at grayscale step

**Step 4 — Match** (`matcher.ts`)
- Filter hashDB by detected types → reduce to ~1–50 candidates
- Compute Hamming distance for each candidate
- Return top 5 with `confidence` = `1 - (distance / 64)`

### Floating Panels — `components/ScreenshotPanel.tsx`

- Two fixed panels pinned to left and right viewport edges
- Default: collapsed tab (does not overlap main content)
- Auto-expand when context has results; shows loading spinner during `isProcessing`
- Each slot: sprite thumbnail + name + confidence color bar
  - High confidence (≥0.80): click directly fills field
  - Low confidence (<0.80): click expands top-3 candidate picker
- Panel state persists until next paste

### Page Integration

| Page | Left panel click | Right panel click |
|------|-----------------|------------------|
| Speed (`/speed`) | Fill "my Pokemon" | Fill "opponent Pokemon" |
| Survival (`/survival`) | Fill "my Pokemon" | No action |
| Home / Search (`/`) | Fill search input | Fill search input |

Integration via a `useScreenshotSelect` hook consumed by each page — the hook reads the current context and exposes an `onSelect(side, candidate)` callback the panel calls on click.

---

## Known Limitations

- Coordinate regions tuned for Switch battle selection screen only; other game layouts require separate region configs
- Mobile game screenshot support deferred
- Text (nicknames) intentionally ignored as primary identifier; used only as supplementary confidence hint if OCR is added later
- Accuracy ~80–90%; low-confidence slots require manual selection from candidates
