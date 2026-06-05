const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const SPRITE_BASE = process.env.NEXT_PUBLIC_SPRITE_URL ?? `${BASE}/sprites`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

import type { PokemonSearchResult, PokemonDetail, SpeedResult, SurvivalResult, MoveEntry } from "./types";

export const api = {
  searchPokemon: (q: string) =>
    request<PokemonSearchResult[]>(`/api/pokemon/search?q=${encodeURIComponent(q)}`),

  getPokemon: (id: number) =>
    request<PokemonDetail>(`/api/pokemon/${id}`),

  calcSpeed: (body: {
    my_pokemon_id: number; my_nature: string; my_modifier_mult: number;
    tgt_pokemon_id: number; tgt_nature: string; tgt_modifier_mult: number; tgt_sp: number;
  }) => request<SpeedResult | null>("/api/speed", { method: "POST", body: JSON.stringify(body) }),

  calcSurvival: (body: {
    pokemon_id: number; nature: string;
    power: number; attacker_atk: number; is_physical: boolean; type_multiplier: number;
  }) => request<SurvivalResult>("/api/survival", { method: "POST", body: JSON.stringify(body) }),

  rebuild: () =>
    request<{ count: number }>("/api/admin/rebuild", { method: "POST" }),

  getMoves: () =>
    request<MoveEntry[]>("/api/moves"),
};
