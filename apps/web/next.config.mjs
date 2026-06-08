/** @type {import('next').NextConfig} */

// 静态导出（GitHub Pages）。basePath 由环境变量注入：
// GitHub Actions 会用仓库名填充 NEXT_PUBLIC_BASE_PATH（如 "/hh-eval"）。
// 本地导出 / 用户站点（user.github.io 根仓库）留空即可。
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  output: "export", // 生成纯静态 out/，无需 Node 服务端
  reactStrictMode: true,
  basePath: basePath || undefined,
  // 静态导出下 next/image 优化不可用，关闭
  images: { unoptimized: true },
  // GitHub Pages 用目录式路由（/about/ 而非 /about），更稳
  trailingSlash: true,
};

export default nextConfig;
