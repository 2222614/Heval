// 分值 -> 视觉映射。颜色走 CSS 变量，故随主题（classic/alpha）自动切换。
// 分数均为 [0,1]。

// 综合分进度条：按分档取主题定义的三档渐变 CSS 变量。
export function scoreBarVar(score: number): string {
  if (score >= 0.7) return "var(--bar-hi)";
  if (score >= 0.5) return "var(--bar-mid)";
  return "var(--bar-lo)";
}

// 分场景热力格背景：用主题主色 RGB + 随分值变化的透明度。
export function heatBg(score: number): string {
  const alpha = 0.08 + 0.78 * Math.max(0, Math.min(1, score));
  return `rgba(var(--heat-rgb), ${alpha.toFixed(3)})`;
}

export function heatTextColor(score: number): string {
  return score >= 0.5 ? "#ffffff" : "var(--ink)";
}

export function pct(score: number): string {
  return (score * 100).toFixed(1);
}
