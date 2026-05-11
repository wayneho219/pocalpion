"use client";
import { createContext, useContext, useEffect, useState } from "react";
import zh from "./zh.json";
import en from "./en.json";
import ja from "./ja.json";

export type Lang = "zh" | "en" | "ja";
const STRINGS: Record<Lang, Record<string, string>> = { zh, en, ja };
const STORAGE_KEY = "poke_lang";

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
  const [lang, setLangState] = useState<Lang>("zh");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    const param = new URLSearchParams(window.location.search).get("lang") as Lang | null;
    const resolved = param && ["zh", "en", "ja"].includes(param) ? param : stored ?? "zh";
    setLangState(resolved as Lang);
  }, []);

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
