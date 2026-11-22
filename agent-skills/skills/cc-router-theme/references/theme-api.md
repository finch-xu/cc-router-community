# 主题格式参考（themeApi 1）

`theme.json` 能写什么、每一项用在哪。权威定义在 cc-router 仓库的
[`src/plugins/theme/tokens.ts`](https://github.com/finch-xu/cc-router/blob/main/src/plugins/theme/tokens.ts)，本页与它保持一致。

**承诺：这张表只增不删。** 已有的名字不会改、不会删；新加的项都有默认值，老主题装到新版 app 上照样完整。
真要改动才会把 `themeApi` 升到 2，那时 app 会明确提示，不会「只生效一半」。

## 结构

```json
{
  "themeApi": 1,
  "base": "quiet",
  "light":  { "colors": { … }, "textures": { … } },
  "dark":   { "colors": { … }, "textures": { … } },
  "shape":  { … },
  "fonts":  { … }
}
```

- `base`：底板，目前只能是 `quiet`（「简洁」）。圆角、布局、描边这些外形都来自底板。
- `light`、`dark` 都可以只写几项，也可以省略；省略的部分沿用底板。
- 没写的项沿用底板。不认识的键会被忽略并在安装时提示，不算错误。

## 颜色 `light.colors` / `dark.colors`

| 名字 | 用在哪 |
|---|---|
| `canvas` | 页面画布 |
| `surface` | 卡片 |
| `popover` | 弹窗、下拉菜单（不写就等于 `surface`） |
| `sidebar` | 侧栏、面板 |
| `well` | 悬停底色、输入框与控件底、卡片里的凹陷区 |
| `selected` | 按下、开关的底 |
| `line` / `line-strong` | 分隔线 / 较明显的描边 |
| `hairline` | 设置页分组描边与行分隔 |
| `edge` | 卡片边缘的 1px 描边 |
| `hover` | 侧栏项悬停 |
| `text` `text-2` `text-3` `text-4` `text-5` | 文字，由深到浅五级 |
| `accent` | 品牌色：主按钮、选中项、开关、焦点 |
| `accent-strong` | 品牌色的深一档（悬停、链接） |
| `accent-soft` | 品牌色的淡底 |
| `accent-line` | 品牌色的描边 |
| `on-accent` | 主按钮上的文字颜色 |
| `flow` | 「正在流动」的请求：实时路由图的粒子、有流量的连线、在途点（不写就用 `accent`） |
| `ok` / `ok-soft` | 正常 / 正常的淡底 |
| `warn` / `warn-soft` | 冷却、限流 / 其淡底 |
| `err` / `err-soft` | 失败、凭证失效 / 其淡底 |

建议文字色对其底色的对比度不低于 4.5:1。

## 形状 `shape`（浅色深色共用）

| 名字 | 用在哪 | 值 |
|---|---|---|
| `radius-card` | 卡片、弹窗、主卡 | 圆角 |
| `radius-control` | 按钮、输入框、侧栏项、提示条 | 圆角 |
| `shadow-card` / `shadow-hero` | 卡片 / 每页主卡 | 阴影 |
| `shadow-control` | 胶囊、选中的侧栏项 | 阴影 |
| `shadow-popover` | 弹窗、下拉菜单 | 阴影 |

## 纹理 `light.textures` / `dark.textures`

位置：`canvas`（页面）、`sidebar`（侧栏）、`card`（卡片）。

```json
"textures": {
  "canvas": { "image": "assets/paper.png", "size": "320px", "repeat": "repeat", "position": "0 0" }
}
```

`image` 必须是清单 `assets` 里列出的 png / jpg / webp / gif / svg。

## 字体 `fonts`

槽位：`body`（正文）、`display`（页面标题）、`mono`（等宽）、`hand`（手写批注）。

```json
"fonts": { "body": "assets/MyFont.woff2" }
```

文件必须列在清单 `assets` 里（woff2 / woff / ttf / otf）。中文字体通常很大，建议裁成只含常用字的子集。没写的槽位用系统字体。

## 值的写法（白名单）

| 类型 | 允许 |
|---|---|
| 颜色 | `#rgb` `#rgba` `#rrggbb` `#rrggbbaa`、`rgb()` / `rgba()` / `hsl()` / `hsla()`、`transparent` |
| 圆角 | 1–4 个长度，可用 `/` 写椭圆角，如 `255px 15px 225px 15px / 15px 225px 15px 255px` |
| 阴影 | `none`，或若干层 `[inset] x y [模糊] [扩散] [颜色]`，用逗号分隔 |
| 长度 | 数字 + `px` / `rem` / `em` / `%`，或 `0` |
| 纹理 size | `auto` / `cover` / `contain`，或 1–2 个长度 |
| 纹理 repeat | `repeat` / `no-repeat` / `repeat-x` / `repeat-y` / `round` / `space` |
| 纹理 position | 1–2 个长度或 `top` `bottom` `left` `right` `center` |

不允许：`var()`、`url()`、`calc()`、颜色名（如 `red`）、分号、花括号、引号。
