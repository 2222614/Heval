"use client";
// Part 2（一级总览）：分场景能力榜。行=模型，列=场景类别，单元格热力着色。
// 二级下钻（领域→task→case）见 /scenario/[domain] 页面。
import { useMemo, useState } from "react";
import { DICT, t } from "@/lib/i18n";
import { useLang } from "./LangProvider";
import { RegionBadge, OpennessBadge } from "./ui";
import { FilterBar, type RegionFilter, type WeightsFilter } from "./FilterBar";
import { heatBg, heatTextColor, pct } from "@/lib/score";
import type { Leaderboard, CategoryInfo } from "@/lib/types";

export function ScenarioTable({
  data,
  categories,
}: {
  data: Leaderboard;
  categories: CategoryInfo[];
}) {
  const { lang } = useLang();
  const [sortCat, setSortCat] = useState<string | null>(null);
  const [region, setRegion] = useState<RegionFilter>("all");
  const [weights, setWeights] = useState<WeightsFilter>("all");

  const cats = categories.length
    ? categories
    : data.categories.map((id) => ({
        id,
        label: data.category_labels[id]
          ? { en: data.category_labels[id].en || id, zh: data.category_labels[id].zh || id }
          : { en: id, zh: id },
        n_tasks: 0,
      }));

  const rows = useMemo(() => {
    const filtered = data.rows.filter((r) => {
      if (region !== "all" && r.region !== region) return false;
      if (weights !== "all" && (r.openness ?? "closed") !== weights) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      const av = sortCat ? a.by_category[sortCat]?.avg_score ?? -1 : a.overall.avg_score;
      const bv = sortCat ? b.by_category[sortCat]?.avg_score ?? -1 : b.overall.avg_score;
      return bv - av;
    });
  }, [data.rows, sortCat, region, weights]);

  return (
    <>
      <FilterBar
        lang={lang}
        region={region}
        setRegion={setRegion}
        weights={weights}
        setWeights={setWeights}
        shown={rows.length}
        total={data.rows.length}
      />
      <div className="mx-auto max-w-7xl px-6">
        {rows.length === 0 || cats.length === 0 ? (
          <div
            className="rounded-2xl border p-16 text-center"
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--subtle)" }}
          >
            {t(DICT.noData, lang)}
          </div>
        ) : (
          <div
            className="overflow-x-auto rounded-2xl border shadow-sm"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-xs font-semibold" style={{ color: "var(--subtle)" }}>
                  <th className="sticky left-0 z-10 px-5 py-4" style={{ background: "var(--surface)" }}>
                    {t(DICT.overall.model, lang)}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-4 text-center hover:opacity-70"
                    style={sortCat === null ? { color: "var(--ink)" } : undefined}
                    onClick={() => setSortCat(null)}
                  >
                    {t(DICT.overall.score, lang)}
                  </th>
                  {cats.map((c) => (
                    <th
                      key={c.id}
                      className="cursor-pointer px-3 py-4 text-center hover:opacity-70"
                      style={sortCat === c.id ? { color: "var(--ink)" } : undefined}
                      onClick={() => setSortCat(c.id)}
                      title={`${c.n_tasks} ${t(DICT.tasks, lang)}`}
                    >
                      <div className="whitespace-nowrap">{t(c.label, lang)}</div>
                      <div className="font-normal opacity-50">
                        {c.n_tasks} {t(DICT.tasks, lang)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.scaffold}-${r.model_id}`} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="sticky left-0 z-10 px-5 py-3" style={{ background: "var(--surface)" }}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium" style={{ color: "var(--ink)" }}>
                          {r.model_display}
                        </span>
                        <RegionBadge region={r.region} lang={lang} />
                        <OpennessBadge openness={r.openness} lang={lang} />
                      </div>
                      <div className="text-xs" style={{ color: "var(--subtle)" }}>
                        {r.org || r.scaffold}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-sm font-semibold tabular-nums" style={{ color: "var(--ink)" }}>
                      {pct(r.overall.avg_score)}
                    </td>
                    {cats.map((c) => {
                      const cell = r.by_category[c.id];
                      if (!cell) {
                        return (
                          <td key={c.id} className="px-3 py-3 text-center" style={{ color: "var(--border)" }}>
                            —
                          </td>
                        );
                      }
                      return (
                        <td key={c.id} className="px-2 py-2 text-center">
                          <div
                            className="mx-auto flex h-9 min-w-[3rem] items-center justify-center rounded-md font-mono text-xs font-semibold tabular-nums"
                            style={{ background: heatBg(cell.avg_score), color: heatTextColor(cell.avg_score) }}
                            title={`${pct(cell.avg_score)} · n=${cell.n}`}
                          >
                            {pct(cell.avg_score)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
