"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang, type Lang } from "@/lib/i18n";

const LANGS: { value: Lang; label: string }[] = [
  { value: "zh", label: "繁體中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
];

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

      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="bg-white/6 border border-white/10 rounded-md px-3 py-1
          text-[12px] text-white/50 outline-none cursor-pointer"
      >
        {LANGS.map((l) => (
          <option key={l.value} value={l.value}>{l.label}</option>
        ))}
      </select>
    </nav>
  );
}
