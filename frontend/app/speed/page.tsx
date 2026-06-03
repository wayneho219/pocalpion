"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n";
import { api, SPRITE_BASE } from "@/lib/api";
import type { PokemonSearchResult, PokemonDetail } from "@/lib/types";
import { useScreenshot } from "@/lib/screenshot-context";
import type { Candidate } from "@/lib/screenshot/matcher";
import { PokemonSelector } from "@/components/PokemonSelector";
import { TypeBadge } from "@/components/TypeBadge";
import { TYPE_NAME } from "@/lib/type-names";
import { SPEED_TIERS, type SpeedTierEntry } from "@/lib/data/speed-tiers";


function spriteUrl(id: number, suffix?: string): string {
  return suffix
    ? `${SPRITE_BASE}/mega/${id}-${suffix}.png`
    : `${SPRITE_BASE}/${id}.png`;
}

function megaLabel(suffix: string): string {
  return suffix.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

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
  return Math.floor(Math.floor((base + sp) * natMult) * modMult);
}

function toggle(set: Set<string>, key: string): Set<string> {
  const next = new Set(set);
  if (next.has(key)) { next.delete(key); } else { next.add(key); }
  return next;
}

function speedColor(self: number | null, other: number | null): string {
  if (self === null || other === null) return "text-white/70";
  if (self > other) return "text-green-300";
  if (self < other) return "text-red-300";
  return "text-yellow-300";
}

function NatToggle({ value, onChange, t }: { value: number; onChange: (m: number) => void; t: (k: string) => string }) {
  return (
    <div className="flex gap-1.5">
      {NAT_OPTIONS.map(o => (
        <button key={o.key} type="button" onClick={() => onChange(o.mult)}
          className={`flex-1 py-1 rounded-md text-[11px] font-medium transition-colors border
            ${value === o.mult
              ? "bg-blue-500/25 border-blue-400/50 text-blue-200"
              : "bg-white/4 border-white/10 text-white/45 hover:bg-white/8 hover:text-white/65"
            }`}>
          {t(o.key)}
        </button>
      ))}
    </div>
  );
}

function ModToggleGroup({ active, onChange, t }: { active: Set<string>; onChange: (s: Set<string>) => void; t: (k: string) => string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MODIFIERS.map(m => {
        const on = active.has(m.key);
        return (
          <button key={m.key} type="button" onClick={() => onChange(toggle(active, m.key))}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border
              ${on
                ? "bg-blue-500/25 border-blue-400/50 text-blue-200"
                : "bg-white/4 border-white/10 text-white/45 hover:bg-white/8 hover:text-white/65"
              }`}>
            {t(m.key)}
          </button>
        );
      })}
    </div>
  );
}

function SpEvInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  const clamp = (n: number) => Math.max(0, Math.min(32, n));
  useEffect(() => { setDraft(String(value)); }, [value]);
  const commit = () => { const n = clamp(Number(draft)); setDraft(String(n)); onChange(n); };
  return (
    <div className="flex items-center gap-2">
      <input type="text" inputMode="numeric" value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
        className="w-14 bg-white/4 border border-white/8 rounded-lg px-2 py-2
          text-[12px] text-white outline-none text-center shrink-0 [color-scheme:dark]"
      />
      <input type="range" min={0} max={32} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-blue-400 cursor-pointer"
      />
    </div>
  );
}

interface CardHeaderProps {
  mon: PokemonSearchResult | null;
  detail: PokemonDetail | null;
  megaIdx: number | null;
  onMega: (idx: number | null) => void;
  liveSpeed: number | null;
  speedColorClass: string;
  label: string;
  lang: string;
}

function CardHeader({ mon, detail, megaIdx, onMega, liveSpeed, speedColorClass, label, lang }: CardHeaderProps) {
  const activeForm = detail && megaIdx !== null ? detail.mega_forms[megaIdx] : null;
  const types  = activeForm ? activeForm.types : mon?.types ?? [];
  const imgUrl = mon ? spriteUrl(mon.id, activeForm?.suffix) : null;
  const typeNames = TYPE_NAME[lang] ?? TYPE_NAME.zh;

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex flex-col gap-1.5">
        <div className="h-14 flex items-center gap-2">
          {imgUrl ? (
            <>
              <img src={imgUrl} alt="" className="w-14 h-14 object-contain shrink-0" />
              <div className="flex flex-wrap gap-1">
                {types.map(tp => (
                  <TypeBadge key={tp} type={tp} label={typeNames[tp] ?? tp} className="text-[10px] px-1.5 py-0.5" />
                ))}
              </div>
            </>
          ) : (
            <p className="text-[10px] tracking-[2px] uppercase text-white/25">{label}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-1 min-h-[22px]">
          {detail && detail.mega_forms.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => onMega(null)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors
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
                  className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors
                    ${megaIdx === i
                      ? "bg-amber-500/25 border-amber-400/50 text-amber-200"
                      : "bg-white/4 border-white/10 text-white/40 hover:bg-white/8"
                    }`}
                >
                  {megaLabel(mf.suffix)}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
      {liveSpeed !== null && (
        <span className={`text-5xl font-extrabold tabular-nums leading-none shrink-0 ${speedColorClass}`}>
          {liveSpeed}
        </span>
      )}
    </div>
  );
}

export default function SpeedPage() {
  const { t, lang } = useLang();

  const [myMon,  setMyMon]  = useState<PokemonSearchResult | null>(null);
  const [tgtMon, setTgtMon] = useState<PokemonSearchResult | null>(null);
  const [myDetail,  setMyDetail]  = useState<PokemonDetail | null>(null);
  const [tgtDetail, setTgtDetail] = useState<PokemonDetail | null>(null);
  const [myMegaIdx,  setMyMegaIdx]  = useState<number | null>(null);
  const [tgtMegaIdx, setTgtMegaIdx] = useState<number | null>(null);
  const [myNatMult,  setMyNatMult]  = useState(1.0);
  const [tgtNatMult, setTgtNatMult] = useState(1.0);
  const [myMods,  setMyMods]  = useState<Set<string>>(new Set());
  const [tgtMods, setTgtMods] = useState<Set<string>>(new Set());
  const [mySpEv,  setMySpEv]  = useState(0);
  const [tgtSp,   setTgtSp]   = useState(0);

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

  useEffect(() => {
    if (!myMon) { setMyDetail(null); setMyMegaIdx(null); return; }
    api.getPokemon(myMon.id).then(d => { setMyDetail(d); setMyMegaIdx(null); }).catch(() => {});
  }, [myMon]);

  useEffect(() => {
    if (!tgtMon) { setTgtDetail(null); setTgtMegaIdx(null); return; }
    api.getPokemon(tgtMon.id).then(d => { setTgtDetail(d); setTgtMegaIdx(null); }).catch(() => {});
  }, [tgtMon]);

  const myActiveForm  = myDetail  && myMegaIdx  !== null ? myDetail.mega_forms[myMegaIdx]   : null;
  const tgtActiveForm = tgtDetail && tgtMegaIdx !== null ? tgtDetail.mega_forms[tgtMegaIdx] : null;
  const myBase  = (myActiveForm  ?? myDetail)?.base_stats.speed  ?? null;
  const tgtBase = (tgtActiveForm ?? tgtDetail)?.base_stats.speed ?? null;

  const myLiveSpeed  = myBase  !== null ? calcLiveSpeed(myBase,  mySpEv, myNatMult,  combinedMult(myMods))  : null;
  const tgtLiveSpeed = tgtBase !== null ? calcLiveSpeed(tgtBase, tgtSp,  tgtNatMult, combinedMult(tgtMods)) : null;

  return (
    <div className="max-w-5xl mx-auto px-8 py-7">
      <p className="text-[11px] font-bold tracking-[2.5px] uppercase text-white/22 mb-6">
        {t("speed_header")}
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* My */}
        <div className="bg-white/4 border border-white/8 rounded-xl p-5 flex flex-col gap-3">
          <CardHeader
            mon={myMon} detail={myDetail}
            megaIdx={myMegaIdx} onMega={setMyMegaIdx}
            liveSpeed={myLiveSpeed}
            speedColorClass={speedColor(myLiveSpeed, tgtLiveSpeed)}
            label={t("speed_my_mon")} lang={lang}
          />
          <PokemonSelector id="speed-my" label={t("speed_name_label")} lang={lang} onSelect={setMyMon} value={myMon} />
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
          <CardHeader
            mon={tgtMon} detail={tgtDetail}
            megaIdx={tgtMegaIdx} onMega={setTgtMegaIdx}
            liveSpeed={tgtLiveSpeed}
            speedColorClass={speedColor(tgtLiveSpeed, myLiveSpeed)}
            label={t("speed_tgt_mon")} lang={lang}
          />
          <PokemonSelector id="speed-tgt" label={t("speed_name_label")} lang={lang} onSelect={setTgtMon} value={tgtMon} />
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

      {/* Speed Tier Table */}
      <SpeedTierTable mySpeed={myLiveSpeed} lang={lang} t={t} />
    </div>
  );
}

function SpeedTierTable({
  mySpeed, lang, t,
}: { mySpeed: number | null; lang: string; t: (k: string) => string }) {
  const nameKey = lang === "zh" ? "name_zh" : lang === "ja" ? "name_ja" : "name_en";

  return (
    <div className="mt-6">
      <p className="text-[11px] font-bold tracking-[2.5px] uppercase text-white/22 mb-3">
        {t("speed_tier_header")}
      </p>
      <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-0">
          {/* header */}
          <div className="grid grid-cols-[1fr_auto_auto] col-span-3 gap-0
            border-b border-white/8 px-4 py-2 bg-white/3">
            <span className="text-[10px] uppercase tracking-widest text-white/25">
              {lang === "zh" ? "寶可夢" : lang === "ja" ? "ポケモン" : "Pokémon"}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-white/25 text-right w-16">
              {t("speed_tier_base")}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-white/25 text-right w-20 ml-4">
              {mySpeed !== null ? (lang === "zh" ? "結果" : lang === "ja" ? "結果" : "Result") : ""}
            </span>
          </div>

          {SPEED_TIERS.map((entry, i) => {
            const outspeeds = mySpeed !== null && mySpeed > entry.base_speed;
            const tied      = mySpeed !== null && mySpeed === entry.base_speed;
            const isMyLine  = mySpeed !== null && i > 0 && entry.base_speed < mySpeed &&
                              (i === 0 || SPEED_TIERS[i - 1].base_speed >= mySpeed);

            return (
              <>
                {isMyLine && (
                  <div key={`line-${entry.base_speed}`}
                    className="col-span-3 flex items-center gap-2 px-4 py-1.5 bg-green-500/8 border-y border-green-400/30">
                    <span className="text-[11px] font-bold text-green-300">
                      ▶ {lang === "zh" ? "你的速度" : lang === "ja" ? "あなたの速度" : "Your speed"}{" "}
                      <span className="tabular-nums">{mySpeed}</span>
                    </span>
                  </div>
                )}
                <div
                  key={entry.name_en}
                  className={`col-span-3 grid grid-cols-[1fr_auto_auto] items-center px-4 py-2
                    border-b border-white/5 last:border-0 transition-colors
                    ${outspeeds ? "hover:bg-white/3" : "hover:bg-white/3 opacity-70"}`}
                >
                  <span className={`text-[12px] ${outspeeds ? "text-white/80" : tied ? "text-yellow-300/80" : "text-white/45"}`}>
                    {entry[nameKey as keyof SpeedTierEntry] as string}
                  </span>
                  <span className="text-[12px] font-mono text-white/50 text-right w-16 tabular-nums">
                    {entry.base_speed}
                  </span>
                  <div className="text-right w-20 ml-4">
                    {mySpeed !== null && (
                      outspeeds ? (
                        <span className="text-[11px] font-bold text-green-400">✓ 超速</span>
                      ) : tied ? (
                        <span className="text-[11px] font-bold text-yellow-400">= 同速</span>
                      ) : (
                        <span className="text-[11px] text-white/25">× 慢</span>
                      )
                    )}
                  </div>
                </div>
              </>
            );
          })}
        </div>
      </div>
    </div>
  );
}
