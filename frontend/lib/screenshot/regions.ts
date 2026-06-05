export interface CropRect {
  xFrac: number;
  yFrac: number;
  wFrac: number;
  hFrac: number;
}

export interface SlotRegion {
  sprite: CropRect;
  badge?: CropRect;
}

// Left side (player's Pokémon) — sprite thumbnail at right end of each row card.
// Calibrated from annotated screenshot (1200×675): sprite col x=296–380, rows y=93–559.
const LEFT_SPRITE_X = 0.247;
const LEFT_SPRITE_W = 0.070;
const LEFT_ROW_STARTS = [0.138, 0.253, 0.368, 0.483, 0.598, 0.713] as const;
const LEFT_ROW_H = 0.115;

export const LEFT_REGIONS: SlotRegion[] = LEFT_ROW_STARTS.map(y => ({
  sprite: { xFrac: LEFT_SPRITE_X, yFrac: y, wFrac: LEFT_SPRITE_W, hFrac: LEFT_ROW_H },
}));

// Right side (opponent's Pokémon) — sprite thumbnail + type badge icons.
// Calibrated from annotated screenshot: sprite col x=1003–1087, badge col x≈1090–1160.
// All 6 rows are equal height (77.7px → hFrac≈0.115).
const RIGHT_SPRITE_X = 0.836;
const RIGHT_SPRITE_W = 0.070;
const RIGHT_BADGE_X  = 0.908;
const RIGHT_BADGE_W  = 0.060;

const RIGHT_ROW_STARTS = [0.138, 0.253, 0.368, 0.483, 0.598, 0.713] as const;
const RIGHT_BADGE_H = 0.058;

export const RIGHT_REGIONS: SlotRegion[] = RIGHT_ROW_STARTS.map(y => ({
  sprite: { xFrac: RIGHT_SPRITE_X, yFrac: y, wFrac: RIGHT_SPRITE_W, hFrac: LEFT_ROW_H },
  badge:  { xFrac: RIGHT_BADGE_X,  yFrac: y, wFrac: RIGHT_BADGE_W,  hFrac: RIGHT_BADGE_H },
}));

export function cropToImageData(canvas: HTMLCanvasElement, rect: CropRect): ImageData {
  const x = Math.round(rect.xFrac * canvas.width);
  const y = Math.round(rect.yFrac * canvas.height);
  const w = Math.max(1, Math.round(rect.wFrac * canvas.width));
  const h = Math.max(1, Math.round(rect.hFrac * canvas.height));
  return canvas.getContext("2d")!.getImageData(x, y, w, h);
}
