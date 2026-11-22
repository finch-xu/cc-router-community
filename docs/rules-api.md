# 规则插件格式参考

规则插件 = 一组**条件 + 动作**（`rules.json`），全部由 Rust 在代理管线内执行，**不含任何可执行代码**。适合编写跨订阅、按请求用途或内容生效的可分享策略（如杂活走便宜模型、发出前脱敏 API Key、护栏拒绝等）。

权威定义在 cc-router 仓库的 [`src-tauri/crates/cc-router-plugin-spec/src/rules_plugin.rs`](https://github.com/finch-xu/cc-router/blob/main/src-tauri/crates/cc-router-plugin-spec/src/rules_plugin.rs) 与 [`rules_engine.rs`](https://github.com/finch-xu/cc-router/blob/main/src-tauri/crates/cc-router-plugin-spec/src/rules_engine.rs)；完整范例：[`examples/plugins/rules-side-tasks`](https://github.com/finch-xu/cc-router/tree/main/examples/plugins/rules-side-tasks)。

## 文件

`cc-router-plugin.json`：

```json
{
  "manifest": 1,
  "id": "my-rules",
  "type": "rules",
  "version": "1.0.0",
  "name": { "zh": "杂活走便宜模型", "en": "Side tasks on a cheap model" },
  "author": "your-name",
  "entry": "rules.json",
  "assets": []
}
```

- `entry` 必须是 `.json`，`assets` 必须为空。
- 规则插件安装后**默认停用**，用户在桌面端配置参数后手动启用；更新若新增钩子或动作会自动停用。

`rules.json`：

```json
{
  "rulesApi": 1,
  "params": [
    {
      "id": "cheap",
      "type": "virtual_model",
      "label": { "zh": "杂活改道到", "en": "Send side tasks to" },
      "default": "haiku"
    },
    {
      "id": "mask_keys",
      "type": "bool",
      "label": { "zh": "发出前屏蔽 API Key", "en": "Mask API keys before sending" },
      "default": false
    }
  ],
  "rules": [
    {
      "id": "side-tasks",
      "hook": "route",
      "when": { "purpose": ["title", "compact", "guard", "fetch"], "virtual_model": ["fable", "opus", "sonnet"] },
      "do": [{ "use_virtual_model": "{{params.cheap}}" }]
    },
    {
      "id": "mask-keys",
      "hook": "request",
      "when": { "param": "mask_keys" },
      "do": [{ "redact": { "preset": ["api_keys"], "scope": "user_text" } }]
    }
  ]
}
```

## 参数（`params`，最多 20 个）

每个参数包含 `id`（`[a-z0-9_-]{1,40}`）、`type`、`label`（字符串或分语言对象）、可选 `default`（无 `default` 即为必填，未填齐前无法启用）：

| `type` | 说明 |
|---|---|
| `string` | 文本（最多 4096 字符） |
| `number` | 有限数值 |
| `bool` | 布尔开关（可被 `when.param` 引用） |
| `enum` | 枚举，需附 `values`（1–50 个字符串） |
| `virtual_model` | 虚拟模型短名：`fable` / `opus` / `sonnet` / `haiku` / `fallback`（不含 `jev`） |

动作的字符串参数可用 `{{params.<id>}}` 引用已声明的参数。

## 钩子（`hook`）

| 钩子 | 时机 | 允许动作 |
|---|---|---|
| `route` | 路由选订阅前（`count_tokens` 也会执行） | `use_virtual_model`、`reject` |
| `request` | `route` 之后、候选循环前应用一次（作用于 Anthropic 形态 body，透传与 6 类翻译订阅均生效） | `system_append`、`set_param`、`clamp_param`、`remove_tools`、`redact`、`reject` |

`/v1/systemone` 与 `model-jev` 不经过规则。求值出错（如参数缺失）只跳过该插件并记录日志，不拦截请求；只有 `reject` 会返回 HTTP 400。

## 条件表（`when`，各项为「且」，全部可省）

| 字段 | 取值 |
|---|---|
| `purpose` | `main` / `agent` / `compact` / `guard` / `title` / `fetch` / `probe` / `background` / `unknown` |
| `purpose_guessed` | 布尔 |
| `virtual_model` | `fable` / `opus` / `sonnet` / `haiku` / `fallback` |
| `client_tool` | 客户端标识（如 `claude-code`、`codex-cli`、`unknown`） |
| `entry` | `messages` / `responses` / `chat_completions` |
| `model_requested` | 客户端原始模型名，支持末尾 `*` 前缀 |
| `stream` / `has_tools` / `has_images` / `thinking` | 布尔 |
| `approx_input_tokens` | `{ "gt": n, "lt": n }`（按 system + messages 文本字符数 ÷ 4 粗估） |
| `time` | `[{ "days": [1..7], "start": "HH:MM", "end": "HH:MM" }]`（本地时间，1=周一，支持跨午夜） |
| `param` | 已声明的 `bool` 参数 id（为真时生效） |

## 动作表（`do`，每条规则 1–20 个，封闭集合）

| 动作 | 参数与说明 |
|---|---|
| `use_virtual_model` | `"haiku"` 或 `"{{params.x}}"`；`route` 中第一条命中生效 |
| `reject` | `{ "message": "..." }`，返回 HTTP 400 |
| `system_append` | `{ "text": "..." }`（≤ 4 KB），追加到 `system` 末尾（不破坏前缀缓存） |
| `set_param` | `{ "path": "...", "value": n \| "{{params.x}}" }`；`path` 限 `temperature` / `top_p` / `top_k` / `max_tokens` / `thinking.budget_tokens` |
| `clamp_param` | `{ "path": "...", "min": n, "max": n }`；`thinking.budget_tokens` 只在已开启思考时修改 |
| `remove_tools` | `{ "names": ["WebSearch", "mcp__*"] }`（支持末尾 `*`；同时清理指向被删工具的 `tool_choice`） |
| `redact` | `{ "preset": ["api_keys", "email", "phone_cn", "id_cn"], "patterns": ["..."], "scope": "user_text" \| "all_text", "replacement": "[REDACTED]" }`（最多 20 条正则，使用线性时间 `regex` crate + 大小上限） |

每个插件最多 100 条规则。

## 自测

```bash
cargo run --release --manifest-path cc-router/src-tauri/Cargo.toml -p cc-router-plugin-spec --bin ccr-plugin-check -- /path/to/your-plugin
```
