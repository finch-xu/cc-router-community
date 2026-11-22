# 小票格式参考（receiptApi 1）

小票插件 = 一份 **HTML 模板** + 一份 **CSS** + 可选字体。cc-router 把用量数据填进模板渲染成小票，导出 PNG / PDF / HTML 时原样带走。
权威定义在 cc-router 仓库的 [`src/plugins/receipt/`](https://github.com/finch-xu/cc-router/tree/main/src/plugins/receipt)；完整范例：[`examples/plugins/receipt-sparrow-bakery`](https://github.com/finch-xu/cc-router/tree/main/examples/plugins/receipt-sparrow-bakery)。

**承诺：数据字段只增不删。** 新加的字段装到旧版 app 上只是显示为空；真要改动才会把 `receiptApi` 升到 2。

## 文件

`cc-router-plugin.json`：`"type": "receipt"`，`"entry": "receipt.json"`，`assets` 里列出模板、样式和字体。

`receipt.json`：

```json
{
  "receiptApi": 1,
  "template": "template.html",
  "style": "style.css",
  "width": 360,
  "paper": "#fffaf1",
  "fonts": { "My Receipt Font": "fonts/receipt.woff2" }
}
```

| 键 | 说明 |
|---|---|
| `template` | 必填，`.html` |
| `style` | 可选，`.css` |
| `width` | 小票宽度，280–480 的整数，默认 360 |
| `paper` | 纸张颜色（导出时用），颜色写法同主题 |
| `fonts` | 字体名 → 字体文件；CSS 里用这个名字。也可以直接用内置小票已有的字体，不必自带：DotGothic16、Courier Prime、IBM Plex Mono、Space Mono、Cormorant Garamond、Archivo、Caveat、Oswald、Archivo Narrow |

## 模板语言

```html
<p>No. {{receipt.no}}</p>

{{#each groups}}
  <h3>{{name}}</h3>
  {{#if empty}}<p>nothing</p>{{else}}
    {{#each lines}}<div>{{model}} — {{tokens}}</div>{{/each}}
  {{/if}}
{{/each}}
```

- `{{字段}}` 输出文字（自动转义，不能输出 HTML）。
- `{{#each 列表}}…{{/each}}`：块里直接写列表项的字段名，也能读外层字段；`{{@index}}` `{{@first}}` `{{@last}}`。
- `{{#if 字段}}…{{else}}…{{/if}}`、`{{#unless 字段}}…{{/unless}}`。空字符串、0、`false`、空列表都算假。
- `{{ }}` 只能写在文字里，不能写在标签或属性里。

app 提供的三个元素：

| 元素 | 属性 |
|---|---|
| `<ccr-qr></ccr-qr>` | `size` 40–200，二维码（指向 ccrouter.app），颜色跟随 CSS `color` |
| `<ccr-barcode></ccr-barcode>` | `height` 20–120，条形码，颜色跟随 CSS `color` |
| `<ccr-logo></ccr-logo>` | `size` 16–128，cc-router logo（渲染为 `<img>`） |

## 数据字段

时间一律 UTC。数字默认是紧凑写法（`39.90M`），加 `Full` 后缀是千分位全写（`39,900,000`）。

**顶层**

| 字段 | 例 |
|---|---|
| `receipt.no` | `5A7C0E21`（单号） |
| `receipt.range` | `last7_days`（`last_24_hours` / `last7_days` / `last30_days` / `last_year` / `all_time`） |
| `receipt.issued` / `receipt.start` / `receipt.end` | 时间，各自有 `.Y` `.YY` `.M` `.D` `.h` `.m` `.s` `.date`（`2026-11-22`）`.time`（`09:30`）`.weekday`（`SUN`…） |
| `receipt.version` / `receipt.port` / `receipt.site` | app 版本、代理端口、`ccrouter.app` |
| `total.*` | 全部合计，见下方「用量」 |
| `groups` | 列表，每项是一个虚拟模型 |

**`groups` 的每一项**：`key`（`model-opus`）、`name`（`MODEL-OPUS`）、`empty`（这一组没有用量）、`multi`（不止一行）、`subtotal.*`（用量）、`lines`（列表）。

**`lines` 的每一项**：`model`（真实模型名）、`provider`（厂商）、`subscription`（订阅名；已删除的订阅显示为界面语言的「已删除订阅」）、`deleted`，以及用量字段。

**用量**（`total.*`、`subtotal.*`、每一行都有）：`requests`、`input`、`output`、`cacheWrite`、`cacheRead`、`tokens`（四项合计）、`hasCache`，以及 `inputFull` `outputFull` `cacheWriteFull` `cacheReadFull` `tokensFull`。

## HTML 规则

- 可用标签：`div span p b strong i em small s u br hr h1–h6 header footer section table thead tbody tfoot tr td th ul ol li pre code`，以及上面三个 `ccr-*`。
- 可用属性：`class`、`colspan`、`rowspan`。**没有** `style`、`id`、事件、链接和图片——样式写在 CSS 里。
- 标签要成对闭合（`br` `hr` 除外）。

## CSS 规则

- 只写「选择器 { 声明 }」。所有选择器会自动加上作用域前缀，只作用在你的小票里。
- 不能用：`@` 规则（`@import` `@media` `@font-face`…，字体请写在 `receipt.json` 的 `fonts` 里）、`url()`、`html` / `body` / `:root`、属性选择器、反斜杠转义、`position: fixed`。
- 小票外框会裁掉溢出的内容，`box-shadow` 等外扩效果请画在小票内部。
