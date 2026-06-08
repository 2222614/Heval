// Part 2：分场景榜。能力下钻（领域→task→case）+ 总览矩阵两视图。
import { getLeaderboard, getCategories, getDomains } from "@/lib/api";
import { ScenarioView } from "@/components/LeaderboardView";

export default async function ScenarioPage() {
  const [data, categories, domains] = await Promise.all([
    getLeaderboard(),
    getCategories(),
    getDomains(),
  ]);
  return <ScenarioView data={data} categories={categories} domains={domains} />;
}
