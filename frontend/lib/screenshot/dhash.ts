const HASH_SIZE = 8;

/** Pure function — testable without DOM. stride = pixels per row (= HASH_SIZE + 1 for dHash). */
export function dhashFromPixels(grayPixels: Uint8Array, stride: number): string {
  let bits = 0n;
  for (let row = 0; row < HASH_SIZE; row++) {
    for (let col = 0; col < HASH_SIZE; col++) {
      bits <<= 1n;
      if (grayPixels[row * stride + col] > grayPixels[row * stride + col + 1]) {
        bits |= 1n;
      }
    }
  }
  return bits.toString(16).padStart(16, "0");
}

export function hammingDistance(a: string, b: string): number {
  let xor = BigInt("0x" + a) ^ BigInt("0x" + b);
  let dist = 0;
  while (xor > 0n) {
    if (xor & 1n) dist++;
    xor >>= 1n;
  }
  return dist;
}

// Replace border-colored background pixels with neutral gray so game screenshot
// background (purple/blue gradient) doesn't contaminate the hash.
function normalizeBg(src: ImageData): ImageData {
  const { data, width, height } = src;
  let rS = 0, gS = 0, bS = 0, n = 0;
  for (let x = 0; x < width; x++) {
    for (const y of [0, height - 1]) {
      const i = (y * width + x) * 4;
      rS += data[i]; gS += data[i+1]; bS += data[i+2]; n++;
    }
  }
  for (let y = 1; y < height - 1; y++) {
    for (const x of [0, width - 1]) {
      const i = (y * width + x) * 4;
      rS += data[i]; gS += data[i+1]; bS += data[i+2]; n++;
    }
  }
  const bgR = rS / n, bgG = gS / n, bgB = bS / n;
  const THRESH = 30;
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < width * height; i++) {
    const r = data[i*4], g = data[i*4+1], b = data[i*4+2];
    const d = Math.sqrt((r-bgR)**2 + (g-bgG)**2 + (b-bgB)**2);
    if (d < THRESH) { out[i*4]=128; out[i*4+1]=128; out[i*4+2]=128; }
    else { out[i*4]=r; out[i*4+1]=g; out[i*4+2]=b; }
    out[i*4+3] = 255;
  }
  return new ImageData(out, width, height);
}

/** DOM wrapper — not unit tested. Resizes imageData to (HASH_SIZE+1)×HASH_SIZE, converts to grayscale. */
export function dhash(imageData: ImageData): string {
  return dhashFromPixels(_toGrayscaleResized(normalizeBg(imageData), HASH_SIZE + 1, HASH_SIZE), HASH_SIZE + 1);
}

function _toGrayscaleResized(src: ImageData, w: number, h: number): Uint8Array {
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = src.width;
  srcCanvas.height = src.height;
  srcCanvas.getContext("2d")!.putImageData(src, 0, 0);

  const dst = document.createElement("canvas");
  dst.width = w;
  dst.height = h;
  const ctx = dst.getContext("2d")!;
  ctx.drawImage(srcCanvas, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
  }
  return gray;
}
