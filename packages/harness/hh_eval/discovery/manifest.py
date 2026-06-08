"""发现层主流程：遍历题目目录 -> 按 task_kind 分流 -> 组装符合 schema 的清单。

对外暴露：
  discover_tasks(tasks_root=None) -> list[dict]
  build_manifest(tasks_root=None, out_path=None, validate=True) -> dict

设计要点：
  * 任务种类 (task_kind) 由"探测器注册表"判定，而非写死。每个探测器是
    (probe, build) 一对：probe(dir) 命中则由 build(dir, root) 产出 manifest。
    现支持 agentic_coding（TB2/SWE Docker）；qa_generation 仅有 schema 与
    接口预留，探测器待真实数据格式定了再注册。
  * agentic_coding 的三种 task.toml 变体由 toml_variants 归一化；reward 由
    reward_detect 探测；canary/镜像/代理由 compliance_scan 标记。
  * 合规层对所有种类统一跑 PII/PHI 护栏扫描；脱敏状态对 coding 默认
    not_applicable，对 QA 默认 desensitized_reviewed（进仓即已人工审核）。
  * 组装结果用 task_manifest.schema.json 校验（validate=True 时）。
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Callable, Optional

from ..paths import manifest_path, schema_dir, tasks_dir
from .compliance_scan import scan_canary, scan_dockerfile
from .pii_scan import scan_pii_phi
from .reward_detect import detect_reward_style
from .toml_variants import NormalizedToml, normalize_toml

# 已知 domain 文件夹 -> 规范化 category（metadata 为空时的兜底）
_DOMAIN_CATEGORY = {
    "finance": "finance",
    "mathematics": "mathematics-coding",
    "mechanical_engineering": "physics-coding",
    "physics": "physics-coding",
}
_KNOWN_DOMAINS = set(_DOMAIN_CATEGORY.keys())

# 关键词 -> category（既无 metadata 也无 domain 时的最后兜底）
_KEYWORD_CATEGORY = [
    (re.compile(r"\b(excel|xlsx|spreadsheet|worksheet)\b", re.I), "spreadsheet"),
    (re.compile(r"\b(bug|fix|debug|race condition|patch)\b", re.I), "debugging"),
    (re.compile(r"\b(css|html|web|frontend|rubric)\b", re.I), "web-coding"),
]

# 上游 repo -> license（仅收录已确证的开源许可；其余 unknown）
_LICENSE_MAP = {
    "sharkdp/bat": "MIT/Apache-2.0",
    "lmax-exchange/disruptor": "Apache-2.0",
}

# 文件后缀/tag -> 语言
_TAG_LANGUAGE = {
    "rust": "rust", "java": "java", "python": "python",
    "fortran": "fortran", "javascript": "javascript", "typescript": "typescript",
}

# instruction.md 正文里的 repo 行，例如 "**Repo:** `LMAX-Exchange/disruptor`"
_REPO_IN_TEXT = re.compile(r"\*?\*?Repo:?\*?\*?\s*`?([\w.\-]+/[\w.\-]+)`?", re.IGNORECASE)


# ---------------------------------------------------------------------------
# 通用小工具
# ---------------------------------------------------------------------------
def _slugify_task_id(rel_path: str) -> str:
    return rel_path.replace("\\", "/").strip("/").replace("/", "__")


def _read_text(path: Optional[Path]) -> str:
    if path is None or not path.is_file():
        return ""
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def _read_h1(path: Optional[Path]) -> Optional[str]:
    """展示标题：优先具体的 Markdown H1，跳过 'Task'/'Description' 占位标题。"""
    text = _read_text(path)
    if not text:
        return None
    first_nonempty = None
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        m = re.match(r"#\s+(.*)", stripped)
        if m:
            title = m.group(1).strip()
            if title.lower() not in {"task", "tasks", "description"}:
                return title
        if first_nonempty is None:
            first_nonempty = stripped
    return first_nonempty


def _domain_folder_of(rel_parts: tuple[str, ...]) -> Optional[str]:
    if len(rel_parts) >= 2 and rel_parts[0].lower() in _KNOWN_DOMAINS:
        return rel_parts[0]
    return None


# ---------------------------------------------------------------------------
# agentic_coding 专属推断
# ---------------------------------------------------------------------------
def _infer_category(norm: NormalizedToml, domain_folder: Optional[str], instruction_text: str) -> str:
    if norm.category:
        return norm.category
    if domain_folder and domain_folder.lower() in _DOMAIN_CATEGORY:
        return _DOMAIN_CATEGORY[domain_folder.lower()]
    for pattern, cat in _KEYWORD_CATEGORY:
        if pattern.search(instruction_text):
            return cat
    return "uncoded"


def _infer_language(norm: NormalizedToml) -> Optional[str]:
    if norm.language:
        return norm.language
    for tag in norm.tags:
        lang = _TAG_LANGUAGE.get(tag.lower())
        if lang:
            return lang
    if norm.source_repo and "/bat" in norm.source_repo:
        return "rust"
    return None


def _resolve_license(repo: Optional[str]) -> Optional[str]:
    if repo and repo.lower() in _LICENSE_MAP:
        return _LICENSE_MAP[repo.lower()]
    return "unknown"


def _find_artifacts(task_root: Path) -> dict:
    """定位 agentic_coding 组件文件，返回相对 task_root 的路径（不存在则 None）。"""

    def rel(p: Path) -> str:
        return p.relative_to(task_root).as_posix()

    dockerfile = task_root / "environment" / "Dockerfile"
    instruction = task_root / "instruction.md"
    instruction_zh = task_root / "instruction-zh.md"
    test_sh = task_root / "tests" / "test.sh"

    oracle: Optional[Path] = None
    solution_dir = task_root / "solution"
    for name in ("solve.sh", "patch.diff"):
        cand = solution_dir / name
        if cand.is_file():
            oracle = cand
            break
    if oracle is None and solution_dir.is_dir():
        py_files = sorted(solution_dir.glob("*.py"))
        if py_files:
            oracle = py_files[0]

    return {
        "dockerfile": rel(dockerfile) if dockerfile.is_file() else None,
        "instruction": rel(instruction) if instruction.is_file() else None,
        "instruction_zh": rel(instruction_zh) if instruction_zh.is_file() else None,
        "test_sh": rel(test_sh) if test_sh.is_file() else None,
        "oracle": rel(oracle) if oracle is not None else None,
    }


# ---------------------------------------------------------------------------
# 探测器：判断一个目录属于哪种 task_kind
# ---------------------------------------------------------------------------
def _probe_agentic_coding(task_root: Path) -> bool:
    return (task_root / "task.toml").is_file()


def _build_agentic_coding(task_root: Path, tasks_root: Path) -> dict:
    rel_path = task_root.relative_to(tasks_root).as_posix()
    rel_parts = task_root.relative_to(tasks_root).parts

    norm = normalize_toml(task_root / "task.toml")
    artifacts = _find_artifacts(task_root)

    instruction_path = (task_root / artifacts["instruction"]) if artifacts["instruction"] else None
    instruction_text = _read_text(instruction_path)

    domain_folder = _domain_folder_of(rel_parts)
    display_name = _read_h1(instruction_path) or task_root.name

    test_sh_path = (task_root / artifacts["test_sh"]) if artifacts["test_sh"] else None
    dockerfile_path = (task_root / artifacts["dockerfile"]) if artifacts["dockerfile"] else None

    reward = detect_reward_style(test_sh_path)
    docker_compliance = scan_dockerfile(dockerfile_path)

    # repo：优先 task.toml.metadata.repo，否则从 instruction 正文兜底提取
    repo = norm.source_repo
    if not repo:
        m = _REPO_IN_TEXT.search(instruction_text)
        if m:
            repo = m.group(1)

    difficulty = norm.difficulty if norm.difficulty in {"easy", "medium", "hard"} else "unknown"
    # coding 任务只扫说明文：数据集 CSV / 代码不含个人数据，全扫会海量误报
    pii = scan_pii_phi(task_root, scope="instructions")

    return {
        "task_id": _slugify_task_id(rel_path),
        "display_name": display_name,
        "rel_path": rel_path,
        "domain_folder": domain_folder,
        "task_kind": "agentic_coding",
        "category": _infer_category(norm, domain_folder, instruction_text),
        "difficulty": difficulty,
        "language": _infer_language(norm),
        "tags": norm.tags,
        "source": {
            "benchmark": norm.source_benchmark,
            "task_id": norm.source_task_id,
            "repo": repo,
            "base_commit": norm.source_base_commit,
            "org": None,
            "author_email_redacted": bool(norm.author_email),
        },
        "agentic_coding": {
            "schema_variant": norm.variant,
            "timeouts": {
                "agent_sec": norm.agent_sec if norm.agent_sec is not None else 0.0,
                "verifier_sec": norm.verifier_sec if norm.verifier_sec is not None else 0.0,
                "build_sec": norm.build_sec if norm.build_sec is not None else 0.0,
                "environment_sec": norm.environment_sec,
            },
            "resources": {
                "cpus": norm.cpus if norm.cpus is not None else 1.0,
                "memory_mb": norm.memory_mb if norm.memory_mb is not None else 2048,
                "storage_mb": norm.storage_mb,
                "gpus": norm.gpus if norm.gpus is not None else 0,
                "allow_internet": norm.allow_internet if norm.allow_internet is not None else False,
            },
            "reward": {
                "style": reward["style"],
                "max_total": reward["max_total"],
                "files": reward["files"],
                "side_metrics": reward["side_metrics"],
            },
            "artifacts": artifacts,
        },
        "compliance": {
            "has_canary": scan_canary(task_root),
            "uses_private_base_image": docker_compliance["uses_private_base_image"],
            "hardcoded_proxy": docker_compliance["hardcoded_proxy"],
            "build_needs_network": docker_compliance["build_needs_network"],
            "license": _resolve_license(repo),
            # coding 任务无个人数据；脱敏维度不适用
            "redaction": {"status": "not_applicable", "reviewed_by": None, "reviewed_at": None},
            "pii_phi": pii,
        },
    }


# 探测器注册表：按顺序匹配，第一个命中的接管该目录。
# 未来注册 qa_generation 探测器时插入此处即可，无需改遍历逻辑。
TaskBuilder = Callable[[Path, Path], dict]
_REGISTRY: list[tuple[Callable[[Path], bool], TaskBuilder]] = [
    (_probe_agentic_coding, _build_agentic_coding),
]


def _build_one(task_root: Path, tasks_root: Path) -> Optional[dict]:
    for probe, build in _REGISTRY:
        if probe(task_root):
            return build(task_root, tasks_root)
    return None


# ---------------------------------------------------------------------------
# 遍历 + 组装
# ---------------------------------------------------------------------------
def _task_roots(root: Path) -> list[Path]:
    """所有"任务根目录"：当前仅由 agentic_coding 的 task.toml 锚定。

    未来 QA 探测器会引入新的锚文件（如 qa.yaml / *.qa.jsonl），在此合并去重。
    """
    roots = {p.parent for p in root.rglob("task.toml")}
    return sorted(roots)


def discover_tasks(tasks_root: Optional[Path] = None) -> list[dict]:
    root = Path(tasks_root).expanduser().resolve() if tasks_root else tasks_dir()
    if not root.is_dir():
        return []
    out: list[dict] = []
    for tr in _task_roots(root):
        m = _build_one(tr, root)
        if m is not None:
            out.append(m)
    return out


def _load_schema() -> dict:
    schema_file = schema_dir() / "task_manifest.schema.json"
    return json.loads(schema_file.read_text(encoding="utf-8"))


def _validate(manifests: list[dict]) -> None:
    import jsonschema

    schema = _load_schema()
    validator = jsonschema.Draft202012Validator(schema)
    for m in manifests:
        errors = sorted(validator.iter_errors(m), key=lambda e: list(e.path))
        if errors:
            err = errors[0]
            loc = "/".join(str(p) for p in err.path) or "(root)"
            raise ValueError(
                f"manifest 校验失败 task_id={m.get('task_id')!r} at {loc}: {err.message}"
            )


def build_manifest(
    tasks_root: Optional[Path] = None,
    out_path: Optional[Path] = None,
    validate: bool = True,
) -> dict:
    """生成清单并写盘，返回 {generated_count, tasks, out_path}。"""
    tasks = discover_tasks(tasks_root)
    if validate:
        _validate(tasks)

    out = Path(out_path) if out_path else manifest_path()
    out.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema": "task_manifest.schema.json",
        "task_count": len(tasks),
        "tasks": tasks,
    }
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return {"generated_count": len(tasks), "out_path": str(out), "tasks": tasks}
