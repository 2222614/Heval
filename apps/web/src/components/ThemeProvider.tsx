"use client";
// 主题上下文：white(light) / dark 双模式切换，写到 <html data-theme> + localStorage。
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_THEME, type ThemeKey } from "@/lib/theme";

interface ThemeCtx {
  theme: ThemeKey;
  setTheme: (t: ThemeKey) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeKey>(DEFAULT_THEME);

  useEffect(() => {
    const saved = window.localStorage.getItem("heval-theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("heval-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return <Ctx.Provider value={{ theme, setTheme, toggle }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
