// 选型顾问 + Battle 的客户端：POST + 解析 SSE 流。
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export interface ChatModel {
  id: string;
  display: string;
  org?: string | null;
  region: "foreign" | "domestic";
  openness?: "open" | "closed";
  available: boolean;
}

export interface Msg {
  role: "system" | "user" | "assistant";
  content: string;
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

export interface ExpertInfo {
  model_id: string;
  display: string;
  available: boolean;
}

export async function getAdvisorExpert(): Promise<ExpertInfo | null> {
  try {
    const r = await fetch(`${BASE}/api/advisor/expert`, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function getChatModels(): Promise<ChatModel[]> {
  try {
    const r = await fetch(`${BASE}/api/chat/models`, { cache: "no-store" });
    if (!r.ok) return [];
    return (await r.json()).models ?? [];
  } catch {
    return [];
  }
}

export async function recommend(body: {
  need: string;
  region?: string;
  weights?: string;
  budget_sensitive?: boolean;
}): Promise<AdvisorResult | null> {
  try {
    const r = await fetch(`${BASE}/api/advisor/recommend`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// 解析 SSE 流，对每个 data:{...} 事件回调。返回一个可 await 的 promise。
async function consumeSSE(
  resp: Response,
  onEvent: (evt: any) => void,
): Promise<void> {
  const reader = resp.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    // SSE 事件以空行分隔
    const parts = buf.split("\n\n");
    buf = parts.pop() || "";
    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      try {
        onEvent(JSON.parse(data));
      } catch {
        /* ignore */
      }
    }
  }
}

// 单模型流式对话。onDelta 收到文本增量，返回 {demo}。
export async function streamChat(
  body: { model_id: string; messages: Msg[] },
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<{ demo: boolean }> {
  let demo = false;
  const resp = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!resp.ok) throw new Error(`API ${resp.status}`);
  await consumeSSE(resp, (evt) => {
    if (evt.type === "delta") onDelta(evt.text);
    else if (evt.type === "done") demo = !!evt.demo;
  });
  return { demo };
}

// 选型顾问对话：固定专家模型（后端决定），前端不传 model_id。
export async function streamAdvisorChat(
  messages: Msg[],
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<{ demo: boolean }> {
  let demo = false;
  const resp = await fetch(`${BASE}/api/advisor/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!resp.ok) throw new Error(`API ${resp.status}`);
  await consumeSSE(resp, (evt) => {
    if (evt.type === "delta") onDelta(evt.text);
    else if (evt.type === "done") demo = !!evt.demo;
  });
  return { demo };
}

// 双模型对战流式。onDelta(side, text)；返回 reveal（双方身份）。
export async function streamBattle(
  body: { model_a: string; model_b: string; messages: Msg[] },
  onDelta: (side: "a" | "b", text: string) => void,
  signal?: AbortSignal,
): Promise<{ reveal: { a: { display: string }; b: { display: string } } | null }> {
  let reveal: any = null;
  const resp = await fetch(`${BASE}/api/battle`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!resp.ok) throw new Error(`API ${resp.status}`);
  await consumeSSE(resp, (evt) => {
    if (evt.type === "delta") onDelta(evt.side, evt.text);
    else if (evt.type === "done") reveal = evt.reveal;
  });
  return { reveal };
}
