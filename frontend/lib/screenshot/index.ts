import { dhash } from "./dhash";
import { detectTypes } from "./type-detect";
import { cropToImageData, LEFT_REGIONS, RIGHT_REGIONS } from "./regions";
import { rankCandidates } from "./matcher";
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
  const processSlot = (spriteData: ImageData, badgeData?: ImageData): SlotCandidates => {
    const hash = dhash(spriteData);
    const types = badgeData ? detectTypes(badgeData) : [];
    return rankCandidates(hash, types, db);
  };

  const left = LEFT_REGIONS.map(r =>
    processSlot(cropToImageData(canvas, r.sprite))
  );
  const right = RIGHT_REGIONS.map(r =>
    processSlot(
      cropToImageData(canvas, r.sprite),
      r.badge ? cropToImageData(canvas, r.badge) : undefined,
    )
  );

  return { left, right };
}
