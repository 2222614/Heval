// 选型顾问 + Battle 合一页（Part 3 & 4）。静态导出：构建时内联模型列表。
import { getChatModels } from "@/lib/playground";
import { PlaygroundView } from "@/components/playground/PlaygroundView";

export default async function PlaygroundPage() {
  const models = await getChatModels();
  return <PlaygroundView models={models} />;
}
