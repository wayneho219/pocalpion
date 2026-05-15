import { hammingDistance } from "./dhash";
import type { SpriteHashEntry } from "@/lib/types";

export interface Candidate {
  id: number;
  name_en: string;
  name_zh: string;
  name_ja: string;
  types: string[];
  confidence: number;
}

// Ranks final-evolution Pokémon by dHash Hamming distance blended with VGC usage weight.
// Mega forms and non-final evolutions are excluded. typeHints optionally pre-filter the DB.
// Falls back to all finals if the type-filtered pool is empty.
export function rankByHash(
  queryHash: string,
  db: SpriteHashEntry[],
  typeHints: string[] = [],
  topN = 6,
  usageWeights: Record<string, number> = {},
): Candidate[] {
  const pool = typeHints.length > 0
    ? db.filter(e => e.is_final_evolution && typeHints.some(t => e.types.includes(t)))
    : db.filter(e => e.is_final_evolution);
  const source = pool.length > 0 ? pool : db.filter(e => e.is_final_evolution);

  const scored: { c: Candidate; score: number }[] = [];
  for (const e of source) {
    const dist = hammingDistance(queryHash, e.hash);
    const dhashConf = 1 - dist / 64;
    const usage = usageWeights[e.name_en.toLowerCase()] ?? 0;
    const score = dhashConf * 0.7 + usage * 0.3;
    scored.push({
      c: { id: e.id, name_en: e.name_en, name_zh: e.name_zh, name_ja: e.name_ja, types: e.types, confidence: score },
      score,
    });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map(s => s.c);
}

// Returns all Pokémon (including mega forms) that match at least one of the detected types,
// sorted alphabetically. When no types are detected the full dex is returned.
export function rankCandidates(
  detectedTypes: string[],
  db: SpriteHashEntry[],
  topN = 30,
): Candidate[] {
  const pool = detectedTypes.length > 0
    ? db.filter(e => detectedTypes.some(t => e.types.includes(t)))
    : db;
  const source = pool.length > 0 ? pool : db;

  const candidates: Candidate[] = [];
  for (const e of source) {
    candidates.push({ id: e.id, name_en: e.name_en, name_zh: e.name_zh, name_ja: e.name_ja, types: e.types, confidence: 0 });
    for (const m of e.mega) {
      candidates.push({ id: e.id, name_en: `${e.name_en} (${m.suffix})`, name_zh: `${e.name_zh} (${m.suffix})`, name_ja: `${e.name_ja} (${m.suffix})`, types: e.types, confidence: 0 });
    }
  }
  candidates.sort((a, b) => a.name_en.localeCompare(b.name_en));
  return candidates.slice(0, topN);
}
