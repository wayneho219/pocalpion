"use client";
import { useState, useEffect, useCallback } from "react";
import { useLang } from "@/lib/i18n";
import { api, SPRITE_BASE } from "@/lib/api";
import type { PokemonDetail, PokemonSearchResult } from "@/lib/types";
import { PokemonSelector } from "@/components/PokemonSelector";
import { TypeBadge } from "@/components/TypeBadge";
import { TYPE_NAME } from "@/lib/type-names";
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


const MULT_COLORS: Record<number, string> = {
  4: "#ef4444", 2: "#f97316", 0.5: "#60a5fa", 0.25: "#3b82f6",
};

export default function SearchPage() {
  const { t, lang } = useLang();
  const [pokemon, setPokemon] = useState<PokemonDetail | null>(null);
  const [selectedResult, setSelectedResult] = useState<PokemonSearchResult | null>(null);
  const [megaIdx, setMegaIdx] = useState<number | null>(null);
  const [selectedAbilityKey, setSelectedAbilityKey] = useState<"mega" | "dream" | number | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const handleSelect = useCallback(async (result: PokemonSearchResult) => {
    setSelectedAbilityKey(null);
    setFetchError(false);
    setMegaIdx(null);
    setLoading(true);
    setSelectedResult(result);
    try {
      const detail = await api.getPokemon(result.id);
      setPokemon(detail);
    } catch {
      setFetchError(true);
      setPokemon(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!pokemon) { setSelectedAbilityKey(null); return; }
    if (megaIdx !== null) setSelectedAbilityKey("mega");
    else if (pokemon.abilities.length > 0) setSelectedAbilityKey(0);
    else if (pokemon.dream_ability) setSelectedAbilityKey("dream");
    else setSelectedAbilityKey(null);
  }, [pokemon, megaIdx]);

  const nameKey = lang === "zh" ? "name_zh" : lang === "ja" ? "name_ja" : "name_en";
  const typeNames = TYPE_NAME[lang] ?? TYPE_NAME.zh;


  const activeForm = pokemon && megaIdx !== null ? pokemon.mega_forms[megaIdx] : null;
  const displayTypes      = activeForm ? activeForm.types      : pokemon?.types;
  const displayStats      = activeForm ? activeForm.base_stats : pokemon?.base_stats;
  const displayTypeMatchup = activeForm ? activeForm.type_matchup : pokemon?.type_matchup;
  const abilityDesc: string | null = (() => {
    if (!pokemon || selectedAbilityKey === null) return null;
    if (selectedAbilityKey === "mega" && activeForm?.ability)
      return (activeForm.ability[`desc_${lang}`] || activeForm.ability.desc_zh || "") as string;
    if (selectedAbilityKey === "dream" && pokemon.dream_ability)
      return (pokemon.dream_ability[`desc_${lang}`] || pokemon.dream_ability.desc_zh || "") as string;
    if (typeof selectedAbilityKey === "number") {
      const ab = pokemon.abilities[selectedAbilityKey];
      if (ab) return (ab[`desc_${lang}`] || ab.desc_zh || "") as string;
    }
    return null;
  })();
  const displaySpriteUrl  = activeForm
    ? `${SPRITE_BASE}/mega/${pokemon!.id}-${activeForm.suffix}.png`
    : pokemon ? `${SPRITE_BASE}/${pokemon.id}.png` : null;
  const megaLabel = (suffix: string) =>
    suffix.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

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
        <PokemonSelector id="search-input" label="" lang={lang} onSelect={handleSelect} value={selectedResult} />
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
                  src={displaySpriteUrl ?? ""}
                  alt={pokemon[nameKey]}
                  className="w-32 h-32 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <p className="text-[17px] font-bold text-white">{pokemon[nameKey]}</p>
              <p className="text-[11px] text-white/28">{pokemon.name_ja}</p>
              <div className="flex gap-1.5 flex-wrap justify-center">
                {displayTypes?.map((tp) => (
                  <TypeBadge key={tp} type={tp} label={typeNames[tp] ?? tp} />
                ))}
              </div>
              {pokemon.mega_forms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                  <button
                    type="button"
                    onClick={() => setMegaIdx(null)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors
                      ${megaIdx === null
                        ? "bg-amber-500/25 border-amber-400/50 text-amber-200"
                        : "bg-white/4 border-white/10 text-white/45 hover:bg-white/8"
                      }`}
                  >
                    Base
                  </button>
                  {pokemon.mega_forms.map((mf, i) => (
                    <button
                      key={mf.suffix}
                      type="button"
                      onClick={() => setMegaIdx(i)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors
                        ${megaIdx === i
                          ? "bg-amber-500/25 border-amber-400/50 text-amber-200"
                          : "bg-white/4 border-white/10 text-white/45 hover:bg-white/8"
                        }`}
                    >
                      {megaLabel(mf.suffix)}
                    </button>
                  ))}
                </div>
              )}
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
              {(activeForm ? activeForm.ability : (pokemon.abilities.length > 0 || pokemon.dream_ability)) && (
                <div>
                  <p className="text-[10px] font-bold tracking-[2px] uppercase text-white/22 mb-2">
                    {t("detail_abilities")}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {activeForm ? (
                      activeForm.ability && (
                        <button
                          key={(activeForm.ability[`name_${lang}`] || activeForm.ability.name_zh) as string}
                          type="button"
                          onClick={() => setSelectedAbilityKey("mega")}
                          className={`rounded-lg px-3 py-1.5 text-[12px] border transition-colors
                            ${selectedAbilityKey === "mega"
                              ? "bg-blue-500/25 border-blue-400/60 text-blue-100 font-semibold shadow-[0_0_0_1px_rgba(96,165,250,0.3)]"
                              : "bg-white/5 border-white/9 text-white/50 hover:bg-white/10 hover:text-white/70"
                            }`}
                        >
                          {(activeForm.ability[`name_${lang}`] || activeForm.ability.name_zh) as string}
                        </button>
                      )
                    ) : (
                      <>
                        {pokemon.abilities.map((ab, i) => (
                          <button
                            key={(ab.name_en || ab.name_zh || String(i)) as string}
                            type="button"
                            onClick={() => setSelectedAbilityKey(i)}
                            className={`rounded-lg px-3 py-1.5 text-[12px] border transition-colors
                              ${selectedAbilityKey === i
                                ? "bg-blue-500/25 border-blue-400/60 text-blue-100 font-semibold shadow-[0_0_0_1px_rgba(96,165,250,0.3)]"
                                : "bg-white/5 border-white/9 text-white/50 hover:bg-white/10 hover:text-white/70"
                              }`}
                          >
                            {(ab[`name_${lang}`] || ab.name_zh) as string}
                          </button>
                        ))}
                        {pokemon.dream_ability && (
                          <button
                            type="button"
                            onClick={() => setSelectedAbilityKey("dream")}
                            className={`rounded-lg px-3 py-1.5 text-[12px] border transition-colors
                              ${selectedAbilityKey === "dream"
                                ? "bg-amber-500/30 border-amber-400/70 text-amber-100 font-semibold shadow-[0_0_0_1px_rgba(251,191,36,0.3)]"
                                : "bg-amber-500/7 border-amber-400/30 text-amber-400/70 hover:bg-amber-500/15 hover:text-amber-300"
                              }`}
                          >
                            ★ {(pokemon.dream_ability[`name_${lang}`] || pokemon.dream_ability.name_zh) as string}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  {abilityDesc && (
                    <div className="mt-2 bg-white/5 rounded-lg px-3 py-2">
                      <p className="text-[12px] text-white/55 leading-relaxed">{abilityDesc}</p>
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
                    value={displayStats?.[k] ?? 0}
                    color={STAT_COLORS[k]}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Radar */}
          <div className="mt-4 bg-white/4 border border-white/8 rounded-2xl p-5">
            <PokemonRadarChart
              base={displayStats ?? pokemon.base_stats}
              labels={statLabels}
              baseLabel={activeForm ? megaLabel(activeForm.suffix) : pokemon[nameKey]}
            />
          </div>

          {/* Type matchup */}
          <div className="mt-4">
            <p className="text-[10px] font-bold tracking-[2px] uppercase text-white/22 mb-3">
              {t("detail_type_matchup")}
            </p>
            {(["weaknesses", "resistances", "immunities"] as const).map((category) => {
              const items = displayTypeMatchup?.[category];
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
