"use client";
// 选型顾问：固定调用专家模型「小H」（用户不选模型）。需求输入 → 推荐卡片 + 流式对话。
// Enter 发送 · Shift+Enter 换行；提供示例 chip 一键填入。
import { useEffect, useRef, useState } from "react";
import { DICT, t } from "@/lib/i18n";
import { useLang } from "../LangProvider";
import { OpennessBadge, RegionBadge, ScaffoldBadge } from "../ui";
import { pct } from "@/lib/score";
import {
  getAdvisorExpert,
  recommend,
  streamAdvisorChat,
  type AdvisorResult,
  type ExpertInfo,
  type Msg,
} from "@/lib/playground";

export function AdvisorPanel() {
  const { lang } = useLang();
  const [need, setNeed] = useState("");
  const [rec, setRec] = useState<AdvisorResult | null>(null);
  const [expert, setExpert] = useState<ExpertInfo | null>(null);
  const [chat, setChat] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [demo, setDemo] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getAdvisorExpert().then(setExpert);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat]);

  async function submit() {
    const text = need.trim();
    if (!text || streaming) return;
    const userMsg: Msg = { role: "user", content: text };
    const history = [...chat, userMsg];
    setChat([...history, { role: "assistant", content: "" }]);
    setNeed("");
    setStreaming(true);
    // 并行触发榜单推荐（仅首轮或需求变化时刷新）
    recommend({ need: text }).then((r) => r && setRec(r));
    abortRef.current = new AbortController();
    try {
      const { demo: d } = await streamAdvisorChat(
        history,
        (delta) =>
          setChat((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              role: "assistant",
              content: next[next.length - 1].content + delta,
            };
            return next;
          }),
        abortRef.current.signal,
      );
      setDemo(d);
    } catch {
      // 网络/后端错误：把最后一条空 assistant 气泡替换为错误提示，避免静默失败
      setChat((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "assistant" && !last.content) {
          next[next.length - 1] = {
            role: "assistant",
            content: lang === "zh" ? "⚠ 请求失败，请检查后端服务后重试。" : "⚠ Request failed. Check the backend and retry.",
          };
        }
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const started = chat.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-6">
      {/* Hero（仅未开始对话时显示，开始后收起） */}
      {!started && (
        <div className="anim-in mb-6 text-center">
          <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--accent)" }}>
            ⚖ {t(DICT.playground.poweredByExpert, lang)}
            {expert && <span style={{ color: "var(--subtle)" }}>· {expert.display}</span>}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
            {t(DICT.playground.advisorHeroTitle, lang)}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm" style={{ color: "var(--subtle)" }}>
            {t(DICT.playground.advisorHeroSub, lang)}
          </p>
        </div>
      )}

      {/* 对话流 */}
      {started && (
        <div className="mb-4 space-y-3">
          {demo && (
            <div className="anim-in rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
              {t(DICT.playground.demoBadge, lang)}
            </div>
          )}
          {chat.map((m, i) => {
            const isLast = i === chat.length - 1;
            const typing = isLast && m.role === "assistant" && streaming;
            return (
              <div
                key={i}
                className="anim-in rounded-xl border p-3.5 text-sm"
                style={{
                  borderColor: "var(--border)",
                  background: m.role === "user" ? "var(--surface-2)" : "var(--surface)",
                  color: "var(--ink)",
                }}
              >
                <div className="mb-1 text-xs font-semibold" style={{ color: "var(--subtle)" }}>
                  {m.role === "user" ? "You" : expert?.display || "小H"}
                </div>
                <div className={`whitespace-pre-wrap leading-relaxed ${typing ? "typing-caret" : ""}`}>
                  {m.content}
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      )}

      {/* 推荐卡片 */}
      {rec && rec.recommendations.length > 0 && (
        <div className="anim-in mb-5">
          <div className="mb-2 flex items-center gap-2 text-sm" style={{ color: "var(--subtle)" }}>
            <span className="font-semibold">{t(DICT.playground.recommendedFor, lang)}</span>
            {rec.matched_category_label && (
              <span className="rounded-md px-2 py-0.5 text-xs" style={{ background: "var(--surface-2)", color: "var(--accent-2)" }}>
                {t(DICT.playground.matchedScene, lang)}: {rec.matched_category_label[lang] || rec.matched_category}
              </span>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {rec.recommendations.map((r) => (
              <div
                key={r.model_id}
                className="anim-pop rounded-xl border p-3"
                style={{ borderColor: r.rank === 1 ? "var(--accent)" : "var(--border)", background: "var(--surface)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>#{r.rank}</span>
                  <span className="font-semibold" style={{ color: "var(--ink)" }}>{r.model_display}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {r.scaffold && <ScaffoldBadge name={r.scaffold} />}
                  {r.region && <RegionBadge region={r.region as "foreign" | "domestic"} lang={lang} />}
                  <OpennessBadge openness={r.openness as "open" | "closed"} lang={lang} />
                </div>
                <div className="mt-2 flex items-center gap-3 text-sm" style={{ color: "var(--subtle)" }}>
                  <span className="font-mono font-semibold" style={{ color: "var(--accent-2)" }}>{pct(r.score)}</span>
                  {r.avg_cost_usd != null && (
                    <span className="font-mono">${r.avg_cost_usd.toFixed(2)}{t(DICT.playground.perTask, lang)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 输入框 */}
      <div
        className="rounded-2xl border p-4 shadow-sm transition-shadow focus-within:shadow-md"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <textarea
          value={need}
          onChange={(e) => setNeed(e.target.value)}
          onKeyDown={onKey}
          rows={started ? 2 : 3}
          placeholder={t(DICT.playground.advisorPlaceholder, lang)}
          className="w-full resize-none bg-transparent text-sm outline-none"
          style={{ color: "var(--ink)" }}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--subtle)" }}>
            {t(DICT.playground.enterHint, lang)}
          </span>
          <button
            onClick={submit}
            disabled={streaming || !need.trim()}
            className="chip rounded-lg px-5 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            {streaming ? t(DICT.playground.sending, lang) : `» ${t(DICT.playground.send, lang)}`}
          </button>
        </div>
      </div>

      {/* 示例 chips（未开始时展示） */}
      {!started && (
        <div className="anim-in mt-5">
          <div className="mb-2 text-center text-xs" style={{ color: "var(--subtle)" }}>
            {t(DICT.playground.tryExamples, lang)}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {DICT.playground.advisorExamples.map((ex, i) => (
              <button
                key={i}
                onClick={() => setNeed(ex[lang])}
                className="chip rounded-full border px-3.5 py-1.5 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--subtle)" }}
              >
                {ex[lang]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
