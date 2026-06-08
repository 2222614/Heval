"use client";
// 第五部分：用例库。通用/专家域 tab + 分类标签筛选 + 卡片网格 + 点击展开详情。
import { useMemo, useState } from "react";
import { DICT, t } from "@/lib/i18n";
import { useLang } from "./LangProvider";
import { PageHeader } from "./PageHeader";
import type { Showcase, ShowcaseCase, ShowcaseCategory } from "@/lib/types";

function SourceBadge({ type, lang }: { type: ShowcaseCase["source_type"]; lang: "zh" | "en" }) {
  const map = {
    public_benchmark: { label: DICT.showcase.sourcePublic, cls: "bg-sky-50 text-sky-600" },
    fabricated: { label: DICT.showcase.sourceFabricated, cls: "bg-violet-50 text-violet-600" },
    closed_preview: { label: DICT.showcase.sourceClosed, cls: "bg-slate-100 text-slate-500" },
  }[type];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${map.cls}`}>
      {t(map.label, lang)}
    </span>
  );
}

const DIFF_CLS: Record<string, string> = {
  easy: "bg-emerald-50 text-emerald-600",
  medium: "bg-amber-50 text-amber-600",
  hard: "bg-rose-50 text-rose-600",
  unknown: "bg-gray-100 text-gray-500",
};

function CaseCard({ c }: { c: ShowcaseCase }) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <div
      className="anim-in flex flex-col rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <SourceBadge type={c.source_type} lang={lang} />
        {c.difficulty && c.difficulty !== "unknown" && (
          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${DIFF_CLS[c.difficulty]}`}>
            {c.difficulty}
          </span>
        )}
        {c.source_name && (
          <span className="text-xs" style={{ color: "var(--subtle)" }}>
            {c.source_name}
          </span>
        )}
      </div>

      <h3 className="text-base font-bold" style={{ color: "var(--ink)" }}>
        {t(c.title, lang)}
      </h3>

      {/* 题面：默认截断，展开看全文 */}
      <p
        className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${open ? "" : "line-clamp-3"}`}
        style={{ color: "var(--subtle)" }}
      >
        {t(c.prompt, lang)}
      </p>

      {/* 考察维度 chips */}
      {c.probes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {c.probes.map((p, i) => (
            <span
              key={i}
              className="rounded-full px-2 py-0.5 text-xs"
              style={{ background: "var(--surface-2)", color: "var(--accent-2)" }}
            >
              {t(p, lang)}
            </span>
          ))}
        </div>
      )}

      {/* 展开：参考答案要点 + 来源链接 */}
      {open && c.answer_key_points.length > 0 && (
        <div className="mt-3 rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
          <div className="mb-1.5 text-xs font-semibold" style={{ color: "var(--subtle)" }}>
            {t(DICT.showcase.keyPoints, lang)}
          </div>
          <ul className="space-y-1">
            {c.answer_key_points.map((k, i) => (
              <li key={i} className="flex gap-2 text-sm" style={{ color: "var(--ink)" }}>
                <span style={{ color: "var(--accent)" }}>·</span>
                {t(k, lang)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-medium hover:opacity-70"
          style={{ color: "var(--accent)" }}
        >
          {open ? t(DICT.showcase.collapse, lang) : t(DICT.showcase.expand, lang)} {open ? "▴" : "▾"}
        </button>
        {c.source_url && (
          <a
            href={c.source_url}
            target="_blank"
            rel="noreferrer"
            className="text-xs hover:opacity-70"
            style={{ color: "var(--subtle)" }}
          >
            {t(DICT.showcase.viewSource, lang)} ↗
          </a>
        )}
      </div>
    </div>
  );
}

export function ShowcaseView({ data }: { data: Showcase }) {
  const { lang } = useLang();
  const [axisId, setAxisId] = useState(data.axes[0]?.id ?? "general");
  const [catId, setCatId] = useState<string>("all");

  const axis = data.axes.find((a) => a.id === axisId) ?? data.axes[0];
  const cats: ShowcaseCategory[] = axis?.categories ?? [];

  const visibleCases = useMemo(() => {
    const pool = catId === "all" ? cats : cats.filter((c) => c.id === catId);
    return pool.flatMap((c) => c.cases);
  }, [cats, catId]);

  const totalCases = useMemo(
    () => data.axes.reduce((s, a) => s + a.categories.reduce((s2, c) => s2 + c.cases.length, 0), 0),
    [data.axes],
  );

  if (!data.axes.length || totalCases === 0) {
    return (
      <>
        <PageHeader title={DICT.showcase.title} subtitle={DICT.showcase.subtitle} lang={lang} />
        <div className="mx-auto max-w-7xl px-6">
          <div
            className="rounded-2xl border p-16 text-center"
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--subtle)" }}
          >
            {t(DICT.noData, lang)}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={DICT.showcase.title} subtitle={DICT.showcase.subtitle} lang={lang} />

      <div className="mx-auto max-w-7xl px-6">
        {/* 轴 tab */}
        <div className="mb-4 flex items-center gap-2">
          {data.axes.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setAxisId(a.id);
                setCatId("all");
              }}
              className="rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors"
              style={
                a.id === axisId
                  ? { background: "var(--accent)", color: "#fff" }
                  : { color: "var(--subtle)", border: "1px solid var(--border)" }
              }
            >
              {t(a.label, lang)}
            </button>
          ))}
        </div>

        {/* 分类标签筛选 */}
        <div className="mb-6 flex flex-wrap gap-2">
          <FilterChip active={catId === "all"} onClick={() => setCatId("all")}>
            {t(DICT.showcase.allCats, lang)}
          </FilterChip>
          {cats.map((c) => (
            <FilterChip key={c.id} active={catId === c.id} onClick={() => setCatId(c.id)}>
              {t(c.label, lang)} <span className="opacity-50">{c.cases.length}</span>
            </FilterChip>
          ))}
        </div>

        {/* 卡片网格 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleCases.map((c) => (
            <CaseCard key={c.id} c={c} />
          ))}
        </div>
      </div>
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="chip rounded-full px-3 py-1 text-xs font-medium"
      style={
        active
          ? { background: "var(--accent)", color: "#fff" }
          : { background: "var(--surface)", color: "var(--subtle)", border: "1px solid var(--border)" }
      }
    >
      {children}
    </button>
  );
}
