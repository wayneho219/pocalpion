# Screenshot Import — Type Badge NCC + Usage Ranking

**Date:** 2026-05-22
**Branch:** Wayne-Dev
**Status:** Approved, ready for implementation

---

## Background

截圖匯入功能已確認 dHash sprite 比對無效（Hamming distance ≈ 隨機，35–44/64）。根本原因是遊戲使用特定攝影機角度的 3D 模型渲染，與所有公開 sprite 資料庫跨 domain 不匹配。

本設計採用替代方案：**NCC 屬性徽章模板比對 + VGC 使用率排序 + 人工確認候選清單**。

---

## Scope

| 面向 | 內容 |
|------|------|
| 右側（對手 6 隻） | NCC 偵測屬性 → 屬性過濾 → VGC 使用率排序 |
| 左側（我方 6 隻） | 放棄圖像分析 → 純 VGC 使用率前 N 排序 |
| UI | 展開清單時加搜尋框（不受屬性限制） |
| 排除項目 | dHash 完全從雙側移除；非最終進化排除 |

---

## Architecture

### 資料流

```
截圖貼上
  │
  ├─ 右側每格
  │    ├─ cropToImageData(badge region)
  │    ├─ detectTypesNCC(badgeData, templates)   ← 取代舊的 detectTypes (HSV)
  │    │    └─ 若偵測失敗（無信心）→ types = []
  │    ├─ rankByUsage(db, types, usageWeights, 30)
  │    │    ├─ 若 types 非空：filter is_final_evolution && type 符合
  │    │    └─ 若 types 為空（fallback）：filter is_final_evolution only
  │    └─ 回傳前 30 名（UI 預設顯示前 6）
  │
  └─ 左側每格
       ├─ 不做任何圖像分析
       └─ rankByUsage(db, [], usageWeights, 30)
            └─ filter is_final_evolution → 依 VGC usage 排序 → 前 30
```

### NCC 模板比對（已實作）

`frontend/lib/screenshot/badge-matcher.ts` — `detectTypesNCC()` 已完整實作：
- 18 種屬性 PNG 模板（64×64）放在 `frontend/public/type-badges/`
- 將 badge crop 縮放至 32×32，左右各半分別比對
- NCC 閾值 0.35（低於此視為未偵測到）
- 回傳不重複的屬性陣列（0–2 個）

目前 **未接線**：`index.ts` 仍呼叫舊的 `detectTypes()`（HSV 色相法）。

---

## Components

### 1. `frontend/lib/screenshot/matcher.ts`

新增：
```ts
export function rankByUsage(
  db: SpriteHashEntry[],
  typeHints: PokemonType[],
  usageWeights: Record<string, number>,
  topN = 30,
): Candidate[]
```
- 過濾 `is_final_evolution`
- 若 `typeHints.length > 0`：追加屬性過濾（至少一屬性符合）
- 若屬性過濾後為空：fallback 到全 `is_final_evolution` pool（不中斷）
- 依 `usageWeights[name_en.toLowerCase()] ?? 0` 降序排列
- 回傳前 `topN` 筆

移除 `rankByHash` 在主流程中的使用（保留定義供日後參考或刪除）。

### 2. `frontend/lib/screenshot/index.ts`

- 右側：`detectTypes(badgeData)` → `detectTypesNCC(badgeData, typeTemplates)`
- 雙側：`rankByHash(...)` → `rankByUsage(...)`
- 左側：跳過圖像分析，直接 `rankByUsage(db, [], weights, 30)`

### 3. `frontend/lib/screenshot-context.tsx`

新增 `hashDb: SpriteHashEntry[]` 到 context state，在 DB 載入後 `setHashDb(data)`，供 `ScreenshotPanel` 搜尋使用。

### 4. `frontend/components/ScreenshotPanel.tsx`

展開狀態下，在清單上方新增搜尋框：
- `<input>` 即時過濾
- 比對 `name_en`、`name_ja`、`name_zh`（includes，大小寫不敏感）
- 搜尋結果來源：`hashDb`（完整 DB，不受屬性限制，**不限最終進化**），依 VGC usage 排序
- 搜尋框空白時顯示原屬性過濾清單（前 30，UI 顯示前 6 可捲動）

---

## Error Handling

| 情境 | 行為 |
|------|------|
| NCC 無法偵測到任何屬性 | fallback 到全 DB 使用率排序 |
| 模板載入失敗（某個 PNG 404） | `loadTypeTemplates()` 已用 `Promise.allSettled`，失敗的類型跳過 |
| hashDb 未載入時搜尋 | 搜尋框 disabled 或顯示空結果 |

---

## Out of Scope

- 左側圖像辨識（已確認技術上不可行）
- 屬性手動覆蓋 UI（搜尋框已足夠作為 escape hatch）
- YOLO / CNN classifier（需要大量遊戲截圖訓練資料，另立計畫）
- 非最終進化（預設清單不顯示；搜尋框無此限制）

---

## Files Changed

| 檔案 | 變動 |
|------|------|
| `frontend/lib/screenshot/matcher.ts` | 新增 `rankByUsage()`  |
| `frontend/lib/screenshot/index.ts` | 接線 NCC；換用 `rankByUsage` |
| `frontend/lib/screenshot-context.tsx` | 加 `hashDb` 到 context |
| `frontend/components/ScreenshotPanel.tsx` | 加搜尋框 |
