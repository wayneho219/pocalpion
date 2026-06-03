export type PokemonType =
  | "normal" | "fire" | "water" | "electric" | "grass" | "ice"
  | "fighting" | "poison" | "ground" | "flying" | "psychic" | "bug"
  | "rock" | "ghost" | "dragon" | "dark" | "steel" | "fairy";

interface TypeColor { type: PokemonType; r: [number,number]; g: [number,number]; b: [number,number] }

const TYPE_RANGES: TypeColor[] = [
  { type: "fire",      r: [195, 255], g: [80,  165], b: [0,   85]  },
  { type: "water",     r: [40,  120], g: [120, 200], b: [175, 255] },
  { type: "grass",     r: [75,  155], g: [155, 225], b: [55,  130] },
  { type: "electric",  r: [195, 255], g: [195, 255], b: [0,   100] },
  { type: "ice",       r: [125, 200], g: [200, 255], b: [200, 255] },
  { type: "fighting",  r: [145, 220], g: [55,  130], b: [55,  120] },
  { type: "poison",    r: [125, 200], g: [55,  130], b: [140, 215] },
  { type: "ground",    r: [175, 240], g: [145, 210], b: [75,  145] },
  { type: "flying",    r: [135, 200], g: [155, 220], b: [205, 255] },
  { type: "psychic",   r: [205, 255], g: [75,  150], b: [115, 190] },
  { type: "bug",       r: [115, 190], g: [175, 240], b: [35,  115] },
  { type: "rock",      r: [145, 210], g: [125, 190], b: [75,  145] },
  { type: "ghost",     r: [75,  140], g: [75,  140], b: [135, 200] },
  { type: "dragon",    r: [55,  130], g: [75,  150], b: [175, 255] },
  { type: "dark",      r: [55,  120], g: [45,  110], b: [55,  120] },
  { type: "steel",     r: [145, 210], g: [155, 220], b: [165, 230] },
  { type: "fairy",     r: [205, 255], g: [145, 210], b: [175, 240] },
  { type: "normal",    r: [145, 210], g: [145, 210], b: [135, 200] },
];

export function detectTypes(imageData: ImageData): PokemonType[] {
  let r = 0, g = 0, b = 0;
  const n = imageData.width * imageData.height;
  for (let i = 0; i < n; i++) {
    r += imageData.data[i * 4];
    g += imageData.data[i * 4 + 1];
    b += imageData.data[i * 4 + 2];
  }
  r /= n; g /= n; b /= n;
  return TYPE_RANGES
    .filter(tc => r >= tc.r[0] && r <= tc.r[1] && g >= tc.g[0] && g <= tc.g[1] && b >= tc.b[0] && b <= tc.b[1])
    .map(tc => tc.type);
}
