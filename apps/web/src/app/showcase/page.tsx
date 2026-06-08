// 第五部分：用例库。服务端拉取 showcase 数据。
import { getShowcase } from "@/lib/api";
import { ShowcaseView } from "@/components/ShowcaseView";

export const dynamic = "force-dynamic";

export default async function ShowcasePage() {
  const data = await getShowcase();
  return <ShowcaseView data={data} />;
}
