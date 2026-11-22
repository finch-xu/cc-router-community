#!/usr/bin/env node
// cc-router 插件本地校验 + 预览 (主题 / 小票通用)。需要 Node 22.18+ 与 git。
//
//   node validate.mjs <插件文件夹>                    校验, 有错误退出 1
//   node validate.mjs <插件文件夹> --preview out.html  另外生成一个预览页
//
// 校验规则不在这里: 脚本会把 cc-router 仓库的 src/plugins/ 浅检出到缓存目录, 直接运行
// app 安装插件时用的同一份代码, 所以「这里通过」=「app 和社区 CI 也会通过」。
// 环境变量 CC_ROUTER_DIR 可指向本地已有的 cc-router 检出。
//
// 本文件在 cc-router-theme 与 cc-router-receipt 两个 skill 里各有一份, 内容必须相同 (社区 CI 会比对)。
import { registerHooks } from "node:module";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--"));
const previewAt = args.includes("--preview") ? args[args.indexOf("--preview") + 1] : null;
if (!dir) {
  console.error("用法: node validate.mjs <插件文件夹> [--preview out.html]");
  process.exit(2);
}
const root = resolve(dir);

// ---------- 取得 cc-router 的校验代码 ----------
function ccRouterDir() {
  if (process.env.CC_ROUTER_DIR) return resolve(process.env.CC_ROUTER_DIR);
  const cache = join(process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"), "cc-router-plugin-kit", "cc-router");
  const git = (...a) => execFileSync("git", a, { stdio: ["ignore", "ignore", "pipe"] });
  try {
    if (!existsSync(join(cache, ".git"))) {
      mkdirSync(join(cache, ".."), { recursive: true });
      git("clone", "--quiet", "--depth", "1", "--filter=blob:none", "--sparse", "https://github.com/finch-xu/cc-router.git", cache);
      git("-C", cache, "sparse-checkout", "set", "src/plugins", "scripts/lib");
    } else {
      git("-C", cache, "pull", "--quiet", "--ff-only");
    }
  } catch (e) {
    if (!existsSync(join(cache, "src/plugins"))) {
      console.error(`取不到 cc-router 的校验代码 (需要 git 和网络): ${e.message}`);
      process.exit(2);
    }
    console.error("⚠️ 无法更新校验代码, 使用上次缓存的版本");
  }
  return cache;
}
const CCR = ccRouterDir();

const isFile = (p) => existsSync(p) && statSync(p).isFile();
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.endsWith(".ts") && specifier.startsWith(".") && !/\.[cm]?[jt]sx?$|\.json$/.test(specifier)) {
      const base = fileURLToPath(new URL(specifier, context.parentURL));
      for (const cand of [`${base}.ts`, `${base}/index.ts`]) if (isFile(cand)) return { url: pathToFileURL(cand).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const imp = (rel) => import(pathToFileURL(join(CCR, rel)).href);
const { validateManifest, MANIFEST_FILE } = await imp("src/plugins/manifest.ts");
const { packageHash } = await imp("scripts/lib/plugin-hash.mjs");

// ---------- 读包 ----------
const errors = [];
const warnings = [];
const fmt = (i) => `${i.path ? `${i.path}: ` : ""}${i.code}${i.detail ? ` (${i.detail})` : ""}`;
const read = (rel) => (isFile(join(root, rel)) ? readFileSync(join(root, rel)) : null);

const manifestBytes = read(MANIFEST_FILE);
if (!manifestBytes) {
  console.error(`❌ ${root} 里没有 ${MANIFEST_FILE}`);
  process.exit(1);
}
let manifestJson;
try {
  manifestJson = JSON.parse(manifestBytes.toString("utf8"));
} catch (e) {
  console.error(`❌ ${MANIFEST_FILE} 不是合法 JSON: ${e.message}`);
  process.exit(1);
}
const m = validateManifest(manifestJson);
errors.push(...m.errors.map((e) => `${MANIFEST_FILE} ${fmt(e)}`));
warnings.push(...m.warnings.map((w) => `${MANIFEST_FILE} ${fmt(w)}`));
const man = m.manifest;
const files = { [MANIFEST_FILE]: manifestBytes };
if (man) {
  for (const p of [man.entry, ...man.assets]) {
    const b = read(p);
    if (!b) errors.push(`缺少清单列出的文件 ${p}`);
    else files[p] = b;
  }
}

// ---------- 按类型校验 ----------
let preview = null;
if (man && errors.length === 0) {
  let entry;
  try {
    entry = JSON.parse(files[man.entry].toString("utf8"));
  } catch (e) {
    errors.push(`${man.entry} 不是合法 JSON: ${e.message}`);
  }
  if (entry && man.type === "theme") {
    const { validateTheme } = await imp("src/plugins/theme/validate.ts");
    const { themeCss } = await imp("src/plugins/theme/css.ts");
    const t = validateTheme(entry, man.assets);
    errors.push(...t.errors.map((e) => `${man.entry} ${fmt(e)}`));
    warnings.push(...t.warnings.map((w) => `${man.entry} ${fmt(w)}`));
    if (t.theme) {
      warnings.push(...contrastWarnings(t.theme));
      preview = () => themePreview(man, t.theme, themeCss);
    }
  }
  if (entry && man.type === "receipt") {
    const { validateReceipt } = await imp("src/plugins/receipt/validate.ts");
    const texts = {};
    for (const a of man.assets) if (/\.(html|css)$/.test(a)) texts[a] = files[a].toString("utf8");
    const r = validateReceipt(entry, man.assets, texts);
    errors.push(...r.errors.map(fmt));
    warnings.push(...r.warnings.map(fmt));
    if (r.receipt) preview = () => receiptPreview(man, r.receipt);
  }
}

const size = Object.values(files).reduce((n, b) => n + b.length, 0);
console.log(errors.length ? "❌ 有问题, app 不会接受这个插件:" : `✅ 通过  ${man.type} · ${man.id} v${man.version} · ${(size / 1024).toFixed(1)} KB · sha256 ${packageHash(files).slice(0, 12)}…`);
for (const e of errors) console.log(`  ❌ ${e}`);
for (const w of warnings) console.log(`  ⚠️ ${w}`);
if (previewAt && preview) {
  writeFileSync(previewAt, await preview());
  console.log(`预览已写到 ${resolve(previewAt)}`);
}
process.exit(errors.length ? 1 : 0);

// ---------- 主题: 对比度 ----------
function luminance(hex) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex ?? "");
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  if (x === null || y === null) return null;
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function contrastWarnings(theme) {
  const out = [];
  const pairs = [
    ["text", "canvas", 4.5], ["text", "surface", 4.5], ["text-2", "surface", 4.5], ["text-3", "surface", 4.5], ["text-3", "canvas", 4.5],
    ["on-accent", "accent", 4.5], ["accent-strong", "surface", 4.5], ["ok", "surface", 3], ["warn", "surface", 3], ["err", "surface", 3],
  ];
  for (const [mode, colors] of [["light", theme.light.colors], ["dark", theme.dark?.colors]]) {
    if (!colors) continue;
    for (const [fg, bg, min] of pairs) {
      const c = contrast(colors[fg], colors[bg] ?? (bg === "surface" ? colors.canvas : undefined));
      if (c !== null && c < min) out.push(`对比度 ${mode}.${fg} / ${bg} = ${c.toFixed(1)}:1, 建议至少 ${min}:1`);
    }
  }
  return out;
}

// ---------- 预览页 ----------
function themePreview(man, theme, themeCss) {
  // 不是真实 app, 只是一块用同样 token 拼出来的样板: 看配色关系够用; 真实效果请在 app 里「从文件夹加载」后「试穿」
  const css = themeCss(man.id, theme, () => null).full;
  const attr = `quiet ccr-${man.id}`;
  const board = (dark) => `
  <div class="${dark ? "dark" : ""}" data-theme="${attr}" style="flex:1;min-width:320px">
    <div class="app">
      <aside><b>cc-router</b><a class="on">实时路由</a><a>订阅管理</a><a>请求日志</a></aside>
      <main>
        <h1>${dark ? "深色" : "浅色"}</h1>
        <div class="card"><h2>卡片标题</h2><p>正文文字 text</p><p class="t2">次要文字 text-2</p><p class="t3">说明文字 text-3</p>
          <p><span class="pill ok">正常</span> <span class="pill warn">冷却</span> <span class="pill err">失败</span> <span class="pill flow">在途</span></p>
          <button class="btn">次要按钮</button> <button class="btn primary">主按钮</button></div>
        <div class="well">凹陷区 well · 分隔线下方</div>
      </main>
    </div>
  </div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${man.id} 预览</title>
<style>
:root { --bg:#f8f7f5; --surface:#fff; --surface-2:#efeeeb; --surface-3:#f1f0ed; --line:#eeece9; --line-2:#e2e0dc; --ink:#1c1917; --ink-2:#44403c; --ink-3:#78716c;
  --accent:#d4553a; --accent-ink:#b9442b; --accent-bg:#fcede7; --on-accent:#fff; --ok:#16a34a; --ok-bg:#e7f6ec; --warn:#c97a00; --q-warn-bg:#fdf2d9; --err:#d93a2f; --err-bg:#fdeceb; --q-r-card:16px; --q-r-ctl:9px; --q-sh-card:0 0 0 1px rgb(41 37 36/8%); }
.dark { --bg:#1a1918; --surface:#242220; --surface-2:#131211; --surface-3:#2c2a28; --line:#2a2826; --line-2:#3a3734; --ink:#f5f4f2; --ink-2:#d6d3d1; --ink-3:#a29c97;
  --accent:#ea7353; --accent-ink:#f29a80; --accent-bg:rgb(234 115 83/14%); --ok:#34c46e; --ok-bg:rgb(52 196 110/13%); --warn:#e8a530; --q-warn-bg:rgb(232 165 48/14%); --err:#f0645a; --err-bg:rgb(240 100 90/14%); }
${css.replaceAll(":root:where(", ":where(")}
body { margin:0; padding:20px; font:14px/1.5 system-ui,-apple-system,"PingFang SC",sans-serif; background:#ccc; display:flex; gap:20px; flex-wrap:wrap; }
.app { display:flex; min-height:360px; background:var(--bg); color:var(--ink); border-radius:12px; overflow:hidden; font-family:var(--font-sans, inherit); }
aside { width:130px; background:var(--surface-2); padding:14px 10px; display:flex; flex-direction:column; gap:4px; }
aside a { padding:5px 8px; border-radius:var(--q-r-ctl); color:var(--ink-2); } aside a.on { background:var(--surface); color:var(--ink); }
main { flex:1; padding:16px; } h1 { font-size:18px; margin:0 0 10px; font-family:var(--font-display, inherit); } h2 { font-size:14px; margin:0 0 6px; }
.card { background:var(--surface); border-radius:var(--q-r-card); box-shadow:var(--q-sh-card); padding:14px; margin-bottom:12px; } .card p { margin:4px 0; }
.t2 { color:var(--ink-2); } .t3 { color:var(--ink-3); } .well { background:var(--surface-3); border-top:1px solid var(--line-2); padding:10px; border-radius:var(--q-r-ctl); color:var(--ink-2); }
.pill { padding:1px 8px; border-radius:6px; font-size:12px; } .ok { color:var(--ok); background:var(--ok-bg); } .warn { color:var(--warn); background:var(--q-warn-bg); } .err { color:var(--err); background:var(--err-bg); }
.flow { color:var(--flow, var(--accent)); background:var(--surface-3); }
.btn { font:inherit; border:0; padding:6px 12px; border-radius:var(--q-r-ctl); background:var(--surface-3); color:var(--ink-2); } .btn.primary { background:var(--accent); color:var(--on-accent); }
</style></head><body>${board(false)}${board(true)}</body></html>`;
}

async function receiptPreview(man, receipt) {
  const { renderTemplate } = await imp("src/plugins/receipt/template.ts");
  const { scopedCss } = await imp("src/plugins/receipt/css.ts");
  const { receiptData, sampleReceiptDto, DEFAULT_RECEIPT_OPTIONS } = await imp("src/plugins/receipt/fields.ts");
  const ctx = { port: 23456, version: "preview", deletedLabel: "(已删除订阅)" };
  const placeholder = (w, h, label) =>
    `<svg width="${w}" height="${h}" style="display:block;margin:0 auto"><rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" fill="none" stroke="currentColor" stroke-dasharray="4"/><text x="50%" y="55%" text-anchor="middle" font-size="10" fill="currentColor">${label}</text></svg>`;
  const expand = (html) =>
    html.replace(/<ccr-(qr|barcode|logo)\b([^>]*?)\/?>(?:\s*<\/ccr-\1>)?/g, (_m, kind, attrs) => {
      const n = (name, d) => Number(new RegExp(`${name}\\s*=\\s*["']?(\\d+)`).exec(attrs)?.[1] ?? d);
      if (kind === "logo") return placeholder(n("size", 32), n("size", 32), "logo");
      if (kind === "qr") return placeholder(200, Math.max(24, Math.round(n("size", 80) / 2)), "条形码 (默认) / 二维码");
      return placeholder(200, n("height", 36), "条形码");
    });
  const variants = [
    ["默认设置", DEFAULT_RECEIPT_OPTIONS],
    ["按订阅分组 · 隐藏请求数 · 全写数字", { ...DEFAULT_RECEIPT_OPTIONS, groupMode: "subscription", showRequests: false, compact: false }],
    ["只看合计 · 关掉缓存", { ...DEFAULT_RECEIPT_OPTIONS, groupMode: "totals_only", showCache: false }],
  ];
  const scope = `ccr-rcpt-${man.id}`;
  const fontNames = Object.keys(receipt.fonts).map((f) => `"${f}"`).join(", ");
  const slips = variants
    .map(([label, opts]) => `<figure><figcaption>${label}</figcaption><div class="${scope}" style="width:${receipt.width}px;position:relative;isolation:isolate;overflow:hidden">${expand(renderTemplate(receipt.nodes, receiptData(sampleReceiptDto(), ctx, opts)))}</div></figure>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${man.id} 预览</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo&family=Archivo+Narrow&family=Caveat:wght@400;700&family=Cormorant+Garamond&family=Courier+Prime&family=DotGothic16&family=IBM+Plex+Mono&family=Oswald&family=Space+Mono&display=swap" rel="stylesheet">
<style>body{margin:0;padding:24px;background:#e9e4da;display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap;font-family:system-ui,sans-serif}
figure{margin:0}figcaption{font-size:12px;color:#555;margin-bottom:8px}
${scopedCss(receipt.rules, scope)}</style></head><body>
${fontNames ? `<p style="width:100%;margin:0;font-size:12px;color:#a33">自带字体 ${fontNames} 在预览里不加载 (app 安装后生效)</p>` : ""}
${slips}</body></html>`;
}
