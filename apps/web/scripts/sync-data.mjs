// 构建前把仓库数据 JSON 复制进 src/generated/，供前端静态内联 import。
// 静态导出（GitHub Pages）下没有后端，数据必须在构建时内联。
import { mkdirSync, copyFileSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..");
const repoRoot = join(webRoot, "..", "..");
const outDir = join(webRoot, "src", "generated");

mkdirSync(outDir, { recursive: true });

// 源文件 -> 目标文件名
const FILES = [
  ["results/seed/leaderboard.seed.json", "leaderboard.json"],
  ["data/models/catalog.json", "models.json"],
  ["data/manifest/tasks.manifest.json", "manifest.json"],
  ["data/domains/domains.json", "domains.json"],
  ["data/showcase/showcase.json", "showcase.json"],
];

let copied = 0;
for (const [src, dest] of FILES) {
  const from = join(repoRoot, src);
  const to = join(outDir, dest);
  if (existsSync(from)) {
    copyFileSync(from, to);
    copied++;
  } else {
    // 源缺失时写一个空骨架，保证 import 不报错
    writeFileSync(to, "{}\n");
    console.warn(`[sync-data] missing ${src}, wrote empty ${dest}`);
  }
}
console.log(`[sync-data] synced ${copied}/${FILES.length} data files to src/generated/`);
