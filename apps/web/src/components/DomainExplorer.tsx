"use client";
// 第二部分二级视图：左侧能力导航（通用 + 复杂场景），右侧 task 列表 →
// best/value 卡片 + 本任务模型榜 + case 下钻。参考 XSCT「应用场景」页。
import { useMemo, useState } from "react";
import { DICT, t } from "@/lib/i18n";
import { useLang } from "./LangProvider";
import { OpennessBadge } from "./ui";
import { heatBg, heatTextColor, pct } from "@/lib/score";
import type { DomainCatalog, Domain, DomainTask, TaskLeader } from "@/lib/types";

function scoringLabel(method: string | null | undefined, lang: "zh" | "en"): string {
  if (!method) return "—";
  const node = (DICT.scoringMethod as Record<string, { zh: string; en: string }>)[method];
  return node ? t(node, lang) : method;
}

function LeaderRow({ leader, rank }: { leader: TaskLeader; rank: number }) {
  return (
    <tr className="border-t" style={{ borderColor: "var(--border)" }}>
      <td className="px-3 py-2 text-sm tabular-nums" style={{ color: "var(--subtle)" }}>
        {rank}
      </td>
      <td className="px-3 py-2">
        <span className="font-medium" style={{ color: "var(--ink)" }}>
          {leader.model_display}
        </span>
        {leader.org && (
          <span className="ml-2 text-xs" style={{ color: "var(--subtle)" }}>
            {leader.org}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <span
          className="inline-block min-w-[3rem] rounded-md px-2 py-0.5 text-center font-mono text-xs font-semibold tabular-nums"
          style={{ background: heatBg(leader.score), color: heatTextColor(leader.score) }}
        >
          {pct(leader.score)}
        </span>
      </td>
      <td className="px-3 py-2 text-right font-mono text-xs tabular-nums" style={{ color: "var(--subtle)" }}>
        {leader.avg_cost_usd != null ? `$${leader.avg_cost_usd.toFixed(2)}` : "—"}
      </td>
    </tr>
  );
}

function PickCard({
  kind,
  leader,
  lang,
}: {
  kind: "best" | "value";
  leader: TaskLeader;
  lang: "zh" | "en";
}) {
  const isBest = kind === "best";
  return (
    <div
      className="flex-1 rounded-xl border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold" style={{ color: isBest ? "var(--gold)" : "var(--accent-2)" }}>
        <span>{isBest ? "★" : "$"}</span>
        {t(isBest ? DICT.scenario.bestPick : DICT.scenario.valuePick, lang)}
      </div>
      <div className="text-lg font-bold" style={{ color: "var(--ink)" }}>
        {leader.model_display}
      </div>
      <div className="mt-1 flex items-center gap-3 text-sm" style={{ color: "var(--subtle)" }}>
        <span className="font-mono font-semibold">{pct(leader.score)}</span>
        {leader.avg_cost_usd != null && <span className="font-mono">${leader.avg_cost_usd.toFixed(2)}/题</span>}
      </div>
    </div>
  );
}

function TaskPanel({ task }: { task: DomainTask }) {
  const { lang } = useLang();
  const [openCases, setOpenCases] = useState(false);

  const best = task.leaders[0];
  // 性价比：score/cost 最高者（成本缺失时退化为分数）
  const value = useMemo(() => {
    let v = task.leaders[0];
    let bestRatio = -1;
    for (const l of task.leaders) {
      const ratio = l.avg_cost_usd && l.avg_cost_usd > 0 ? l.score / l.avg_cost_usd : l.score;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        v = l;
      }
    }
    return v;
  }, [task.leaders]);

  return (
    <div
      className="rounded-2xl border p-5 shadow-sm"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold" style={{ color: "var(--ink)" }}>
              {t(task.label, lang)}
            </h3>
            {task.is_closed_source && (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                {t(DICT.scenario.closedSource, lang)}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs" style={{ color: "var(--subtle)" }}>
            {t(DICT.scenario.scoring, lang)}: {scoringLabel(task.scoring_method, lang)}
            {task.n_cases ? ` · ${task.n_cases} ${t(DICT.scenario.cases, lang)}` : ""}
          </div>
        </div>
      </div>

      {(task.input_summary || task.output_summary) && (
        <div className="mt-3 space-y-1 text-sm" style={{ color: "var(--subtle)" }}>
          {task.input_summary && (
            <div>
              <span className="font-semibold">{t(DICT.scenario.input, lang)}:</span> {t(task.input_summary, lang)}
            </div>
          )}
          {task.output_summary && (
            <div>
              <span className="font-semibold">{t(DICT.scenario.output, lang)}:</span> {t(task.output_summary, lang)}
            </div>
          )}
        </div>
      )}

      {best && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <PickCard kind="best" leader={best} lang={lang} />
          <PickCard kind="value" leader={value} lang={lang} />
        </div>
      )}

      {task.leaders.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--subtle)" }}>
            {t(DICT.scenario.leaderboardOnTask, lang)}
          </div>
          <table className="w-full">
            <tbody>
              {task.leaders.map((l, i) => (
                <LeaderRow key={l.model_id} leader={l} rank={i + 1} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {task.cases.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setOpenCases((v) => !v)}
            className="text-xs font-medium hover:opacity-70"
            style={{ color: "var(--accent-2)" }}
          >
            {openCases ? "▾" : "▸"} {task.cases.length} {t(DICT.scenario.cases, lang)}
          </button>
          {openCases && (
            <ul className="mt-2 space-y-1">
              {task.cases.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-sm" style={{ color: "var(--subtle)" }}>
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                  {t(c.label, lang)}
                  {c.is_sample_public && (
                    <span className="rounded bg-emerald-50 px-1.5 text-xs text-emerald-600">sample</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function DomainExplorer({ catalog }: { catalog: DomainCatalog }) {
  const { lang } = useLang();
  // 扁平化所有领域，记录所属轴，便于左侧分组渲染与选中态。
  const allDomains = catalog.axes.flatMap((ax) => ax.domains.map((d) => ({ axis: ax, domain: d })));
  const [selected, setSelected] = useState<string | null>(
    allDomains.length ? allDomains[0].domain.id : null,
  );

  const current = allDomains.find((x) => x.domain.id === selected)?.domain as Domain | undefined;

  if (!catalog.axes.length) {
    return (
      <div className="mx-auto max-w-7xl px-6">
        <div
          className="rounded-2xl border p-16 text-center"
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--subtle)" }}
        >
          {t(DICT.noData, lang)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 md:grid-cols-[240px_1fr]">
      {/* 左侧能力导航 */}
      <aside className="space-y-5">
        {catalog.axes.map((ax) => (
          <div key={ax.id}>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--subtle)" }}>
              {t(ax.label, lang)}
            </div>
            <ul className="space-y-0.5">
              {ax.domains.map((d) => {
                const active = d.id === selected;
                return (
                  <li key={d.id}>
                    <button
                      onClick={() => setSelected(d.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors"
                      style={
                        active
                          ? { background: "var(--accent)", color: "#fff" }
                          : { color: "var(--ink)" }
                      }
                    >
                      {d.icon && <span>{d.icon}</span>}
                      <span className="font-medium">{t(d.label, lang)}</span>
                      <span className="ml-auto text-xs" style={{ opacity: 0.6 }}>
                        {d.tasks.length}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </aside>

      {/* 右侧 task 面板 */}
      <section className="space-y-4">
        {current ? (
          <>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
                  {current.icon ? `${current.icon} ` : ""}
                  {t(current.label, lang)}
                </h2>
                {current.contributor_org && (
                  <span className="rounded-md px-2 py-0.5 text-xs" style={{ background: "var(--rank1-bg)", color: "var(--rank1-tx)" }}>
                    {t(DICT.scenario.contributedBy, lang)} {current.contributor_org}
                  </span>
                )}
              </div>
              {current.blurb && (
                <p className="mt-1 text-sm" style={{ color: "var(--subtle)" }}>
                  {t(current.blurb, lang)}
                </p>
              )}
            </div>
            {current.tasks.length ? (
              current.tasks.map((task) => <TaskPanel key={task.id} task={task} />)
            ) : (
              <div className="rounded-2xl border p-10 text-center text-sm" style={{ borderColor: "var(--border)", color: "var(--subtle)" }}>
                {t(DICT.noData, lang)}
              </div>
            )}
          </>
        ) : (
          <div className="text-sm" style={{ color: "var(--subtle)" }}>
            {t(DICT.scenario.selectCapability, lang)}
          </div>
        )}
      </section>
    </div>
  );
}
