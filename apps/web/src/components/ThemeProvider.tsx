"use client";
// 主题上下文：在 classic / alpha 间切换，写到 <html data-theme> + localStorage。
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_THEME, THEMES, type ThemeKey, type ThemeMeta } from "@/lib/theme";

interface ThemeCtx {
  theme: ThemeKey;
  meta: ThemeMeta;
  setTheme: (t: ThemeKey) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: DEFAULT_THEME,
  meta: THEMES[DEFAULT_THEME],
  setTheme: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeKey>(DEFAULT_THEME);

  useEffect(() => {
    const saved = window.localStorage.getItem("hh-theme");
    if (saved === "classic" || saved === "alpha") setTheme(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("hh-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "alpha" ? "classic" : "alpha"));

  return (
    <Ctx.Provider value={{ theme, meta: THEMES[theme], setTheme, toggle }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  return useContext(Ctx);
}
