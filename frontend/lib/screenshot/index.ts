import { detectTypes } from "./type-detect";
import { cropToImageData, LEFT_REGIONS, RIGHT_REGIONS } from "./regions";
import { rankByHash } from "./matcher";
import { dhash } from "./dhash";
import usageWeights from "@/lib/data/vgc_usage.json";
import type { Candidate } from "./matcher";
import type { SpriteHashEntry } from "@/lib/types";

export type SlotCandidates = Candidate[];

export interface AnalysisResult {
  left: SlotCandidates[];
  right: SlotCandidates[];
}

export function analyzeScreenshot(
  canvas: HTMLCanvasElement,
  db: SpriteHashEntry[],
): AnalysisResult {
  const weights = usageWeights as Record<string, number>;
  const left = LEFT_REGIONS.map(r => {
    const h = dhash(cropToImageData(canvas, r.sprite));
    return rankByHash(h, db, [], 6, weights);
  });
  const right = RIGHT_REGIONS.map(r => {
    const types = r.badge ? detectTypes(cropToImageData(canvas, r.badge)) : [];
    const h = dhash(cropToImageData(canvas, r.sprite));
    return rankByHash(h, db, types, 6, weights);
  });
  return { left, right };
}
