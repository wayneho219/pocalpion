import { dhashFromPixels, hammingDistance } from "@/lib/screenshot/dhash";

describe("dhashFromPixels", () => {
  it("returns 16-char hex string", () => {
    const pixels = new Uint8Array(9 * 8).fill(128);
    expect(dhashFromPixels(pixels, 9)).toMatch(/^[0-9a-f]{16}$/);
  });

  it("uniform pixels yield all-zero hash (no gradients)", () => {
    const pixels = new Uint8Array(9 * 8).fill(200);
    expect(dhashFromPixels(pixels, 9)).toBe("0000000000000000");
  });

  it("strictly decreasing row yields all-ones hash", () => {
    // Each row: col 0=255, col 1=245, ..., col 8=175 → every left > right
    const pixels = new Uint8Array(9 * 8);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 9; col++) {
        pixels[row * 9 + col] = 255 - col * 10;
      }
    }
    expect(dhashFromPixels(pixels, 9)).toBe("ffffffffffffffff");
  });
});

describe("hammingDistance", () => {
  it("identical strings → 0", () => {
    expect(hammingDistance("a1b2c3d4e5f60708", "a1b2c3d4e5f60708")).toBe(0);
  });

  it("all bits flipped → 64", () => {
    expect(hammingDistance("0000000000000000", "ffffffffffffffff")).toBe(64);
  });

  it("single bit difference → 1", () => {
    expect(hammingDistance("0000000000000001", "0000000000000000")).toBe(1);
  });
});
