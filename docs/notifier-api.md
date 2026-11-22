# 通知插件格式参考

通知插件 = 一份声明式的 HTTP 推送模板（`notifier.json`），全部由 Rust 在独立通知队列中执行，**不含任何可执行代码**。适合对接 ntfy、Bark、Server酱、飞书、钉钉、Telegram、Slack 或任意自建 Webhook 推送通道。

权威定义在 cc-router 仓库的 [`src-tauri/crates/cc-router-plugin-spec/src/notifier_plugin.rs`](https://github.com/finch-xu/cc-router/blob/main/src-tauri/crates/cc-router-plugin-spec/src/notifier_plugin.rs) 与 [`notifier_template.rs`](https://github.com/finch-xu/cc-router/blob/main/src-tauri/crates/cc-router-plugin-spec/src/notifier_template.rs)；官方范例：[`examples/plugins/notifier-*`](https://github.com/finch-xu/cc-router/tree/main/examples/plugins)（含 ntfy / Bark / Server酱 / 飞书 / 钉钉 / Telegram / Slack）。

## 文件

`cc-router-plugin.json`：

```json
{
  "manifest": 1,
  "id": "notifier-ntfy",
  "type": "notifier",
  "version": "1.0.0",
  "name": { "zh": "ntfy 推送", "en": "ntfy Push" },
  "author": "your-name",
  "entry": "notifier.json",
  "assets": []
}
```

- `entry` 必须是 `.json`，`assets` 必须为空。
- 通知插件安装后**默认停用**，用户在桌面端配置参数并测试后手动启用；更新若新增目标域名、订阅事件或发送字段会自动停用。

`notifier.json`：

```json
{
  "notifierApi": 1,
  "params": [
    {
      "id": "server",
      "type": "base_url",
      "label": { "zh": "服务器地址", "en": "Server URL" },
      "default": "https://ntfy.sh"
    },
    {
      "id": "topic",
      "type": "string",
      "label": { "zh": "主题（Topic）", "en": "Topic" }
    },
    {
      "id": "token",
      "type": "secret",
      "label": { "zh": "访问令牌（可选）", "en": "Access token (optional)" },
      "optional": true
    }
  ],
  "events": [
    "subscription.auth_failed",
    "subscription.quota_reached",
    "proxy.stopped",
    "usage.daily_summary",
    "test"
  ],
  "request": {
    "method": "POST",
    "url": "{{params.server}}/{{params.topic}}",
    "headers": {
      "Authorization": "{{#if params.token}}Bearer {{params.token}}{{/if}}",
      "Title": "{{title}}"
    },
    "body": { "type": "text", "template": "{{body}}" }
  },
  "templates": {
    "default": { "title": "{{event.title}}", "body": "{{event.text}}" }
  }
}
```

## 安全边界（由 Rust 静态推导）

1. **目标域名约束**：`request.url` 的 host 只能是字面量 `https://` 域名，或者以 `{{params.<id>}}` 开头且该参数类型为 `base_url`（后接 `/`、`?` 或结尾，不可拼接域名后缀）。`base_url` 由用户自行填写，允许 `https://` 以及指向回环或 RFC1918 私网的 `http://`。
2. **字段白名单**：模板中只能引用下方公开事件字段表与已声明的 `params.<id>`，**永远不会接触 API Key、提示词、请求头、客户端 IP 或会话 ID**。
3. **凭据保护**：`type: "secret"` 参数不允许设置 `default`，仅保存在本机数据库，永远不经列表 API 回传明文。
4. **运行保护**：同事件 + 同目标 10 分钟去重；每插件每小时最多发送 30 条；单次超时 10 秒、5xx/网络错误重试 1 次；任何失败仅写入最近 20 条内存发送记录，不影响代理请求。

## 参数（`params`，最多 20 个）

每个参数包含 `id`（`[a-z0-9_-]{1,40}`）、`type`、`label`（字符串或分语言对象）、可选 `default`、可选 `optional`（默认 `false`；无 `default` 且 `optional` 为 `false` 即为必填）：

| `type` | 说明 |
|---|---|
| `string` | 非空文本（最多 4096 字符） |
| `number` | 有限数值 |
| `bool` | 布尔开关 |
| `enum` | 枚举，需附 `values`（1–50 个字符串） |
| `base_url` | 服务器根地址（`https://` 或本机 / 私有网段 `http://`，不含 query / fragment） |
| `secret` | 敏感凭据（令牌 / Webhook 密钥，不可设 `default`，界面密码框输入且不回显） |

## 公开事件表（`events`）

| 事件名 | 说明 |
|---|---|
| `subscription.auth_failed` | 订阅鉴权失败（401 / 403） |
| `subscription.cooldown` | 订阅进入冷却（限流 / 连续错误） |
| `subscription.recovered` | 订阅恢复可用 |
| `subscription.quota_reached` | 订阅达到 token 限额 |
| `subscription.quota_warning` | 订阅达到限额 80% 预警 |
| `subscription.balance_low` | 订阅余额偏低 |
| `requests.all_failed` | 虚拟模型所有候选订阅均失败（503） |
| `proxy.stopped` | 代理服务异常停止 |
| `update.available` | 发现新版本 |
| `usage.daily_summary` | 每日用量汇总（按用户设置的本地时间触发） |
| `test` | 用户在设置对话框点击「保存并测试推送」 |

## 模板语法与允许字段

支持 `{{path}}` 与 `{{#if path}}...{{else}}...{{/if}}`（自动按位置转义：URL 路径 / 查询段做 percent-encode，请求头剥离 CR/LF 且空值省略该头，JSON 字符串叶子安全序列化，表单自动编码）。

`request` 中除以下事件字段外，还可使用 `{{title}}` / `{{body}}`（由 `templates.<event>` 或 `templates.default` 预渲染）：

- 通用：`event.kind`、`event.title`、`event.text`（按界面语言预渲染的四语默认文案）、`time`
- 订阅类：`subscription.name`、`provider.name`、`reason`
- 限额类：`period`、`used`、`limit`、`percent`
- 余额类：`remaining`、`unit`
- 路由 / 代理 / 更新：`virtual_model`、`count`、`version`
- 每日汇总：`requests`、`tokens`、`costUsd`、`costCny`、`topSubscriptions`

## 请求体（`request.body`，可选）

- `{"type": "text", "template": "..."}`（`text/plain; charset=utf-8`）
- `{"type": "json", "template": { ... }}`（递归渲染所有字符串叶子，`application/json`）
- `{"type": "form", "fields": { "k": "..." }}`（最多 30 个字段，`application/x-www-form-urlencoded`）

## 自测

```bash
cargo run --release --manifest-path cc-router/src-tauri/Cargo.toml -p cc-router-plugin-spec --bin ccr-plugin-check -- /path/to/your-plugin
```
