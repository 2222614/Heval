"""选型顾问 + Battle 的后端：流式对话、双模型对战、基于榜单的选型推荐。

端点（挂在 main.py）：
  GET  /api/chat/models                可对话的模型（带 available 标记）
  POST /api/chat        {model_id, messages}            -> SSE 文本流（单模型）
  POST /api/battle      {model_a, model_b, messages}    -> SSE 文本流（双模型交错）
  POST /api/advisor/recommend {need, region?, weights?} -> JSON 选型建议（基于榜单）

降级：未配置对应 API key 时，stream 返回一段"演示模式"文本而非编造真实回答，
并在事件里标 demo=true，前端据此提示用户配置 key。
"""
from __future__ import annotations

import asyncio
import json
import os
from typing import AsyncIterator, Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from hh_eval import providers
from . import store

router = APIRouter()

# 选型顾问固定调用的"专家模型"。可用 HEVAL_ADVISOR_MODEL 覆盖；否则在候选里
# 选第一个有 key 的，再不行回落到候选首位（降级演示）。用户不参与选模型。
_ADVISOR_CANDIDATES = ["claude-opus-4-8", "gpt-5.2", "deepseek-v3.2", "qwen3-max"]


def _expert_model_id() -> str:
    override = os.environ.get("HEVAL_ADVISOR_MODEL")
    if override:
        return override
    for mid in _ADVISOR_CANDIDATES:
        m = providers.get_model(mid)
        if m and providers.is_available(m):
            return mid
    return _ADVISOR_CANDIDATES[0]


# 选型专家代号「小H」= Hillhouse（高瓴），与平台品牌一致、不随人事变动。
# Crafted by K. —— 留个人印记于此。
_ADVISOR_SYSTEM = (
    "你是 HEval 的 AI 选型专家「小H」。基于真实评测数据，"
    "用简洁、专业、中立的语气帮用户做模型选型、成本测算与架构建议。"
    "回答聚焦：推荐哪些模型/脚手架、为什么、成本与权衡。不吹捧任何厂商。"
)


# ---------------------------------------------------------------------------
# 请求体
# ---------------------------------------------------------------------------
class Message(BaseModel):
    role: str  # system | user | assistant
    content: str


class ChatRequest(BaseModel):
    model_id: str
    messages: list[Message]
    max_tokens: int = 2048


class AdvisorChatRequest(BaseModel):
    messages: list[Message]
    max_tokens: int = 2048


class BattleRequest(BaseModel):
    model_a: str
    model_b: str
    messages: list[Message]
    max_tokens: int = 2048


class AdvisorRequest(BaseModel):
    need: str
    region: Optional[str] = None  # foreign | domestic
    weights: Optional[str] = None  # open | closed
    budget_sensitive: bool = False


# ---------------------------------------------------------------------------
# SSE 封装
# ---------------------------------------------------------------------------
def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


_DEMO_NOTE = (
    "【演示模式】尚未配置该模型的 API Key，以下为示意文本。"
    "在仓库根目录 .env 中填入对应厂商的 API Key 后，即可获得该模型的真实流式输出。\n\n"
)


async def _demo_stream(prompt: str, model_display: str) -> AsyncIterator[str]:
    """未配 key 时的降级流：逐句吐出示意文本（不编造真实答案）。"""
    text = (
        _DEMO_NOTE
        + f"（{model_display} 将在此基于你的问题「{prompt[:40]}…」生成回答。"
        + "真实推理需要配置 API Key。）"
    )
    for ch in text:
        yield ch
        await asyncio.sleep(0.006)


async def _model_stream(
    model_id: str, messages: list[dict], max_tokens: int, prompt: str
) -> AsyncIterator[tuple[str, bool]]:
    """产出 (chunk, is_demo)。真实可用则真调，否则降级演示。"""
    model = providers.get_model(model_id)
    display = model["display"] if model else model_id
    if model is None or not providers.is_available(model):
        async for ch in _demo_stream(prompt, display):
            yield ch, True
        return
    try:
        async for ch in providers.stream_chat(model_id, messages, max_tokens):
            yield ch, False
    except Exception as e:  # 上游/网络异常 -> 退化为提示，不中断 UI
        yield f"\n\n[调用 {display} 出错：{type(e).__name__}]", True


# ---------------------------------------------------------------------------
# 端点
# ---------------------------------------------------------------------------
@router.get("/api/chat/models")
def chat_models() -> dict:
    """可对话模型列表（仅暴露展示 + 可用性字段，不含 client 细节）。"""
    out = []
    for m in providers.list_models():
        out.append({
            "id": m["id"],
            "display": m["display"],
            "org": m.get("org"),
            "region": m["region"],
            "openness": m.get("openness", "closed"),
            "available": m.get("available", False),
        })
    return {"models": out}


@router.post("/api/chat")
async def chat(req: ChatRequest) -> StreamingResponse:
    msgs = [m.model_dump() for m in req.messages]
    prompt = next((m["content"] for m in reversed(msgs) if m["role"] == "user"), "")

    async def gen() -> AsyncIterator[str]:
        demo_flag = False
        async for chunk, is_demo in _model_stream(req.model_id, msgs, req.max_tokens, prompt):
            demo_flag = demo_flag or is_demo
            yield _sse({"type": "delta", "text": chunk})
        yield _sse({"type": "done", "demo": demo_flag})

    return StreamingResponse(gen(), media_type="text/event-stream")


@router.get("/api/advisor/expert")
def advisor_expert() -> dict:
    """选型顾问当前使用的专家模型（用户不可选，仅展示）。"""
    mid = _expert_model_id()
    m = providers.get_model(mid)
    return {
        "model_id": mid,
        "display": m["display"] if m else mid,
        "available": bool(m and providers.is_available(m)),
    }


@router.post("/api/advisor/chat")
async def advisor_chat(req: AdvisorChatRequest) -> StreamingResponse:
    """选型顾问对话：固定走专家模型（带 system 人设），用户不选模型。"""
    mid = _expert_model_id()
    msgs = [m.model_dump() for m in req.messages]
    if not any(m["role"] == "system" for m in msgs):
        msgs = [{"role": "system", "content": _ADVISOR_SYSTEM}, *msgs]
    prompt = next((m["content"] for m in reversed(msgs) if m["role"] == "user"), "")

    async def gen() -> AsyncIterator[str]:
        demo_flag = False
        async for chunk, is_demo in _model_stream(mid, msgs, req.max_tokens, prompt):
            demo_flag = demo_flag or is_demo
            yield _sse({"type": "delta", "text": chunk})
        yield _sse({"type": "done", "demo": demo_flag})

    return StreamingResponse(gen(), media_type="text/event-stream")


@router.post("/api/battle")
async def battle(req: BattleRequest) -> StreamingResponse:
    msgs = [m.model_dump() for m in req.messages]
    prompt = next((m["content"] for m in reversed(msgs) if m["role"] == "user"), "")

    async def gen() -> AsyncIterator[str]:
        # 两个模型并发跑，各自把增量塞进一个队列，交错推给前端（标 side=a/b）
        queue: asyncio.Queue = asyncio.Queue()

        async def run(side: str, model_id: str):
            try:
                async for chunk, is_demo in _model_stream(model_id, msgs, req.max_tokens, prompt):
                    await queue.put({"type": "delta", "side": side, "text": chunk, "demo": is_demo})
            finally:
                await queue.put({"type": "side_done", "side": side})

        tasks = [
            asyncio.create_task(run("a", req.model_a)),
            asyncio.create_task(run("b", req.model_b)),
        ]
        done_sides = set()
        while len(done_sides) < 2:
            evt = await queue.get()
            if evt["type"] == "side_done":
                done_sides.add(evt["side"])
                continue
            yield _sse(evt)
        for t in tasks:
            await t
        # battle 揭晓双方真实身份（前端盲选投票后再展示）
        ma, mb = providers.get_model(req.model_a), providers.get_model(req.model_b)
        yield _sse({
            "type": "done",
            "reveal": {
                "a": {"id": req.model_a, "display": ma["display"] if ma else req.model_a},
                "b": {"id": req.model_b, "display": mb["display"] if mb else req.model_b},
            },
        })

    return StreamingResponse(gen(), media_type="text/event-stream")


# 关键词 -> 看重的能力 category（用于从榜单挑推荐）
_NEED_KEYWORDS = [
    (("代码", "编程", "code", "调试", "debug", "重构"), "debugging"),
    (("前端", "网页", "web", "ui"), "web-coding"),
    (("数学", "推理", "math", "计算"), "mathematics-coding"),
    (("物理", "工程", "仿真", "physics"), "physics-coding"),
    (("表格", "excel", "spreadsheet", "数据"), "spreadsheet"),
    (("金融", "财务", "税务", "合规", "finance"), "finance"),
]


@router.post("/api/advisor/recommend")
def advisor_recommend(req: AdvisorRequest) -> dict:
    """基于榜单数据给出选型推荐（规则版，不调模型，永远可用）。

    逻辑：从需求文本命中能力类别 -> 在该类别下按分排序，结合区域/开源/预算偏好筛选，
    取 Top 3，给出推荐理由。这是确定性、可复现、零成本的"小山顾问"基线。
    """
    lb = store.leaderboard()
    rows = lb.get("rows", [])
    need = req.need.lower()

    # 命中能力类别
    target_cat = None
    for keys, cat in _NEED_KEYWORDS:
        if any(k in need for k in keys):
            target_cat = cat
            break

    # 筛选
    def keep(r: dict) -> bool:
        if req.region and r.get("region") != req.region:
            return False
        if req.weights and (r.get("openness") or "closed") != req.weights:
            return False
        return True

    pool = [r for r in rows if keep(r)]

    def score_of(r: dict) -> float:
        if target_cat and target_cat in r.get("by_category", {}):
            return r["by_category"][target_cat]["avg_score"]
        return r["overall"]["avg_score"]

    # 预算敏感：综合分与成本的折中（分数 - 成本惩罚）
    def rank_key(r: dict) -> float:
        s = score_of(r)
        if req.budget_sensitive:
            cost = r["overall"].get("avg_cost_usd") or 0.0
            return s - min(0.25, cost * 0.3)
        return s

    pool.sort(key=rank_key, reverse=True)
    # 同一模型可能多脚手架命中，去重保留每模型最佳
    seen = set()
    picks = []
    for r in pool:
        if r["model_id"] in seen:
            continue
        seen.add(r["model_id"])
        picks.append(r)
        if len(picks) >= 3:
            break

    cat_label = None
    if target_cat:
        cat_label = lb.get("category_labels", {}).get(target_cat)

    return {
        "need": req.need,
        "matched_category": target_cat,
        "matched_category_label": cat_label,
        "is_seed": lb.get("is_seed", True),
        "recommendations": [
            {
                "rank": i + 1,
                "model_id": r["model_id"],
                "model_display": r["model_display"],
                "scaffold": r.get("scaffold"),
                "org": r.get("org"),
                "region": r.get("region"),
                "openness": r.get("openness", "closed"),
                "score": round(score_of(r), 4),
                "avg_cost_usd": r["overall"].get("avg_cost_usd"),
            }
            for i, r in enumerate(picks)
        ],
    }
