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

export function rankCandidates(
  hash: string,
  detectedTypes: string[],
  db: SpriteHashEntry[],
  topN = 5,
): Candidate[] {
  const filtered =
    detectedTypes.length > 0
      ? db.filter(e => detectedTypes.some(t => e.types.includes(t)))
      : db;
  const pool = filtered.length > 0 ? filtered : db;

  const entries: { id: number; name_en: string; name_zh: string; name_ja: string; types: string[]; hash: string }[] = [];
  for (const e of pool) {
    entries.push({ id: e.id, name_en: e.name_en, name_zh: e.name_zh, name_ja: e.name_ja, types: e.types, hash: e.hash });
    for (const m of e.mega) {
      entries.push({
        id: e.id,
        name_en: `${e.name_en} (${m.suffix})`,
        name_zh: `${e.name_zh} (${m.suffix})`,
        name_ja: `${e.name_ja} (${m.suffix})`,
        types: e.types,
        hash: m.hash,
      });
    }
  }

  return entries
    .map(e => ({ ...e, confidence: 1 - hammingDistance(hash, e.hash) / 64 }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, topN);
}
