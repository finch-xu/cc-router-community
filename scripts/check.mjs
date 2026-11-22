#!/usr/bin/env node
// 校验全部插件条目, 并 (带 --write 时) 生成 index.json。
//
//   node scripts/check.mjs            PR 上跑: 只校验, 有错误即退出 1, 结果写进 $GITHUB_STEP_SUMMARY
//   node scripts/check.mjs --write    合并后跑: 校验 + 写 index.json
//
// 校验规则不在本仓库: 直接 import cc-router 主仓库的 src/plugins/*.ts (CI 把它检出到 .cc-router/),
// 与 app 安装时跑的是同一份代码, 两边不会对不上。需要 Node 22.18+ (原生 TS type stripping)。
// 环境变量 CC_ROUTER_DIR 可指向本地的 cc-router 检出 (默认 ./.cc-router)。
import { registerHooks } from "node:module";
import { appendFileSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const CCR = resolve(process.env.CC_ROUTER_DIR ?? join(ROOT, ".cc-router"));
const WRITE = process.argv.includes("--write");

// .ts 里的无扩展名相对 import 补 .ts (与 cc-router 的 scripts/check-*.mjs 同一钩子)
const isFile = (p) => existsSync(p) && statSync(p).isFile();
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.endsWith(".ts") && specifier.startsWith(".") && !/\.[cm]?[jt]sx?$|\.json$/.test(specifier)) {
      const base = fileURLToPath(new URL(specifier, context.parentURL));
      for (const cand of [`${base}.ts`, `${base}/index.ts`]) {
        if (isFile(cand)) return { url: pathToFileURL(cand).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});

const imp = (rel) => import(pathToFileURL(join(CCR, rel)).href);
const { validateManifest, isSafePath, SUPPORTED_TYPES, MANIFEST_FILE } = await imp("src/plugins/manifest.ts");
const { validateTheme } = await imp("src/plugins/theme/validate.ts");
const { packageHash } = await imp("scripts/lib/plugin-hash.mjs");

const TAGS = JSON.parse(readFileSync(join(ROOT, "schema/tags.json"), "utf8")).tags.map((t) => t.id);
const MEDIA_MAX = { logo: 100 * 1024, shot: 500 * 1024 };
const MAX_SHOTS = 4;
const BIG = 8 * 1024 * 1024;

const isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const raw = (repo, commit, path) => `https://raw.githubusercontent.com/${repo}/${commit}/${path}`;

async function fetchBytes(url) {
  const r = await fetch(url, { headers: { "user-agent": "cc-router-community-ci" } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return new Uint8Array(await r.arrayBuffer());
}

function mediaKind(bytes) {
  const b = bytes;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "webp";
  return null;
}

function checkMedia(id, errors) {
  const dir = join(ROOT, "media", id);
  const out = { logo: undefined, screenshots: [] };
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir).sort()) {
    const p = join(dir, f);
    const bytes = readFileSync(p);
    const rel = `media/${id}/${f}`;
    const isLogo = /^logo\.(png|jpg|webp)$/.test(f);
    const isShot = /^shot-\d+\.(png|jpg|webp)$/.test(f);
    if (!isLogo && !isShot) {
      errors.push(`${rel}: 文件名只能是 logo.png 或 shot-1.png 这样的形式`);
      continue;
    }
    if (!mediaKind(bytes) || !f.endsWith(mediaKind(bytes))) errors.push(`${rel}: 只接受 png / jpg / webp, 且扩展名要与内容一致`);
    if (bytes.length > (isLogo ? MEDIA_MAX.logo : MEDIA_MAX.shot)) errors.push(`${rel}: 超过 ${isLogo ? "100 KB" : "500 KB"}`);
    if (isLogo) out.logo = rel;
    else out.screenshots.push(rel);
  }
  if (out.screenshots.length > MAX_SHOTS) errors.push(`media/${id}: 截图最多 ${MAX_SHOTS} 张`);
  return out;
}

async function checkEntry(type, file) {
  const id = file.replace(/\.json$/, "");
  const errors = [];
  const warnings = [];
  const fail = () => ({ id, type, errors, warnings, index: null });
  let entry;
  try {
    entry = JSON.parse(readFileSync(join(ROOT, "plugins", type, file), "utf8"));
  } catch (e) {
    errors.push(`不是合法 JSON: ${e.message}`);
    return fail();
  }
  if (!isObj(entry)) {
    errors.push("顶层必须是对象");
    return fail();
  }
  for (const k of Object.keys(entry)) if (!["repo", "path", "tags", "versions", "revoked"].includes(k)) errors.push(`不认识的字段 ${k}`);
  if (typeof entry.repo !== "string" || !/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(entry.repo)) errors.push("repo 要写成 owner/repo");
  if (entry.path !== undefined && !isSafePath(entry.path)) errors.push("path 不合法");
  const tags = entry.tags ?? [];
  if (!Array.isArray(tags) || tags.length > 5) errors.push("tags 是数组, 最多 5 个");
  else for (const t of tags) if (!TAGS.includes(t)) errors.push(`标签 ${t} 不在 schema/tags.json 里 (可以在同一个 PR 里加上)`);
  if (entry.revoked !== undefined && (typeof entry.revoked !== "string" || !entry.revoked)) errors.push("revoked 要写下架原因");
  const versions = entry.versions;
  if (!Array.isArray(versions) || versions.length === 0) errors.push("versions 至少一项");
  else for (const v of versions) if (!isObj(v) || !/^[0-9a-f]{40}$/.test(v.commit ?? "")) errors.push("versions[].commit 要写完整的 40 位提交号");
  const media = checkMedia(id, errors);
  if (errors.length) return fail();

  // 只取最后一项 (最新版本) 下载检查; 之前的提交在合并时已经检查过
  const commit = versions[versions.length - 1].commit;
  const base = entry.path ? `${entry.path}/` : "";
  const files = {};
  const manifestBytes = await fetchBytes(raw(entry.repo, commit, base + MANIFEST_FILE));
  if (!manifestBytes) {
    errors.push(`${entry.repo}@${commit.slice(0, 7)} 里没有 ${base}${MANIFEST_FILE}`);
    return fail();
  }
  files[MANIFEST_FILE] = manifestBytes;
  let manifestJson;
  try {
    manifestJson = JSON.parse(new TextDecoder().decode(manifestBytes));
  } catch {
    errors.push(`${MANIFEST_FILE} 不是合法 JSON`);
    return fail();
  }
  const m = validateManifest(manifestJson);
  warnings.push(...m.warnings.map((w) => `${MANIFEST_FILE} ${w.path}: ${w.code}`));
  if (!m.manifest) {
    errors.push(...m.errors.map((e) => `${MANIFEST_FILE} ${e.path}: ${e.code}${e.detail ? ` (${e.detail})` : ""}`));
    return fail();
  }
  const man = m.manifest;
  if (man.id !== id) errors.push(`清单里的 id (${man.id}) 要与文件名 (${id}) 一致`);
  if (man.type !== type) errors.push(`清单里的 type (${man.type}) 要与目录 plugins/${type}/ 一致`);
  for (const p of [man.entry, ...man.assets]) {
    const b = await fetchBytes(raw(entry.repo, commit, base + p));
    if (!b) errors.push(`仓库里缺少清单列出的文件 ${p}`);
    else files[p] = b;
  }
  if (errors.length) return fail();
  if (type === "theme") {
    let theme;
    try {
      theme = JSON.parse(new TextDecoder().decode(files[man.entry]));
    } catch {
      errors.push(`${man.entry} 不是合法 JSON`);
      return fail();
    }
    const t = validateTheme(theme, man.assets);
    errors.push(...t.errors.map((e) => `${man.entry} ${e.path}: ${e.code}${e.detail ? ` (${e.detail})` : ""}`));
    warnings.push(...t.warnings.map((w) => `${man.entry} ${w.path}: ${w.code}`));
  }
  const size = Object.values(files).reduce((n, b) => n + b.length, 0);
  if (size > BIG) warnings.push(`插件包 ${(size / 1024 / 1024).toFixed(1)} MB, 较大`);
  if (errors.length) return fail();

  return {
    id,
    type,
    errors,
    warnings,
    index: {
      id,
      type,
      name: man.name,
      description: man.description,
      author: man.author,
      license: man.license,
      repo: entry.repo,
      path: entry.path,
      tags,
      logo: media.logo,
      screenshots: media.screenshots,
      latest: { version: man.version, commit, sha256: packageHash(files), minApp: man.minApp },
      revoked: entry.revoked,
    },
  };
}

const results = [];
for (const type of SUPPORTED_TYPES) {
  const dir = join(ROOT, "plugins", type);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) results.push(await checkEntry(type, f));
}
for (const d of readdirSync(join(ROOT, "plugins"))) {
  if (statSync(join(ROOT, "plugins", d)).isDirectory() && !SUPPORTED_TYPES.includes(d)) {
    results.push({ id: d, type: d, errors: [`plugins/${d}/: cc-router 还不支持这种插件类型`], warnings: [], index: null });
  }
}

const lines = ["## cc-router 社区目录检查", ""];
for (const r of results) {
  const mark = r.errors.length ? "❌" : "✅";
  lines.push(`${mark} **${r.type}/${r.id}**${r.index ? ` v${r.index.latest.version} · \`${r.index.latest.sha256.slice(0, 12)}…\`` : ""}`);
  for (const e of r.errors) lines.push(`  - ❌ ${e}`);
  for (const w of r.warnings) lines.push(`  - ⚠️ ${w}`);
}
if (results.length === 0) lines.push("(目录里还没有插件)");
const report = lines.join("\n");
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);

const failed = results.filter((r) => r.errors.length);
if (WRITE) {
  // 合并后: 有问题的条目不进目录 (不阻断其他条目发布)
  const plugins = results.filter((r) => r.index).map((r) => JSON.parse(JSON.stringify(r.index)));
  const next = { index: 1, plugins };
  const file = join(ROOT, "index.json");
  const prev = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
  if (!prev || JSON.stringify({ ...prev, generatedAt: undefined }) !== JSON.stringify({ ...next, generatedAt: undefined })) {
    writeFileSync(file, `${JSON.stringify({ index: 1, generatedAt: new Date().toISOString(), plugins }, null, 2)}\n`);
    console.log("index.json 已更新");
  } else {
    console.log("index.json 无变化");
  }
} else if (failed.length) {
  process.exit(1);
}
