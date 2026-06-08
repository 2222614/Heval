// 数据访问层。静态导出（GitHub Pages）下没有后端：数据在构建时由
// scripts/sync-data.mjs 复制进 src/generated/，此处直接内联 import。
// 函数保持 async 签名不变，页面代码无需改动。
import type { Leaderboard, CategoryInfo, ModelEntry, DomainCatalog, Showcase } from "./types";

import leaderboardJson from "@/generated/leaderboard.json";
import modelsJson from "@/generated/models.json";
import manifestJson from "@/generated/manifest.json";
import domainsJson from "@/generated/domains.json";
import showcaseJson from "@/generated/showcase.json";

export async function getLeaderboard(): Promise<Leaderboard> {
  // 种子数据：标记 is_seed=true（与后端 store 行为一致）
  const lb = leaderboardJson as unknown as Leaderboard;
  return { ...lb, is_seed: true };
}

export async function getCategories(): Promise<CategoryInfo[]> {
  // 复刻后端 store.categories()：从 manifest 统计每类题数 + leaderboard 标签
  const lb = leaderboardJson as unknown as Leaderboard;
  const manifest = manifestJson as unknown as { tasks?: Array<{ category?: string }> };
  const labels = lb.category_labels || {};
  const counts: Record<string, number> = {};
  for (const tsk of manifest.tasks || []) {
    if (tsk.category) counts[tsk.category] = (counts[tsk.category] || 0) + 1;
  }
  return (lb.categories || []).map((cat) => ({
    id: cat,
    label: {
      en: labels[cat]?.en || cat,
      zh: labels[cat]?.zh || cat,
    },
    n_tasks: counts[cat] || 0,
  }));
}

export async function getModels(): Promise<ModelEntry[]> {
  const data = modelsJson as unknown as { models?: ModelEntry[] };
  return data.models || [];
}

export async function getDomains(): Promise<DomainCatalog> {
  return domainsJson as unknown as DomainCatalog;
}

export async function getShowcase(): Promise<Showcase> {
  return showcaseJson as unknown as Showcase;
}
