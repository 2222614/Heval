// 双模式主题：light（白天）/ dark（黑夜），统一红色系。
// 通过 <html data-theme="light|dark"> 切换，所有颜色走 CSS 变量。
// 品牌固定为 HEval。

export type ThemeKey = "light" | "dark";

export const BRAND = "HEval";

export const DEFAULT_THEME: ThemeKey = "light";
