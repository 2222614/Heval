"""PII/PHI 残留扫描护栏。

进仓的题目都已人工脱敏审核；本模块是兜底护栏，用于在发现阶段
标记"本该被脱敏却残留"的个人/医疗/金融敏感信息。

关键安全约束：只报告**发现的类型与计数**，绝不记录匹配到的原值
（否则护栏本身就成了泄露面）。结果写入 manifest.compliance.pii_phi。

启发式正则面向"中国大陆 + 跨境"场景（手机号、身份证、护照、银行卡、
邮箱、MRN 病历号）。宁可少报误报，也通过 finding_types 让审核者复核。
"""
from __future__ import annotations

import re
from pathlib import Path

# 不扫描的二进制/大文件后缀
_SKIP_SUFFIXES = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg",
    ".xlsx", ".xls", ".pdf", ".so", ".pyc", ".zip", ".tar", ".gz",
    ".woff", ".woff2", ".ttf", ".ico", ".mp3", ".mp4", ".wav",
}
_MAX_FILE_BYTES = 2_000_000

# 每类一条正则。命名分组的 key 即 finding_type。
# 注意：这些模式只用于"是否存在"判定，匹配值绝不外泄。
_PATTERNS: dict[str, re.Pattern] = {
    # 中国大陆手机号：1 开头 11 位（避免与长数字串误撞，前后加边界）
    "phone": re.compile(r"(?<!\d)1[3-9]\d{9}(?!\d)"),
    # 身份证：18 位（17 位数字 + 校验位 0-9/X）
    "id_number": re.compile(r"(?<!\d)\d{17}[\dXx](?!\d)"),
    # 邮箱
    "email": re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}"),
    # 银行卡 / 信用卡：13-19 位连续数字（用边界限制）
    "credit_card": re.compile(r"(?<!\d)\d{13,19}(?!\d)"),
    # 护照：1 字母 + 7-8 位数字（中国普通护照 E/G 开头等）
    "passport": re.compile(r"(?<![A-Za-z0-9])[A-Za-z]\d{7,8}(?![A-Za-z0-9])"),
    # 病历号 MRN：常见 "MRN" / "病历号" / "住院号" 后跟数字
    "mrn": re.compile(r"(?:MRN|病案号|病历号|住院号|门诊号)\s*[:：#]?\s*\d{4,}", re.IGNORECASE),
}

# 这些"看起来像长数字"的类别容易误报，列出来供调用方了解（不改变行为）。
_HIGH_FALSE_POSITIVE = {"credit_card", "passport"}


# 人类可读的说明/文档文件名模式（scope="instructions" 时只扫这些）。
# coding 任务的数据集 CSV、代码、HTML 不含个人数据，全扫会产生海量误报
# （科研长数字被当成银行卡、装饰符 @ 被当成邮箱），故默认只扫说明文。
_INSTRUCTION_NAMES = re.compile(
    r"(instruction.*\.md|readme.*|prompt.*|case.*\.(md|txt)|.*-zh\.md)$",
    re.IGNORECASE,
)


def _iter_text_files(task_root: Path, scope: str):
    for path in task_root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() in _SKIP_SUFFIXES:
            continue
        if scope == "instructions" and not _INSTRUCTION_NAMES.search(path.name):
            continue
        try:
            if path.stat().st_size > _MAX_FILE_BYTES:
                continue
        except OSError:
            continue
        yield path


def scan_pii_phi(task_root: Path, scope: str = "full") -> dict:
    """扫描题目目录下的文本文件，返回 compliance.pii_phi 结构。

    scope:
      "instructions"  只扫人类可读的说明/README/prompt（agentic_coding 用，
                      避免数据集/代码里的长数字、装饰符触发海量误报）。
      "full"          全扫所有文本文件（qa_generation 用，真实个人数据可能
                      残留在任意输入文件里）。

    返回:
      {scanned: bool, clean: bool, finding_types: [str], finding_count: int}
    """
    finding_types: set[str] = set()
    finding_count = 0
    scanned_any = False

    for path in _iter_text_files(task_root, scope):
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        scanned_any = True
        for ftype, pattern in _PATTERNS.items():
            matches = pattern.findall(text)
            if matches:
                finding_types.add(ftype)
                finding_count += len(matches)

    return {
        "scanned": scanned_any,
        "clean": finding_count == 0,
        "finding_types": sorted(finding_types),
        "finding_count": finding_count,
    }
