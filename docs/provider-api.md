# 厂商插件格式参考

厂商插件 = 一份**厂商描述**（`provider.yaml`），格式与 cc-router 内置厂商（[`src-tauri/providers/*.yaml`](https://github.com/finch-xu/cc-router/tree/main/src-tauri/providers)）完全相同。装上之后，「添加订阅」的厂商列表里会多出一项，用户照常填 API Key 建订阅。适合用来接入新的中转站、聚合站或本地模型服务，不用等 cc-router 发版。

权威定义在 cc-router 仓库的 [`src-tauri/crates/cc-router-plugin-spec`](https://github.com/finch-xu/cc-router/tree/main/src-tauri/crates/cc-router-plugin-spec)（app 安装时与本仓库 CI 跑的是同一份 Rust 检查器）；完整范例：[`examples/plugins/provider-example-relay`](https://github.com/finch-xu/cc-router/tree/main/examples/plugins/provider-example-relay)。

## 先判断该不该做成插件

- 厂商**有原生 Anthropic 兼容端点**（`…/anthropic/v1/messages` 之类）：用 `auth.type: api_key` 透传。不要因为它也有 OpenAI 兼容端点就写成翻译类——翻译会丢掉 thinking / tool_use / 缓存等信息。
- 只有 OpenAI Responses / Chat Completions / Gemini 接口：用对应的翻译类 `auth.type`。
- **每个用户的域名都不一样**（自建中转、内网服务）：做不成插件（见下方「域名」规则），请用 app 里的「自定义」入口。

## 文件

`cc-router-plugin.json`：

```json
{
  "manifest": 1,
  "id": "my-relay",
  "type": "provider",
  "version": "1.0.0",
  "name": { "zh": "我的中转站", "en": "My Relay" },
  "author": "your-name",
  "homepage": "https://github.com/your-name/ccr-my-relay",
  "entry": "provider.yaml",
  "assets": []
}
```

- `entry` 是 `.yaml` / `.yml` / `.json`。
- `assets` 必须为空（厂商插件第一期不能自带图标；`provider.yaml` 的 `icon` 可以写内置的品牌图标名）。

`provider.yaml`：

```yaml
display_name: { zh: 我的中转站, en: My Relay }
description: { zh: 一句话介绍, en: One-line description }
category: aggregator          # first_party / second_party / aggregator
compatibility: untested       # verified / partial / untested
homepage: https://example.com
auth:
  type: api_key               # 见下表
  header_name: Authorization
  header_format: bearer       # bearer / raw
endpoints:
  - id: main
    label: { zh: 主线路, en: Main }
    base_url: https://api.example.com/anthropic
    messages_path: /v1/messages
default_endpoint: main
model_discovery:
  enabled: true
  url: https://api.example.com/v1/models
  example_models: [claude-sonnet-4-5]
```

除下面几条外，字段含义与内置厂商相同，写法可以直接参考 [`src-tauri/providers/`](https://github.com/finch-xu/cc-router/tree/main/src-tauri/providers) 里的任意一份。

## 与内置描述符的区别

| 规则 | 说明 |
|---|---|
| 顶层 `id` | 写不写都行，会被替换成 `plugin:<清单 id>` |
| 上屏文字 | `display_name` / `description` / 端点 `label` 等可以只写部分语言；缺的按 en → zh → zh-Hant → ja 的顺序补齐。建议至少写 zh 和 en |
| 鉴权类型 | 只能是 `api_key`、`openai_responses_api_key`、`openai_chat_completions_api_key`、`gemini_api_key`、`gemini_interactions_api_key`。OAuth 类（ChatGPT / Kiro）只能内置 |
| 地址 | 所有 URL 必须是 `https://`；只有指向本机（`localhost` / `127.0.0.1` / `[::1]`）时可以用 `http://` |
| 域名 | URL 的**域名部分不能有占位符**（`https://{tenant}.example.com` 不行；路径里的 `{account_id}` 这类 `url_params` 可以） |

为什么限制域名：用户在确认框里会看到「你填写的 API Key 会发往：…」，这份清单由 cc-router 从插件内容里算出来（对话、模型列表、余额查询三类地址都算，它们都会带上 Key）。域名里有占位符就算不出来了。

## 余额查询（可选）

new-api / one-api 系中转站的余额接口可以用声明式写法：

```yaml
balance_discovery:
  url: https://api.example.com/api/user/self
  parser: json
  json:
    remaining: "$.data.quota"       # 必填
    used: "$.data.used_quota"       # 可选, 显示「已用 X」
    available: "$.data.enabled"     # 可选, 布尔
    divisor: 500000                 # 可选, 数值都除以它 (new-api 的 quota 单位)
    unit: USD                       # USD / CNY / tokens / credits
    low_below: 5                    # 可选, 低于它标黄; 低于 0 恒为红色
```

路径只支持 `$` 开头、`.字段` 和 `[下标]`。数值可以是 JSON 数字或数字字符串。余额接口必须能用订阅自己的 API Key 鉴权（需要另一种「系统令牌」的接口暂不支持）。

## 自测

1. 在 app 的插件页点「从文件夹加载」，选你的插件目录。确认框会列出问题，或者列出 Key 会发往的域名。
2. 或者用命令行跑与 CI 相同的检查（需要 Rust）：

   ```bash
   git clone --depth 1 https://github.com/finch-xu/cc-router
   cargo run --release --manifest-path cc-router/src-tauri/Cargo.toml -p cc-router-plugin-spec --bin ccr-plugin-check -- /path/to/your-plugin
   ```

   输出 `"ok": true` 就说明 app 与本仓库 CI 都会通过。

## 更新与已有订阅

用户的订阅在创建时会把连接信息（地址、请求头等）保存下来，你发新版本**不会悄悄改变已有订阅的去向**：用户会在订阅编辑页看到「厂商描述已更新」，逐项核对新旧地址后手动重建。更新确认框也会提示「新增域名 x」。所以改域名是可以的，但请在更新说明里讲清楚原因。
