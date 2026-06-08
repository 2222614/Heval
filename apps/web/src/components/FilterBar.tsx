"use client";
// 区域 / 开源 筛选条。受控组件，父级持有筛选状态。
import { DICT, t, type Lang } from "@/lib/i18n";

export type RegionFilter = "all" | "foreign" | "domestic";
export type WeightsFilter = "all" | "closed" | "open";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
      style={
        active
          ? { background: "var(--accent)", color: "#fff" }
          : { background: "var(--surface)", color: "var(--subtle)", border: "1px solid var(--border)" }
      }
    >
      {children}
    </button>
  );
}

export function FilterBar({
  lang,
  region,
  setRegion,
  weights,
  setWeights,
  shown,
  total,
}: {
  lang: Lang;
  region: RegionFilter;
  setRegion: (r: RegionFilter) => void;
  weights: WeightsFilter;
  setWeights: (w: WeightsFilter) => void;
  shown: number;
  total: number;
}) {
  return (
    <div className="mx-auto mb-4 flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-6">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold" style={{ color: "var(--subtle)" }}>
          {t(DICT.filter.region, lang)}
        </span>
        <Chip active={region === "all"} onClick={() => setRegion("all")}>
          {t(DICT.filter.all, lang)}
        </Chip>
        <Chip active={region === "domestic"} onClick={() => setRegion("domestic")}>
          {t(DICT.region.domestic, lang)}
        </Chip>
        <Chip active={region === "foreign"} onClick={() => setRegion("foreign")}>
          {t(DICT.region.foreign, lang)}
        </Chip>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold" style={{ color: "var(--subtle)" }}>
          {t(DICT.filter.weights, lang)}
        </span>
        <Chip active={weights === "all"} onClick={() => setWeights("all")}>
          {t(DICT.filter.all, lang)}
        </Chip>
        <Chip active={weights === "closed"} onClick={() => setWeights("closed")}>
          {t(DICT.openness.closed, lang)}
        </Chip>
        <Chip active={weights === "open"} onClick={() => setWeights("open")}>
          {t(DICT.openness.open, lang)}
        </Chip>
      </div>

      <span className="ml-auto text-xs" style={{ color: "var(--subtle)" }}>
        {t(DICT.showing, lang)} {shown} / {t(DICT.of, lang)} {total}
      </span>
    </div>
  );
}
