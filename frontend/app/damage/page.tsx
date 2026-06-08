"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLang, type Lang } from "@/lib/i18n";
import { api, SPRITE_BASE } from "@/lib/api";
import type { PokemonSearchResult, PokemonDetail, MoveEntry } from "@/lib/types";
import { PokemonSelector } from "@/components/PokemonSelector";
import { TypeBadge } from "@/components/TypeBadge";
import { TYPE_NAME } from "@/lib/type-names";
import {
  type SP, EMPTY_SP, spTotal, calcAllStats, calcDamage, stageMult,
  type DamageContext, DEFAULT_CONTEXT,
} from "@/lib/damage-calc";
import { NATURES, type StatKey } from "@/lib/natures";
import {
  WEATHERS, TERRAINS, ATK_ITEMS, DEF_ITEMS, ATK_ABILITIES, DEF_ABILITIES,
  type WeatherKey, type TerrainKey,
} from "@/lib/data/damage-modifiers";


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

const CAT_ICON: Record<string, string> = { physical: "⚔", special: "✦", status: "●" };

const TYPE_COLOR: Record<string, string> = {
  fire:"#f97316", water:"#3b82f6", grass:"#22c55e", electric:"#eab308",
  ice:"#67e8f9", fighting:"#dc2626", poison:"#a855f7", ground:"#ca8a04",
  flying:"#7dd3fc", psychic:"#ec4899", bug:"#84cc16", rock:"#78716c",
  ghost:"#7c3aed", dragon:"#4f46e5", dark:"#1c1917", steel:"#94a3b8",
  fairy:"#f9a8d4", normal:"#6b7280",
};

// ─── Nature picker ───────────────────────────────────────────────────────────

type NatureParts = { boosted: StatKey | null; reduced: StatKey | null };
const NEUTRAL_NAT: NatureParts = { boosted: null, reduced: null };
const SPE_LABEL: Record<Lang, string> = { zh: "速", en: "Spe", ja: "素早" };

function natureName(p: NatureParts): string {
  if (!p.boosted && !p.reduced) return "Hardy";
  return NATURES.find(n => n.boosted === p.boosted && n.reduced === p.reduced)?.en ?? "Hardy";
}

function NatStatPicker({ value, onChange, t, lang }: { value: NatureParts; onChange: (p: NatureParts) => void; t: (k: string) => string; lang: Lang }) {
  const opts: { key: StatKey | null; label: string }[] = [
    { key: null,  label: t("speed_nat_neutral") },
    { key: "atk", label: t("dmg_stage_atk") },
    { key: "def", label: t("dmg_stage_def") },
    { key: "spa", label: t("dmg_stage_spa") },
    { key: "spd", label: t("dmg_stage_spd") },
    { key: "spe", label: SPE_LABEL[lang] ?? "速" },
  ];
  function setBoost(k: StatKey | null) {
    if (k === null) { onChange({ boosted: null, reduced: null }); return; }
    onChange({ boosted: k, reduced: k === value.reduced ? null : value.reduced });
  }
  function setReduce(k: StatKey | null) {
    if (k === null) { onChange({ boosted: null, reduced: null }); return; }
    onChange({ boosted: k === value.boosted ? null : value.boosted, reduced: k });
  }
  return (
    <div className="flex flex-col gap-1.5">
      {([["dmg_nature_boost", "amber", value.boosted, setBoost], ["dmg_nature_reduce", "blue", value.reduced, setReduce]] as const).map(([labelKey, color, selected, setter]) => (
        <div key={labelKey} className="flex items-center gap-1.5">
          <span className={`text-[9px] font-bold uppercase tracking-wide w-7 shrink-0 ${color === "amber" ? "text-amber-400/70" : "text-blue-400/70"}`}>
            {t(labelKey)}
          </span>
          <div className="flex gap-1 flex-1 flex-wrap">
            {opts.map(o => (
              <button key={String(o.key)} type="button" onClick={() => setter(o.key)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors border
                  ${selected === o.key
                    ? color === "amber" ? "bg-amber-500/30 border-amber-400/50 text-amber-200" : "bg-blue-500/30 border-blue-400/50 text-blue-200"
                    : "bg-white/4 border-white/8 text-white/40 hover:bg-white/8 hover:text-white/65"
                  }`}
              >{o.label}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stage stepper ───────────────────────────────────────────────────────────

function StageStepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const color = value > 0 ? "text-green-300" : value < 0 ? "text-red-300" : "text-white/40";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/35 w-8 shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" disabled={value >= 6} onClick={() => onChange(Math.min(6, value + 1))}
          className="w-5 h-5 flex items-center justify-center text-[10px] text-white/50 hover:text-white/90 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">▲</button>
        <span className={`w-7 text-center text-[12px] font-bold tabular-nums ${color}`}>
          {value > 0 ? `+${value}` : value}
        </span>
        <button type="button" disabled={value <= -6} onClick={() => onChange(Math.max(-6, value - 1))}
          className="w-5 h-5 flex items-center justify-center text-[10px] text-white/50 hover:text-white/90 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">▼</button>
      </div>
    </div>
  );
}

// ─── Toggle button group ─────────────────────────────────────────────────────

function ToggleGroup<T extends string | null>({
  options, value, onChange, lang, color = "blue",
}: {
  options: { key: T; zh: string; en: string; ja: string }[];
  value: T;
  onChange: (k: T) => void;
  lang: Lang;
  color?: "blue" | "amber" | "green";
}) {
  const colorOn = color === "amber"
    ? "bg-amber-500/25 border-amber-400/50 text-amber-200"
    : color === "green"
    ? "bg-green-500/20 border-green-400/40 text-green-200"
    : "bg-blue-500/25 border-blue-400/50 text-blue-200";

  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(o => (
        <button key={String(o.key)} type="button" onClick={() => onChange(o.key)}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors
            ${value === o.key ? colorOn : "bg-white/4 border-white/8 text-white/40 hover:bg-white/8 hover:text-white/65"}`}
        >
          {lang === "zh" ? o.zh : lang === "ja" ? o.ja : o.en}
        </button>
      ))}
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
    if (total - value[key] + v > 66) return;
    onChange({ ...value, [key]: v });
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-semibold ${remaining < 0 ? "text-red-400" : "text-white/40"}`}>
          {t("dmg_sp_remain")} {remaining}/66
        </span>
        <button type="button" onClick={() => onChange(EMPTY_SP)}
          className="text-[10px] text-white/30 hover:text-white/60 transition-colors px-2 py-0.5 border border-white/8 rounded">
          {t("dmg_sp_reset")}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {SP_KEYS.map(k => (
          <div key={k} className="flex items-center gap-2">
            <span className="text-[10px] text-white/35 w-8 shrink-0">{SP_LABELS[k]}</span>
            <input type="number" min={0} max={32} value={value[k]} onChange={e => update(k, e.target.value)}
              className="w-12 bg-white/5 border border-white/8 rounded px-2 py-1 text-[11px] text-white text-center outline-none [color-scheme:dark] shrink-0" />
            <input type="range" min={0} max={32} value={value[k]} onChange={e => update(k, e.target.value)}
              className="flex-1 accent-blue-400 cursor-pointer" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stat display ─────────────────────────────────────────────────────────────

function StatDisplay({ stats }: { stats: ReturnType<typeof calcAllStats> | null }) {
  if (!stats) return null;
  const pairs = [["HP",stats.hp],["攻",stats.attack],["防",stats.defense],["特攻",stats.sp_attack],["特防",stats.sp_defense],["速",stats.speed]] as [string,number][];
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

// ─── Move slot ───────────────────────────────────────────────────────────────

function MoveSlot({ index, value, allMoves, lang, onChange }: {
  index: number; value: MoveEntry | null; allMoves: MoveEntry[]; lang: Lang; onChange: (m: MoveEntry | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => { if (value) setQuery(moveDisplayName(value, lang)); else setQuery(""); }, [value, lang]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allMoves.slice(0, 40);
    const q = query.toLowerCase();
    return allMoves.filter(m =>
      m.name_en.includes(q) || m.name_zh.toLowerCase().includes(q) ||
      m.name_ja.includes(q) || m.name_en.replace(/-/g, " ").includes(q)
    ).slice(0, 30);
  }, [query, allMoves]);

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors
        ${value ? "bg-white/5 border-white/12" : "bg-white/3 border-white/7 border-dashed"}`}>
        {value && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
            style={{ background: (TYPE_COLOR[value.type]??"#888")+"33", color: TYPE_COLOR[value.type]??"#888" }}>
            {value.type.toUpperCase().slice(0,3)}
          </span>
        )}
        <input type="text" value={query} placeholder={`招式 ${index + 1}`}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="flex-1 bg-transparent outline-none text-white text-[12px] placeholder:text-white/20 min-w-0" />
        {value && (
          <>
            <span className="text-[10px] text-white/35 shrink-0">{CAT_ICON[value.category]}</span>
            {value.power != null && <span className="text-[11px] font-bold text-white/60 shrink-0">{value.power}</span>}
            <button type="button" onClick={() => { onChange(null); setQuery(""); }}
              className="text-white/25 hover:text-white/60 text-[13px] shrink-0 transition-colors">×</button>
          </>
        )}
      </div>
      {open && (
        <ul className="absolute z-30 w-full mt-1 bg-[#0f1520] border border-white/12 rounded-xl overflow-hidden shadow-2xl max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-[11px] text-white/30">無結果</li>
          ) : filtered.map(m => (
            <li key={m.name_en}>
              <button type="button"
                onClick={() => { onChange(m); setQuery(moveDisplayName(m, lang)); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/8 text-left transition-colors">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: (TYPE_COLOR[m.type]??"#888")+"33", color: TYPE_COLOR[m.type]??"#888" }}>
                  {m.type.toUpperCase().slice(0,3)}
                </span>
                <span className="text-[12px] text-white/80 flex-1 min-w-0 truncate">{moveDisplayName(m, lang)}</span>
                <span className="text-[10px] text-white/30 shrink-0">{CAT_ICON[m.category]}</span>
                {m.power != null && <span className="text-[11px] font-semibold text-white/50 w-8 text-right shrink-0">{m.power}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Field section ───────────────────────────────────────────────────────────

function FieldSection({ ctx, onChange, t, lang }: {
  ctx: DamageContext;
  onChange: (c: DamageContext) => void;
  t: (k: string) => string;
  lang: Lang;
}) {
  const set = (patch: Partial<DamageContext>) => onChange({ ...ctx, ...patch });

  const supportToggles: { key: keyof DamageContext; labelKey: string }[] = [
    { key: "helpingHand", labelKey: "dmg_helping_hand" },
    { key: "reflect",     labelKey: "dmg_reflect" },
    { key: "lightScreen", labelKey: "dmg_light_screen" },
    { key: "auroraVeil",  labelKey: "dmg_aurora_veil" },
    { key: "spread",      labelKey: "dmg_spread" },
  ];

  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl p-5 flex flex-col gap-4">
      <p className="text-[10px] font-bold tracking-[2px] uppercase text-white/25">{t("dmg_field_title")}</p>

      <div className="flex flex-col gap-3">
        {/* Weather */}
        <div>
          <p className="text-[10px] text-white/25 uppercase tracking-wide mb-2">{t("dmg_weather_title")}</p>
          <ToggleGroup
            options={WEATHERS as { key: WeatherKey; zh: string; en: string; ja: string }[]}
            value={ctx.weather}
            onChange={w => set({ weather: w })}
            lang={lang}
            color="amber"
          />
        </div>

        {/* Terrain */}
        <div>
          <p className="text-[10px] text-white/25 uppercase tracking-wide mb-2">{t("dmg_terrain_title")}</p>
          <ToggleGroup
            options={TERRAINS as { key: TerrainKey; zh: string; en: string; ja: string }[]}
            value={ctx.terrain}
            onChange={tr => set({ terrain: tr })}
            lang={lang}
            color="green"
          />
        </div>

        {/* Support toggles */}
        <div>
          <p className="text-[10px] text-white/25 uppercase tracking-wide mb-2">{t("dmg_support_title")}</p>
          <div className="flex gap-1.5 flex-wrap">
            {supportToggles.map(({ key, labelKey }) => (
              <button key={key} type="button"
                onClick={() => set({ [key]: !ctx[key] } as Partial<DamageContext>)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors
                  ${ctx[key]
                    ? "bg-purple-500/25 border-purple-400/50 text-purple-200"
                    : "bg-white/4 border-white/8 text-white/40 hover:bg-white/8 hover:text-white/65"
                  }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>
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
  nat: NatureParts; onNat: (p: NatureParts) => void;
  sp: SP; onSP: (sp: SP) => void;
  lang: Lang; t: (k: string) => string;
  onSelect: (r: PokemonSearchResult) => void;
  value: PokemonSearchResult | null;
  moves?: (MoveEntry | null)[];
  allMoves?: MoveEntry[];
  onMoveChange?: (idx: number, m: MoveEntry | null) => void;
  calcedStats: ReturnType<typeof calcAllStats> | null;
  atkStage?: number; onAtkStage?: (v: number) => void;
  spaStage?: number; onSpaStage?: (v: number) => void;
  defStage?: number; onDefStage?: (v: number) => void;
  spdStage?: number; onSpdStage?: (v: number) => void;
  item: string; onItem: (k: string) => void;
  ability: string; onAbility: (k: string) => void;
}

function PokeCard({
  side, mon, detail, megaIdx, onMega, nat, onNat, sp, onSP,
  lang, t, onSelect, value, moves, allMoves, onMoveChange, calcedStats,
  atkStage, onAtkStage, spaStage, onSpaStage,
  defStage, onDefStage, spdStage, onSpdStage,
  item, onItem, ability, onAbility,
}: PokeCardProps) {
  const activeForm = detail && megaIdx !== null ? detail.mega_forms[megaIdx] : null;
  const types = activeForm ? activeForm.types : mon?.types ?? [];
  const typeNames = TYPE_NAME[lang] ?? TYPE_NAME.zh;
  const isAtk = side === "attacker";
  const items = isAtk ? ATK_ITEMS : DEF_ITEMS;
  const abilities = isAtk ? ATK_ABILITIES : DEF_ABILITIES;

  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl p-5 flex flex-col gap-4">
      <p className="text-[10px] font-bold tracking-[2px] uppercase text-white/25">
        {t(isAtk ? "dmg_attacker" : "dmg_defender")}
      </p>

      {/* Selector + sprite */}
      <div className="flex items-center gap-3">
        {mon ? (
          <img src={spriteUrl(mon.id, activeForm?.suffix)} alt=""
            className="w-14 h-14 object-contain shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="w-14 h-14 rounded-full bg-white/4 border border-white/8 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <PokemonSelector id={`dmg-${side}`} label="" lang={lang} onSelect={onSelect} value={value} />
          {types.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {types.map(tp => <TypeBadge key={tp} type={tp} label={typeNames[tp]??tp} className="text-[9px] px-1.5 py-0.5" />)}
            </div>
          )}
        </div>
      </div>

      {/* Mega toggle */}
      {detail && detail.mega_forms.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          <button type="button" onClick={() => onMega(null)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors
              ${megaIdx === null ? "bg-amber-500/25 border-amber-400/50 text-amber-200" : "bg-white/4 border-white/10 text-white/40 hover:bg-white/8"}`}>
            Base
          </button>
          {detail.mega_forms.map((mf, i) => (
            <button key={mf.suffix} type="button" onClick={() => onMega(i)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors
                ${megaIdx === i ? "bg-amber-500/25 border-amber-400/50 text-amber-200" : "bg-white/4 border-white/10 text-white/40 hover:bg-white/8"}`}>
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

      <StatDisplay stats={calcedStats} />

      {/* Stat stages */}
      <div>
        <p className="text-[10px] text-white/25 uppercase tracking-wide mb-2">{t("dmg_stage_title")}</p>
        <div className="flex flex-col gap-1">
          {isAtk && onAtkStage && onSpaStage && (
            <>
              <StageStepper label={t("dmg_stage_atk")} value={atkStage??0} onChange={onAtkStage} />
              <StageStepper label={t("dmg_stage_spa")} value={spaStage??0} onChange={onSpaStage} />
            </>
          )}
          {!isAtk && onDefStage && onSpdStage && (
            <>
              <StageStepper label={t("dmg_stage_def")} value={defStage??0} onChange={onDefStage} />
              <StageStepper label={t("dmg_stage_spd")} value={spdStage??0} onChange={onSpdStage} />
            </>
          )}
        </div>
      </div>

      {/* Item */}
      <div>
        <p className="text-[10px] text-white/25 uppercase tracking-wide mb-2">{t("dmg_item_title")}</p>
        <div className="flex gap-1 flex-wrap">
          {items.map(it => (
            <button key={it.key} type="button" onClick={() => onItem(it.key)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors
                ${item === it.key
                  ? "bg-amber-500/25 border-amber-400/50 text-amber-200"
                  : "bg-white/4 border-white/8 text-white/40 hover:bg-white/8 hover:text-white/65"
                }`}
            >
              {lang === "zh" ? it.zh : lang === "ja" ? it.ja : it.en}
            </button>
          ))}
        </div>
      </div>

      {/* Ability */}
      <div>
        <p className="text-[10px] text-white/25 uppercase tracking-wide mb-2">{t("dmg_ability_title")}</p>
        <div className="flex gap-1 flex-wrap">
          {abilities.map(ab => (
            <button key={ab.key} type="button" onClick={() => onAbility(ab.key)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors
                ${ability === ab.key
                  ? "bg-blue-500/25 border-blue-400/50 text-blue-200"
                  : "bg-white/4 border-white/8 text-white/40 hover:bg-white/8 hover:text-white/65"
                }`}
            >
              {lang === "zh" ? ab.zh : lang === "ja" ? ab.ja : ab.en}
            </button>
          ))}
        </div>
      </div>

      {/* Move slots (attacker only) */}
      {moves && allMoves && onMoveChange && (
        <div>
          <p className="text-[10px] text-white/25 uppercase tracking-wide mb-2">{t("dmg_moves")}</p>
          <div className="flex flex-col gap-1.5">
            {moves.map((m, i) => (
              <MoveSlot key={i} index={i} value={m} allMoves={allMoves} lang={lang}
                onChange={mv => onMoveChange(i, mv)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Result row ──────────────────────────────────────────────────────────────

function ResultRow({ move, lang, t, atkStats, defStats, defTypes, atkTypes, atkAtkStage, atkSpaStage, defDefStage, defSpdStage, ctx }: {
  move: MoveEntry; lang: Lang; t: (k: string) => string;
  atkStats: ReturnType<typeof calcAllStats>;
  defStats: ReturnType<typeof calcAllStats>;
  defTypes: string[]; atkTypes: string[];
  atkAtkStage: number; atkSpaStage: number;
  defDefStage: number; defSpdStage: number;
  ctx: DamageContext;
}) {
  const name = moveDisplayName(move, lang);

  if (move.category === "status" || move.power == null) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/3 border border-white/6">
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{ background: (TYPE_COLOR[move.type]??"#888")+"22", color: (TYPE_COLOR[move.type]??"#888")+"88" }}>
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

  const result = calcDamage(
    move.power, effectiveAtkStat, effectiveDefStat, defStats.hp,
    move.type, atkTypes, defTypes, move.category, ctx,
  );

  if (result.immune) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/3 border border-white/6">
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{ background: (TYPE_COLOR[move.type]??"#888")+"22", color: (TYPE_COLOR[move.type]??"#888")+"88" }}>
          {move.type.toUpperCase().slice(0, 3)}
        </span>
        <span className="text-[12px] text-white/50 flex-1 truncate">{name}</span>
        <span className="text-[10px] text-white/25 shrink-0 bg-white/5 px-2 py-0.5 rounded">免疫 ×0</span>
      </div>
    );
  }

  let rowClass = "bg-white/3 border-white/6";
  let koTag: string | null = null;
  if (result.minPct >= 100) { rowClass = "bg-red-500/8 border-red-500/30"; koTag = "確定 KO"; }
  else if (result.maxPct >= 100) { rowClass = "bg-orange-500/8 border-orange-500/25"; koTag = "確率 KO"; }

  const multLabel = result.typeMult !== 1.0
    ? `×${result.typeMult}` + (atkTypes.includes(move.type) ? " +屬" : "")
    : atkTypes.includes(move.type) ? "+屬" : null;

  const atkLabel = isPhysical ? t("dmg_stage_atk") : t("dmg_stage_spa");
  const defLabel = isPhysical ? t("dmg_stage_def") : t("dmg_stage_spd");
  const stageLabel = (() => {
    const parts: string[] = [];
    if (atkStage !== 0) parts.push(`${atkLabel}${atkStage > 0 ? `+${atkStage}` : atkStage}`);
    if (defStage !== 0) parts.push(`${defLabel}${defStage > 0 ? `+${defStage}` : defStage}`);
    return parts.join(" ");
  })();

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors ${rowClass}`}>
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
        style={{ background: (TYPE_COLOR[move.type]??"#888")+"33", color: TYPE_COLOR[move.type]??"#888" }}>
        {move.type.toUpperCase().slice(0, 3)}
      </span>
      <span className="text-[12px] text-white/80 flex-1 min-w-0 truncate">{name}</span>
      <span className="text-[9px] text-white/25 shrink-0">{move.category === "physical" ? "⚔" : "✦"} {move.power}</span>
      {stageLabel && <span className="text-[9px] text-purple-300/70 shrink-0">{stageLabel}</span>}
      {multLabel && (
        <span className="text-[9px] font-bold shrink-0"
          style={{ color: result.typeMult > 1 ? "#f97316" : result.typeMult < 1 ? "#60a5fa" : "#fff" }}>
          {multLabel}
        </span>
      )}
      <div className="text-right shrink-0">
        <p className="text-[13px] font-bold text-white tabular-nums">{result.min}~{result.max}</p>
        <p className="text-[10px] text-white/45 tabular-nums">{result.minPct}~{result.maxPct}%</p>
      </div>
      {koTag && (
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded shrink-0
          ${koTag === "確定 KO"
            ? "bg-red-500/25 text-red-300 border border-red-400/40"
            : "bg-orange-500/25 text-orange-300 border border-orange-400/40"}`}>
          {koTag}
        </span>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function DamagePage() {
  const { t, lang } = useLang();

  const [atkMon, setAtkMon] = useState<PokemonSearchResult | null>(null);
  const [defMon, setDefMon] = useState<PokemonSearchResult | null>(null);
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
  const [ctx, setCtx] = useState<DamageContext>(DEFAULT_CONTEXT);

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
    setCtx(c => ({ ...c, atkItem: "none", atkAbility: "none" }));
  }, []);
  const handleDefSelect = useCallback((r: PokemonSearchResult) => {
    setDefMon(r); setDefMega(null); setDefSP(EMPTY_SP); setDefNat(NEUTRAL_NAT);
    setCtx(c => ({ ...c, defItem: "none", defAbility: "none" }));
  }, []);

  const atkActiveForm = atkDetail && atkMega !== null ? atkDetail.mega_forms[atkMega] : null;
  const defActiveForm = defDetail && defMega !== null ? defDetail.mega_forms[defMega] : null;
  const atkBase = atkActiveForm?.base_stats ?? atkDetail?.base_stats ?? null;
  const defBase = defActiveForm?.base_stats ?? defDetail?.base_stats ?? null;
  const atkTypes: string[] = atkActiveForm?.types ?? atkMon?.types ?? [];
  const defTypes: string[] = defActiveForm?.types ?? defMon?.types ?? [];
  const atkStats = atkBase ? calcAllStats(atkBase, atkSP, natureName(atkNat)) : null;
  const defStats = defBase ? calcAllStats(defBase, defSP, natureName(defNat)) : null;

  const handleMoveChange = (idx: number, m: MoveEntry | null) =>
    setMoves(prev => prev.map((mv, i) => i === idx ? m : mv));

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
          nat={atkNat} onNat={setAtkNat} sp={atkSP} onSP={setAtkSP}
          lang={lang} t={t} onSelect={handleAtkSelect} value={atkMon}
          moves={moves} allMoves={allMoves} onMoveChange={handleMoveChange}
          calcedStats={atkStats}
          atkStage={atkAtkStage} onAtkStage={setAtkAtkStage}
          spaStage={atkSpaStage} onSpaStage={setAtkSpaStage}
          item={ctx.atkItem} onItem={k => setCtx(c => ({ ...c, atkItem: k }))}
          ability={ctx.atkAbility} onAbility={k => setCtx(c => ({ ...c, atkAbility: k }))}
        />
        <PokeCard
          side="defender"
          mon={defMon} detail={defDetail} megaIdx={defMega} onMega={setDefMega}
          nat={defNat} onNat={setDefNat} sp={defSP} onSP={setDefSP}
          lang={lang} t={t} onSelect={handleDefSelect} value={defMon}
          calcedStats={defStats}
          defStage={defDefStage} onDefStage={setDefDefStage}
          spdStage={defSpdStage} onSpdStage={setDefSpdStage}
          item={ctx.defItem} onItem={k => setCtx(c => ({ ...c, defItem: k }))}
          ability={ctx.defAbility} onAbility={k => setCtx(c => ({ ...c, defAbility: k }))}
        />
      </div>

      {/* Field conditions */}
      <div className="mt-4">
        <FieldSection ctx={ctx} onChange={setCtx} t={t} lang={lang} />
      </div>

      {/* Results */}
      <div className="mt-4 bg-white/4 border border-white/8 rounded-2xl p-5">
        <p className="text-[10px] font-bold tracking-[2px] uppercase text-white/25 mb-4">
          {t("dmg_results")}
        </p>
        {!hasResults ? (
          <p className="text-center text-white/25 text-[13px] py-6">{t("dmg_select_both")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {activeMoves.map((move, i) => (
              <ResultRow
                key={`${move.name_en}-${i}`}
                move={move} lang={lang} t={t}
                atkStats={atkStats!} defStats={defStats!}
                defTypes={defTypes} atkTypes={atkTypes}
                atkAtkStage={atkAtkStage} atkSpaStage={atkSpaStage}
                defDefStage={defDefStage} defSpdStage={defSpdStage}
                ctx={ctx}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
