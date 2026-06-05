export type PokemonType =
  | "normal" | "fire" | "water" | "electric" | "grass" | "ice"
  | "fighting" | "poison" | "ground" | "flying" | "psychic" | "bug"
  | "rock" | "ghost" | "dragon" | "dark" | "steel" | "fairy";

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === rf) h = 60 * (((gf - bf) / d + 6) % 6);
    else if (max === gf) h = 60 * ((bf - rf) / d + 2);
    else h = 60 * ((rf - gf) / d + 4);
  }
  return [h, max === 0 ? 0 : d / max, max];
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function circularMean(hues: number[]): number {
  let sin = 0, cos = 0;
  for (const h of hues) {
    sin += Math.sin((h * Math.PI) / 180);
    cos += Math.cos((h * Math.PI) / 180);
  }
  const m = (Math.atan2(sin, cos) * 180) / Math.PI;
  return m < 0 ? m + 360 : m;
}

// Reference hues calibrated from actual in-game type badge PNGs
const TYPE_HUES: [PokemonType, number][] = [
  ["water",    200],
  ["ice",      196],
  ["flying",   205],
  ["steel",    200],
  ["dragon",   220],
  ["fire",      15],
  ["fighting",  37],
  ["ground",    45],
  ["electric",  51],
  ["rock",      60],
  ["bug",       61],
  ["grass",    113],
  ["ghost",    296],
  ["poison",   282],
  ["psychic",  348],
  ["fairy",    334],
];

function closestType(hue: number): PokemonType {
  let best: PokemonType = "normal";
  let bestDist = Infinity;
  for (const [type, ref] of TYPE_HUES) {
    const d = hueDistance(hue, ref);
    if (d < bestDist) { bestDist = d; best = type; }
  }
  return best;
}

function subRegion(src: ImageData, x: number, y: number, w: number, h: number): ImageData {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const si = ((y + row) * src.width + (x + col)) * 4;
      const di = (row * w + col) * 4;
      out[di]     = src.data[si];
      out[di + 1] = src.data[si + 1];
      out[di + 2] = src.data[si + 2];
      out[di + 3] = src.data[si + 3];
    }
  }
  return new ImageData(out, w, h);
}

function detectOneType(imageData: ImageData): PokemonType | null {
  const { data, width, height } = imageData;
  const n = width * height;
  const vividHues: number[] = [];
  let grayBright = 0;

  for (let i = 0; i < n; i++) {
    const [h, s, v] = rgbToHsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    if (v > 0.65 && s < 0.25) grayBright++;
    if (v > 0.65 && s > 0.45) vividHues.push(h);
  }

  if (vividHues.length < n * 0.03) {
    return grayBright > n * 0.10 ? "normal" : null;
  }
  return closestType(circularMean(vividHues));
}

// Split badge crop into left/right halves and detect one type per half.
// This handles dual-type badges (two icons side-by-side) more reliably than
// looking for a secondary hue cluster across the whole crop.
export function detectTypes(imageData: ImageData): PokemonType[] {
  const midX = Math.floor(imageData.width / 2);
  const detected: PokemonType[] = [];
  for (const half of [
    subRegion(imageData, 0, 0, midX, imageData.height),
    subRegion(imageData, midX, 0, imageData.width - midX, imageData.height),
  ]) {
    const t = detectOneType(half);
    if (t && !detected.includes(t)) detected.push(t);
  }
  return detected;
}
