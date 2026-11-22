# 计价插件格式参考（pricingApi 1）

计价插件 = 一张**价格表**。cc-router 本身不带任何价格；装上计价插件后，统计页、请求详情和小票会按价格表**估算**费用。

权威定义在 cc-router 仓库的 [`src-tauri/crates/cc-router-plugin-spec/src/pricing_plugin.rs`](https://github.com/finch-xu/cc-router/tree/main/src-tauri/crates/cc-router-plugin-spec/src/pricing_plugin.rs)（app 与本仓库 CI 跑同一份 Rust 检查器）；范例：[`examples/plugins/pricing-sample`](https://github.com/finch-xu/cc-router/tree/main/examples/plugins/pricing-sample)（价格是虚构的）。

## 文件

`cc-router-plugin.json`：`"type": "pricing"`，`"entry": "pricing.json"`，`"assets": []`。

`pricing.json`：

```json
{
  "pricingApi": 1,
  "currency": "USD",
  "per": 1000000,
  "prices": [
    { "provider": "deepseek", "model": "deepseek-chat", "input": 0.27, "output": 1.1, "cache_read": 0.07, "cache_write": 0.27 },
    { "provider": "*", "model": "claude-sonnet-*", "input": 3, "output": 15, "cache_read": 0.3, "cache_write": 3.75 }
  ]
}
```

| 键 | 说明 |
|---|---|
| `currency` | `USD` 或 `CNY`。一张表只有一种币种；两种币种的费用在界面上分开显示，不做汇率换算 |
| `per` | 价格对应多少个 token，默认 `1000000`（每百万 token） |
| `prices[].provider` | 厂商 id：内置厂商的 id（如 `anthropic`、`deepseek`、`openrouter`，见 cc-router 仓库 [`src-tauri/providers/`](https://github.com/finch-xu/cc-router/tree/main/src-tauri/providers) 的文件名与 `id`）、自定义订阅的 `custom` / `custom-openai` / `custom-openai-chat` / `custom-gemini` / `custom-gemini-interactions`、厂商插件的 `plugin:<插件 id>`，或 `*` 表示任意厂商 |
| `prices[].model` | 上游真实模型名；以 `*` 结尾表示前缀匹配（`claude-sonnet-*`），`*` 只能放在末尾 |
| `input` / `output` | 必填。输入 / 输出价格 |
| `cache_read` / `cache_write` | 可选。缓存读 / 写价格；不写时按 `input` 计（通常会高估，建议写全） |

厂商 id 是 cc-router 承诺「只增不删」的公开键，可以放心引用。

## 匹配规则

对一条请求的 (厂商, 真实模型)：

1. 精确厂商 + 精确模型
2. 精确厂商 + 最长的前缀
3. `*` + 精确模型
4. `*` + 最长的前缀

装了多个计价插件时，排在前面的插件里有匹配就用它（目前按插件 id 排序；以后会提供优先级设置）。所以一张表最好覆盖完整，不要依赖别的插件补缺。

「输入」按**不含缓存**的 token 计：cc-router 会把 OpenAI / Gemini 等翻译类上游「输入里含缓存」的口径先减掉缓存部分，你的价格表不用关心上游差异。

## 费用怎么显示

- 费用在查询时用**当前**价格表现算：装上插件后历史费用立刻出现；价格表更新后，历史费用也按新价格显示。界面写明「按当前价格表估算」与「价格来自 <插件名> <版本>」。
- 用户把订阅标成「包月 / 方案」时，它的费用显示为「等价费用」，不计入按量花费。
- 没有匹配价格的模型显示为「—」，统计页会列出哪些模型没有价格。

## 自测

```bash
git clone --depth 1 https://github.com/finch-xu/cc-router
cargo run --release --manifest-path cc-router/src-tauri/Cargo.toml -p cc-router-plugin-spec --bin ccr-plugin-check -- /path/to/your-plugin
```

输出 `"ok": true` 即可。也可以在 app 的插件页「从文件夹加载」，确认框会显示币种、条目数与覆盖的厂商。

## 审核约定

- 请在介绍或 `homepage` 里写明价格的来源（厂商官网价格页）与更新日期。
- 价格变化时发新版本即可（在目录条目的 `versions` 末尾追加提交号）。
