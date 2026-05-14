import { rankCandidates } from "@/lib/screenshot/matcher";
import type { SpriteHashEntry } from "@/lib/types";

const DB: SpriteHashEntry[] = [
  { id: 1,  name_en: "Bulbasaur",  name_zh: "妙蛙種子", name_ja: "フシギダネ", types: ["grass","poison"], hash: "0000000000000000", mega: [] },
  { id: 4,  name_en: "Charmander", name_zh: "小火龍",   name_ja: "ヒトカゲ",   types: ["fire"],           hash: "ffffffffffffffff", mega: [] },
  { id: 7,  name_en: "Squirtle",   name_zh: "傑尼龜",   name_ja: "ゼニガメ",   types: ["water"],          hash: "5555555555555555", mega: [] },
  { id: 9,  name_en: "Blastoise",  name_zh: "水箭龜",   name_ja: "カメックス", types: ["water"],          hash: "aaaaaaaaaaaaaaaa",
    mega: [{ suffix: "mega", hash: "cccccccccccccccc" }] },
];

describe("rankCandidates", () => {
  it("returns best match first (confidence = 1 for exact hash)", () => {
    const r = rankCandidates("0000000000000000", [], DB);
    expect(r[0].id).toBe(1);
    expect(r[0].confidence).toBe(1);
  });

  it("filters by detected types when provided", () => {
    const r = rankCandidates("0000000000000000", ["fire"], DB);
    expect(r.every(c => c.types.includes("fire"))).toBe(true);
  });

  it("falls back to full DB if no entry matches detected type", () => {
    const r = rankCandidates("0000000000000000", ["dragon"], DB);
    expect(r.length).toBeGreaterThan(0);
  });

  it("includes mega forms as candidates", () => {
    const r = rankCandidates("cccccccccccccccc", [], DB);
    expect(r[0].name_en).toContain("mega");
    expect(r[0].id).toBe(9);
    expect(r[0].confidence).toBe(1);
  });

  it("respects topN limit", () => {
    expect(rankCandidates("0000000000000000", [], DB, 2)).toHaveLength(2);
  });

  it("confidence is between 0 and 1", () => {
    rankCandidates("0000000000000000", [], DB).forEach(c => {
      expect(c.confidence).toBeGreaterThanOrEqual(0);
      expect(c.confidence).toBeLessThanOrEqual(1);
    });
  });
});
