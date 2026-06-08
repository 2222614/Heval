"""toml_variants 单元测试 —— 三种变体识别 + 超时/内存归一化。"""
from pathlib import Path

import pytest

from hh_eval.discovery.toml_variants import (
    classify_variant,
    normalize_toml,
    parse_memory_to_mb,
)


def _write(tmp_path: Path, body: str) -> Path:
    p = tmp_path / "task.toml"
    p.write_text(body, encoding="utf-8")
    return p


def test_classify_tb2_standard():
    data = {"version": "1.0", "metadata": {}, "verifier": {}, "agent": {}, "environment": {}}
    assert classify_variant(data) == "tb2_standard"


def test_classify_tb2_task_wrapped():
    data = {"task": {"version": "1.0"}, "agent": {}, "environment": {}, "verifier": {}}
    assert classify_variant(data) == "tb2_task_wrapped"


def test_classify_project_eval():
    data = {"project": {"name": "x"}, "container": {}, "evaluation": {}}
    assert classify_variant(data) == "project_eval"


@pytest.mark.parametrize(
    "value,expected",
    [(256, 256), ("192m", 192), ("2g", 2048), ("512k", 0), (None, None), ("4096", 4096)],
)
def test_parse_memory_to_mb(value, expected):
    # 512k -> 0.5MB -> round(0.5)=0 但 max(1,...) 兜底，实际取 max(1, round)
    result = parse_memory_to_mb(value)
    if value == "512k":
        assert result == 1  # max(1, round(0.5)) = max(1,0) = 1
    else:
        assert result == expected


def test_tb2_task_wrapped_agent_timeout_is_min(tmp_path):
    """tb2_task_wrapped：agent_sec 取 [agent] 与 [environment] 较小值。"""
    p = _write(
        tmp_path,
        """[task]
version = "1.0"
[agent]
timeout_sec = 1200
[environment]
timeout_sec = 900
build_timeout_sec = 600
cpus = 1
memory_mb = 4096
[verifier]
timeout_sec = 300
[metadata]
difficulty = "hard"
""",
    )
    n = normalize_toml(p)
    assert n.variant == "tb2_task_wrapped"
    assert n.agent_sec == 900.0  # min(1200, 900)
    assert n.environment_sec == 900.0
    assert n.verifier_sec == 300.0
    assert n.build_sec == 600.0
    assert n.memory_mb == 4096
    assert n.difficulty == "hard"


def test_project_eval_memory_suffix_and_timeout(tmp_path):
    """project_eval：'192m' -> 192；evaluation.timeout 同时给 agent/verifier。"""
    p = _write(
        tmp_path,
        """[project]
name = "ledger_recovery"
[container]
memory_limit = "192m"
[evaluation]
timeout = 180
mode = "subprocess"
""",
    )
    n = normalize_toml(p)
    assert n.variant == "project_eval"
    assert n.memory_mb == 192
    assert n.agent_sec == 180.0
    assert n.verifier_sec == 180.0


def test_tb2_standard_metadata_extraction(tmp_path):
    p = _write(
        tmp_path,
        """version = "1.0"
[metadata]
difficulty = "medium"
category = "debugging"
tags = ["rust", "ansi"]
repo = "sharkdp/bat"
language = "rust"
[verifier]
timeout_sec = 1000.0
[agent]
timeout_sec = 4800.0
[environment]
build_timeout_sec = 1200.0
cpus = 1
memory_mb = 10240
allow_internet = true
""",
    )
    n = normalize_toml(p)
    assert n.variant == "tb2_standard"
    assert n.category == "debugging"
    assert n.language == "rust"
    assert n.source_repo == "sharkdp/bat"
    assert n.allow_internet is True
    assert n.agent_sec == 4800.0


def test_corrupt_toml_returns_empty_shell(tmp_path):
    p = _write(tmp_path, "this is not valid toml [[[")
    n = normalize_toml(p)
    # 不抛异常，返回空壳
    assert n.agent_sec is None
    assert n.category is None
