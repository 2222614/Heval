"use client";
// 模型详情页：聚合该模型在各脚手架下的真实榜单数据 + 预留「简评与总结」空块。
import Link from "next/link";
import { useMemo } from "react";
import { DICT, t } from "@/lib/i18n";
import { useLang } from "./LangProvider";
import { RegionBadge, OpennessBadge, ScaffoldBadge } from "./ui";
import { heatBg, heatTextColor, pct, scoreBarVar } from "@/lib/score";
import type { Leaderboard, LeaderboardRow } from "@/lib/types";

export function ModelDetailView({ data, modelId }: { data: Leaderboard; modelId: string }) {
  const { lang } = useLang();

  const rows = useMemo(
    () => data.rows.filter((r) => r.model_id === modelId),
    [data.rows, modelId],
  );

  // 取该模型的最佳脚手架行作为主展示
  const best = useMemo<LeaderboardRow | null>(() => {
    if (!rows.length) return null;
    return [...rows].sort((a, b) => b.overall.avg_score - a.overall.avg_score)[0];
  }, [rows]);

  if (!best) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center" style={{ color: "var(--subtle)" }}>
        <Link href="/" className="text-sm hover:opacity-70" style={{ color: "var(--accent)" }}>
          {t(DICT.modelDetail.back, lang)}
        </Link>
        <div className="mt-10">{t(DICT.noData, lang)}</div>
      </div>
    );
  }

  const cats = data.categories;
  const catLabel = (id: string) =>
    data.category_labels[id]?.[lang] || data.category_labels[id]?.en || id;

  // 跨脚手架取每个场景的最高分（该模型在该场景的最好表现）
  const sceneBest: Record<string, number> = {};
  for (const c of cats) {
    sceneBest[c] = Math.max(...rows.map((r) => r.by_category[c]?.avg_score ?? 0));
  }

  return (
    <div className="mx-auto max-w-5xl px-6">
      <Link href="/" className="text-sm hover:opacity-70" style={{ color: "var(--accent)" }}>
        {t(DICT.modelDetail.back, lang)}
      </Link>

      {/* 头部：模型名 + 标签 + 综合分 */}
      <div className="anim-in mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
            {best.model_display}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {best.org && (
              <span className="text-sm" style={{ color: "var(--subtle)" }}>
                {best.org}
              </span>
            )}
            <RegionBadge region={best.region} lang={lang} />
            <OpennessBadge openness={best.openness} lang={lang} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider" style={{ color: "var(--subtle)" }}>
            {t(DICT.modelDetail.overallScore, lang)}
          </div>
          <div className="font-mono text-4xl font-extrabold" style={{ color: "var(--accent-2)" }}>
            {pct(best.overall.avg_score)}
          </div>
          <div className="mt-1 flex items-center justify-end gap-1 text-xs" style={{ color: "var(--subtle)" }}>
            {t(DICT.modelDetail.bestScaffold, lang)}: <ScaffoldBadge name={best.scaffold} />
          </div>
        </div>
      </div>

      {/* 关键指标 */}
      <div className="anim-in mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label={t(DICT.modelDetail.avgCost, lang)} value={best.overall.avg_cost_usd != null ? `$${best.overall.avg_cost_usd.toFixed(2)}` : "—"} />
        <Stat label={t(DICT.modelDetail.avgLatency, lang)} value={best.overall.avg_latency_sec != null ? `${best.overall.avg_latency_sec.toFixed(0)}s` : "—"} />
        <Stat label={t(DICT.overall.completed, lang)} value={`${best.overall.n_completed ?? best.overall.n_tasks}/${best.overall.n_tasks}`} />
      </div>

      {/* 分场景表现 */}
      <section className="anim-in mt-8">
        <h2 className="mb-3 text-lg font-bold" style={{ color: "var(--ink)" }}>
          {t(DICT.modelDetail.byScenario, lang)}
        </h2>
        <div className="space-y-2">
          {cats.map((c) => (
            <div key={c} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-sm" style={{ color: "var(--subtle)" }}>
                {catLabel(c)}
              </span>
              <div className="score-bar flex-1">
                <span style={{ width: `${sceneBest[c] * 100}%`, background: scoreBarVar(sceneBest[c]) }} />
              </div>
              <span className="w-12 text-right font-mono text-sm font-semibold tabular-nums" style={{ color: "var(--ink)" }}>
                {pct(sceneBest[c])}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 各脚手架得分 */}
      <section className="anim-in mt-8">
        <h2 className="mb-3 text-lg font-bold" style={{ color: "var(--ink)" }}>
          {t(DICT.modelDetail.byScaffold, lang)}
        </h2>
        <div className="flex flex-wrap gap-2">
          {[...rows]
            .sort((a, b) => b.overall.avg_score - a.overall.avg_score)
            .map((r) => (
              <div
                key={r.scaffold}
                className="flex items-center gap-2 rounded-xl border px-3 py-2"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <ScaffoldBadge name={r.scaffold} />
                <span
                  className="rounded-md px-2 py-0.5 font-mono text-xs font-semibold tabular-nums"
                  style={{ background: heatBg(r.overall.avg_score), color: heatTextColor(r.overall.avg_score) }}
                >
                  {pct(r.overall.avg_score)}
                </span>
              </div>
            ))}
        </div>
      </section>

      {/* 预留：简评与总结（下一级内容空块） */}
      <section className="anim-in mt-8 mb-12">
        <h2 className="mb-3 text-lg font-bold" style={{ color: "var(--ink)" }}>
          {t(DICT.modelDetail.reviewTitle, lang)}
        </h2>
        <div
          className="rounded-2xl border border-dashed p-8 text-center text-sm"
          style={{ borderColor: "var(--accent)", background: "var(--surface-2)", color: "var(--subtle)" }}
        >
          {t(DICT.modelDetail.reviewPlaceholder, lang)}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="text-xs uppercase tracking-wider" style={{ color: "var(--subtle)" }}>
        {label}
      </div>
      <div className="mt-1 font-mono text-lg font-bold" style={{ color: "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}
