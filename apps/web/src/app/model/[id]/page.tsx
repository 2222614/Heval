// 模型详情页（下一级）：真实榜单数据骨架 + 预留简评总结。
// 静态导出：用 generateStaticParams 预生成所有模型页。
import { getLeaderboard } from "@/lib/api";
import { ModelDetailView } from "@/components/ModelDetailView";

// 预生成所有出现在榜单里的模型详情页
export async function generateStaticParams() {
  const data = await getLeaderboard();
  const ids = Array.from(new Set(data.rows.map((r) => r.model_id)));
  return ids.map((id) => ({ id }));
}

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getLeaderboard();
  return <ModelDetailView data={data} modelId={decodeURIComponent(id)} />;
}
