// 极简中英双语字典。默认中文（目标用户以中文为主，见截图 XSCT/xbench）。
export type Lang = "zh" | "en";

export const DICT = {
  brand: { zh: "AlphaEval", en: "AlphaEval" },
  tagline: {
    zh: "面向智能体编程与专家域任务的 AI 模型评测平台",
    en: "AI model evaluation for agentic coding & expert-domain tasks",
  },
  nav: {
    overall: { zh: "综合榜", en: "Overall" },
    scenario: { zh: "分场景榜", en: "By Scenario" },
    advisor: { zh: "选型顾问", en: "Advisor" },
    battle: { zh: "对战", en: "Battle" },
    showcase: { zh: "用例展示", en: "Showcase" },
  },
  comingSoon: { zh: "即将上线", en: "Coming soon" },
  seedBanner: {
    zh: "当前展示为种子演示数据，真实评测结果产出后将自动替换。",
    en: "Showing seed demo data; replaced automatically once real runs land.",
  },
  overall: {
    title: { zh: "综合能力榜", en: "Overall Leaderboard" },
    subtitle: {
      zh: "基于真实任务套件的模型综合评分（脚手架 × 模型）。点击表头可排序。",
      en: "Composite scores over the real task suite (scaffold × model). Click headers to sort.",
    },
    rank: { zh: "排名", en: "Rank" },
    scaffold: { zh: "脚手架", en: "Scaffold" },
    model: { zh: "模型", en: "Model" },
    region: { zh: "区域", en: "Region" },
    score: { zh: "综合分", en: "Avg Score" },
    completed: { zh: "完成率", en: "Completed" },
    cost: { zh: "均价(USD)", en: "Avg Cost" },
    latency: { zh: "均延迟(s)", en: "Avg Latency" },
  },
  scenario: {
    title: { zh: "分场景能力榜", en: "Per-Scenario Leaderboard" },
    subtitle: {
      zh: "各任务类别下的专项评分。每列一个场景，颜色越深表示得分越高。点击下方能力进入二级视图。",
      en: "Specialized scores per task category. Click a capability below for the drill-down view.",
    },
    matrixTab: { zh: "总览矩阵", en: "Overview Matrix" },
    drilldownTab: { zh: "能力下钻", en: "Capability Drill-down" },
    generalAxis: { zh: "主流通用能力", en: "General Capabilities" },
    complexAxis: { zh: "复杂场景能力", en: "Complex Expert Domains" },
    bestPick: { zh: "效果最佳", en: "Best" },
    valuePick: { zh: "性价比", en: "Best Value" },
    taskList: { zh: "任务", en: "Tasks" },
    cases: { zh: "案例", en: "cases" },
    input: { zh: "输入", en: "Input" },
    output: { zh: "输出", en: "Output" },
    scoring: { zh: "判分", en: "Scoring" },
    closedSource: { zh: "闭源", en: "Closed" },
    contributedBy: { zh: "贡献", en: "By" },
    leaderboardOnTask: { zh: "本任务榜单", en: "Leaderboard on this task" },
    selectCapability: { zh: "选择一个能力查看任务与模型表现", en: "Select a capability to view its tasks and model performance" },
  },
  scoringMethod: {
    llm_rubric: { zh: "LLM 评分量表", en: "LLM Rubric" },
    llm_reference: { zh: "LLM 参考答案", en: "LLM Reference" },
    deterministic: { zh: "规则匹配", en: "Deterministic" },
    pairwise: { zh: "成对偏好", en: "Pairwise" },
    human: { zh: "人工", en: "Human" },
  },
  region: {
    foreign: { zh: "国外", en: "Foreign" },
    domestic: { zh: "国内", en: "Domestic" },
  },
  openness: {
    open: { zh: "开源", en: "Open" },
    closed: { zh: "闭源", en: "Closed" },
  },
  org: { zh: "机构", en: "Org" },
  filter: {
    all: { zh: "全部", en: "All" },
    region: { zh: "区域", en: "Region" },
    weights: { zh: "权重", en: "Weights" },
  },
  theme: {
    label: { zh: "切换白天 / 黑夜", en: "Toggle light / dark" },
  },
  scaffold: { zh: "脚手架", en: "Scaffold" },
  allScaffolds: { zh: "全部脚手架", en: "All scaffolds" },
  tasks: { zh: "题", en: "tasks" },
  noData: { zh: "暂无数据", en: "No data" },
  showing: { zh: "显示", en: "Showing" },
  of: { zh: "共", en: "of" },
  footer: {
    zh: "学术非营利用途 · 数据保留上游许可",
    en: "Academic, non-profit use · task data retains upstream licenses",
  },
} as const;

export function t(node: { zh: string; en: string }, lang: Lang): string {
  return node[lang];
}
