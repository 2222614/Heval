// 模型详情页（下一级）：真实榜单数据骨架 + 预留简评总结。
import { getLeaderboard } from "@/lib/api";
import { ModelDetailView } from "@/components/ModelDetailView";

export const dynamic = "force-dynamic";

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getLeaderboard();
  return <ModelDetailView data={data} modelId={decodeURIComponent(id)} />;
}
