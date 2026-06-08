"use client";
// 共享小组件：排名徽章、区域标签、开源/闭源标签、分数条、种子提示条。
// 颜色走 CSS 变量，随主题切换。
import { DICT, t, type Lang } from "@/lib/i18n";
import { scoreBarVar, pct } from "@/lib/score";

export function RankBadge({ rank }: { rank: number }) {
  // 第 1 名用主题强调色边框；2/3 名中性；其余淡色。
  if (rank === 1) {
    return (
      <span
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-bold"
        style={{ background: "var(--rank1-bg)", borderColor: "var(--rank1-bd)", color: "var(--rank1-tx)" }}
      >
        {rank}
      </span>
    );
  }
  const cls =
    rank === 2
      ? "border-gray-300 bg-gray-50 text-gray-600"
      : rank === 3
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : "border-gray-200 bg-white text-gray-400";
  return (
    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-bold ${cls}`}>
      {rank}
    </span>
  );
}

export function RegionBadge({ region, lang }: { region: "foreign" | "domestic"; lang: Lang }) {
  const isDom = region === "domestic";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
        isDom ? "bg-rose-50 text-rose-600" : "bg-sky-50 text-sky-600"
      }`}
    >
      {t(DICT.region[region], lang)}
    </span>
  );
}

export function OpennessBadge({ openness, lang }: { openness?: "open" | "closed"; lang: Lang }) {
  const isOpen = openness === "open";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
        isOpen ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
      }`}
    >
      {t(isOpen ? DICT.openness.open : DICT.openness.closed, lang)}
    </span>
  );
}

export function ScaffoldBadge({ name }: { name: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
      style={{ background: "var(--surface-2)", color: "var(--accent-2)", border: "1px solid var(--border)" }}
    >
      <span style={{ opacity: 0.6 }}>⌗</span>
      {name}
    </span>
  );
}

export function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-right font-mono text-sm font-semibold tabular-nums">
        {pct(score)}
      </span>
      <div className="score-bar w-full max-w-[260px]">
        <span style={{ width: `${score * 100}%`, background: scoreBarVar(score) }} />
      </div>
    </div>
  );
}

export function SeedBanner({ lang }: { lang: Lang }) {
  return (
    <div className="mx-auto mb-6 max-w-7xl px-6">
      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        <span className="text-base">⚠️</span>
        {t(DICT.seedBanner, lang)}
      </div>
    </div>
  );
}
