"use client";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend,
} from "recharts";
import type { StatSet } from "@/lib/types";

interface RadarChartProps {
  base: StatSet;
  labels: Record<string, string>;
  mega?: StatSet;
  megaLabel?: string;
  baseLabel?: string;
}

function toData(base: StatSet, labels: Record<string, string>, mega?: StatSet) {
  const keys: (keyof StatSet)[] = ["hp", "attack", "defense", "sp_attack", "sp_defense", "speed"];
  return keys.map((k) => ({
    stat: labels[k] ?? k,
    base: base[k],
    ...(mega ? { mega: mega[k] } : {}),
  }));
}

export function PokemonRadarChart({ base, labels, mega, megaLabel = "Mega", baseLabel = "Base" }: RadarChartProps) {
  const data = toData(base, labels, mega);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.1)" />
        <PolarAngleAxis
          dataKey="stat"
          tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
        />
        <Radar
          name={baseLabel}
          dataKey="base"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.15}
        />
        {mega && (
          <Radar
            name={megaLabel}
            dataKey="mega"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.15}
          />
        )}
        {mega && <Legend wrapperStyle={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }} />}
      </RadarChart>
    </ResponsiveContainer>
  );
}
