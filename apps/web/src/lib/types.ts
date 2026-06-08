// 前端用到的数据类型，对齐 packages/schema 的 leaderboard / models 契约。
// 仅声明前端实际消费的字段，避免与后端 schema 全量耦合。

export interface CategoryScore {
  avg_score: number;
  n: number;
  n_completed?: number;
}

export interface LeaderboardRow {
  scaffold: string;
  scaffold_version?: string;
  model_id: string;
  model_display: string;
  provider: string;
  org?: string | null;
  region: "foreign" | "domestic";
  openness?: "open" | "closed";
  overall: {
    avg_score: number;
    n_tasks: number;
    n_completed?: number;
    stderr?: number | null;
    avg_cost_usd?: number | null;
    avg_latency_sec?: number | null;
  };
  by_category: Record<string, CategoryScore>;
  totals?: {
    input_tokens?: number;
    output_tokens?: number;
    cost_usd?: number | null;
  } | null;
}

export interface ScaffoldInfo {
  name: string;
  label: { zh?: string; en?: string };
  blurb?: string | null;
}

export interface OracleReference {
  label: { zh?: string; en?: string };
  overall: number;
  by_category: Record<string, number>;
}

export interface Leaderboard {
  schema_version: string;
  generated_at: string | null;
  task_count: number;
  categories: string[];
  category_labels: Record<string, { en?: string; zh?: string }>;
  scaffolds?: ScaffoldInfo[];
  oracle_reference?: OracleReference | null;
  rows: LeaderboardRow[];
  is_seed: boolean;
  empty?: boolean;
}

export interface CategoryInfo {
  id: string;
  label: { en: string; zh: string };
  n_tasks: number;
}

// ── 第二部分二级页面：领域能力树 ──
export interface BiLabel {
  zh: string;
  en: string;
}

export interface TaskLeader {
  model_id: string;
  model_display: string;
  org?: string | null;
  score: number;
  avg_cost_usd?: number | null;
  scaffold?: string | null;
}

export interface CaseRef {
  id: string;
  label: BiLabel;
  difficulty?: "easy" | "medium" | "hard" | "unknown";
  is_sample_public?: boolean;
}

export interface DomainTask {
  id: string;
  label: BiLabel;
  task_kind: "agentic_coding" | "qa_generation";
  scoring_method?: string | null;
  input_summary?: BiLabel | null;
  output_summary?: BiLabel | null;
  n_cases?: number;
  is_closed_source?: boolean;
  leaders: TaskLeader[];
  cases: CaseRef[];
}

export interface Domain {
  id: string;
  label: BiLabel;
  icon?: string | null;
  blurb?: BiLabel | null;
  contributor_org?: string | null;
  tasks: DomainTask[];
}

export interface Axis {
  id: string;
  label: BiLabel;
  kind: "general" | "complex";
  domains: Domain[];
}

export interface DomainCatalog {
  schema_version: string;
  generated_at?: string | null;
  is_seed: boolean;
  axes: Axis[];
}

// ── 第五部分：用例库 ──
export interface ShowcaseCase {
  id: string;
  title: BiLabel;
  difficulty?: "easy" | "medium" | "hard" | "unknown";
  source_type: "public_benchmark" | "fabricated" | "closed_preview";
  source_name?: string | null;
  source_url?: string | null;
  prompt: BiLabel;
  probes: BiLabel[];
  answer_key_points: BiLabel[];
}

export interface ShowcaseCategory {
  id: string;
  label: BiLabel;
  icon?: string | null;
  cases: ShowcaseCase[];
}

export interface ShowcaseAxis {
  id: string;
  label: BiLabel;
  kind: "general" | "expert";
  categories: ShowcaseCategory[];
}

export interface Showcase {
  schema_version: string;
  generated_at?: string | null;
  axes: ShowcaseAxis[];
}

export interface ModelEntry {
  id: string;
  display: string;
  provider: string;
  org?: string | null;
  region: "foreign" | "domestic";
  openness?: "open" | "closed";
  context_window?: number | null;
  pricing?: {
    input_per_mtok?: number;
    output_per_mtok?: number;
  } | null;
  notes?: string | null;
}
