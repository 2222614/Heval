# 部署到 GitHub Pages

本项目前端可**纯静态导出**（无需后端、无需 API Key），通过 GitHub Pages 免费分享。
推一次代码，GitHub Actions 自动构建并发布，给别人一个网址即可访问。

## 工作原理

- 前端数据在**构建时内联**（`apps/web/scripts/sync-data.mjs` 把 `data/`、`results/seed/`
  的 JSON 复制进 `apps/web/src/generated/`），所以静态站点不依赖后端。
- 「选型顾问 / 对战」在静态版走**纯前端演示**（逐字示意文本）；榜单/分场景/用例库/
  模型详情都是**真实数据**。
- `.github/workflows/deploy-pages.yml` 在 push 到 `main` 时自动：装依赖 → 构建静态站点
  （自动按仓库名设置子路径）→ 发布到 Pages。

## 首次启用（仓库 Settings，只需一次）

1. 打开仓库 **Settings → Pages**
2. **Build and deployment → Source** 选 **GitHub Actions**
3. 完成。之后每次 push 到 `main` 都会自动重新部署。

## 访问网址

- 项目仓库（如 `用户名/hh-eval`）：`https://用户名.github.io/hh-eval/`
- 若仓库名为 `用户名.github.io`：`https://用户名.github.io/`

工作流会自动识别这两种情况并设置正确的子路径，你无需手改。

## 本地预览静态版（可选）

```bash
cd apps/web
NEXT_PUBLIC_BASE_PATH= npm run build   # 生成 apps/web/out/
cd out && python3 -m http.server 4321  # 浏览器开 http://127.0.0.1:4321
```

## 更新内容后重新发布

改了数据（`data/`、`results/seed/`）或代码后：

```bash
git add -A && git commit -m "update" && git push
```

push 后 1-2 分钟，GitHub Actions 自动重新构建发布。在仓库 **Actions** 标签页可看进度。

## 想接真实模型推理？

静态版是演示模式。若要真实流式输出，需在本地或服务器同时跑后端：

```bash
# 后端（需在 .env 配至少一个厂商 API Key）
PYTHONPATH=packages/harness:packages/backend uvicorn app.main:app --port 8000
# 前端指向后端
cd apps/web && NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

（注：当前 `apps/web/src/lib/playground.ts` 与 `api.ts` 已改为静态内联版；
接后端需切回 fetch 版本，见 git 历史 v1.x。）
