// 选型顾问 + Battle 合一页（Part 3 & 4）。服务端拉取可对话模型列表。
import { getChatModels } from "@/lib/playground";
import { PlaygroundView } from "@/components/playground/PlaygroundView";

export const dynamic = "force-dynamic";

export default async function PlaygroundPage() {
  const models = await getChatModels();
  return <PlaygroundView models={models} />;
}
