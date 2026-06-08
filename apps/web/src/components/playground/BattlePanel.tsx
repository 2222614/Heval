"use client";
// Battle 对战：默认只有一个输入框；提交后下方才出现两个文本框展示双匿名模型流式答案。
// Enter 发送 · Shift+Enter 换行；示例 chip 一键填入；盲选投票后揭晓身份。
import { useMemo, useRef, useState } from "react";
import { DICT, t } from "@/lib/i18n";
import { useLang } from "../LangProvider";
import { streamBattle, type ChatModel, type Msg } from "@/lib/playground";

type Vote = "a" | "b" | "tie" | "bad" | null;

export function BattlePanel({ models }: { models: ChatModel[] }) {
  const { lang } = useLang();
  const [prompt, setPrompt] = useState("");
  const [asked, setAsked] = useState(false); // 是否已提交过（控制双栏出现）
  const [question, setQuestion] = useState("");
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [vote, setVote] = useState<Vote>(null);
  const [reveal, setReveal] = useState<{ a: string; b: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function pickPair(): { a: string; b: string } {
    if (models.length < 2) return { a: models[0]?.id ?? "", b: models[0]?.id ?? "" };
    const idxA = Math.floor(Math.random() * models.length);
    let idxB = Math.floor(Math.random() * models.length);
    if (idxB === idxA) idxB = (idxB + 1) % models.length;
    return { a: models[idxA].id, b: models[idxB].id };
  }

  async function start() {
    const text = prompt.trim();
    if (!text || streaming) return;
    const pair = pickPair();
    setQuestion(text);
    setAsked(true);
    setPrompt(""); // 提交后清空输入框（与 Advisor 一致）
    setTextA("");
    setTextB("");
    setVote(null);
    setReveal(null);
    setStreaming(true);
    const msgs: Msg[] = [{ role: "user", content: text }];
    abortRef.current = new AbortController();
    try {
      const { reveal: rv } = await streamBattle(
        { model_a: pair.a, model_b: pair.b, messages: msgs },
        (side, delta) => (side === "a" ? setTextA((p) => p + delta) : setTextB((p) => p + delta)),
        abortRef.current.signal,
      );
      if (rv) setReveal({ a: rv.a.display, b: rv.b.display });
    } catch {
      const errMsg = lang === "zh" ? "⚠ 请求失败，请检查后端服务后重试。" : "⚠ Request failed.";
      setTextA((p) => p || errMsg);
      setTextB((p) => p || errMsg);
    } finally {
      setStreaming(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      start();
    }
  }

  const canVote = useMemo(() => textA.length > 0 && textB.length > 0 && !streaming, [textA, textB, streaming]);

  return (
    <div className="mx-auto max-w-5xl px-6">
      {!asked && (
        <div className="anim-in mb-6 text-center">
          <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--accent)" }}>
            ⚔ {t(DICT.playground.battleMode, lang)}
          </div>
          <p className="mx-auto max-w-xl text-sm" style={{ color: "var(--subtle)" }}>
            {t(DICT.playground.battleHeroSub, lang)}
          </p>
        </div>
      )}

      {/* 提问回显 */}
      {asked && question && (
        <div className="anim-in mb-4 flex justify-end">
          <span className="max-w-[80%] rounded-2xl px-4 py-2 text-sm" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
            {question}
          </span>
        </div>
      )}

      {/* 双栏（提交后才出现） */}
      {asked && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(["a", "b"] as const).map((side, idx) => {
            const text = side === "a" ? textA : textB;
            const label = side === "a" ? t(DICT.playground.assistantA, lang) : t(DICT.playground.assistantB, lang);
            const revealed = vote && reveal ? (side === "a" ? reveal.a : reveal.b) : null;
            const typing = streaming && text.length > 0;
            return (
              <div
                key={side}
                className="anim-pop flex min-h-[280px] flex-col rounded-2xl border shadow-sm"
                style={{ borderColor: "var(--border)", background: "var(--surface)", animationDelay: `${idx * 80}ms` }}
              >
                <div
                  className="flex items-center justify-between border-b px-4 py-2.5 text-sm font-semibold"
                  style={{ borderColor: "var(--border)", color: "var(--ink)" }}
                >
                  <span>{label}</span>
                  {revealed && (
                    <span className="anim-pop rounded-md px-2 py-0.5 text-xs" style={{ background: "var(--rank1-bg)", color: "var(--rank1-tx)" }}>
                      {revealed}
                    </span>
                  )}
                </div>
                <div
                  className={`flex-1 whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed ${typing && text ? "typing-caret" : ""}`}
                  style={{ color: "var(--ink)" }}
                >
                  {text || <span style={{ color: "var(--subtle)" }}>…</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 投票条 */}
      {canVote && (
        <div className="anim-in mt-4 flex flex-wrap items-center justify-center gap-2">
          {vote ? (
            <span className="text-sm font-medium" style={{ color: "var(--accent-2)" }}>
              ✓ {t(DICT.playground.voted, lang)} · {t(DICT.playground.revealed, lang)}
            </span>
          ) : (
            <>
              <VoteBtn onClick={() => setVote("a")}>← {t(DICT.playground.aBetter, lang)}</VoteBtn>
              <VoteBtn onClick={() => setVote("tie")}>{t(DICT.playground.tie, lang)}</VoteBtn>
              <VoteBtn onClick={() => setVote("bad")}>{t(DICT.playground.bothBad, lang)}</VoteBtn>
              <VoteBtn onClick={() => setVote("b")}>{t(DICT.playground.bBetter, lang)} →</VoteBtn>
            </>
          )}
        </div>
      )}

      {/* 输入框（布局与选型顾问一致：未提交时大，提交后缩小） */}
      <div
        className="mt-5 rounded-2xl border p-4 shadow-sm transition-shadow focus-within:shadow-md"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={onKey}
          rows={asked ? 2 : 3}
          placeholder={t(DICT.playground.battlePlaceholder, lang)}
          className="w-full resize-none bg-transparent text-sm outline-none"
          style={{ color: "var(--ink)" }}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--subtle)" }}>
            {models.length < 2 ? t(DICT.playground.noBattleModels, lang) : t(DICT.playground.enterHint, lang)}
          </span>
          <button
            onClick={start}
            disabled={streaming || !prompt.trim() || models.length < 2}
            className="chip rounded-lg px-5 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            {streaming ? t(DICT.playground.sending, lang) : t(DICT.playground.battleStart, lang)}
          </button>
        </div>
      </div>

      {/* 示例 chips（未提交时展示） */}
      {!asked && (
        <div className="anim-in mt-5">
          <div className="mb-2 text-center text-xs" style={{ color: "var(--subtle)" }}>
            {t(DICT.playground.tryExamples, lang)}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {DICT.playground.battleExamples.map((ex, i) => (
              <button
                key={i}
                onClick={() => setPrompt(ex[lang])}
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

function VoteBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="chip rounded-lg border px-4 py-1.5 text-sm font-medium hover:bg-black/[0.03]"
      style={{ borderColor: "var(--border)", color: "var(--ink)" }}
    >
      {children}
    </button>
  );
}
