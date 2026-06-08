"use client";
import { DICT, t, type Lang } from "@/lib/i18n";

export function PageHeader({
  title,
  subtitle,
  lang,
}: {
  title: { zh: string; en: string };
  subtitle: { zh: string; en: string };
  lang: Lang;
}) {
  return (
    <div className="mx-auto mb-8 max-w-7xl px-6 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
        {t(title, lang)}
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--subtle)" }}>
        {t(subtitle, lang)}
      </p>
      <p className="mt-2 text-xs uppercase tracking-widest" style={{ color: "var(--subtle)", opacity: 0.7 }}>
        {t(DICT.footer, lang)}
      </p>
    </div>
  );
}
