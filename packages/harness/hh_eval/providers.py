"""统一的 LLM 客户端：从模型目录路由到对应 provider，流式产出文本增量。

设计：
  * 不依赖各家官方 SDK，统一用 httpx 直接打各 provider 的 REST/SSE 接口。
    三种 wire 协议覆盖全部目录模型：
      anthropic       —— Anthropic Messages API（SSE）
      openai_compat   —— OpenAI Chat Completions（含国内 DeepSeek/Qwen/Zhipu/Moonshot 等兼容端点）
      gemini          —— Google Generative Language streamGenerateContent
  * 密钥与 base_url 仅通过环境变量名引用（catalog.client.api_key_env / base_url_env），
    本模块只读 os.environ，绝不接收/记录明文密钥。
  * 未配置 key 时返回 available=False，由上层走"降级演示"——不在此处编造内容。

对外：
  list_models() -> list[dict]              目录中带可用性标记的模型
  get_model(model_id) -> dict | None
  is_available(model) -> bool              对应 api_key_env 是否已设置
  stream_chat(model_id, messages) -> AsyncIterator[str]   流式文本增量
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import AsyncIterator, Optional

import httpx

from .paths import model_catalog_path

_TIMEOUT = httpx.Timeout(connect=10.0, read=120.0, write=30.0, pool=10.0)


# ---------------------------------------------------------------------------
# 目录读取
# ---------------------------------------------------------------------------
def _load_catalog() -> list[dict]:
    path: Path = model_catalog_path()
    if not path.is_file():
        return []
    return json.loads(path.read_text(encoding="utf-8")).get("models", [])


def list_models() -> list[dict]:
    """返回目录模型，附 `available` 标记（对应 api_key_env 是否已设置）。"""
    out = []
    for m in _load_catalog():
        out.append({**m, "available": is_available(m)})
    return out


def get_model(model_id: str) -> Optional[dict]:
    for m in _load_catalog():
        if m["id"] == model_id:
            return m
    return None


def is_available(model: dict) -> bool:
    env = (model.get("client") or {}).get("api_key_env")
    return bool(env and os.environ.get(env))


def _resolve(model: dict) -> dict:
    """从 client 配置解析出实际请求参数（key / base_url / model_param）。"""
    client = model.get("client") or {}
    api_key = os.environ.get(client.get("api_key_env", ""), "")
    base_url = None
    if client.get("base_url_env"):
        base_url = os.environ.get(client["base_url_env"])
    if not base_url:
        base_url = client.get("base_url_default")
    model_param = client.get("model_param") or model.get("snapshot") or model["id"]
    return {"kind": client.get("kind"), "api_key": api_key, "base_url": base_url, "model_param": model_param}


# ---------------------------------------------------------------------------
# 流式：三种 wire 协议
# ---------------------------------------------------------------------------
async def _stream_anthropic(cfg: dict, messages: list[dict], max_tokens: int) -> AsyncIterator[str]:
    url = (cfg["base_url"] or "https://api.anthropic.com") + "/v1/messages"
    headers = {
        "x-api-key": cfg["api_key"],
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    # Anthropic 把 system 单列；这里简单合并到第一条 user 之前
    system = "\n".join(m["content"] for m in messages if m["role"] == "system")
    convo = [m for m in messages if m["role"] != "system"]
    payload = {
        "model": cfg["model_param"],
        "max_tokens": max_tokens,
        "stream": True,
        "messages": convo,
    }
    if system:
        payload["system"] = system

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if not data or data == "[DONE]":
                    continue
                try:
                    evt = json.loads(data)
                except json.JSONDecodeError:
                    continue
                if evt.get("type") == "content_block_delta":
                    delta = evt.get("delta", {})
                    if delta.get("type") == "text_delta":
                        yield delta.get("text", "")


async def _stream_openai(cfg: dict, messages: list[dict], max_tokens: int) -> AsyncIterator[str]:
    base = cfg["base_url"] or "https://api.openai.com/v1"
    url = base.rstrip("/") + "/chat/completions"
    headers = {
        "authorization": f"Bearer {cfg['api_key']}",
        "content-type": "application/json",
    }
    payload = {
        "model": cfg["model_param"],
        "messages": messages,
        "stream": True,
        "max_tokens": max_tokens,
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if not data or data == "[DONE]":
                    continue
                try:
                    evt = json.loads(data)
                except json.JSONDecodeError:
                    continue
                choices = evt.get("choices") or []
                if choices:
                    delta = choices[0].get("delta", {})
                    chunk = delta.get("content")
                    if chunk:
                        yield chunk


async def _stream_gemini(cfg: dict, messages: list[dict], max_tokens: int) -> AsyncIterator[str]:
    base = cfg["base_url"] or "https://generativelanguage.googleapis.com"
    url = f"{base}/v1beta/models/{cfg['model_param']}:streamGenerateContent?alt=sse&key={cfg['api_key']}"
    # Gemini contents：role user/model；system 用 systemInstruction
    system = "\n".join(m["content"] for m in messages if m["role"] == "system")
    contents = []
    for m in messages:
        if m["role"] == "system":
            continue
        role = "model" if m["role"] == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": m["content"]}]})
    payload: dict = {"contents": contents, "generationConfig": {"maxOutputTokens": max_tokens}}
    if system:
        payload["systemInstruction"] = {"parts": [{"text": system}]}

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        async with client.stream("POST", url, json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if not data:
                    continue
                try:
                    evt = json.loads(data)
                except json.JSONDecodeError:
                    continue
                for cand in evt.get("candidates", []):
                    for part in cand.get("content", {}).get("parts", []):
                        if "text" in part:
                            yield part["text"]


_STREAMERS = {
    "anthropic": _stream_anthropic,
    "openai_compat": _stream_openai,
    "gemini": _stream_gemini,
}


async def stream_chat(
    model_id: str, messages: list[dict], max_tokens: int = 2048
) -> AsyncIterator[str]:
    """流式产出某模型对一段对话的回复文本增量。

    抛出 LookupError（模型不存在）/ PermissionError（未配 key）/ httpx 异常（网络/上游）。
    上层据此决定降级或报错。
    """
    model = get_model(model_id)
    if model is None:
        raise LookupError(f"unknown model: {model_id}")
    if not is_available(model):
        raise PermissionError(f"no API key for {model_id}")

    cfg = _resolve(model)
    streamer = _STREAMERS.get(cfg["kind"])
    if streamer is None:
        raise LookupError(f"unsupported client kind: {cfg['kind']}")

    async for chunk in streamer(cfg, messages, max_tokens):
        yield chunk
