"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n";
import { api } from "@/lib/api";
import type { PokemonSearchResult } from "@/lib/types";
import { PokemonSelector } from "@/components/PokemonSelector";

const MODIFIERS = [
  { key: "speed_mod_scarf",     mult: 1.5 },
  { key: "speed_mod_tailwind",  mult: 2.0 },
  { key: "speed_mod_weather",   mult: 2.0 },
  { key: "speed_mod_paralysis", mult: 0.5 },
  { key: "speed_mod_iron_ball", mult: 0.5 },
];

const NAT_OPTIONS: { key: string; mult: number }[] = [
  { key: "speed_nat_boost",   mult: 1.1 },
  { key: "speed_nat_neutral", mult: 1.0 },
  { key: "speed_nat_reduce",  mult: 0.9 },
];

function combinedMult(active: Set<string>): number {
  return MODIFIERS.filter(m => active.has(m.key)).reduce((acc, m) => acc * m.mult, 1.0);
}

function calcLiveSpeed(base: number, sp: number, natMult: number, modMult: number): number {
  return Math.floor(Math.floor((base + 20 + sp) * natMult) * modMult);
}

function toggle(set: Set<string>, key: string): Set<string> {
  const next = new Set(set);
  next.has(key) ? next.delete(key) : next.add(key);
  return next;
}

function speedColor(self: number | null, other: number | null): string {
  if (self === null || other === null) return "text-white/70";
  if (self > other) return "text-green-300";
  if (self < other) return "text-red-300";
  return "text-yellow-300";
}

interface NatToggleProps {
  value: number;
  onChange: (mult: number) => void;
  t: (k: string) => string;
}

function NatToggle({ value, onChange, t }: NatToggleProps) {
  return (
    <div className="flex gap-1.5">
      {NAT_OPTIONS.map(o => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.mult)}
          className={`flex-1 py-1 rounded-md text-[11px] font-medium transition-colors border
            ${value === o.mult
              ? "bg-blue-500/25 border-blue-400/50 text-blue-200"
              : "bg-white/4 border-white/10 text-white/45 hover:bg-white/8 hover:text-white/65"
            }`}
        >
          {t(o.key)}
        </button>
      ))}
    </div>
  );
}

interface ModToggleGroupProps {
  active: Set<string>;
  onChange: (next: Set<string>) => void;
  t: (k: string) => string;
}

function SpEvInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  const clamp = (n: number) => Math.max(0, Math.min(32, n));

  useEffect(() => { setDraft(String(value)); }, [value]);

  const commitDraft = () => {
    const n = clamp(Number(draft));
    setDraft(String(n));
    onChange(n);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text" inputMode="numeric" value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => { if (e.key === "Enter") commitDraft(); }}
        className="w-14 bg-white/4 border border-white/8 rounded-lg px-2 py-2
          text-[12px] text-white outline-none text-center shrink-0 [color-scheme:dark]"
      />
      <input
        type="range" min={0} max={32} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-blue-400 cursor-pointer"
      />
    </div>
  );
}

function ModToggleGroup({ active, onChange, t }: ModToggleGroupProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MODIFIERS.map(m => {
        const on = active.has(m.key);
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange(toggle(active, m.key))}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border
              ${on
                ? "bg-blue-500/25 border-blue-400/50 text-blue-200"
                : "bg-white/4 border-white/10 text-white/45 hover:bg-white/8 hover:text-white/65"
              }`}
          >
            {t(m.key)}
          </button>
        );
      })}
    </div>
  );
}

export default function SpeedPage() {
  const { t, lang } = useLang();

  const [myMon,  setMyMon]  = useState<PokemonSearchResult | null>(null);
  const [tgtMon, setTgtMon] = useState<PokemonSearchResult | null>(null);
  const [myNatMult,  setMyNatMult]  = useState(1.0);
  const [tgtNatMult, setTgtNatMult] = useState(1.0);
  const [myMods,  setMyMods]  = useState<Set<string>>(new Set());
  const [tgtMods, setTgtMods] = useState<Set<string>>(new Set());
  const [mySpEv,  setMySpEv]  = useState(0);
  const [tgtSp,   setTgtSp]   = useState(0);
  const [myBase,  setMyBase]  = useState<number | null>(null);
  const [tgtBase, setTgtBase] = useState<number | null>(null);

  useEffect(() => {
    if (!myMon) { setMyBase(null); return; }
    api.getPokemon(myMon.id).then(d => setMyBase(d.base_stats.speed)).catch(() => {});
  }, [myMon]);

  useEffect(() => {
    if (!tgtMon) { setTgtBase(null); return; }
    api.getPokemon(tgtMon.id).then(d => setTgtBase(d.base_stats.speed)).catch(() => {});
  }, [tgtMon]);

  const myLiveSpeed  = myBase  !== null ? calcLiveSpeed(myBase,  mySpEv, myNatMult,  combinedMult(myMods))  : null;
  const tgtLiveSpeed = tgtBase !== null ? calcLiveSpeed(tgtBase, tgtSp,  tgtNatMult, combinedMult(tgtMods)) : null;

  const myColor  = speedColor(myLiveSpeed,  tgtLiveSpeed);
  const tgtColor = speedColor(tgtLiveSpeed, myLiveSpeed);

  return (
    <div className="max-w-5xl mx-auto px-8 py-7">
      <p className="text-[11px] font-bold tracking-[2.5px] uppercase text-white/22 mb-6">
        {t("speed_header")}
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* My */}
        <div className="bg-white/4 border border-white/8 rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] tracking-[2px] uppercase text-white/25">{t("speed_my_mon")}</p>
            {myLiveSpeed !== null && (
              <span className={`text-2xl font-extrabold tabular-nums leading-none ${myColor}`}>
                {myLiveSpeed}
              </span>
            )}
          </div>
          <PokemonSelector id="speed-my" label={t("speed_name_label")} lang={lang} onSelect={setMyMon} />
          <div>
            <p className="text-[10px] text-white/25 mb-1.5 uppercase tracking-wide">{t("speed_nature_label")}</p>
            <NatToggle value={myNatMult} onChange={setMyNatMult} t={t} />
          </div>
          <div>
            <p className="text-[10px] text-white/25 mb-1.5 uppercase tracking-wide">{t("speed_modifier_label")}</p>
            <ModToggleGroup active={myMods} onChange={setMyMods} t={t} />
          </div>
          <div>
            <p className="text-[10px] text-white/25 mb-1.5 uppercase tracking-wide">{t("speed_my_sp_label")}</p>
            <SpEvInput value={mySpEv} onChange={setMySpEv} />
          </div>
        </div>

        {/* Target */}
        <div className="bg-white/4 border border-white/8 rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] tracking-[2px] uppercase text-white/25">{t("speed_tgt_mon")}</p>
            {tgtLiveSpeed !== null && (
              <span className={`text-2xl font-extrabold tabular-nums leading-none ${tgtColor}`}>
                {tgtLiveSpeed}
              </span>
            )}
          </div>
          <PokemonSelector id="speed-tgt" label={t("speed_name_label")} lang={lang} onSelect={setTgtMon} />
          <div>
            <p className="text-[10px] text-white/25 mb-1.5 uppercase tracking-wide">{t("speed_nature_label")}</p>
            <NatToggle value={tgtNatMult} onChange={setTgtNatMult} t={t} />
          </div>
          <div>
            <p className="text-[10px] text-white/25 mb-1.5 uppercase tracking-wide">{t("speed_modifier_label")}</p>
            <ModToggleGroup active={tgtMods} onChange={setTgtMods} t={t} />
          </div>
          <div>
            <p className="text-[10px] text-white/25 mb-1.5 uppercase tracking-wide">{t("speed_tgt_sp_label")}</p>
            <SpEvInput value={tgtSp} onChange={setTgtSp} />
          </div>
        </div>
      </div>
    </div>
  );
}
