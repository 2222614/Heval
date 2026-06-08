// 双主题定义。classic = 旧版（HH Eval / 靛紫，保留供对比）；
// alpha = AlphaEval（高瓴 Hillhouse 风格：深藏蓝主色 + 暖金点缀，沉稳专业）。
// 通过 <html data-theme="..."> 切换，所有颜色走 CSS 变量。

export type ThemeKey = "classic" | "alpha";

export interface ThemeMeta {
  key: ThemeKey;
  brandZh: string;
  brandEn: string;
  // 导航 logo 方块的两端渐变色
  logoFrom: string;
  logoTo: string;
}

export const THEMES: Record<ThemeKey, ThemeMeta> = {
  classic: {
    key: "classic",
    brandZh: "AlphaEval",
    brandEn: "AlphaEval",
    logoFrom: "#6366f1",
    logoTo: "#7c3aed",
  },
  alpha: {
    key: "alpha",
    brandZh: "AlphaEval",
    brandEn: "AlphaEval",
    logoFrom: "#9e1b22",
    logoTo: "#c0282f",
  },
};

export const DEFAULT_THEME: ThemeKey = "alpha";
