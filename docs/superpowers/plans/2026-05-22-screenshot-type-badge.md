# Screenshot Type Badge NCC + Usage Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 NCC 屬性徽章模板比對取代無效的 dHash，右側候選清單改為純屬性過濾 + VGC 使用率排序，左側顯示全使用率前 30，展開時加搜尋框。

**Architecture:** 新增 `rankByUsage()` 函式（屬性過濾 + usage 排序），接線 `detectTypesNCC` 取代 HSV 法，在 `ScreenshotContext` 暴露 `hashDb`，讓 `ScreenshotPanel` 搜尋框可查整個 DB。

**Tech Stack:** TypeScript, React, Next.js, Jest + jsdom

---

## File Map

| 檔案 | 動作 | 說明 |
|------|------|------|
| `frontend/lib/screenshot/matcher.ts` | Modify | 新增 `rankByUsage()`；保留 `rankByHash` 定義但不再在主流程使用 |
| `frontend/__tests__/screenshot/matcher.test.ts` | Modify | 新增 `rankByUsage` 測試 |
| `frontend/lib/screenshot/index.ts` | Modify | 接線 NCC；雙側換用 `rankByUsage`；左側略過圖像分析 |
| `frontend/lib/screenshot-context.tsx` | Modify | 加 `hashDb: SpriteHashEntry[]` 到 context state 和 value |
| `frontend/components/ScreenshotPanel.tsx` | Modify | `PokemonSlot` 加搜尋框，查整個 `hashDb` |

---

## Task 1: 新增 `rankByUsage()` + 測試

**Files:**
- Modify: `frontend/lib/screenshot/matcher.ts`
- Modify: `frontend/__tests__/screenshot/matcher.test.ts`

- [ ] **Step 1: 在 matcher.test.ts 寫 rankByUsage 的失敗測試**

在 `frontend/__tests__/screenshot/matcher.test.ts` 最後加入：

```ts
describe("rankByUsage", () => {
  const WEIGHTS = { venusaur: 0.9, charizard: 0.5, blastoise: 0.1 };

  it("returns only final evolutions when no type hints", () => {
    const r = rankByUsage(DB, [], WEIGHTS);
    const names = r.map(c => c.name_en);
    expect(names).not.toContain("Bulbasaur");
    expect(names).not.toContain("Charmander");
    expect(names).not.toContain("Squirtle");
  });

  it("sorts by usage weight descending", () => {
    const r = rankByUsage(DB, [], WEIGHTS);
    // Venusaur(0.9) > Charizard(0.5) > Blastoise(0.1) alphabetically fallback for ties
    expect(r[0].name_en).toBe("Venusaur");
    expect(r[1].name_en).toBe("Charizard");
    expect(r[2].name_en).toBe("Blastoise");
  });

  it("filters to type-matching finals when typeHints provided", () => {
    const r = rankByUsage(DB, ["water"], WEIGHTS);
    expect(r.every(c => c.types.includes("water"))).toBe(true);
    expect(r.some(c => c.name_en === "Blastoise")).toBe(true);
    expect(r.some(c => c.name_en === "Venusaur")).toBe(false);
  });

  it("falls back to all finals when type filter yields empty pool", () => {
    const r = rankByUsage(DB, ["dragon"], WEIGHTS);
    expect(r.length).toBeGreaterThan(0);
    // No dragon Pokémon in DB, so all finals returned
    expect(r.some(c => c.name_en === "Venusaur")).toBe(true);
  });

  it("respects topN limit", () => {
    const r = rankByUsage(DB, [], WEIGHTS, 2);
    expect(r).toHaveLength(2);
  });

  it("Pokémon not in weights get usage 0 and rank last", () => {
    const r = rankByUsage(DB, [], {});
    // All have usage 0; order stable (any order fine), but all 3 finals must be included
    const names = r.map(c => c.name_en);
    expect(names).toContain("Venusaur");
    expect(names).toContain("Charizard");
    expect(names).toContain("Blastoise");
  });
});
```

也在頂部的 import 加上 `rankByUsage`：
```ts
import { rankCandidates, rankByHash, rankByUsage } from "@/lib/screenshot/matcher";
```

- [ ] **Step 2: 確認測試現在失敗**

```bash
cd frontend && npx jest __tests__/screenshot/matcher.test.ts --no-coverage 2>&1 | tail -20
```

Expected: `rankByUsage is not a function` 或類似 import 錯誤。

- [ ] **Step 3: 實作 `rankByUsage` in matcher.ts**

在 `frontend/lib/screenshot/matcher.ts` 末尾新增（`rankCandidates` 後面）：

```ts
export function rankByUsage(
  db: SpriteHashEntry[],
  typeHints: string[],
  usageWeights: Record<string, number>,
  topN = 30,
): Candidate[] {
  const pool = db.filter(e => e.is_final_evolution);
  const filtered = typeHints.length > 0
    ? pool.filter(e => typeHints.some(t => e.types.includes(t)))
    : pool;
  const source = filtered.length > 0 ? filtered : pool;

  const result: Candidate[] = source.map(e => ({
    id: e.id,
    name_en: e.name_en,
    name_zh: e.name_zh,
    name_ja: e.name_ja,
    types: e.types,
    confidence: usageWeights[e.name_en.toLowerCase()] ?? 0,
  }));

  result.sort((a, b) => b.confidence - a.confidence);
  return result.slice(0, topN);
}
```

> `typeHints: string[]` は `rankByHash` と同じ型。`matcher.ts` に新しい import は不要。

- [ ] **Step 4: 確認所有 matcher テスト合格**

```bash
cd frontend && npx jest __tests__/screenshot/matcher.test.ts --no-coverage 2>&1 | tail -20
```

Expected: `Tests: X passed, X total` 全部綠。

- [ ] **Step 5: Commit**

```bash
cd frontend && git add lib/screenshot/matcher.ts __tests__/screenshot/matcher.test.ts
git commit -m "feat(screenshot): add rankByUsage for type-filtered usage-sorted candidates"
```

---

## Task 2: 接線 NCC，更新 `index.ts`

**Files:**
- Modify: `frontend/lib/screenshot/index.ts`

不需要新的單元測試（Canvas/ImageData 需要 DOM，已有整合測試流程）。

- [ ] **Step 1: 更新 index.ts imports**

把 `import { detectTypes } from "./type-detect"` 改為：
```ts
import type { PokemonType } from "./type-detect";
import { detectTypesNCC } from "./badge-matcher";
```

把 `import { rankByHash } from "./matcher"` 改為：
```ts
import { rankByUsage } from "./matcher";
```

移除 `import { dhash } from "./dhash"`（雙側都不再計算 hash）。

- [ ] **Step 2: 更新 `analyzeScreenshot` 函式本體**

將 `frontend/lib/screenshot/index.ts` 的 `analyzeScreenshot` 改為：

```ts
export function analyzeScreenshot(
  canvas: HTMLCanvasElement,
  db: SpriteHashEntry[],
  typeTemplates?: Map<PokemonType, ImageData>,
): AnalysisResult {
  const weights = usageWeights as Record<string, number>;
  const templates = typeTemplates ?? new Map<PokemonType, ImageData>();
  const debug = process.env.NODE_ENV === "development";

  const left = LEFT_REGIONS.map((r, i) => {
    const candidates = rankByUsage(db, [], weights, 30);
    if (debug) {
      console.log(`[L${i+1}] left-side usage top: ${candidates[0]?.name_en}`);
    }
    return candidates;
  });

  const right = RIGHT_REGIONS.map((r, i) => {
    const badgeData = r.badge ? cropToImageData(canvas, r.badge) : null;
    const types = badgeData ? detectTypesNCC(badgeData, templates) : [];
    const candidates = rankByUsage(db, types, weights, 30);
    if (debug) {
      const badgeCrop = badgeData ? cropDataURL(canvas, badgeData) : null;
      console.groupCollapsed(`[R${i+1}] types=${types.join(",") || "none"} | top: ${candidates[0]?.name_en}`);
      if (badgeCrop) console.log("badge: %c ", `font-size:32px;background:url(${badgeCrop}) no-repeat;background-size:contain`);
      candidates.slice(0, 3).forEach(c => console.log(`  ${c.name_en} usage=${c.confidence.toFixed(3)}`));
      console.groupEnd();
    }
    return candidates;
  });

  return { left, right };
}
```

移除 `dhash` import（左側不再計算 hash）。`cropDataURL` は右側 debug でまだ使うので残す。

- [ ] **Step 3: TypeScript ビルドが通ることを確認**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: エラーなし。もし `dhash` が他の場所で使われていれば import を残す。

- [ ] **Step 4: Commit**

```bash
cd frontend && git add lib/screenshot/index.ts
git commit -m "feat(screenshot): wire NCC badge detection, replace dHash with usage ranking"
```

---

## Task 3: `hashDb` を Context に公開

**Files:**
- Modify: `frontend/lib/screenshot-context.tsx`

- [ ] **Step 1: `hashDb` state と context value を追加**

`frontend/lib/screenshot-context.tsx` の `ScreenshotContextValue` interface に追加：

```ts
interface ScreenshotContextValue {
  left: SlotCandidates[];
  right: SlotCandidates[];
  hashDb: SpriteHashEntry[];          // ← 追加
  isProcessing: boolean;
  onSelectLeft: ((c: Candidate) => void) | null;
  onSelectRight: ((c: Candidate) => void) | null;
  registerHandlers: (
    left: ((c: Candidate) => void) | null,
    right: ((c: Candidate) => void) | null,
  ) => void;
  processScreenshot: (canvas: HTMLCanvasElement) => Promise<void>;
}
```

- [ ] **Step 2: Provider に state と setter を追加**

`ScreenshotProvider` 内部：

```ts
const [hashDb, setHashDb] = useState<SpriteHashEntry[]>([]);
```

`processScreenshot` の中の `loadHashDB()` 直後に `setHashDb(data)` を追加：

```ts
const processScreenshot = useCallback(async (canvas: HTMLCanvasElement) => {
  setIsProcessing(true);
  try {
    if (!typeTemplatesRef.current) {
      const { loadTypeTemplates } = await import("./screenshot/badge-matcher");
      typeTemplatesRef.current = await loadTypeTemplates();
    }
    const db = await loadHashDB();
    setHashDb(db);                    // ← 追加
    const { analyzeScreenshot } = await import("./screenshot/index");
    const result = analyzeScreenshot(canvas, db, typeTemplatesRef.current);
    setLeft(result.left);
    setRight(result.right);
  } catch (err) {
    console.error("Screenshot analysis failed:", err);
  } finally {
    setIsProcessing(false);
  }
}, []);
```

- [ ] **Step 3: Context Provider value に `hashDb` を追加**

```ts
<ScreenshotContext.Provider value={{
  left, right, hashDb, isProcessing, onSelectLeft, onSelectRight, registerHandlers, processScreenshot,
}}>
```

`createContext` の初期値も修正（型エラー防止のため）：

```ts
const ScreenshotContext = createContext<ScreenshotContextValue | null>(null);
```

（null チェックは `useScreenshot` で行うため初期値は null のまま OK）

- [ ] **Step 4: TypeScript build チェック**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: エラーなし。

- [ ] **Step 5: Commit**

```bash
cd frontend && git add lib/screenshot-context.tsx
git commit -m "feat(screenshot): expose hashDb in ScreenshotContext for panel search"
```

---

## Task 4: ScreenshotPanel に搜尋框を追加

**Files:**
- Modify: `frontend/components/ScreenshotPanel.tsx`

- [ ] **Step 1: import を追加**

`frontend/components/ScreenshotPanel.tsx` 先頭に追加：

```ts
import usageWeights from "@/lib/data/vgc_usage.json";
import type { SpriteHashEntry } from "@/lib/types";
```

- [ ] **Step 2: `PokemonSlot` を搜尋框付きに更新**

`PokemonSlot` コンポーネントを以下に置き換え：

```tsx
function PokemonSlot({ slot, onSelect }: { slot: SlotCandidates; onSelect: (c: Candidate) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const { hashDb } = useScreenshot();
  const weights = usageWeights as Record<string, number>;

  const top = slot[0];
  if (!top) return <div className="h-9 rounded-lg bg-white/5" />;

  const q = query.trim().toLowerCase();
  const displayCandidates: Candidate[] = q
    ? (hashDb as SpriteHashEntry[])
        .filter(e =>
          e.name_en.toLowerCase().includes(q) ||
          e.name_ja.includes(query.trim()) ||
          e.name_zh.includes(query.trim()),
        )
        .sort((a, b) => (weights[b.name_en.toLowerCase()] ?? 0) - (weights[a.name_en.toLowerCase()] ?? 0))
        .slice(0, 30)
        .map(e => ({
          id: e.id,
          name_en: e.name_en,
          name_zh: e.name_zh,
          name_ja: e.name_ja,
          types: e.types,
          confidence: 0,
        }))
    : slot;

  function handleToggle() {
    if (expanded) setQuery("");
    setExpanded(p => !p);
  }

  return (
    <div>
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors text-left"
      >
        <img
          src={`${API}/sprites/${top.id}.png`}
          alt={top.name_en}
          className="w-8 h-8 object-contain shrink-0"
        />
        <span className="text-xs text-white/80 truncate flex-1">{top.name_en}</span>
        <span className="text-white/30 text-[10px] shrink-0">▾</span>
      </button>
      {expanded && (
        <div className="ml-2 mt-0.5 bg-black/50 rounded-lg overflow-hidden">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜尋寶可夢…"
            className="w-full px-2 py-1.5 text-xs bg-transparent text-white/70 border-b border-white/10 outline-none placeholder:text-white/30"
            autoFocus
          />
          <ul className="max-h-48 overflow-y-auto">
            {displayCandidates.map(c => (
              <li key={`${c.id}-${c.name_en}`}>
                <button
                  onClick={() => { onSelect(c); setExpanded(false); setQuery(""); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/10 text-xs text-white/70 text-left"
                >
                  <img
                    src={`${API}/sprites/${c.id}.png`}
                    alt={c.name_en}
                    className="w-5 h-5 object-contain shrink-0"
                  />
                  <span className="truncate flex-1">{c.name_en}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: TypeScript build チェック**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: エラーなし。

- [ ] **Step 4: Jest テスト全体が通ることを確認**

```bash
cd frontend && npx jest --no-coverage 2>&1 | tail -20
```

Expected: `Test Suites: X passed` 全部グリーン。

- [ ] **Step 5: Commit**

```bash
cd frontend && git add components/ScreenshotPanel.tsx
git commit -m "feat(screenshot): add search box to candidate panel, query full DB"
```

---

## 手動テスト手順

Task 4 完了後、実際の截圖を使って確認：

1. `cd frontend && npm run dev` でアプリ起動
2. 右側に対手チームが写っている截圖をコピーして、アプリのどのページでも `Ctrl+V` / `Cmd+V` でペースト
3. 右側パネルに候選が表示されることを確認
4. 各スロットを展開して候選が使用率順に並んでいることを確認
5. 検索ボックスに `Calyrex` など打って結果が絞られることを確認
6. 左側パネルが VGC 使用率上位 6 名を表示していることを確認
