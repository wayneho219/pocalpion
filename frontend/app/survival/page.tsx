"use client";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { api } from "@/lib/api";
import type { PokemonSearchResult, SurvivalResult, SurvivalPlan } from "@/lib/types";
import { PokemonSelector } from "@/components/PokemonSelector";
import { NatureSelector } from "@/components/NatureSelector";

const TYPE_MULTS = [0.25, 0.5, 1.0, 2.0, 4.0];

function PlanCard({ plan, title, t }: { plan: SurvivalPlan; title: string; t: (k: string) => string }) {
  return (
    <div className="bg-white/4 border border-white/8 rounded-xl p-5">
      <p className="text-[10px] tracking-[2px] uppercase text-white/25 mb-4">{title}</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          ["surv_sp_hp",    plan.sp_hp],
          ["surv_sp_def",   plan.sp_def],
          ["surv_final_hp", plan.final_hp],
          ["surv_final_def",plan.final_def],
        ].map(([key, val]) => (
          <div key={key as string} className="bg-white/4 rounded-lg p-3">
            <p className="text-[10px] text-white/30">{t(key as string)}</p>
            <p className="text-xl font-bold text-white">{val}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-white/30">
        {t("surv_total_sp")}: <span className="text-white font-bold">{plan.total_sp}</span>
      </p>
    </div>
  );
}

export default function SurvivalPage() {
  const { t, lang } = useLang();
  const [mon,     setMon]     = useState<PokemonSearchResult | null>(null);
  const [nature,  setNature]  = useState("Hardy");
  const [power,   setPower]   = useState(120);
  const [atkVal,  setAtkVal]  = useState(200);
  const [physical, setPhysical] = useState(true);
  const [multIdx, setMultIdx] = useState(2);
  const [result,  setResult]  = useState<SurvivalResult | null>(null);
  const [impossible, setImpossible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calcError, setCalcError] = useState(false);

  const calc = async () => {
    if (!mon) return;
    setLoading(true);
    setResult(null);
    setCalcError(false);
    try {
      const r = await api.calcSurvival({
        pokemon_id: mon.id, nature,
        power, attacker_atk: atkVal,
        is_physical: physical,
        type_multiplier: TYPE_MULTS[multIdx],
      });
      setImpossible(!r.prefer_hp.survived);
      setResult(r);
    } catch {
      setCalcError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-7">
      <p className="text-[11px] font-bold tracking-[2.5px] uppercase text-white/22 mb-6">
        {t("surv_header")}
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* Defender */}
        <div className="bg-white/4 border border-white/8 rounded-xl p-5 flex flex-col gap-3">
          <p className="text-[10px] tracking-[2px] uppercase text-white/25">{t("surv_my_mon")}</p>
          <PokemonSelector id="surv-mon" label={t("surv_name_label")} lang={lang} onSelect={setMon} />
          <div>
            <p className="text-[10px] text-white/25 mb-1.5 uppercase tracking-wide">{t("surv_nature_label")}</p>
            <NatureSelector lang={lang} value={nature} onChange={setNature} />
          </div>
        </div>

        {/* Attack params */}
        <div className="bg-white/4 border border-white/8 rounded-xl p-5 flex flex-col gap-3">
          <p className="text-[10px] tracking-[2px] uppercase text-white/25">{t("surv_atk_params")}</p>
          <div>
            <p className="text-[10px] text-white/25 mb-1 uppercase tracking-wide">{t("surv_power_label")}</p>
            <input type="number" min={1} max={250} value={power}
              onChange={(e) => setPower(Number(e.target.value))}
              className="w-full bg-white/4 border border-white/8 rounded-lg px-3 py-2
                text-[12px] text-white outline-none" />
          </div>
          <div>
            <p className="text-[10px] text-white/25 mb-1 uppercase tracking-wide">{t("surv_atk_label")}</p>
            <input type="number" min={1} max={999} value={atkVal}
              onChange={(e) => setAtkVal(Number(e.target.value))}
              className="w-full bg-white/4 border border-white/8 rounded-lg px-3 py-2
                text-[12px] text-white outline-none" />
          </div>
          <div>
            <p className="text-[10px] text-white/25 mb-1.5 uppercase tracking-wide">{t("surv_cat_label")}</p>
            <div className="flex gap-2">
              {[true, false].map((isPhys) => (
                <button key={String(isPhys)} type="button"
                  onClick={() => setPhysical(isPhys)}
                  className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-colors
                    ${physical === isPhys
                      ? "bg-blue-500/30 border border-blue-400/50 text-blue-200"
                      : "bg-white/5 border border-white/9 text-white/50"}`}>
                  {isPhys ? t("surv_cat_physical") : t("surv_cat_special")}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] text-white/25 mb-1.5 uppercase tracking-wide">{t("surv_mult_label")}</p>
            <div className="flex gap-1.5">
              {TYPE_MULTS.map((m, i) => (
                <button key={m} type="button"
                  onClick={() => setMultIdx(i)}
                  className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-colors
                    ${multIdx === i
                      ? "bg-blue-500/30 border border-blue-400/50 text-blue-200"
                      : "bg-white/5 border border-white/9 text-white/50"}`}>
                  {m}×
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Calc button */}
      <button
        type="button"
        disabled={!mon || loading}
        onClick={calc}
        className="mt-4 w-full py-3 rounded-xl bg-blue-600/40 border border-blue-400/40
          text-white font-bold text-[14px] hover:bg-blue-600/60 transition-colors
          disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? t("calculating") : t("calc_button")}
      </button>

      {calcError && (
        <div className="mt-4 text-center py-4 text-red-400/70 text-sm">
          {t("error_generic")}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-4">
          {impossible ? (
            <div className="bg-red-500/15 border border-red-400/30 rounded-xl px-5 py-4 text-center
              text-red-300 font-bold">
              {t("surv_impossible")}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <PlanCard plan={result.prefer_hp}  title={t("surv_plan_hp")}  t={t} />
              <PlanCard plan={result.prefer_def} title={t("surv_plan_def")} t={t} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
