"""reward_detect 单元测试 —— 重点锁死"被注释的 reward.json 误判"回归。

该回归由对抗式交叉校验发现：test.sh 把 reward.json 写入块整段注释掉、
改用 reward.txt(binary)，朴素子串匹配会误判成 multi_metric。
"""
from pathlib import Path

import pytest

from hh_eval.discovery.reward_detect import (
    _strip_shell_comments,
    _writes_file,
    detect_reward_style,
)


def _write(tmp_path: Path, body: str) -> Path:
    p = tmp_path / "test.sh"
    p.write_text(body, encoding="utf-8")
    return p


def test_commented_reward_json_not_multi_metric(tmp_path):
    """注释掉的 reward.json + 真实 echo 到 reward.txt -> binary（核心回归）。"""
    sh = _write(
        tmp_path,
        """#!/bin/bash
# Write multi-metric reward as JSON
# cat > /logs/verifier/reward.json <<EOF
# { "accuracy": $ACCURACY }
# EOF
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "1" > /logs/verifier/reward.txt
else
    echo "0" > /logs/verifier/reward.txt
fi
# Note: Only reward.json is generated.
""",
    )
    r = detect_reward_style(sh)
    assert r["style"] == "binary"
    assert r["files"] == ["reward.txt"]
    assert "reward.json" not in r["files"]


def test_real_reward_json_is_multi_metric(tmp_path):
    """未注释的 reward.json 写入 -> multi_metric。"""
    sh = _write(
        tmp_path,
        """#!/bin/bash
cat > /logs/verifier/reward.json <<EOF
{ "accuracy": 1 }
EOF
""",
    )
    r = detect_reward_style(sh)
    assert r["style"] == "multi_metric"
    assert "reward.json" in r["files"]


def test_fractional_score_total(tmp_path):
    sh = _write(
        tmp_path,
        """#!/bin/bash
SCORE=0
TOTAL=5
REWARD=$(python3 -c "print(f'{$SCORE/$TOTAL:.2f}')")
echo "$REWARD" > /logs/verifier/reward.txt
""",
    )
    r = detect_reward_style(sh)
    assert r["style"] == "fractional"
    assert r["max_total"] == 5


def test_side_metrics_only_when_written(tmp_path):
    """ctrf.json 被 pytest --ctrf 真实写出 -> 计入；formula_stats.json 仅被读取 -> 不计入。"""
    sh = _write(
        tmp_path,
        """#!/bin/bash
pytest --ctrf /logs/verifier/ctrf.json /tests/test_outputs.py
if [ -f /logs/verifier/formula_stats.json ]; then
    FORMULA_RATIO=$(python3 -c "import json; print(0)")
fi
echo "1" > /logs/verifier/reward.txt
""",
    )
    r = detect_reward_style(sh)
    assert "ctrf.json" in r["side_metrics"]
    assert "formula_stats.json" not in r["side_metrics"]


def test_missing_test_sh_returns_unknown():
    r = detect_reward_style(None)
    assert r["style"] == "unknown"
    assert r["files"] == ["reward.txt"]


def test_strip_shell_comments():
    src = "echo hi  # trailing comment\n# full line\nrun --flag x"
    out = _strip_shell_comments(src)
    assert "trailing comment" not in out
    assert "full line" not in out
    assert "echo hi" in out
    assert "run --flag x" in out


def test_strip_preserves_param_expansion():
    """$# / ${#arr} 这类紧贴 # 不应被当成注释截断。"""
    src = 'len=${#array}\ncount=$#\n'
    out = _strip_shell_comments(src)
    assert "${#array}" in out
    assert "$#" in out


@pytest.mark.parametrize(
    "redirect",
    ["> /logs/x.json", ">> /logs/x.json", "tee /logs/x.json", "--out /logs/x.json"],
)
def test_writes_file_detects_redirects(redirect):
    assert _writes_file(f"cmd {redirect}", "x.json") is True


def test_writes_file_ignores_mere_mention():
    assert _writes_file("if [ -f x.json ]; then", "x.json") is False
