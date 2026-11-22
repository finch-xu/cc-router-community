---
name: cc-router-receipt
description: Make a receipt theme plugin for cc-router (the desktop app that routes Claude Code across subscriptions) — design a usage "receipt" as a restricted HTML template + CSS, validate it with the app's own validator, preview it with sample data under every display setting, and load it into the app. Use when the user wants to create or fix a cc-router receipt / 小票 / 用量小票 theme, or turn a real-world receipt, ticket, label or bill style into one.
---

# Make a cc-router receipt theme

cc-router's Receipts page renders token usage as a shareable receipt. A receipt plugin is **a restricted HTML template + restricted CSS + optional fonts**. cc-router's own renderer fills the template with usage data. There's no JavaScript, no images (except three app-provided elements) and no network access.

Read `references/receipt-api.md` before writing the template: it lists every data field, the template syntax, and the allowed HTML/CSS.

## Workflow

### 1. Pick a concept

Receipts are the fun part, so lean into a real-world reference: a café or bakery receipt, a train ticket, a parking stub, a pharmacy label, a diner check, a shipping label. Decide:

- **the paper**: width (280–480 px, default 360), paper color, and whether to add a torn edge (CSS `clip-path`).
- **the voice**: playful relabels like "flour (input)" or "loaves sold" make a receipt memorable. Keep the numbers themselves untouched.
- **the type**: a monospace or receipt-like font. You can use the fonts the built-in receipts already load without bundling anything: DotGothic16, Courier Prime, IBM Plex Mono, Space Mono, Cormorant Garamond, Archivo, Caveat, Oswald, Archivo Narrow.

### 2. Create the folder

```
<id>/
├─ cc-router-plugin.json   "type": "receipt", "entry": "receipt.json", assets: [template.html, style.css, …fonts]
├─ receipt.json            { "receiptApi": 1, "template": "template.html", "style": "style.css", "width": 360, "paper": "#fffdf5" }
├─ template.html
└─ style.css
```

`id`: lowercase letters, digits and `-`, 2–40 characters. Give `name` / `description` in the user's language plus English.

### 3. Write the template

- Output fields with `{{receipt.no}}`, `{{total.tokens}}`… They're always HTML-escaped.
- Loop the groups and their lines:

  ```html
  {{#each groups}}
    <div class="row group"><span>{{name}}</span><span>{{subtotal.tokens}}</span></div>
    {{#if empty}}<p class="none">nothing here</p>{{/if}}
    {{#each lines}}
      <div class="row"><span class="name">{{#if model}}{{model}}{{else}}{{subscription}}{{/if}}</span><span>{{tokens}}</span></div>
    {{/each}}
  {{/each}}
  ```

- Put `<ccr-qr size="72"></ccr-qr>` (or `<ccr-barcode>`, `<ccr-logo>`) where the code or logo goes. `<ccr-qr>` follows the user's "footer code" setting and renders a barcode by default.
- Only `class`, `colspan` and `rowspan` attributes are allowed, and `{{ }}` can't appear inside tags. All styling goes in `style.css`.

**Respect the user's display settings.** The Receipts page passes them in as data, and a good receipt reacts to them:

| Setting | What your template must handle |
|---|---|
| Grouping (by virtual model / by subscription / totals only) | `groups` changes shape. In "totals only" the *by subscription* group has lines **without** `model`, and the *by model* group has lines **without** `provider` / `subscription`. Use `{{#if}}` so you never print an empty name or a dangling " / ". |
| Show cache | Wrap cache rows in `{{#if total.hasCache}}` (or the line's `hasCache`). |
| Show request counts | Wrap counts in `{{#if options.showRequests}}`. |
| Compact numbers | Nothing to do: default number fields follow it. Use `*Full` only when you want full digits regardless. |
| Footer code | Nothing to do if you use `<ccr-qr>`. |

### 4. Write the CSS

- Plain `selector { declarations }` only: no `@` rules, `url()`, `html` / `body` / `:root`, attribute selectors, backslash escapes, or `position: fixed`. Selectors are scoped to your receipt automatically.
- Style your own top-level element (e.g. `.paper`) as the receipt body.
- The receipt shell clips overflow, so draw shadows and decorations inside the receipt.
- Use `color` on the parent to color `<ccr-qr>` / `<ccr-barcode>` (they render in `currentColor`).

### 5. Validate and preview, then iterate

```bash
node <this-skill-dir>/scripts/validate.mjs <id> --preview <id>-preview.html
```

- The first run shallow-clones cc-router's validation code into `~/.cache/cc-router-plugin-kit/` (needs `git` and Node 22.18+); `CC_ROUTER_DIR` can point at an existing checkout.
- `❌` = the app won't install it; fix everything. `⚠️ unknown_key ({{…}})` means the template uses a field that doesn't exist (likely a typo).
- The preview renders the receipt with sample data under **three settings** side by side: default, by subscription / hidden counts / full numbers, and totals only / no cache. Check all three for empty names, stray separators, and overflowing text. In the preview, codes and the logo are dashed placeholders. If you can view HTML, look at it; otherwise tell the user where it is.

Repeat until it prints `✅` and all three variants look right.

### 6. Try it in the real app

Tell the user: **Plugins → Load from folder**, pick the folder. The install dialog shows a preview with sample data. After installing, the receipt appears in the theme picker on the **Receipts** page, where they can switch settings and export PNG / PDF / HTML.

### 7. Share it (optional)

To publish it in the community catalog, use the `cc-router-submit` skill.
