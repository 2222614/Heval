"""task.toml 的变体识别与归一化。

真实数据里有 3 种互不兼容的结构：

  tb2_standard       顶层 version + [metadata]/[verifier]/[agent]/[environment]
                     超时在 [agent].timeout_sec / [verifier].timeout_sec
  tb2_task_wrapped   [task] 包装版；同时存在 [agent].timeout_sec 和
                     [environment].timeout_sec（两者可能不同）
  project_eval       完全离群：[project] / [container].memory_limit="192m" /
                     [evaluation].timeout=180,mode="subprocess"，没有任何标准键

本模块只负责"读 toml -> 归一化的中间字典"，不碰文件系统的其它部分。
所有数值都做类型强制（超时 -> float，资源 -> int）。
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Optional

try:  # Python 3.11+
    import tomllib as _toml

    def _load_toml(path: Path) -> dict:
        with path.open("rb") as f:
            return _toml.load(f)
except ModuleNotFoundError:  # Python <= 3.10
    import tomli as _toml  # type: ignore

    def _load_toml(path: Path) -> dict:
        with path.open("rb") as f:
            return _toml.load(f)


# ---------------------------------------------------------------------------
# 类型强制小工具
# ---------------------------------------------------------------------------
def _as_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _as_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


_MEM_SUFFIX = re.compile(r"^\s*(\d+(?:\.\d+)?)\s*([kKmMgG]?)[bB]?\s*$")


def parse_memory_to_mb(value: Any) -> Optional[int]:
    """把内存配置统一成 MB 整数。

    接受 int（已是 MB）或带后缀的字符串（"192m"/"2g"/"512k"）。
    project_eval 用的是 "192m" 这种字符串。
    """
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    if not isinstance(value, str):
        return None
    m = _MEM_SUFFIX.match(value)
    if not m:
        return None
    num = float(m.group(1))
    unit = m.group(2).lower()
    factor = {"": 1, "k": 1 / 1024, "m": 1, "g": 1024}.get(unit, 1)
    return max(1, int(round(num * factor)))


# ---------------------------------------------------------------------------
# 变体识别
# ---------------------------------------------------------------------------
def classify_variant(data: dict) -> str:
    """根据 toml 的顶层键判定变体。"""
    if "project" in data or "evaluation" in data or "container" in data:
        # project_eval 没有任何标准 [verifier]/[environment] 区段
        if "verifier" not in data and "agent" not in data:
            return "project_eval"
    if "task" in data and isinstance(data.get("task"), dict):
        return "tb2_task_wrapped"
    return "tb2_standard"


# ---------------------------------------------------------------------------
# 归一化
# ---------------------------------------------------------------------------
class NormalizedToml:
    """从任意变体归一化出来的统一视图。

    字段全部 Optional —— 空 [metadata]、缺失区段都不会抛异常。
    timeouts/resources 已做类型强制。
    """

    def __init__(self, variant: str) -> None:
        self.variant = variant
        # metadata
        self.difficulty: Optional[str] = None
        self.category: Optional[str] = None
        self.language: Optional[str] = None
        self.tags: list[str] = []
        self.source_benchmark: Optional[str] = None
        self.source_task_id: Optional[str] = None
        self.source_repo: Optional[str] = None
        self.source_base_commit: Optional[str] = None
        self.author_email: Optional[str] = None
        # timeouts (秒)
        self.agent_sec: Optional[float] = None
        self.verifier_sec: Optional[float] = None
        self.build_sec: Optional[float] = None
        self.environment_sec: Optional[float] = None
        # resources
        self.cpus: Optional[float] = None
        self.memory_mb: Optional[int] = None
        self.storage_mb: Optional[int] = None
        self.gpus: Optional[int] = None
        self.allow_internet: Optional[bool] = None

    def as_dict(self) -> dict:
        return self.__dict__.copy()


def normalize_toml(path: Path) -> NormalizedToml:
    """读取一个 task.toml 并归一化。读取失败时返回一个空壳 + variant=unknown。"""
    try:
        data = _load_toml(path)
    except Exception:
        n = NormalizedToml("tb2_standard")  # 兜底当作标准变体（全空）
        return n

    variant = classify_variant(data)
    n = NormalizedToml(variant)

    if variant == "project_eval":
        _fill_project_eval(n, data)
    else:
        _fill_tb2(n, data)
    return n


def _fill_metadata(n: NormalizedToml, meta: dict) -> None:
    if not isinstance(meta, dict):
        return
    n.difficulty = meta.get("difficulty") or None
    n.category = meta.get("category") or None
    n.language = meta.get("language") or None
    tags = meta.get("tags")
    if isinstance(tags, list):
        n.tags = [str(t) for t in tags]
    n.source_benchmark = meta.get("source") or None
    n.source_task_id = meta.get("task_id") or None
    n.source_repo = meta.get("repo") or None
    n.source_base_commit = meta.get("base_commit") or None
    # 作者邮箱可能在不同键里
    for key in ("author_email", "author", "contact", "email"):
        val = meta.get(key)
        if isinstance(val, str) and "@" in val:
            n.author_email = val
            break


def _fill_tb2(n: NormalizedToml, data: dict) -> None:
    """tb2_standard 与 tb2_task_wrapped 共用：区段位置一致，仅 version 包装不同。"""
    meta = data.get("metadata", {})
    _fill_metadata(n, meta)

    agent = data.get("agent", {}) if isinstance(data.get("agent"), dict) else {}
    verifier = data.get("verifier", {}) if isinstance(data.get("verifier"), dict) else {}
    env = data.get("environment", {}) if isinstance(data.get("environment"), dict) else {}

    agent_to = _as_float(agent.get("timeout_sec"))
    env_to = _as_float(env.get("timeout_sec"))  # tb2_task_wrapped 会有这个
    n.environment_sec = env_to
    # agent 的硬上限：两者都存在时取较小值（容器墙钟 vs 智能体预算）
    if agent_to is not None and env_to is not None:
        n.agent_sec = min(agent_to, env_to)
    else:
        n.agent_sec = agent_to if agent_to is not None else env_to

    n.verifier_sec = _as_float(verifier.get("timeout_sec"))
    n.build_sec = _as_float(env.get("build_timeout_sec"))

    n.cpus = _as_float(env.get("cpus"))
    n.memory_mb = parse_memory_to_mb(env.get("memory_mb"))
    n.storage_mb = parse_memory_to_mb(env.get("storage_mb"))
    n.gpus = _as_int(env.get("gpus"))
    ai = env.get("allow_internet")
    n.allow_internet = bool(ai) if ai is not None else None


def _fill_project_eval(n: NormalizedToml, data: dict) -> None:
    """离群结构：[project]/[container]/[evaluation]。"""
    project = data.get("project", {}) if isinstance(data.get("project"), dict) else {}
    container = data.get("container", {}) if isinstance(data.get("container"), dict) else {}
    evaluation = data.get("evaluation", {}) if isinstance(data.get("evaluation"), dict) else {}

    # 没有独立的 metadata；尽量从 project 里捞描述性信息
    n.source_task_id = project.get("name") or None

    # evaluation.timeout 同时充当 agent 和 verifier 的预算（没有更细的划分）
    eval_to = _as_float(evaluation.get("timeout"))
    n.agent_sec = eval_to
    n.verifier_sec = eval_to

    n.memory_mb = parse_memory_to_mb(container.get("memory_limit"))
    # 这种变体不声明 cpu/gpu/网络，留空由上层填默认
