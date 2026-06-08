// Part 1：综合榜（首页）。服务端拉取 leaderboard。
import { getLeaderboard } from "@/lib/api";
import { OverallView } from "@/components/LeaderboardView";

export default async function HomePage() {
  const data = await getLeaderboard();
  return <OverallView data={data} />;
}
