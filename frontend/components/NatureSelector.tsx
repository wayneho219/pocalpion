"use client";
import type { Lang } from "@/lib/i18n";
import { NATURES } from "@/lib/natures";

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
