"use client";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import type { PokemonSearchResult } from "@/lib/types";
import type { Lang } from "@/lib/i18n";

interface PokemonSelectorProps {
  id: string;
  label: string;
  lang: Lang;
  onSelect: (p: PokemonSearchResult) => void;
}

export function PokemonSelector({ id, label, lang, onSelect }: PokemonSelectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PokemonSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const justSelected = useRef(false);

  useEffect(() => {
    if (justSelected.current) { justSelected.current = false; return; }
    if (query.trim().length === 0) { setResults([]); setOpen(false); return; }
    clearTimeout(timer.current);
    const timerId = setTimeout(async () => {
      try {
        const data = await api.searchPokemon(query.trim());
        setResults(data);
        setOpen(true);
      } catch { setResults([]); }
    }, 300);
    timer.current = timerId;
    return () => clearTimeout(timerId);
  }, [query]);

  const nameKey = lang === "zh" ? "name_zh" : lang === "ja" ? "name_ja" : "name_en";

  const handleSelect = (p: PokemonSearchResult) => {
    justSelected.current = true;
    setQuery(p[nameKey] as string);
    setOpen(false);
    onSelect(p);
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-[10px] text-white/25 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
        <input
          id={id}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-white/20"
          autoComplete="off"
        />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 w-full mt-1 bg-[#131828] border border-white/10
          rounded-xl overflow-hidden shadow-xl">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => handleSelect(p)}
                className="w-full text-left px-4 py-2.5 text-sm text-white/80
                  hover:bg-white/8 transition-colors"
              >
                {p[nameKey] as string}
                <span className="ml-2 text-white/30 text-xs">#{p.id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
