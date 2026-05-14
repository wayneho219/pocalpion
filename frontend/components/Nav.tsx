"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useLang, type Lang } from "@/lib/i18n";

const LANGS: { value: Lang; label: string }[] = [
  { value: "zh", label: "繁體中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
];

function LangDropdown({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 flex items-center justify-center rounded-md
          text-white/40 hover:text-white/70 hover:bg-white/6 transition-colors text-[16px]"
        aria-label="Language"
      >
        🌐
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 min-w-[120px]
          bg-[#0f1420] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
          {LANGS.map(l => (
            <button
              key={l.value}
              onClick={() => { setLang(l.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-[12px] transition-colors
                ${lang === l.value
                  ? "text-white bg-white/8"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Nav() {
  const { t, lang, setLang } = useLang();
  const pathname = usePathname();

  const tabs = [
    { href: "/",         key: "nav_search" },
    { href: "/speed",    key: "nav_speed" },
    { href: "/survival", key: "nav_survival" },
  ];

  return (
    <nav className="sticky top-0 z-10 flex items-center justify-between
      px-8 py-3.5 border-b border-white/7 bg-[#0a0e1a]/90 backdrop-blur-md">
      <span className="text-[17px] font-extrabold uppercase tracking-widest
        bg-gradient-to-r from-red-500 to-amber-400 bg-clip-text text-transparent">
        ⚡ Pokémon Calc
      </span>

      <div className="flex gap-1">
        {tabs.map(({ href, key }) => (
          <Link
            key={href}
            href={href}
            className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors
              ${pathname === href
                ? "bg-white/9 text-white"
                : "text-white/40 hover:text-white/70"
              }`}
          >
            {t(key)}
          </Link>
        ))}
      </div>

      <LangDropdown lang={lang} setLang={setLang} />
    </nav>
  );
}
