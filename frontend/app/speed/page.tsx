"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n";
import { api } from "@/lib/api";
import type { PokemonSearchResult, SpeedResult } from "@/lib/types";
import { PokemonSelector } from "@/components/PokemonSelector";
import { NatureSelector } from "@/components/NatureSelector";

const MODIFIERS = [
  { key: "speed_mod_none",      mult: 1.0 },
  { key: "speed_mod_scarf",     mult: 1.5 },
  { key: "speed_mod_tailwind",  mult: 2.0 },
  { key: "speed_mod_weather",   mult: 2.0 },
  { key: "speed_mod_paralysis", mult: 0.5 },
  { key: "speed_mod_iron_ball", mult: 0.5 },
];

export default function SpeedPage() {
  const { t, lang } = useLang();

  const [myMon,  setMyMon]  = useState<PokemonSearchResult | null>(null);
  const [tgtMon, setTgtMon] = useState<PokemonSearchResult | null>(null);
  const [myNature,  setMyNature]  = useState("Hardy");
  const [tgtNature, setTgtNature] = useState("Hardy");
  const [myModIdx,  setMyModIdx]  = useState(0);
  const [tgtModIdx, setTgtModIdx] = useState(0);
  const [tgtSp, setTgtSp] = useState(0);
  const [result, setResult] = useState<SpeedResult | null | "error">(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!myMon || !tgtMon) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.calcSpeed({
          my_pokemon_id: myMon.id,
          my_nature: myNature,
          my_modifier_mult: MODIFIERS[myModIdx].mult,
          tgt_pokemon_id: tgtMon.id,
          tgt_nature: tgtNature,
          tgt_modifier_mult: MODIFIERS[tgtModIdx].mult,
          tgt_sp: tgtSp,
        });
        setResult(r);
      } catch { setResult("error"); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [myMon, tgtMon, myNature, tgtNature, myModIdx, tgtModIdx, tgtSp]);

  return (
    <div className="max-w-5xl mx-auto px-8 py-7">
      <p className="text-[11px] font-bold tracking-[2.5px] uppercase text-white/22 mb-6">
        {t("speed_header")}
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* My */}
        <div className="bg-white/4 border border-white/8 rounded-xl p-5 flex flex-col gap-3">
          <p className="text-[10px] tracking-[2px] uppercase text-white/25">{t("speed_my_mon")}</p>
          <PokemonSelector id="speed-my" label={t("speed_name_label")} lang={lang} onSelect={setMyMon} />
          <div>
            <p className="text-[10px] text-white/25 mb-1.5 uppercase tracking-wide">{t("speed_nature_label")}</p>
            <NatureSelector lang={lang} value={myNature} onChange={setMyNature} />
          </div>
          <div>
            <p className="text-[10px] text-white/25 mb-1.5 uppercase tracking-wide">{t("speed_modifier_label")}</p>
            <select
              value={myModIdx}
              onChange={(e) => setMyModIdx(Number(e.target.value))}
              className="w-full bg-white/4 border border-white/8 rounded-lg px-3 py-2
                text-[12px] text-white/60 outline-none"
            >
              {MODIFIERS.map((m, i) => (
                <option key={m.key} value={i}>{t(m.key)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Target */}
        <div className="bg-white/4 border border-white/8 rounded-xl p-5 flex flex-col gap-3">
          <p className="text-[10px] tracking-[2px] uppercase text-white/25">{t("speed_tgt_mon")}</p>
          <PokemonSelector id="speed-tgt" label={t("speed_name_label")} lang={lang} onSelect={setTgtMon} />
          <div>
            <p className="text-[10px] text-white/25 mb-1.5 uppercase tracking-wide">{t("speed_nature_label")}</p>
            <NatureSelector lang={lang} value={tgtNature} onChange={setTgtNature} />
          </div>
          <div>
            <p className="text-[10px] text-white/25 mb-1.5 uppercase tracking-wide">{t("speed_modifier_label")}</p>
            <select
              value={tgtModIdx}
              onChange={(e) => setTgtModIdx(Number(e.target.value))}
              className="w-full bg-white/4 border border-white/8 rounded-lg px-3 py-2
                text-[12px] text-white/60 outline-none"
            >
              {MODIFIERS.map((m, i) => (
                <option key={m.key} value={i}>{t(m.key)}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-[10px] text-white/25 mb-1.5 uppercase tracking-wide">{t("speed_tgt_sp_label")}</p>
            <input
              type="number" min={0} max={32} value={tgtSp}
              onChange={(e) => setTgtSp(Number(e.target.value))}
              className="w-full bg-white/4 border border-white/8 rounded-lg px-3 py-2
                text-[12px] text-white outline-none"
            />
          </div>
        </div>
      </div>

      {/* Result */}
      {myMon && tgtMon && (
        <div className="mt-4 bg-gradient-to-r from-blue-500/12 to-purple-500/8
          border border-blue-400/28 rounded-xl px-5 py-4 flex items-center justify-between">
          <p className="text-[12px] text-white/40">
            {loading ? t("calculating") : result === null
              ? t("speed_cannot_outspeed")
              : result === "error"
                ? t("error_generic")
                : t("speed_result_label")}
          </p>
          {result && result !== "error" && result !== null && (
            <p className="text-2xl font-extrabold text-blue-300">
              {result.sp_needed} <span className="text-sm font-normal text-white/30">SP</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
