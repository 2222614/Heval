"use client";
// 客户端语言上下文：默认中文，localStorage 记忆选择。
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Lang } from "@/lib/i18n";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
}

const Ctx = createContext<LangCtx>({ lang: "zh", setLang: () => {}, toggle: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("zh");

  useEffect(() => {
    const saved = window.localStorage.getItem("hh-lang");
    if (saved === "en" || saved === "zh") setLang(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("hh-lang", lang);
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  const toggle = () => setLang((l) => (l === "zh" ? "en" : "zh"));

  return <Ctx.Provider value={{ lang, setLang, toggle }}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}
