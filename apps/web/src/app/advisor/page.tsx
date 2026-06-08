import { redirect } from "next/navigation";

// 选型顾问已合并进 /playground（左上角切 Mode）。
export default function AdvisorRedirect() {
  redirect("/playground");
}
