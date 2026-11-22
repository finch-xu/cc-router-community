---
name: cc-router-theme
description: Make a UI theme plugin for cc-router (the desktop app that routes Claude Code across subscriptions) — pick a palette, write cc-router-plugin.json + theme.json, validate it with the app's own validator, preview it, and load it into the app. Use when the user wants to create, restyle, recolor, or fix a cc-router theme / 主题 / 配色 / 皮肤, even if they only describe a mood or a color ("做一个森林绿的 cc-router 主题").
---

# Make a cc-router UI theme

A cc-router theme is **data, not code**: one `theme.json` that fills a published token table (colors, shapes, textures, fonts) on top of the built-in **Quiet** layout. You can't write CSS selectors; you can only fill in values. That's why themes keep working when the app is redesigned.

Read `references/theme-api.md` before writing values: it lists every token, where it shows up, and the exact value syntax that's accepted.

## Workflow

### 1. Understand what the user wants

If the request is vague, propose a direction rather than asking a long list of questions. Settle these, guessing sensibly where the user didn't say:

- the mood or inspiration (a place, an animal, a season, a brand palette they own)
- which mode matters most (light, dark, or both — default both)
- whether they want textures or a custom font (default: no; colors and shapes go a long way)

### 2. Create the folder

```
<id>/
├─ cc-router-plugin.json
├─ theme.json
└─ assets/            only if there are textures or fonts
```

`id`: lowercase letters, digits and `-`, 2–40 characters, not a built-in theme name (`classic`, `sketch`, `win2000`, `quiet`, `sparrow`…). Every file referenced from `theme.json` must also be listed in the manifest's `assets`.

```json
{
  "manifest": 1,
  "id": "forest-moss",
  "type": "theme",
  "version": "1.0.0",
  "name": { "zh": "森林苔藓", "en": "Forest Moss" },
  "description": { "zh": "一句话介绍", "en": "One line" },
  "author": "<their GitHub name>",
  "license": "MIT",
  "entry": "theme.json",
  "assets": []
}
```

`name` / `description` can carry `zh`, `zh-Hant`, `en`, `ja`; give at least the user's language plus English.

### 3. Design the palette

Follow the same rules the built-in themes use:

- **~90% neutrals.** `canvas`, `surface`, `sidebar`, `well`, the lines and `text`…`text-5` carry the look. Keep `surface` close to white in light mode (or close to the canvas in dark mode); a heavily tinted surface looks dated fast.
- **One brand color.** `accent` is for primary buttons, selection, switches and the preferred route — nothing else. Pick `accent-strong` (hover / links), `accent-soft` (tinted background), `accent-line`, and `on-accent` (text on primary buttons).
- **`flow`** colors live traffic on the Live Routing page (particles, active edges). It can be the accent, or a second color for "things that move" (Sparrow uses water blue).
- **Status colors** (`ok`, `warn`, `err` plus their `-soft` backgrounds) must stay distinguishable from the accent: if the accent is orange or red, push `err` toward crimson or pink.
- **Contrast**: text colors need ≥ 4.5:1 against the surfaces they sit on, and `on-accent` ≥ 4.5:1 against `accent`. The validator reports pairs that fall short.
- **Dark mode is not inverted light mode.** Use a warm or cool near-black canvas, lift the accent a step (a light-mode `#b9501c` becomes something like `#ff9a5c`), and switch `on-accent` to a dark color when the accent is light.

Fill every color token for both modes. A missing token falls back to Quiet's value, which usually clashes with the rest of the palette.

### 4. Optional: shape, texture, font

- `shape`: `radius-card`, `radius-control`, shadows. Irregular radii like `255px 15px 225px 15px / 15px 225px 15px 255px` give a hand-drawn feel.
- `textures`: small tileable PNG / WebP / SVG for `canvas`, `sidebar` or `card`. Keep them subtle and small (tens of KB). SVGs must not contain scripts, event attributes or external links.
- `fonts`: `body`, `display`, `mono`, `hand`, each pointing to a font file in `assets/`. Make sure the license allows redistribution, and subset CJK fonts (a full Chinese font is 10 MB or more).

### 5. Validate and preview, then iterate

Run the validator that ships with this skill (it lives in this skill's `scripts/` folder):

```bash
node <this-skill-dir>/scripts/validate.mjs <id> --preview <id>-preview.html
```

- The first run shallow-clones cc-router's validation code into `~/.cache/cc-router-plugin-kit/`; it needs `git` and Node 22.18 or newer. Point `CC_ROUTER_DIR` at an existing cc-router checkout to skip the clone.
- `❌` lines are hard errors: the app won't install the theme. Fix all of them.
- `⚠️` lines are warnings (unknown keys, low contrast). Fix the contrast ones unless the user deliberately wants low contrast.
- The preview is a mock-up board in light and dark that uses the same tokens. It's good for judging color relationships, not a pixel-exact app. If you can view HTML, look at it and adjust. Otherwise, tell the user where it is.

Repeat until the validator prints `✅`.

### 6. Try it in the real app

Tell the user: in cc-router, open **Plugins → Load from folder**, pick the theme folder, click **Try on** to preview it across the whole app, then **Install**. Installed themes appear in **Settings → Appearance → Plugin themes**.

### 7. Share it (optional)

To publish it in the community catalog, use the `cc-router-submit` skill.
