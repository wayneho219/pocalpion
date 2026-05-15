import { rankCandidates, rankByHash } from "@/lib/screenshot/matcher";
import type { SpriteHashEntry } from "@/lib/types";

const DB: SpriteHashEntry[] = [
  { id: 1,  name_en: "Bulbasaur",  name_zh: "妙蛙種子", name_ja: "フシギダネ", types: ["grass","poison"], hash: "0000000000000000", mega: [], is_final_evolution: false },
  { id: 3,  name_en: "Venusaur",   name_zh: "妙蛙花",   name_ja: "フシギバナ", types: ["grass","poison"], hash: "1111111111111111", mega: [], is_final_evolution: true  },
  { id: 4,  name_en: "Charmander", name_zh: "小火龍",   name_ja: "ヒトカゲ",   types: ["fire"],           hash: "ffffffffffffffff", mega: [], is_final_evolution: false },
  { id: 6,  name_en: "Charizard",  name_zh: "噴火龍",   name_ja: "リザードン", types: ["fire","flying"],  hash: "eeeeeeeeeeeeeeee", mega: [], is_final_evolution: true  },
  { id: 7,  name_en: "Squirtle",   name_zh: "傑尼龜",   name_ja: "ゼニガメ",   types: ["water"],          hash: "5555555555555555", mega: [], is_final_evolution: false },
  { id: 9,  name_en: "Blastoise",  name_zh: "水箭龜",   name_ja: "カメックス", types: ["water"],          hash: "aaaaaaaaaaaaaaaa",
    mega: [{ suffix: "mega", hash: "cccccccccccccccc" }], is_final_evolution: true },
];

describe("rankByHash", () => {
  it("returns closest final-evolution hash match first", () => {
    // Venusaur (1111, final) is closer to 0000 than Charizard (eeee) or Blastoise (aaaa)
    const r = rankByHash("0000000000000000", DB);
    expect(r[0].name_en).toBe("Venusaur");
  });

  it("confidence is 0.7 for identical hash with no usage weight", () => {
    // score = dhashConf*0.7 + usage*0.3; perfect hash → dhashConf=1, usage=0 → score=0.7
    const r = rankByHash("eeeeeeeeeeeeeeee", DB);
    const match = r.find(c => c.name_en === "Charizard")!;
    expect(match).toBeDefined();
    expect(match.confidence).toBeCloseTo(0.7);
  });

  it("excludes non-final evolutions from results", () => {
    const r = rankByHash("0000000000000000", DB);
    const names = r.map(c => c.name_en);
    expect(names).not.toContain("Bulbasaur");
    expect(names).not.toContain("Charmander");
    expect(names).not.toContain("Squirtle");
  });

  it("never includes mega forms", () => {
    // Even though Blastoise has a mega entry, rankByHash must not return it
    const r = rankByHash("cccccccccccccccc", DB);
    expect(r.every(c => !c.name_en.includes("mega"))).toBe(true);
  });

  it("respects topN limit", () => {
    expect(rankByHash("0000000000000000", DB, [], 2)).toHaveLength(2);
  });

  it("typeHints pre-filters to matching finals, falls back to all finals if empty pool", () => {
    // Water finals: Blastoise only (Squirtle is not final)
    const r = rankByHash("aaaaaaaaaaaaaaaa", DB, ["water"]);
    expect(r.every(c => c.types.includes("water"))).toBe(true);
    expect(r.every(c => !c.name_en.includes("Squirtle"))).toBe(true);
  });

  it("falls back to all finals when typeHints match nothing", () => {
    const r = rankByHash("0000000000000000", DB, ["dragon"]);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every(c => !["Bulbasaur","Charmander","Squirtle"].includes(c.name_en))).toBe(true);
  });

  it("usage weights can flip ranking order", () => {
    // Query = aaaa (Blastoise hash). Without weights, Blastoise ranks first (dist=0, score=0.7).
    // Charizard hash = eeee; aaaa XOR eeee → 1 bit per hex digit → dist=16 → dhashConf=0.75.
    // With charizard usage=1.0: score = 0.75*0.7 + 1.0*0.3 = 0.825 > Blastoise 0.7 → Charizard flips to first.
    const noWeights = rankByHash("aaaaaaaaaaaaaaaa", DB);
    expect(noWeights[0].name_en).toBe("Blastoise");
    const withWeights = rankByHash("aaaaaaaaaaaaaaaa", DB, [], 6, { "charizard": 1.0 });
    expect(withWeights[0].name_en).toBe("Charizard");
  });
});

describe("rankCandidates", () => {
  it("returns all entries sorted alphabetically when no types given", () => {
    const r = rankCandidates([], DB);
    expect(r.length).toBeGreaterThan(0);
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].name_en.localeCompare(r[i].name_en)).toBeLessThanOrEqual(0);
    }
  });

  it("filters by detected types when provided", () => {
    const r = rankCandidates(["fire"], DB);
    expect(r.every(c => c.types.includes("fire"))).toBe(true);
  });

  it("falls back to full DB if no entry matches detected type", () => {
    const r = rankCandidates(["dragon"], DB);
    expect(r.length).toBeGreaterThan(0);
  });

  it("includes mega forms as candidates", () => {
    const r = rankCandidates(["water"], DB);
    const mega = r.find(c => c.name_en.includes("mega"));
    expect(mega).toBeDefined();
    expect(mega!.id).toBe(9);
  });

  it("respects topN limit", () => {
    expect(rankCandidates([], DB, 2)).toHaveLength(2);
  });

  it("multi-type filter includes entries matching any type", () => {
    const r = rankCandidates(["grass", "water"], DB);
    expect(r.some(c => c.types.includes("grass"))).toBe(true);
    expect(r.some(c => c.types.includes("water"))).toBe(true);
    expect(r.every(c => c.types.includes("fire"))).toBe(false);
  });
});
