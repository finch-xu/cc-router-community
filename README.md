<p align="center">
  <img src="assets/header-cc-router.svg" alt="cc-router" width="300" height="130">&emsp;<img src="assets/header-divider.svg" alt="" width="2" height="130">&emsp;<img src="assets/header-sparrow-bakery.svg" alt="Sparrow Bakery" width="300" height="130">
</p>
<p align="center">
  <b>cc-router 社区创作中心</b>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;<b>麻雀面包坊</b>&emsp;&emsp;&emsp;
</p>

<p align="center">
  <strong>中文</strong> · <a href="README.en.md">English</a> · <a href="README.ja.md">日本語</a>
</p>

# Sparrow Bakery

这里是 [cc-router](https://github.com/finch-xu/cc-router) 插件商店的目录，名叫 **Sparrow Bakery**。app 里的「插件」页读的就是这个仓库生成的 `index.json`。

目前开放的插件类型：

| 类型 | 目录 | 说明 |
|---|---|---|
| 界面主题 | `plugins/theme/` | 颜色、形状、纹理、字体 |
| 小票主题 | `plugins/receipt/` | HTML 模板 + CSS + 字体，格式见 [docs/receipt-api.md](docs/receipt-api.md) |

**插件只装数据，不装代码。** 主题只能填写一张公开的 token 表（见 [docs/theme-api.md](docs/theme-api.md)），不能写 CSS 选择器、不能联网、不能运行脚本，所以 cc-router 以后怎么改版，你的主题都不会「只生效一半」。小票是受限的 HTML 模板 + CSS，只能读一张公开的数据字段表（见 [docs/receipt-api.md](docs/receipt-api.md)）。

## 这个仓库里放什么

**只放「指针」和展示图**，插件本体留在你自己的仓库里：

```
plugins/theme/<插件 id>.json   ← 你的仓库地址 + 提交号 + 标签 (小票放 plugins/receipt/)
media/<插件 id>/logo.png        ← 可选, ≤ 100 KB
media/<插件 id>/shot-1.png      ← 可选, 每张 ≤ 500 KB, 最多 4 张
```

`index.json` 由 CI 自动生成，请不要手改。

## 让 AI 帮你做插件

本仓库同时是一个 Claude Code 插件市场，里面的 **cc-router 插件工具包** 带三个 skill，按需自动启用：

| skill | 用途 |
|---|---|
| `cc-router-theme` | 做界面主题：定配色、写 `theme.json`、查对比度、生成浅深两色预览 |
| `cc-router-receipt` | 做小票主题：写模板和样式，用样例数据在三种显示设置下各渲染一张预览 |
| `cc-router-submit` | 把做好的插件推到 GitHub、固定提交号、向本仓库提 PR；也负责发新版本 |

在 Claude Code 里安装：

```
/plugin install cc-router-plugin-kit --marketplace finch-xu/cc-router-community
```

较早的 Claude Code 分两步：`/plugin marketplace add finch-xu/cc-router-community`，再 `/plugin install cc-router-plugin-kit@cc-router-community`。

装好后直接说「帮我做一个森林绿的 cc-router 主题」或「做一张火车票样式的小票」即可。skill 自带的校验脚本跑的是 cc-router **同一份**校验代码（首次运行会把它浅克隆到 `~/.cache/cc-router-plugin-kit/`，需要 git 与 Node 22.18+），所以脚本通过就等于 app 与本仓库的 CI 也会通过。

用其他支持 Agent Skills 的 AI 工具：把 [`agent-skills/skills/`](agent-skills/skills/) 下的文件夹复制到该工具的 skills 目录即可。

## 做一个主题

1. 新建一个**公开**的 GitHub 仓库，根目录（或某个子目录）放两个文件：

   `cc-router-plugin.json`（插件清单）

   ```json
   {
     "manifest": 1,
     "id": "my-theme",
     "type": "theme",
     "version": "1.0.0",
     "name": { "zh": "我的主题", "en": "My Theme" },
     "description": { "zh": "一句话介绍", "en": "One-line description" },
     "author": "your-github-name",
     "license": "MIT",
     "entry": "theme.json",
     "assets": []
   }
   ```

   `theme.json`（主题本体，写法见 [docs/theme-api.md](docs/theme-api.md)）

   ```json
   {
     "themeApi": 1,
     "base": "quiet",
     "light": { "colors": { "canvas": "#fffaf1", "accent": "#b9501c" } },
     "dark":  { "colors": { "canvas": "#1e1813", "accent": "#ff9a5c" } }
   }
   ```

   完整范例：cc-router 仓库的 [`examples/plugins/sparrow-sun`](https://github.com/finch-xu/cc-router/tree/main/examples/plugins/sparrow-sun)（内置「麻雀」主题的插件版）。

2. 本地调试：cc-router →「插件」→「从文件夹加载」，选你的文件夹，可以先「试穿」再安装。
3. 推送后再用「从链接安装」粘贴 `https://github.com/你/仓库/tree/<提交号>` 试一次，这和用户安装走的是同一条路。

`id` 只能用小写字母、数字和短横线（2–40 个字符），不能和内置主题重名。

做小票插件：清单写 `"type": "receipt"`、`"entry": "receipt.json"`，模板与样式按 [docs/receipt-api.md](docs/receipt-api.md) 写；完整范例见 cc-router 仓库的 [`examples/plugins/receipt-sparrow-bakery`](https://github.com/finch-xu/cc-router/tree/main/examples/plugins/receipt-sparrow-bakery)。安装确认框会用样例数据渲染一张预览。

## 提交到社区

1. Fork 本仓库。
2. 新建 `plugins/theme/<id>.json`（小票插件放 `plugins/receipt/<id>.json`）：

   ```json
   {
     "repo": "your-github-name/my-theme",
     "tags": ["warm", "light"],
     "versions": [{ "commit": "完整的 40 位提交号" }]
   }
   ```

   - 一个仓库放了多个插件时，加 `"path": "子目录"`。
   - 标签从 [`schema/tags.json`](schema/tags.json) 里选，最多 5 个；想要新标签可以在同一个 PR 里加。
3. 可选：放 `media/<id>/logo.png` 和 `media/<id>/shot-1.png`…（png / jpg / webp）。
4. 提 PR。CI 会下载你那次提交里的文件，用与 app **同一份**校验代码检查一遍，结果显示在 PR 的检查摘要里。

名字、介绍、版本号都从你的清单里读，不用在这里重复写；包的哈希也由 CI 计算。

### 发布新版本

在你的仓库里改好、改清单的 `version`，然后提 PR 在 `versions` **末尾**追加新的提交号。已安装的用户会在插件页看到「有更新」。

## 规则

- 必须是公开仓库；建议附开源许可证。
- 不得冒充 cc-router 官方或其他品牌的名字、logo。
- 截图要是主题的真实效果。
- 字体许可证由作者自己负责。
- 违反规则或有问题的插件会被下架：条目里写上 `"revoked": "原因"`，app 会提示已安装的用户。

## 安全说明

- app 安装时固定在你填的那次提交，并核对内容哈希；作者之后改仓库不会悄悄影响已安装的用户。
- 主题的每个值都要通过语法白名单（颜色 / 长度 / 阴影等），图片与字体只能来自插件包内，SVG 不能带脚本或外链。
- 用户也可以不经过本目录，直接「从链接安装」任何仓库；app 会提示「未经社区审核」。
