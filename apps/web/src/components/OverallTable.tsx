"use client";
// Part 1：综合能力榜。Scaffold × Model 行，可按列排序 + 区域/开源筛选。
import { useMemo, useState } from "react";
import { DICT, t } from "@/lib/i18n";
import { useLang } from "./LangProvider";
import { RankBadge, RegionBadge, OpennessBadge, ScoreBar, ScaffoldBadge, OracleLine } from "./ui";
import { FilterBar, type RegionFilter, type WeightsFilter } from "./FilterBar";
import type { Leaderboard, LeaderboardRow } from "@/lib/types";

type SortKey = "score" | "cost" | "latency";

export function OverallTable({ data }: { data: Leaderboard }) {
  const { lang } = useLang();
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [asc, setAsc] = useState(false);
  const [region, setRegion] = useState<RegionFilter>("all");
  const [weights, setWeights] = useState<WeightsFilter>("all");
  const [scaffold, setScaffold] = useState<string>("all");

  const rows = useMemo(() => {
    let copy = data.rows.filter((r) => {
      if (scaffold !== "all" && r.scaffold !== scaffold) return false;
      if (region !== "all" && r.region !== region) return false;
      if (weights !== "all" && (r.openness ?? "closed") !== weights) return false;
      return true;
    });
    const val = (r: LeaderboardRow): number => {
      if (sortKey === "score") return r.overall.avg_score;
      if (sortKey === "cost") return r.overall.avg_cost_usd ?? Infinity;
      return r.overall.avg_latency_sec ?? Infinity;
    };
    copy = [...copy].sort((a, b) => (asc ? val(a) - val(b) : val(b) - val(a)));
    return copy;
  }, [data.rows, sortKey, asc, region, weights, scaffold]);

  function clickSort(key: SortKey) {
    if (sortKey === key) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(false);
    }
  }
  const arrow = (key: SortKey) => (sortKey === key ? (asc ? " ↑" : " ↓") : "");

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
        scaffolds={data.scaffolds}
        scaffold={scaffold}
        setScaffold={setScaffold}
      />
      <div className="mx-auto max-w-7xl px-6">
        {rows.length === 0 ? (
          <div
            className="rounded-2xl border p-16 text-center"
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--subtle)" }}
          >
            {t(DICT.noData, lang)}
          </div>
        ) : (
          <div className="space-y-3">
            {data.oracle_reference && (
              <OracleLine
                label={data.oracle_reference.label[lang] || data.oracle_reference.label.en || "Oracle"}
                score={data.oracle_reference.overall}
              />
            )}
            <div
              className="overflow-hidden rounded-2xl border shadow-sm"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
            <table className="w-full">
              <thead>
                <tr
                  className="border-b text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ borderColor: "var(--border)", color: "var(--subtle)" }}
                >
                  <th className="px-6 py-4">{t(DICT.overall.rank, lang)}</th>
                  <th className="px-6 py-4">{t(DICT.overall.model, lang)}</th>
                  <th className="px-6 py-4">{t(DICT.org, lang)}</th>
                  <th className="px-6 py-4">{t(DICT.overall.region, lang)}</th>
                  <th
                    className="cursor-pointer px-6 py-4 hover:opacity-70"
                    onClick={() => clickSort("score")}
                  >
                    {t(DICT.overall.score, lang)}
                    {arrow("score")}
                  </th>
                  <th
                    className="cursor-pointer px-6 py-4 text-right hover:opacity-70"
                    onClick={() => clickSort("cost")}
                  >
                    {t(DICT.overall.cost, lang)}
                    {arrow("cost")}
                  </th>
                  <th
                    className="cursor-pointer px-6 py-4 text-right hover:opacity-70"
                    onClick={() => clickSort("latency")}
                  >
                    {t(DICT.overall.latency, lang)}
                    {arrow("latency")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={`${r.scaffold}-${r.model_id}`}
                    className="hh-row border-b"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="px-6 py-4">
                      <RankBadge rank={i + 1} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: "var(--ink)" }}>
                          {r.model_display}
                        </span>
                        <OpennessBadge openness={r.openness} lang={lang} />
                      </div>
                      <div className="mt-1">
                        <ScaffoldBadge name={r.scaffold} />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: "var(--subtle)" }}>
                      {r.org || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <RegionBadge region={r.region} lang={lang} />
                    </td>
                    <td className="px-6 py-4">
                      <ScoreBar score={r.overall.avg_score} />
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm tabular-nums" style={{ color: "var(--subtle)" }}>
                      {r.overall.avg_cost_usd != null ? `$${r.overall.avg_cost_usd.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm tabular-nums" style={{ color: "var(--subtle)" }}>
                      {r.overall.avg_latency_sec != null ? r.overall.avg_latency_sec.toFixed(0) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
