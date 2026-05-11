"use client";
import type { Lang } from "@/lib/i18n";

interface Nature {
  en: string;
  zh: string;
  ja: string;
  boosted: string | null;
  reduced: string | null;
}

const NATURES: Nature[] = [
  { en: "Hardy",   zh: "勤奮", ja: "がんばりや", boosted: null,    reduced: null },
  { en: "Lonely",  zh: "孤獨", ja: "さみしがり", boosted: "atk",  reduced: "def" },
  { en: "Brave",   zh: "勇敢", ja: "ゆうかん",   boosted: "atk",  reduced: "spd" },
  { en: "Adamant", zh: "固執", ja: "いじっぱり", boosted: "atk",  reduced: "spa" },
  { en: "Naughty", zh: "頑皮", ja: "やんちゃ",   boosted: "atk",  reduced: "spdef" },
  { en: "Bold",    zh: "大膽", ja: "ずぶとい",   boosted: "def",  reduced: "atk" },
  { en: "Docile",  zh: "坦率", ja: "すなお",     boosted: null,   reduced: null },
  { en: "Relaxed", zh: "悠閒", ja: "のんき",     boosted: "def",  reduced: "spd" },
  { en: "Impish",  zh: "淘氣", ja: "わんぱく",   boosted: "def",  reduced: "spa" },
  { en: "Lax",     zh: "樂天", ja: "のうてんき", boosted: "def",  reduced: "spdef" },
  { en: "Timid",   zh: "膽小", ja: "おくびょう", boosted: "spd",  reduced: "atk" },
  { en: "Hasty",   zh: "急躁", ja: "せっかち",   boosted: "spd",  reduced: "def" },
  { en: "Serious", zh: "認真", ja: "まじめ",     boosted: null,   reduced: null },
  { en: "Jolly",   zh: "爽朗", ja: "ようき",     boosted: "spd",  reduced: "spa" },
  { en: "Naive",   zh: "天真", ja: "むじゃき",   boosted: "spd",  reduced: "spdef" },
  { en: "Modest",  zh: "內斂", ja: "ひかえめ",   boosted: "spa",  reduced: "atk" },
  { en: "Mild",    zh: "溫和", ja: "おっとり",   boosted: "spa",  reduced: "def" },
  { en: "Quiet",   zh: "冷靜", ja: "れいせい",   boosted: "spa",  reduced: "spd" },
  { en: "Bashful", zh: "害羞", ja: "てれや",     boosted: null,   reduced: null },
  { en: "Rash",    zh: "浮躁", ja: "うっかりや", boosted: "spa",  reduced: "spdef" },
  { en: "Calm",    zh: "溫順", ja: "おだやか",   boosted: "spdef", reduced: "atk" },
  { en: "Gentle",  zh: "溫柔", ja: "おとなしい", boosted: "spdef", reduced: "def" },
  { en: "Sassy",   zh: "自大", ja: "なまいき",   boosted: "spdef", reduced: "spd" },
  { en: "Careful", zh: "慎重", ja: "しんちょう", boosted: "spdef", reduced: "spa" },
  { en: "Quirky",  zh: "浮動", ja: "きまぐれ",   boosted: null,   reduced: null },
];

interface NatureSelectorProps {
  lang: Lang;
  value: string;
  onChange: (natureEn: string) => void;
}

export function NatureSelector({ lang, value, onChange }: NatureSelectorProps) {
  const nameKey = lang === "zh" ? "zh" : lang === "ja" ? "ja" : "en";
  return (
    <div className="grid grid-cols-5 gap-1">
      {NATURES.map((n) => {
        const isSelected = value === n.en;
        const isNeutral = n.boosted === null;
        return (
          <button
            key={n.en}
            type="button"
            onClick={() => onChange(n.en)}
            className={`
              text-[11px] px-1.5 py-1 rounded truncate transition-colors
              ${isSelected
                ? "bg-blue-500/30 border border-blue-400/50 text-blue-200"
                : isNeutral
                  ? "bg-white/5 border border-white/8 text-white/50 hover:bg-white/10"
                  : "bg-white/5 border border-white/8 text-white/70 hover:bg-white/10"
              }
            `}
            title={`${n.en} (${n.zh})`}
          >
            {n[nameKey]}
          </button>
        );
      })}
    </div>
  );
}
