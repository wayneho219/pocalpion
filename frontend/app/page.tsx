"use client";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { api } from "@/lib/api";
import type { PokemonDetail, PokemonSearchResult } from "@/lib/types";
import { PokemonSelector } from "@/components/PokemonSelector";
import { TypeBadge } from "@/components/TypeBadge";
import { StatBar } from "@/components/StatBar";
import { PokemonRadarChart } from "@/components/RadarChart";

const STAT_COLORS: Record<string, string> = {
  hp:         "linear-gradient(90deg,#ef4444,#f87171)",
  attack:     "linear-gradient(90deg,#f59e0b,#fcd34d)",
  defense:    "linear-gradient(90deg,#f59e0b,#fcd34d)",
  sp_attack:  "linear-gradient(90deg,#8b5cf6,#c4b5fd)",
  sp_defense: "linear-gradient(90deg,#8b5cf6,#c4b5fd)",
  speed:      "linear-gradient(90deg,#3b82f6,#93c5fd)",
};

const TYPE_NAME: Record<string, Record<string, string>> = {
  zh: { normal:"一般",fighting:"格鬥",flying:"飛行",poison:"毒",ground:"地面",rock:"岩石",
        bug:"蟲",ghost:"幽靈",steel:"鋼",fire:"火",water:"水",grass:"草",
        electric:"電",psychic:"超能力",ice:"冰",dragon:"龍",dark:"惡",fairy:"妖精" },
  en: { normal:"Normal",fighting:"Fighting",flying:"Flying",poison:"Poison",ground:"Ground",
        rock:"Rock",bug:"Bug",ghost:"Ghost",steel:"Steel",fire:"Fire",water:"Water",
        grass:"Grass",electric:"Electric",psychic:"Psychic",ice:"Ice",dragon:"Dragon",
        dark:"Dark",fairy:"Fairy" },
  ja: { normal:"ノーマル",fighting:"かくとう",flying:"ひこう",poison:"どく",ground:"じめん",
        rock:"いわ",bug:"むし",ghost:"ゴースト",steel:"はがね",fire:"ほのお",water:"みず",
        grass:"くさ",electric:"でんき",psychic:"エスパー",ice:"こおり",dragon:"ドラゴン",
        dark:"あく",fairy:"フェアリー" },
};

const MULT_COLORS: Record<number, string> = {
  4: "#ef4444", 2: "#f97316", 0.5: "#60a5fa", 0.25: "#3b82f6",
};

export default function SearchPage() {
  const { t, lang } = useLang();
  const [pokemon, setPokemon] = useState<PokemonDetail | null>(null);
  const [abilityDesc, setAbilityDesc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const handleSelect = async (result: PokemonSearchResult) => {
    setAbilityDesc(null);
    setFetchError(false);
    setLoading(true);
    try {
      const detail = await api.getPokemon(result.id);
      setPokemon(detail);
    } catch {
      setFetchError(true);
      setPokemon(null);
    } finally {
      setLoading(false);
    }
  };

  const nameKey = lang === "zh" ? "name_zh" : lang === "ja" ? "name_ja" : "name_en";
  const typeNames = TYPE_NAME[lang] ?? TYPE_NAME.zh;

  const statLabels: Record<string, string> = {
    hp: t("stat_hp"), attack: t("stat_attack"), defense: t("stat_defense"),
    sp_attack: t("stat_sp_attack"), sp_defense: t("stat_sp_defense"), speed: t("stat_speed"),
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-7">
      <p className="text-[11px] font-bold tracking-[2.5px] uppercase text-white/22 mb-4">
        {t("search_header")}
      </p>

      <div className="flex items-center gap-3 bg-white/5 border border-white/10
        rounded-xl px-5 py-3 mb-6">
        <svg className="w-4 h-4 text-white/25" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={2.5}>
          <circle cx={11} cy={11} r={7} /><path d="M21 21l-4.35-4.35" />
        </svg>
        <PokemonSelector id="search-input" label="" lang={lang} onSelect={handleSelect} />
      </div>

      {loading && (
        <div className="text-center py-12 text-white/30 text-sm">{t("calculating")}</div>
      )}
      {fetchError && (
        <div className="text-center py-12 text-red-400/70 text-sm">{t("error_load_pokemon")}</div>
      )}

      {pokemon && (
        <>
          <div className="bg-white/4 border border-white/8 rounded-2xl p-7
            grid grid-cols-[190px_1fr] gap-7">
            {/* Sprite */}
            <div className="flex flex-col items-center gap-2.5">
              <div className="w-40 h-40 rounded-full border border-orange-500/22
                bg-gradient-radial from-orange-500/16 to-transparent
                flex items-center justify-center overflow-hidden">
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL}/sprites/${pokemon.id}.png`}
                  alt={pokemon[nameKey]}
                  className="w-32 h-32 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <p className="text-[17px] font-bold text-white">{pokemon[nameKey]}</p>
              <p className="text-[11px] text-white/28">{pokemon.name_ja}</p>
              <div className="flex gap-1.5 flex-wrap justify-center">
                {pokemon.types.map((tp) => (
                  <TypeBadge key={tp} type={tp} label={typeNames[tp] ?? tp} />
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="flex flex-col gap-4">
              <p className="text-2xl font-extrabold text-white tracking-tight">
                {pokemon.name_en.charAt(0).toUpperCase() + pokemon.name_en.slice(1)}
                <span className="text-[17px] font-normal text-white/28 ml-2">
                  #{String(pokemon.id).padStart(3, "0")}
                </span>
              </p>

              {/* Abilities */}
              {(pokemon.abilities.length > 0 || pokemon.dream_ability) && (
                <div>
                  <p className="text-[10px] font-bold tracking-[2px] uppercase text-white/22 mb-2">
                    {t("detail_abilities")}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {pokemon.abilities.map((ab, i) => (
                      <button
                        key={(ab.name_en || ab.name_zh || String(i)) as string}
                        type="button"
                        onClick={() => setAbilityDesc(
                          (ab[`desc_${lang}`] || ab.desc_zh || "") as string
                        )}
                        className="bg-white/5 border border-white/9 rounded-lg px-3 py-1.5
                          text-[12px] text-white/60 hover:bg-white/10 transition-colors"
                      >
                        {(ab[`name_${lang}`] || ab.name_zh) as string}
                      </button>
                    ))}
                    {pokemon.dream_ability && (
                      <button
                        type="button"
                        onClick={() => setAbilityDesc(
                          (pokemon.dream_ability![`desc_${lang}`] || pokemon.dream_ability!.desc_zh || "") as string
                        )}
                        className="bg-amber-500/7 border border-amber-400/40 rounded-lg px-3 py-1.5
                          text-[12px] text-amber-300 hover:bg-amber-500/15 transition-colors"
                      >
                        ★ {(pokemon.dream_ability[`name_${lang}`] || pokemon.dream_ability.name_zh) as string}
                      </button>
                    )}
                  </div>
                  {abilityDesc && (
                    <div className="mt-2 flex items-start gap-2 bg-white/5 rounded-lg px-3 py-2">
                      <p className="flex-1 text-[12px] text-white/50">{abilityDesc}</p>
                      <button
                        type="button"
                        onClick={() => setAbilityDesc(null)}
                        className="text-white/30 hover:text-white/60 text-[11px] shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex flex-col gap-2">
                {(["hp","attack","defense","sp_attack","sp_defense","speed"] as const).map((k) => (
                  <StatBar
                    key={k}
                    label={statLabels[k]}
                    value={pokemon.base_stats[k]}
                    color={STAT_COLORS[k]}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Radar */}
          <div className="mt-4 bg-white/4 border border-white/8 rounded-2xl p-5">
            <PokemonRadarChart
              base={pokemon.base_stats}
              labels={statLabels}
              baseLabel={pokemon[nameKey]}
            />
          </div>

          {/* Type matchup */}
          <div className="mt-4">
            <p className="text-[10px] font-bold tracking-[2px] uppercase text-white/22 mb-3">
              {t("detail_type_matchup")}
            </p>
            {(["weaknesses", "resistances", "immunities"] as const).map((category) => {
              const items = pokemon.type_matchup[category];
              if (!items || items.length === 0) return null;
              return (
                <div key={category} className="flex items-center gap-2 flex-wrap mb-2.5">
                  <span className="text-[11px] text-white/30 w-14">{t(`detail_${category}`)}</span>
                  {category === "immunities"
                    ? (items as string[]).map((tp) => (
                        <TypeBadge key={tp} type={tp} label={typeNames[tp] ?? tp} />
                      ))
                    : (items as {type: string; multiplier: number}[]).map((e) => (
                        <span key={e.type} className="flex items-center gap-1">
                          <span
                            style={{ color: MULT_COLORS[e.multiplier] ?? "#fff" }}
                            className="text-[13px] font-bold"
                          >
                            {`${e.multiplier}×`}
                          </span>
                          <TypeBadge type={e.type} label={typeNames[e.type] ?? e.type} />
                        </span>
                      ))
                  }
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
