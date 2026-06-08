"use client";
import { DICT, t } from "@/lib/i18n";
import { useLang } from "./LangProvider";

const COPY = {
  advisor: {
    title: { zh: "选型顾问", en: "Model Advisor" },
    desc: {
      zh: "描述你的需求（场景、规模、预算、合规约束），基于真实评测数据推荐合适的模型组合。",
      en: "Describe your need (scenario, scale, budget, compliance); get a model recommendation grounded in real eval data.",
    },
  },
  battle: {
    title: { zh: "模型对战", en: "Battle" },
    desc: {
      zh: "输入一个需求，同时调用两个模型生成答案，由你盲选更符合心意的一个。",
      en: "Enter a prompt; two models answer; you blind-pick the better one.",
    },
  },
  showcase: {
    title: { zh: "用例展示", en: "QA Showcase" },
    desc: {
      zh: "精选评测用例与模型表现对比（大部分用例为闭源，仅展示脱敏样例）。",
      en: "Selected eval cases and model comparisons (most are closed-source; only desensitized samples shown).",
    },
  },
} as const;

export function ComingSoon({ kind }: { kind: keyof typeof COPY }) {
  const { lang } = useLang();
  const c = COPY[kind];
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
      <span className="mb-6 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
        {t(DICT.comingSoon, lang)}
      </span>
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{t(c.title, lang)}</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-500">{t(c.desc, lang)}</p>
      <div className="mt-10 w-full max-w-md rounded-2xl border border-dashed border-gray-300 bg-white/60 p-10 text-gray-300">
        <div className="mx-auto h-2 w-2/3 rounded-full bg-gray-100" />
        <div className="mx-auto mt-3 h-2 w-1/2 rounded-full bg-gray-100" />
        <div className="mx-auto mt-3 h-2 w-3/5 rounded-full bg-gray-100" />
      </div>
    </div>
  );
}
