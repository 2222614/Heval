"use client";
// 把 header/seed 提示与表格组合起来的客户端视图（消费 lang 上下文）。
import { useState } from "react";
import { DICT, t } from "@/lib/i18n";
import { useLang } from "./LangProvider";
import { PageHeader } from "./PageHeader";
import { SeedBanner } from "./ui";
import { OverallTable } from "./OverallTable";
import { ScenarioTable } from "./ScenarioTable";
import { DomainExplorer } from "./DomainExplorer";
import type { Leaderboard, CategoryInfo, DomainCatalog } from "@/lib/types";

export function OverallView({ data }: { data: Leaderboard }) {
  const { lang } = useLang();
  return (
    <>
      <PageHeader title={DICT.overall.title} subtitle={DICT.overall.subtitle} lang={lang} />
      {data.is_seed && <SeedBanner lang={lang} />}
      <OverallTable data={data} />
    </>
  );
}

export function ScenarioView({
  data,
  categories,
  domains,
}: {
  data: Leaderboard;
  categories: CategoryInfo[];
  domains: DomainCatalog;
}) {
  const { lang } = useLang();
  const [tab, setTab] = useState<"matrix" | "drilldown">("drilldown");

  return (
    <>
      <PageHeader title={DICT.scenario.title} subtitle={DICT.scenario.subtitle} lang={lang} />
      {data.is_seed && <SeedBanner lang={lang} />}

      {/* 两视图切换：能力下钻（默认，二级页）/ 总览矩阵 */}
      <div className="mx-auto mb-5 flex max-w-7xl items-center gap-2 px-6">
        <button
          onClick={() => setTab("drilldown")}
          className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          style={tab === "drilldown" ? { background: "var(--accent)", color: "#fff" } : { color: "var(--subtle)", border: "1px solid var(--border)" }}
        >
          {t(DICT.scenario.drilldownTab, lang)}
        </button>
        <button
          onClick={() => setTab("matrix")}
          className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          style={tab === "matrix" ? { background: "var(--accent)", color: "#fff" } : { color: "var(--subtle)", border: "1px solid var(--border)" }}
        >
          {t(DICT.scenario.matrixTab, lang)}
        </button>
      </div>

      {tab === "drilldown" ? (
        <DomainExplorer catalog={domains} />
      ) : (
        <ScenarioTable data={data} categories={categories} />
      )}
    </>
  );
}
