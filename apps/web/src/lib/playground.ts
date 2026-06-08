// 选型顾问 + Battle 的客户端 —— 纯前端演示版（静态导出 / GitHub Pages 用）。
// 无后端：chat/battle 在前端逐字吐出示意文本；advisor 基于内联榜单做规则推荐。
import type { Leaderboard, LeaderboardRow } from "./types";
import leaderboardJson from "@/generated/leaderboard.json";
import modelsJson from "@/generated/models.json";

const LB = leaderboardJson as unknown as Leaderboard;
const MODELS = (modelsJson as unknown as { models?: ChatModel[] }).models || [];

export interface ChatModel {
  id: string;
  display: string;
  org?: string | null;
  region: "foreign" | "domestic";
  openness?: "open" | "closed";
  available?: boolean;
}

export interface Msg {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ExpertInfo {
  model_id: string;
  display: string;
  available: boolean;
}

export interface AdvisorRec {
  rank: number;
  model_id: string;
  model_display: string;
  scaffold?: string | null;
  org?: string | null;
  region?: string;
  openness?: string;
  score: number;
  avg_cost_usd?: number | null;
}

export interface AdvisorResult {
  need: string;
  matched_category: string | null;
  matched_category_label?: { zh?: string; en?: string } | null;
  is_seed: boolean;
  recommendations: AdvisorRec[];
}

const DEMO_NOTE =
  "【演示模式】这是 HEval 的静态分享版，未接入真实模型推理。以下为示意文本。";

// 逐字吐出示意文本，模拟流式打字
async function demoStream(prefix: string, onDelta: (t: string) => void, signal?: AbortSignal) {
  const text = `${DEMO_NOTE}\n\n${prefix}`;
  for (const ch of text) {
    if (signal?.aborted) return;
    onDelta(ch);
    await new Promise((r) => setTimeout(r, 8));
  }
}

export async function getChatModels(): Promise<ChatModel[]> {
  return MODELS.map((m) => ({ ...m, available: false }));
}

export async function getAdvisorExpert(): Promise<ExpertInfo | null> {
  // 静态版固定一个专家代号「小H」
  return { model_id: "expert", display: "小H", available: false };
}

// 关键词 -> 能力类别（与后端 advisor 规则一致）
const NEED_KEYWORDS: Array<[string[], string]> = [
  [["代码", "编程", "code", "调试", "debug", "重构"], "debugging"],
  [["前端", "网页", "web", "ui"], "web-coding"],
  [["数学", "推理", "math", "计算"], "mathematics-coding"],
  [["物理", "工程", "仿真", "physics"], "physics-coding"],
  [["表格", "excel", "spreadsheet", "数据"], "spreadsheet"],
  [["金融", "财务", "税务", "合规", "finance"], "finance"],
];

export async function recommend(body: {
  need: string;
  region?: string;
  weights?: string;
  budget_sensitive?: boolean;
}): Promise<AdvisorResult | null> {
  const need = body.need.toLowerCase();
  let targetCat: string | null = null;
  for (const [keys, cat] of NEED_KEYWORDS) {
    if (keys.some((k) => need.includes(k))) {
      targetCat = cat;
      break;
    }
  }

  const scoreOf = (r: LeaderboardRow) =>
    targetCat && r.by_category[targetCat] ? r.by_category[targetCat].avg_score : r.overall.avg_score;

  const pool = (LB.rows || []).filter((r) => {
    if (body.region && r.region !== body.region) return false;
    if (body.weights && (r.openness ?? "closed") !== body.weights) return false;
    return true;
  });
  pool.sort((a, b) => scoreOf(b) - scoreOf(a));

  const seen = new Set<string>();
  const picks: LeaderboardRow[] = [];
  for (const r of pool) {
    if (seen.has(r.model_id)) continue;
    seen.add(r.model_id);
    picks.push(r);
    if (picks.length >= 3) break;
  }

  return {
    need: body.need,
    matched_category: targetCat,
    matched_category_label: targetCat ? LB.category_labels?.[targetCat] ?? null : null,
    is_seed: true,
    recommendations: picks.map((r, i) => ({
      rank: i + 1,
      model_id: r.model_id,
      model_display: r.model_display,
      scaffold: r.scaffold,
      org: r.org,
      region: r.region,
      openness: r.openness ?? "closed",
      score: Math.round(scoreOf(r) * 10000) / 10000,
      avg_cost_usd: r.overall.avg_cost_usd ?? null,
    })),
  };
}

export async function streamAdvisorChat(
  messages: Msg[],
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<{ demo: boolean }> {
  const prompt = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  await demoStream(
    `小H 将基于你的需求「${prompt.slice(0, 40)}…」给出选型建议。完整推理需在本地配置后端与 API Key 后启用；上方的「为你推荐」卡片基于真实榜单数据，是可用的。`,
    onDelta,
    signal,
  );
  return { demo: true };
}

export async function streamChat(
  body: { model_id: string; messages: Msg[] },
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<{ demo: boolean }> {
  const prompt = [...body.messages].reverse().find((m) => m.role === "user")?.content || "";
  await demoStream(`将在此基于你的问题「${prompt.slice(0, 40)}…」生成回答。`, onDelta, signal);
  return { demo: true };
}

export async function streamBattle(
  body: { model_a: string; model_b: string; messages: Msg[] },
  onDelta: (side: "a" | "b", text: string) => void,
  signal?: AbortSignal,
): Promise<{ reveal: { a: { display: string }; b: { display: string } } | null }> {
  const prompt = [...body.messages].reverse().find((m) => m.role === "user")?.content || "";
  const ma = MODELS.find((m) => m.id === body.model_a);
  const mb = MODELS.find((m) => m.id === body.model_b);
  // 两侧并发逐字吐示意文本
  await Promise.all([
    demoStream(`（助手 A 对「${prompt.slice(0, 30)}…」的示意回答）`, (t) => onDelta("a", t), signal),
    demoStream(`（助手 B 对「${prompt.slice(0, 30)}…」的示意回答）`, (t) => onDelta("b", t), signal),
  ]);
  return {
    reveal: {
      a: { display: ma?.display || body.model_a },
      b: { display: mb?.display || body.model_b },
    },
  };
}
