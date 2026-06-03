"use client";
import { createContext, useContext, useState } from "react";
import zh from "./zh.json";
import en from "./en.json";
import ja from "./ja.json";

export type Lang = "zh" | "en" | "ja";
const STRINGS: Record<Lang, Record<string, string>> = { zh, en, ja };
const STORAGE_KEY = "poke_lang";
const VALID_LANGS: Lang[] = ["zh", "en", "ja"];

function resolveInitialLang(): Lang {
  if (typeof window === "undefined") return "zh";
  const param = new URLSearchParams(window.location.search).get("lang");
  if (param && VALID_LANGS.includes(param as Lang)) return param as Lang;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && VALID_LANGS.includes(stored as Lang)) return stored as Lang;
  return "zh";
}

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: "zh",
  setLang: () => {},
  t: (k) => k,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(resolveInitialLang);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", l);
    window.history.replaceState({}, "", url.toString());
  };

  const t = (key: string) => STRINGS[lang][key] ?? key;

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
