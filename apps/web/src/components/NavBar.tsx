"use client";
// 顶部导航：动态品牌（随主题切换 HH Eval / AlphaEval）+ 五部分入口
// （后三个标"即将上线"）+ 主题切换 + 语言切换。
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DICT, t } from "@/lib/i18n";
import { useLang } from "./LangProvider";
import { useTheme } from "./ThemeProvider";

const NAV = [
  { href: "/", key: "overall", ready: true },
  { href: "/scenario", key: "scenario", ready: true },
  { href: "/advisor", key: "advisor", ready: false },
  { href: "/battle", key: "battle", ready: false },
  { href: "/showcase", key: "showcase", ready: false },
] as const;

export function NavBar() {
  const { lang, toggle: toggleLang } = useLang();
  const { theme, meta, toggle: toggleTheme } = useTheme();
  const pathname = usePathname();

  const brand = lang === "zh" ? meta.brandZh : meta.brandEn;

  return (
    <header
      className="sticky top-0 z-20 border-b backdrop-blur"
      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 82%, transparent)" }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${meta.logoFrom}, ${meta.logoTo})` }}
          >
            {theme === "alpha" ? "α" : "HH"}
          </span>
          <span className="text-lg font-bold tracking-tight" style={{ color: "var(--ink)" }}>
            {brand}
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const label = t(DICT.nav[item.key], lang);
            const active = pathname === item.href;
            const base = "relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors";
            if (!item.ready) {
              return (
                <span
                  key={item.href}
                  title={t(DICT.comingSoon, lang)}
                  className={`${base} cursor-not-allowed`}
                  style={{ color: "var(--subtle)", opacity: 0.5 }}
                >
                  {label}
                  <span className="ml-1 align-super text-[9px]" style={{ color: "var(--gold)" }}>
                    •
                  </span>
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${base} ${active ? "text-white" : "hover:opacity-70"}`}
                style={
                  active
                    ? { background: "var(--accent)", color: "#fff" }
                    : { color: "var(--subtle)" }
                }
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* 主题切换：经典版 ↔ 高瓴版 */}
          <button
            onClick={toggleTheme}
            title={t(DICT.theme.label, lang)}
            className="rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-70"
            style={{ borderColor: "var(--border)", color: "var(--subtle)" }}
          >
            {theme === "alpha" ? t(DICT.theme.classic, lang) : t(DICT.theme.alpha, lang)}
          </button>
          {/* 语言切换 */}
          <button
            onClick={toggleLang}
            className="rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-70"
            style={{ borderColor: "var(--border)", color: "var(--subtle)" }}
          >
            {lang === "zh" ? "EN" : "中文"}
          </button>
        </div>
      </div>
    </header>
  );
}
