"""FastAPI 只读 API。

端点（均 GET）：
  GET /api/health                 健康检查
  GET /api/leaderboard            综合榜 + 分场景榜数据（Part 1 & 2 共用）
  GET /api/categories             分场景榜列轴（id + 中英标签 + 题数）
  GET /api/models                 模型目录（供选型/展示）
  GET /api/tasks                  题目清单摘要（合规/种类/难度，敏感字段已剔除）

前端（Next.js）通过 NEXT_PUBLIC_API_BASE_URL 访问本服务。CORS 默认放开
localhost 开发端口；生产可用环境变量收紧。
"""
from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import store
from .playground import router as playground_router

app = FastAPI(
    title="HH Eval API",
    version="0.1.0",
    description="Read-only API over evaluation leaderboard data + chat/battle/advisor.",
)

# CORS：开发期放开本地前端；可用 HH_EVAL_CORS_ORIGINS 覆盖（逗号分隔）。
_origins_env = os.environ.get("HH_EVAL_CORS_ORIGINS", "")
_origins = [o.strip() for o in _origins_env.split(",") if o.strip()] or [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# 选型顾问 + Battle 路由
app.include_router(playground_router)


@app.get("/api/health")
def health() -> dict:
    lb = store.leaderboard()
    return {
        "status": "ok",
        "is_seed": lb.get("is_seed", True),
        "task_count": lb.get("task_count", 0),
        "n_rows": len(lb.get("rows", [])),
    }


@app.get("/api/leaderboard")
def get_leaderboard() -> dict:
    """Part 1（overall）+ Part 2（by_category）共用的主数据。"""
    return store.leaderboard()


@app.get("/api/categories")
def get_categories() -> dict:
    return {"categories": store.categories()}


@app.get("/api/models")
def get_models() -> dict:
    return store.models()


@app.get("/api/domains")
def get_domains() -> dict:
    """Part 2 二级：领域能力树（主流通用 + 高瓴复杂场景 → task → case）。"""
    return store.domains()


@app.get("/api/showcase")
def get_showcase() -> dict:
    """Part 5：用例库（通用公开经典题 + 专家域拟定题）。"""
    return store.showcase()


@app.get("/api/tasks")
def get_tasks() -> dict:
    """题目清单摘要：只暴露展示/合规需要的字段，剔除路径与内部细节。"""
    manifest = store.tasks_manifest()
    summary = []
    for t in manifest.get("tasks", []):
        comp = t.get("compliance", {})
        summary.append({
            "task_id": t.get("task_id"),
            "display_name": t.get("display_name"),
            "task_kind": t.get("task_kind"),
            "category": t.get("category"),
            "difficulty": t.get("difficulty"),
            "language": t.get("language"),
            "domain_folder": t.get("domain_folder"),
            "compliance": {
                "license": comp.get("license"),
                "has_canary": comp.get("has_canary"),
                "redaction_status": comp.get("redaction", {}).get("status"),
                "pii_clean": comp.get("pii_phi", {}).get("clean"),
            },
        })
    return {"task_count": manifest.get("task_count", len(summary)), "tasks": summary}
