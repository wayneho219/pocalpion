"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLang, type Lang } from "@/lib/i18n";
import { api, SPRITE_BASE } from "@/lib/api";
import type { PokemonSearchResult, PokemonDetail, MoveEntry } from "@/lib/types";
import { PokemonSelector } from "@/components/PokemonSelector";
import { TypeBadge } from "@/components/TypeBadge";
import { TYPE_NAME } from "@/lib/type-names";
import { type SP, EMPTY_SP, spTotal, calcAllStats, calcDamage, stageMult } from "@/lib/damage-calc";
import { NATURES, type StatKey } from "@/lib/natures";


// ─── helpers ────────────────────────────────────────────────────────────────

function spriteUrl(id: number, suffix?: string) {
  return suffix ? `${SPRITE_BASE}/mega/${id}-${suffix}.png` : `${SPRITE_BASE}/${id}.png`;
}

function megaLabel(suffix: string) {
  return suffix.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function moveDisplayName(m: MoveEntry, lang: string): string {
  if (lang === "zh") return m.name_zh || m.name_en;
  if (lang === "ja") return m.name_ja || m.name_en;
  return m.name_en.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const CAT_ICON: Record<string, string> = {
  physical: "⚔",
  special:  "✦",
  status:   "●",
};

const TYPE_COLOR: Record<string, string> = {
  fire:"#f97316", water:"#3b82f6", grass:"#22c55e", electric:"#eab308",
  ice:"#67e8f9", fighting:"#dc2626", poison:"#a855f7", ground:"#ca8a04",
  flying:"#7dd3fc", psychic:"#ec4899", bug:"#84cc16", rock:"#78716c",
  ghost:"#7c3aed", dragon:"#4f46e5", dark:"#1c1917", steel:"#94a3b8",
  fairy:"#f9a8d4", normal:"#6b7280",
};

// ─── nature parts ────────────────────────────────────────────────────────────

type NatureParts = { boosted: StatKey | null; reduced: StatKey | null };
const NEUTRAL_NAT: NatureParts = { boosted: null, reduced: null };

const SPE_LABEL: Record<Lang, string> = { zh: "速", en: "Spe", ja: "素早" };

function natureName(p: NatureParts): string {
  if (!p.boosted && !p.reduced) return "Hardy";
  return NATURES.find(n => n.boosted === p.boosted && n.reduced === p.reduced)?.en ?? "Hardy";
}

function NatStatPicker({
  value, onChange, t, lang,
}: {
  value: NatureParts;
  onChange: (p: NatureParts) => void;
  t: (k: string) => string;
  lang: Lang;
}) {
  const opts: { key: StatKey | null; label: string }[] = [
    { key: null, label: t("speed_nat_neutral") },
    { key: "atk", label: t("dmg_stage_atk") },
    { key: "def", label: t("dmg_stage_def") },
    { key: "spa", label: t("dmg_stage_spa") },
    { key: "spd", label: t("dmg_stage_spd") },
    { key: "spe", label: SPE_LABEL[lang] ?? "速" },
  ];

  function setBoost(k: StatKey | null) {
    onChange({ boosted: k, reduced: k === value.reduced ? null : value.reduced });
  }
  function setReduce(k: StatKey | null) {
    onChange({ boosted: k === value.boosted ? null : value.boosted, reduced: k });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-amber-400/70 font-bold uppercase tracking-wide w-7 shrink-0">
          {t("dmg_nature_boost")}
        </span>
        <div className="flex gap-1 flex-1 flex-wrap">
          {opts.map(o => (
            <button
              key={String(o.key)}
              type="button"
              onClick={() => setBoost(o.key)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors border
                ${value.boosted === o.key
                  ? "bg-amber-500/30 border-amber-400/50 text-amber-200"
                  : "bg-white/4 border-white/8 text-white/40 hover:bg-white/8 hover:text-white/65"
                }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-blue-400/70 font-bold uppercase tracking-wide w-7 shrink-0">
          {t("dmg_nature_reduce")}
        </span>
        <div className="flex gap-1 flex-1 flex-wrap">
          {opts.map(o => (
            <button
              key={String(o.key)}
              type="button"
              onClick={() => setReduce(o.key)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors border
                ${value.reduced === o.key
                  ? "bg-blue-500/30 border-blue-400/50 text-blue-200"
                  : "bg-white/4 border-white/8 text-white/40 hover:bg-white/8 hover:text-white/65"
                }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── stat stage stepper ──────────────────────────────────────────────────────

function StageStepper({
  label, value, onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const color =
    value > 0 ? "text-green-300" :
    value < 0 ? "text-red-300" :
    "text-white/40";

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/35 w-8 shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={value >= 6}
          onClick={() => onChange(Math.min(6, value + 1))}
          className="w-5 h-5 flex items-center justify-center text-[10px] text-white/50
            hover:text-white/90 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
        >
          ▲
        </button>
        <span className={`w-7 text-center text-[12px] font-bold tabular-nums ${color}`}>
          {value > 0 ? `+${value}` : value}
        </span>
        <button
          type="button"
          disabled={value <= -6}
          onClick={() => onChange(Math.max(-6, value - 1))}
          className="w-5 h-5 flex items-center justify-center text-[10px] text-white/50
            hover:text-white/90 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
        >
          ▼
        </button>
      </div>
    </div>
  );
}

// ─── SP allocation ───────────────────────────────────────────────────────────

const SP_KEYS: (keyof SP)[] = ["hp", "atk", "def", "spa", "spd", "spe"];
const SP_LABELS: Record<keyof SP, string> = { hp:"HP", atk:"攻", def:"防", spa:"特攻", spd:"特防", spe:"速" };

function SpGrid({ value, onChange, t }: { value: SP; onChange: (sp: SP) => void; t: (k:string)=>string }) {
  const total = spTotal(value);
  const remaining = 66 - total;

  function update(key: keyof SP, raw: string) {
    const v = Math.max(0, Math.min(32, parseInt(raw, 10) || 0));
    const newTotal = total - value[key] + v;
    if (newTotal > 66) return;
    onChange({ ...value, [key]: v });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-semibold ${remaining < 0 ? "text-red-400" : "text-white/40"}`}>
          {t("dmg_sp_remain")} {remaining}/66
        </span>
        <button
          type="button"
          onClick={() => onChange(EMPTY_SP)}
          className="text-[10px] text-white/30 hover:text-white/60 transition-colors px-2 py-0.5
            border border-white/8 rounded"
        >
          {t("dmg_sp_reset")}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {SP_KEYS.map(k => (
          <div key={k} className="flex items-center gap-2">
            <span className="text-[10px] text-white/35 w-8 shrink-0">{SP_LABELS[k]}</span>
            <input
              type="number" min={0} max={32}
              value={value[k]}
              onChange={e => update(k, e.target.value)}
              className="w-12 bg-white/5 border border-white/8 rounded px-2 py-1
                text-[11px] text-white text-center outline-none [color-scheme:dark] shrink-0"
            />
            <input
              type="range" min={0} max={32} value={value[k]}
              onChange={e => update(k, e.target.value)}
              className="flex-1 accent-blue-400 cursor-pointer"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── stat display ────────────────────────────────────────────────────────────

function StatDisplay({ stats }: { stats: ReturnType<typeof calcAllStats> | null }) {
  if (!stats) return null;
  const pairs = [
    ["HP", stats.hp], ["攻", stats.attack], ["防", stats.defense],
    ["特攻", stats.sp_attack], ["特防", stats.sp_defense], ["速", stats.speed],
  ] as [string, number][];
  return (
    <div className="grid grid-cols-3 gap-1 mt-2">
      {pairs.map(([label, val]) => (
        <div key={label} className="bg-white/4 rounded px-2 py-1 flex items-center justify-between gap-1">
          <span className="text-[9px] text-white/30">{label}</span>
          <span className="text-[12px] font-bold text-white tabular-nums">{val}</span>
        </div>
      ))}
    </div>
  );
}

// ─── move slot ───────────────────────────────────────────────────────────────

function MoveSlot({
  index, value, allMoves, lang, onChange,
}: {
  index: number;
  value: MoveEntry | null;
  allMoves: MoveEntry[];
  lang: Lang;
  onChange: (m: MoveEntry | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => {
    if (value) setQuery(moveDisplayName(value, lang));
    else setQuery("");
  }, [value, lang]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allMoves.slice(0, 40);
    const q = query.toLowerCase();
    return allMoves
      .filter(m =>
        m.name_en.includes(q) ||
        m.name_zh.toLowerCase().includes(q) ||
        m.name_ja.includes(q) ||
        m.name_en.replace(/-/g, " ").includes(q)
      )
      .slice(0, 30);
  }, [query, allMoves]);

  const selectMove = (m: MoveEntry) => {
    onChange(m);
    setQuery(moveDisplayName(m, lang));
    setOpen(false);
  };

  const clearMove = () => { onChange(null); setQuery(""); };

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors
        ${value ? "bg-white/5 border-white/12" : "bg-white/3 border-white/7 border-dashed"}`}>
        {value && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
            style={{ background: (TYPE_COLOR[value.type] ?? "#888") + "33", color: TYPE_COLOR[value.type] ?? "#888" }}
          >
            {value.type.toUpperCase().slice(0,3)}
          </span>
        )}
        <input
          type="text"
          value={query}
          placeholder={`招式 ${index + 1}`}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="flex-1 bg-transparent outline-none text-white text-[12px] placeholder:text-white/20 min-w-0"
        />
        {value && (
          <>
            <span className="text-[10px] text-white/35 shrink-0">{CAT_ICON[value.category]}</span>
            {value.power != null && (
              <span className="text-[11px] font-bold text-white/60 shrink-0">{value.power}</span>
            )}
            <button type="button" onClick={clearMove}
              className="text-white/25 hover:text-white/60 text-[13px] shrink-0 transition-colors">×</button>
          </>
        )}
      </div>

      {open && (
        <ul className="absolute z-30 w-full mt-1 bg-[#0f1520] border border-white/12
          rounded-xl overflow-hidden shadow-2xl max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-[11px] text-white/30">無結果</li>
          ) : filtered.map(m => (
            <li key={m.name_en}>
              <button
                type="button"
                onClick={() => selectMove(m)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/8
                  text-left transition-colors"
              >
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: (TYPE_COLOR[m.type] ?? "#888") + "33", color: TYPE_COLOR[m.type] ?? "#888" }}
                >
                  {m.type.toUpperCase().slice(0,3)}
                </span>
                <span className="text-[12px] text-white/80 flex-1 min-w-0 truncate">
                  {moveDisplayName(m, lang)}
                </span>
                <span className="text-[10px] text-white/30 shrink-0">{CAT_ICON[m.category]}</span>
                {m.power != null && (
                  <span className="text-[11px] font-semibold text-white/50 w-8 text-right shrink-0">
                    {m.power}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Pokemon card ─────────────────────────────────────────────────────────────

interface PokeCardProps {
  side: "attacker" | "defender";
  mon: PokemonSearchResult | null;
  detail: PokemonDetail | null;
  megaIdx: number | null;
  onMega: (i: number | null) => void;
  nat: NatureParts;
  onNat: (p: NatureParts) => void;
  sp: SP;
  onSP: (sp: SP) => void;
  lang: Lang;
  t: (k: string) => string;
  onSelect: (r: PokemonSearchResult) => void;
  value: PokemonSearchResult | null;
  moves?: (MoveEntry | null)[];
  allMoves?: MoveEntry[];
  onMoveChange?: (idx: number, m: MoveEntry | null) => void;
  calcedStats: ReturnType<typeof calcAllStats> | null;
  atkStage?: number;
  onAtkStage?: (v: number) => void;
  spaStage?: number;
  onSpaStage?: (v: number) => void;
  defStage?: number;
  onDefStage?: (v: number) => void;
  spdStage?: number;
  onSpdStage?: (v: number) => void;
}

function PokeCard({
  side, mon, detail, megaIdx, onMega, nat, onNat, sp, onSP,
  lang, t, onSelect, value, moves, allMoves, onMoveChange, calcedStats,
  atkStage, onAtkStage, spaStage, onSpaStage,
  defStage, onDefStage, spdStage, onSpdStage,
}: PokeCardProps) {
  const activeForm = detail && megaIdx !== null ? detail.mega_forms[megaIdx] : null;
  const types = activeForm ? activeForm.types : mon?.types ?? [];
  const typeNames = TYPE_NAME[lang] ?? TYPE_NAME.zh;

  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl p-5 flex flex-col gap-4">
      {/* Header */}
      <p className="text-[10px] font-bold tracking-[2px] uppercase text-white/25">
        {t(side === "attacker" ? "dmg_attacker" : "dmg_defender")}
      </p>

      {/* Pokemon selector + sprite */}
      <div className="flex items-center gap-3">
        {mon ? (
          <img
            src={spriteUrl(mon.id, activeForm?.suffix)}
            alt=""
            className="w-14 h-14 object-contain shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-white/4 border border-white/8 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <PokemonSelector
            id={`dmg-${side}`}
            label=""
            lang={lang}
            onSelect={onSelect}
            value={value}
          />
          {types.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {types.map(tp => (
                <TypeBadge key={tp} type={tp} label={typeNames[tp] ?? tp} className="text-[9px] px-1.5 py-0.5" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mega toggle */}
      {detail && detail.mega_forms.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onMega(null)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors
              ${megaIdx === null
                ? "bg-amber-500/25 border-amber-400/50 text-amber-200"
                : "bg-white/4 border-white/10 text-white/40 hover:bg-white/8"
              }`}
          >
            Base
          </button>
          {detail.mega_forms.map((mf, i) => (
            <button
              key={mf.suffix}
              type="button"
              onClick={() => onMega(i)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors
                ${megaIdx === i
                  ? "bg-amber-500/25 border-amber-400/50 text-amber-200"
                  : "bg-white/4 border-white/10 text-white/40 hover:bg-white/8"
                }`}
            >
              {megaLabel(mf.suffix)}
            </button>
          ))}
        </div>
      )}

      {/* Nature */}
      <div>
        <p className="text-[10px] text-white/25 uppercase tracking-wide mb-2">{t("dmg_nature")}</p>
        <NatStatPicker value={nat} onChange={onNat} t={t} lang={lang} />
      </div>

      {/* SP */}
      <div>
        <p className="text-[10px] text-white/25 uppercase tracking-wide mb-2">{t("dmg_sp_alloc")}</p>
        <SpGrid value={sp} onChange={onSP} t={t} />
      </div>

      {/* Calculated stats */}
      <StatDisplay stats={calcedStats} />

      {/* Stat stages */}
      <div>
        <p className="text-[10px] text-white/25 uppercase tracking-wide mb-2">{t("dmg_stage_title")}</p>
        <div className="flex flex-col gap-1">
          {side === "attacker" && onAtkStage && onSpaStage && (
            <>
              <StageStepper label={t("dmg_stage_atk")} value={atkStage ?? 0} onChange={onAtkStage} />
              <StageStepper label={t("dmg_stage_spa")} value={spaStage ?? 0} onChange={onSpaStage} />
            </>
          )}
          {side === "defender" && onDefStage && onSpdStage && (
            <>
              <StageStepper label={t("dmg_stage_def")} value={defStage ?? 0} onChange={onDefStage} />
              <StageStepper label={t("dmg_stage_spd")} value={spdStage ?? 0} onChange={onSpdStage} />
            </>
          )}
        </div>
      </div>

      {/* Move slots (attacker only) */}
      {moves && allMoves && onMoveChange && (
        <div>
          <p className="text-[10px] text-white/25 uppercase tracking-wide mb-2">{t("dmg_moves")}</p>
          <div className="flex flex-col gap-1.5">
            {moves.map((m, i) => (
              <MoveSlot
                key={i}
                index={i}
                value={m}
                allMoves={allMoves}
                lang={lang}
                onChange={mv => onMoveChange(i, mv)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── result row ──────────────────────────────────────────────────────────────

function ResultRow({
  move, lang, atkStats, defStats, defTypes, atkTypes,
  atkAtkStage, atkSpaStage, defDefStage, defSpdStage,
}: {
  move: MoveEntry;
  lang: Lang;
  atkStats: ReturnType<typeof calcAllStats>;
  defStats: ReturnType<typeof calcAllStats>;
  defTypes: string[];
  atkTypes: string[];
  atkAtkStage: number;
  atkSpaStage: number;
  defDefStage: number;
  defSpdStage: number;
}) {
  const name = moveDisplayName(move, lang);

  if (move.category === "status" || move.power == null) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/3 border border-white/6">
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{ background: (TYPE_COLOR[move.type] ?? "#888") + "22", color: (TYPE_COLOR[move.type] ?? "#888") + "88" }}
        >
          {move.type.toUpperCase().slice(0, 3)}
        </span>
        <span className="text-[12px] text-white/40 flex-1 truncate">{name}</span>
        <span className="text-[10px] text-white/20 shrink-0">●  ——</span>
      </div>
    );
  }

  const isPhysical = move.category === "physical";
  const rawAtkStat = isPhysical ? atkStats.attack : atkStats.sp_attack;
  const atkStage   = isPhysical ? atkAtkStage : atkSpaStage;
  const rawDefStat = isPhysical ? defStats.defense : defStats.sp_defense;
  const defStage   = isPhysical ? defDefStage : defSpdStage;

  const effectiveAtkStat = Math.floor(rawAtkStat * stageMult(atkStage));
  const effectiveDefStat = Math.floor(rawDefStat * stageMult(defStage));

  const result = calcDamage(move.power, effectiveAtkStat, effectiveDefStat, defStats.hp, move.type, atkTypes, defTypes);

  if (result.immune) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/3 border border-white/6">
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{ background: (TYPE_COLOR[move.type] ?? "#888") + "22", color: (TYPE_COLOR[move.type] ?? "#888") + "88" }}
        >
          {move.type.toUpperCase().slice(0, 3)}
        </span>
        <span className="text-[12px] text-white/50 flex-1 truncate">{name}</span>
        <span className="text-[10px] text-white/25 shrink-0 bg-white/5 px-2 py-0.5 rounded">免疫 ×0</span>
      </div>
    );
  }

  let rowClass = "bg-white/3 border-white/6";
  let koTag: string | null = null;

  if (result.minPct >= 100) {
    rowClass = "bg-red-500/8 border-red-500/30";
    koTag = "確定 KO";
  } else if (result.maxPct >= 100) {
    rowClass = "bg-orange-500/8 border-orange-500/25";
    koTag = "確率 KO";
  }

  const multLabel = result.typeMult !== 1.0
    ? `×${result.typeMult}` + (atkTypes.includes(move.type) ? " +屬" : "")
    : atkTypes.includes(move.type) ? "+屬" : null;

  const stageLabel = (() => {
    const parts: string[] = [];
    if (atkStage !== 0) parts.push(`攻${atkStage > 0 ? `+${atkStage}` : atkStage}`);
    if (defStage !== 0) parts.push(`防${defStage > 0 ? `+${defStage}` : defStage}`);
    return parts.join(" ");
  })();

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors ${rowClass}`}>
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
        style={{ background: (TYPE_COLOR[move.type] ?? "#888") + "33", color: TYPE_COLOR[move.type] ?? "#888" }}
      >
        {move.type.toUpperCase().slice(0, 3)}
      </span>

      <span className="text-[12px] text-white/80 flex-1 min-w-0 truncate">{name}</span>

      <span className="text-[9px] text-white/25 shrink-0">
        {move.category === "physical" ? "⚔" : "✦"} {move.power}
      </span>

      {stageLabel && (
        <span className="text-[9px] text-purple-300/70 shrink-0">{stageLabel}</span>
      )}

      {multLabel && (
        <span className="text-[9px] font-bold shrink-0"
          style={{ color: result.typeMult > 1 ? "#f97316" : result.typeMult < 1 ? "#60a5fa" : "#fff" }}>
          {multLabel}
        </span>
      )}

      <div className="text-right shrink-0">
        <p className="text-[13px] font-bold text-white tabular-nums">
          {result.min}~{result.max}
        </p>
        <p className="text-[10px] text-white/45 tabular-nums">
          {result.minPct}~{result.maxPct}%
        </p>
      </div>

      {koTag && (
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded shrink-0
          ${koTag === "確定 KO"
            ? "bg-red-500/25 text-red-300 border border-red-400/40"
            : "bg-orange-500/25 text-orange-300 border border-orange-400/40"
          }`}
        >
          {koTag}
        </span>
      )}
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function DamagePage() {
  const { t, lang } = useLang();

  const [atkMon,  setAtkMon]  = useState<PokemonSearchResult | null>(null);
  const [defMon,  setDefMon]  = useState<PokemonSearchResult | null>(null);
  const [atkDetail, setAtkDetail] = useState<PokemonDetail | null>(null);
  const [defDetail, setDefDetail] = useState<PokemonDetail | null>(null);
  const [atkMega, setAtkMega] = useState<number | null>(null);
  const [defMega, setDefMega] = useState<number | null>(null);
  const [atkNat, setAtkNat] = useState<NatureParts>(NEUTRAL_NAT);
  const [defNat, setDefNat] = useState<NatureParts>(NEUTRAL_NAT);
  const [atkSP, setAtkSP] = useState<SP>(EMPTY_SP);
  const [defSP, setDefSP] = useState<SP>(EMPTY_SP);
  const [moves, setMoves] = useState<(MoveEntry | null)[]>([null, null, null, null]);
  const [allMoves, setAllMoves] = useState<MoveEntry[]>([]);
  const [atkAtkStage, setAtkAtkStage] = useState(0);
  const [atkSpaStage, setAtkSpaStage] = useState(0);
  const [defDefStage, setDefDefStage] = useState(0);
  const [defSpdStage, setDefSpdStage] = useState(0);

  useEffect(() => { api.getMoves().then(setAllMoves).catch(() => {}); }, []);

  useEffect(() => {
    if (!atkMon) { setAtkDetail(null); setAtkMega(null); return; }
    api.getPokemon(atkMon.id).then(d => { setAtkDetail(d); setAtkMega(null); }).catch(() => {});
  }, [atkMon]);

  useEffect(() => {
    if (!defMon) { setDefDetail(null); setDefMega(null); return; }
    api.getPokemon(defMon.id).then(d => { setDefDetail(d); setDefMega(null); }).catch(() => {});
  }, [defMon]);

  const handleAtkSelect = useCallback((r: PokemonSearchResult) => {
    setAtkMon(r); setAtkMega(null); setAtkSP(EMPTY_SP); setAtkNat(NEUTRAL_NAT);
  }, []);
  const handleDefSelect = useCallback((r: PokemonSearchResult) => {
    setDefMon(r); setDefMega(null); setDefSP(EMPTY_SP); setDefNat(NEUTRAL_NAT);
  }, []);

  const atkActiveForm = atkDetail && atkMega !== null ? atkDetail.mega_forms[atkMega] : null;
  const defActiveForm = defDetail && defMega !== null ? defDetail.mega_forms[defMega] : null;

  const atkBase = atkActiveForm?.base_stats ?? atkDetail?.base_stats ?? null;
  const defBase = defActiveForm?.base_stats ?? defDetail?.base_stats ?? null;

  const atkTypes: string[] = atkActiveForm?.types ?? atkMon?.types ?? [];
  const defTypes: string[] = defActiveForm?.types ?? defMon?.types ?? [];

  const atkStats = atkBase ? calcAllStats(atkBase, atkSP, natureName(atkNat)) : null;
  const defStats = defBase ? calcAllStats(defBase, defSP, natureName(defNat)) : null;

  const handleMoveChange = (idx: number, m: MoveEntry | null) => {
    setMoves(prev => prev.map((mv, i) => i === idx ? m : mv));
  };

  const hasResults = atkStats && defStats && moves.some(m => m !== null);
  const activeMoves = moves.filter((m): m is MoveEntry => m !== null);

  return (
    <div className="max-w-5xl mx-auto px-8 py-7">
      <p className="text-[11px] font-bold tracking-[2.5px] uppercase text-white/22 mb-6">
        {t("dmg_header")}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <PokeCard
          side="attacker"
          mon={atkMon} detail={atkDetail} megaIdx={atkMega} onMega={setAtkMega}
          nat={atkNat} onNat={setAtkNat}
          sp={atkSP} onSP={setAtkSP}
          lang={lang} t={t}
          onSelect={handleAtkSelect} value={atkMon}
          moves={moves} allMoves={allMoves} onMoveChange={handleMoveChange}
          calcedStats={atkStats}
          atkStage={atkAtkStage} onAtkStage={setAtkAtkStage}
          spaStage={atkSpaStage} onSpaStage={setAtkSpaStage}
        />
        <PokeCard
          side="defender"
          mon={defMon} detail={defDetail} megaIdx={defMega} onMega={setDefMega}
          nat={defNat} onNat={setDefNat}
          sp={defSP} onSP={setDefSP}
          lang={lang} t={t}
          onSelect={handleDefSelect} value={defMon}
          calcedStats={defStats}
          defStage={defDefStage} onDefStage={setDefDefStage}
          spdStage={defSpdStage} onSpdStage={setDefSpdStage}
        />
      </div>

      {/* Results */}
      <div className="mt-4 bg-white/4 border border-white/8 rounded-2xl p-5">
        <p className="text-[10px] font-bold tracking-[2px] uppercase text-white/25 mb-4">
          {t("dmg_results")}
        </p>

        {!hasResults ? (
          <p className="text-center text-white/25 text-[13px] py-6">
            {t("dmg_select_both")}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {activeMoves.map((move, i) => (
              <ResultRow
                key={`${move.name_en}-${i}`}
                move={move}
                lang={lang}
                atkStats={atkStats!}
                defStats={defStats!}
                defTypes={defTypes}
                atkTypes={atkTypes}
                atkAtkStage={atkAtkStage}
                atkSpaStage={atkSpaStage}
                defDefStage={defDefStage}
                defSpdStage={defSpdStage}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
