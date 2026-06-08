"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 选型顾问已合并进 /playground（左上角切 Mode）。客户端跳转（兼容静态导出）。
export default function AdvisorRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/playground");
  }, [router]);
  return null;
}
