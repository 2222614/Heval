// Generates TypeScript types from the JSON Schemas into ts/index.ts.
// This keeps the frontend's types in lockstep with the harness output schema.
//
//   cd packages/schema && npm install && npm run generate
//
import { compileFromFile } from "json-schema-to-typescript";
import { readdir, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const schemaDir = join(here, "..");
const outDir = join(schemaDir, "ts");

const banner = `/**
 * AUTO-GENERATED from packages/schema/*.schema.json — DO NOT EDIT BY HAND.
 * Regenerate with: cd packages/schema && npm run generate
 */
`;

const options = {
  bannerComment: "",
  additionalProperties: false,
  style: { singleQuote: false, semi: true },
};

const files = (await readdir(schemaDir)).filter((f) => f.endsWith(".schema.json"));
files.sort();

let out = banner;
for (const file of files) {
  const ts = await compileFromFile(join(schemaDir, file), options);
  out += `\n// ── from ${file} ──\n${ts}`;
}

await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, "index.ts"), out, "utf8");
console.log(`Generated ts/index.ts from ${files.length} schema(s): ${files.map((f) => basename(f)).join(", ")}`);
