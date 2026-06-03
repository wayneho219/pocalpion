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

// Left side (player's Pokemon) — sprite at right end of each row card
const LEFT_SPRITE_X = 0.215;
const LEFT_SPRITE_W = 0.075;
const LEFT_ROW_STARTS = [0.115, 0.228, 0.341, 0.454, 0.567, 0.680] as const;
const LEFT_ROW_H = 0.108;

export const LEFT_REGIONS: SlotRegion[] = LEFT_ROW_STARTS.map(y => ({
  sprite: { xFrac: LEFT_SPRITE_X, yFrac: y, wFrac: LEFT_SPRITE_W, hFrac: LEFT_ROW_H },
}));

// Right side (opponent's Pokemon) — thumbnail + type badge to its right
const RIGHT_SPRITE_X = 0.678;
const RIGHT_SPRITE_W = 0.098;
const RIGHT_BADGE_X  = 0.778;
const RIGHT_BADGE_W  = 0.048;
const RIGHT_ROW_STARTS = [0.072, 0.205, 0.338, 0.471, 0.604, 0.737] as const;
const RIGHT_ROW_H = 0.122;

export const RIGHT_REGIONS: SlotRegion[] = RIGHT_ROW_STARTS.map(y => ({
  sprite: { xFrac: RIGHT_SPRITE_X, yFrac: y, wFrac: RIGHT_SPRITE_W, hFrac: RIGHT_ROW_H },
  badge:  { xFrac: RIGHT_BADGE_X,  yFrac: y, wFrac: RIGHT_BADGE_W,  hFrac: RIGHT_ROW_H },
}));

export function cropToImageData(canvas: HTMLCanvasElement, rect: CropRect): ImageData {
  const x = Math.round(rect.xFrac * canvas.width);
  const y = Math.round(rect.yFrac * canvas.height);
  const w = Math.max(1, Math.round(rect.wFrac * canvas.width));
  const h = Math.max(1, Math.round(rect.hFrac * canvas.height));
  return canvas.getContext("2d")!.getImageData(x, y, w, h);
}
