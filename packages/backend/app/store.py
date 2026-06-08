"""数据访问层：加载 leaderboard / 模型目录 / 题目清单，按 mtime 缓存。

数据优先级：results/aggregated/leaderboard.json（真实评测产出）若存在则优先，
否则回落到 results/seed/leaderboard.seed.json（种子/demo 数据）。前端可据
`is_seed` 字段提示用户当前看的是种子还是真实数据。

只读：本层不写任何文件。所有路径来自 harness 的 paths 模块，保持单一事实源。
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

# 复用 harness 的路径解析，避免后端与引擎对"数据在哪"产生分歧。
from hh_eval.paths import (
    aggregated_leaderboard_path,
    domains_path,
    manifest_path,
    model_catalog_path,
    seed_leaderboard_path,
)


class _CachedJson:
    """按文件 mtime 缓存 JSON，文件更新后自动失效重载。"""

    def __init__(self) -> None:
        self._cache: dict[Path, tuple[float, Any]] = {}

    def load(self, path: Path) -> Optional[Any]:
        if not path.is_file():
            return None
        mtime = path.stat().st_mtime
        cached = self._cache.get(path)
        if cached and cached[0] == mtime:
            return cached[1]
        data = json.loads(path.read_text(encoding="utf-8"))
        self._cache[path] = (mtime, data)
        return data


_store = _CachedJson()


def leaderboard() -> dict:
    """返回 leaderboard 文档，附带 `is_seed` 标记数据来源。"""
    aggregated = _store.load(aggregated_leaderboard_path())
    if aggregated is not None:
        aggregated = dict(aggregated)
        aggregated["is_seed"] = False
        return aggregated

    seed = _store.load(seed_leaderboard_path())
    if seed is not None:
        seed = dict(seed)
        seed["is_seed"] = True
        return seed

    # 两者都缺：返回空骨架，让前端优雅降级而非 500。
    return {
        "schema_version": "1.0.0",
        "generated_at": None,
        "task_count": 0,
        "categories": [],
        "category_labels": {},
        "rows": [],
        "is_seed": True,
        "empty": True,
    }


def models() -> dict:
    data = _store.load(model_catalog_path())
    if data is None:
        return {"schema_version": "1.0.0", "models": []}
    return data


def tasks_manifest() -> dict:
    data = _store.load(manifest_path())
    if data is None:
        return {"task_count": 0, "tasks": []}
    return data


def domains() -> dict:
    """第二部分二级页面的领域能力树（general + complex 两轴）。"""
    data = _store.load(domains_path())
    if data is None:
        return {"schema_version": "1.0.0", "is_seed": True, "axes": []}
    return data


def categories() -> list[dict]:
    """分场景榜的列轴：category id + 中英标签 + 题数。"""
    lb = leaderboard()
    labels = lb.get("category_labels", {})
    # 题数从 manifest 统计（更准），缺失时回落到任一行的 by_category.n
    manifest = tasks_manifest()
    counts: dict[str, int] = {}
    for t in manifest.get("tasks", []):
        c = t.get("category")
        if c:
            counts[c] = counts.get(c, 0) + 1

    out = []
    for cat in lb.get("categories", []):
        out.append({
            "id": cat,
            "label": labels.get(cat, {"en": cat, "zh": cat}),
            "n_tasks": counts.get(cat, 0),
        })
    return out
