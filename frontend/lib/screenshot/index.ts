import type { PokemonType } from "./type-detect";
import { detectTypesNCC } from "./badge-matcher";
import { cropToImageData, LEFT_REGIONS, RIGHT_REGIONS } from "./regions";
import { rankByUsage } from "./matcher";
import usageWeights from "@/lib/data/vgc_usage.json";
import type { Candidate } from "./matcher";
import type { SpriteHashEntry } from "@/lib/types";

export type SlotCandidates = Candidate[];

export interface AnalysisResult {
  left: SlotCandidates[];
  right: SlotCandidates[];
}

function cropDataURL(data: ImageData): string {
  const c = document.createElement("canvas");
  c.width = data.width; c.height = data.height;
  c.getContext("2d")!.putImageData(data, 0, 0);
  return c.toDataURL();
}

export function analyzeScreenshot(
  canvas: HTMLCanvasElement,
  db: SpriteHashEntry[],
  typeTemplates?: Map<PokemonType, ImageData>,
): AnalysisResult {
  const weights = usageWeights as Record<string, number>;
  const templates = typeTemplates ?? new Map<PokemonType, ImageData>();
  const debug = process.env.NODE_ENV === "development";

  const left = LEFT_REGIONS.map((r, i) => {
    const candidates = rankByUsage(db, [], weights, 30);
    if (debug) {
      console.log(`[L${i+1}] left-side usage top: ${candidates[0]?.name_en}`);
    }
    return candidates;
  });

  const right = RIGHT_REGIONS.map((r, i) => {
    const badgeData = r.badge ? cropToImageData(canvas, r.badge) : null;
    const types = badgeData ? detectTypesNCC(badgeData, templates) : [];
    const candidates = rankByUsage(db, types, weights, 30);
    if (debug) {
      const badgeCrop = badgeData ? cropDataURL(badgeData) : null;
      console.groupCollapsed(`[R${i+1}] types=${types.join(",") || "none"} | top: ${candidates[0]?.name_en}`);
      if (badgeCrop) console.log("badge: %c ", `font-size:32px;background:url(${badgeCrop}) no-repeat;background-size:contain`);
      candidates.slice(0, 3).forEach(c => console.log(`  ${c.name_en} usage=${c.confidence.toFixed(3)}`));
      console.groupEnd();
    }
    return candidates;
  });

  return { left, right };
}
