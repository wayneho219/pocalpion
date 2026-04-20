# poke-calc

> 競技寶可夢策略計算工具箱 / Competitive Pokémon Strategy Toolbox / 競技ポケモン戦略計算ツール

---

## 繁體中文

### 簡介

poke-calc 是一款針對 VGC（Video Game Championships）2026 賽制設計的競技寶可夢輔助工具，提供種族值查詢、超速分析與存活計算三大功能，並支援繁體中文、English、日本語三語搜尋。

### 功能

- **寶可夢查詢** — 三語名稱模糊搜尋，顯示種族值與圖鑑圖片
- **超速分析** — 計算超越目標對手所需的最小速度努力值（SP）
- **存活分析** — 找出能扛下特定攻擊的最小 HP + 防禦努力值組合

### 安裝與執行

```bash
pip install -e ".[dev]"
streamlit run interfaces/streamlit/app.py
```

### 執行測試

```bash
python -m pytest -v
```

---

## English

### Overview

poke-calc is a competitive Pokémon strategy toolbox for the VGC 2026 format. It provides Pokédex lookup, speed tier analysis, and survival optimization, with trilingual search support (Traditional Chinese, English, Japanese).

### Features

- **Pokémon Search** — Fuzzy trilingual name search with base stats and sprite display
- **Speed Analysis** — Calculate the minimum Speed EVs needed to outspeed a target
- **Survival Analysis** — Find the optimal HP + Defense EV split to survive a given hit

### Setup & Run

```bash
pip install -e ".[dev]"
streamlit run interfaces/streamlit/app.py
```

### Run Tests

```bash
python -m pytest -v
```

---

## 日本語

### 概要

poke-calc は VGC 2026 フォーマット向けの競技ポケモン戦略ツールです。ポケモン検索・素早さ計算・耐久計算の3機能を備え、繁体字中国語・英語・日本語の3言語検索に対応しています。

### 機能

- **ポケモン検索** — 3言語対応のあいまい検索、種族値とスプライト表示
- **素早さ分析** — 相手を抜くために必要な最小素早さ努力値を計算
- **耐久分析** — 特定の攻撃を耐えるための最適な HP + 防御努力値の配分を算出

### セットアップ・起動

```bash
pip install -e ".[dev]"
streamlit run interfaces/streamlit/app.py
```

### テスト実行

```bash
python -m pytest -v
```

---

## Tech Stack

- Python 3.11+
- Streamlit 1.35+
- PokéAPI
- pytest

## Architecture

Clean Architecture (DDD) — `domain` / `application` / `adapters` / `interfaces`
