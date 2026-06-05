import type { PokemonType } from "./type-detect";

const BADGE_SIZE = 32;
const NCC_THRESHOLD = 0.35;

export const ALL_TYPES: PokemonType[] = [
  "normal","fire","water","electric","grass","ice",
  "fighting","poison","ground","flying","psychic","bug",
  "rock","ghost","dragon","dark","steel","fairy",
];

export async function loadTypeTemplates(): Promise<Map<PokemonType, ImageData>> {
  const templateMap = new Map<PokemonType, ImageData>();

  const loaded = await Promise.allSettled(
    ALL_TYPES.map(async (type) => {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = `/type-badges/${type}.png`;
      });
      return { type, img };
    }),
  );

  const canvas = document.createElement("canvas");
  canvas.width = BADGE_SIZE;
  canvas.height = BADGE_SIZE;
  const ctx = canvas.getContext("2d")!;

  for (const r of loaded) {
    if (r.status === "fulfilled") {
      const { type, img } = r.value;
      ctx.clearRect(0, 0, BADGE_SIZE, BADGE_SIZE);
      ctx.drawImage(img, 0, 0, BADGE_SIZE, BADGE_SIZE);
      templateMap.set(type, ctx.getImageData(0, 0, BADGE_SIZE, BADGE_SIZE));
    }
  }

  return templateMap;
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

function resizeTo(data: ImageData, size: number): ImageData {
  const src = document.createElement("canvas");
  src.width = data.width;
  src.height = data.height;
  src.getContext("2d")!.putImageData(data, 0, 0);
  const dst = document.createElement("canvas");
  dst.width = size;
  dst.height = size;
  dst.getContext("2d")!.drawImage(src, 0, 0, size, size);
  return dst.getContext("2d")!.getImageData(0, 0, size, size);
}

function ncc(a: ImageData, b: ImageData): number {
  const n = a.width * a.height;
  let sA = 0, sB = 0;
  const ga = new Float32Array(n);
  const gb = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    ga[i] = 0.299 * a.data[i * 4] + 0.587 * a.data[i * 4 + 1] + 0.114 * a.data[i * 4 + 2];
    gb[i] = 0.299 * b.data[i * 4] + 0.587 * b.data[i * 4 + 1] + 0.114 * b.data[i * 4 + 2];
    sA += ga[i];
    sB += gb[i];
  }
  const mA = sA / n, mB = sB / n;
  let num = 0, dA = 0, dB = 0;
  for (let i = 0; i < n; i++) {
    const da = ga[i] - mA, db = gb[i] - mB;
    num += da * db;
    dA += da * da;
    dB += db * db;
  }
  const den = Math.sqrt(dA * dB);
  return den === 0 ? 0 : num / den;
}

function bestMatch(
  region: ImageData,
  templates: Map<PokemonType, ImageData>,
): PokemonType | null {
  const resized = resizeTo(region, BADGE_SIZE);
  let best: PokemonType | null = null;
  let bestScore = NCC_THRESHOLD;
  for (const [type, tmpl] of templates) {
    const score = ncc(resized, tmpl);
    if (score > bestScore) {
      bestScore = score;
      best = type;
    }
  }
  return best;
}

// Split badge crop into left/right halves (upper 55% to exclude gender icon),
// match each half against all templates, return unique detected types.
export function detectTypesNCC(
  badgeCrop: ImageData,
  templates: Map<PokemonType, ImageData>,
): PokemonType[] {
  if (templates.size === 0) return [];
  const { width, height } = badgeCrop;
  const midX = Math.floor(width / 2);

  const detected: PokemonType[] = [];
  for (const half of [
    subRegion(badgeCrop, 0, 0, midX, height),
    subRegion(badgeCrop, midX, 0, width - midX, height),
  ]) {
    const t = bestMatch(half, templates);
    if (t && !detected.includes(t)) detected.push(t);
  }
  return detected;
}
