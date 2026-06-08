import { redirect } from "next/navigation";

// 对战已合并进 /playground（左上角切 Mode）。
export default function BattleRedirect() {
  redirect("/playground");
}
