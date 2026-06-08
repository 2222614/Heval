// 后端 API 客户端。服务端组件在构建/请求时调用，带优雅降级。
import type { Leaderboard, CategoryInfo, ModelEntry, DomainCatalog, Showcase } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

// 后端不可用时返回的空骨架，保证页面仍能渲染（显示"暂无数据"）。
const EMPTY_LEADERBOARD: Leaderboard = {
  schema_version: "1.0.0",
  generated_at: null,
  task_count: 0,
  categories: [],
  category_labels: {},
  rows: [],
  is_seed: true,
  empty: true,
};

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      // 榜单数据不频繁变动；开发期每次都拉最新。
      cache: "no-store",
    });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export function getLeaderboard(): Promise<Leaderboard> {
  return getJson<Leaderboard>("/api/leaderboard", EMPTY_LEADERBOARD);
}

export async function getCategories(): Promise<CategoryInfo[]> {
  const data = await getJson<{ categories: CategoryInfo[] }>("/api/categories", {
    categories: [],
  });
  return data.categories;
}

export async function getModels(): Promise<ModelEntry[]> {
  const data = await getJson<{ models: ModelEntry[] }>("/api/models", { models: [] });
  return data.models;
}

const EMPTY_DOMAINS: DomainCatalog = {
  schema_version: "1.0.0",
  generated_at: null,
  is_seed: true,
  axes: [],
};

export function getDomains(): Promise<DomainCatalog> {
  return getJson<DomainCatalog>("/api/domains", EMPTY_DOMAINS);
}

const EMPTY_SHOWCASE: Showcase = { schema_version: "1.0.0", generated_at: null, axes: [] };

export function getShowcase(): Promise<Showcase> {
  return getJson<Showcase>("/api/showcase", EMPTY_SHOWCASE);
}
