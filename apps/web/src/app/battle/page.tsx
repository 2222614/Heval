"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 对战已合并进 /playground（左上角切 Mode）。客户端跳转（兼容静态导出）。
export default function BattleRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/playground");
  }, [router]);
  return null;
}
