"use client";
// 选型顾问 + Battle 合一页：左上角切换 Mode（参考 Arena）。
import { useState } from "react";
import { DICT, t } from "@/lib/i18n";
import { useLang } from "../LangProvider";
import { AdvisorPanel } from "./AdvisorPanel";
import { BattlePanel } from "./BattlePanel";
import type { ChatModel } from "@/lib/playground";

type Mode = "advisor" | "battle";

export function PlaygroundView({ models }: { models: ChatModel[] }) {
  const { lang } = useLang();
  const [mode, setMode] = useState<Mode>("advisor");

  return (
    <div className="py-2">
      {/* 左上角 Mode 切换 */}
      <div className="mx-auto mb-6 max-w-6xl px-6">
        <div
          className="inline-flex items-center gap-1 rounded-xl border p-1"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          {(["advisor", "battle"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors"
              style={
                mode === m
                  ? { background: "var(--accent)", color: "#fff" }
                  : { color: "var(--subtle)" }
              }
            >
              {m === "advisor"
                ? `⚖ ${t(DICT.playground.advisorMode, lang)}`
                : `⚔ ${t(DICT.playground.battleMode, lang)}`}
            </button>
          ))}
        </div>
      </div>

      {mode === "advisor" ? <AdvisorPanel /> : <BattlePanel models={models} />}
    </div>
  );
}
