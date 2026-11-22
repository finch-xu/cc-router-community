---
name: cc-router-notifier
description: Build and validate a cc-router notifier plugin (`type: "notifier"`, `notifier.json`) to push cc-router alerts and daily usage summaries to HTTP webhooks, mobile push services, or chat bots. Use when the user wants to create a notification channel plugin (ntfy, Bark, Feishu, DingTalk, Telegram, Slack, Discord, Gotify, Pushover, etc.).
---

# Build a cc-router Notifier Plugin

A notifier plugin ships a declarative `notifier.json` (`notifierApi: 1`) HTTP request template — **data only, zero executable code**. cc-router enforces two hard security boundaries:
1. `request.url` host must be a literal `https://` domain OR start with `{{params.<id>}}` where that param has `"type": "base_url"` (which allows user-configured `https://` or local/RFC1918 `http://`).
2. Templates may only reference declared `params.<id>` and the public event field whitelist — never API keys, prompts, request headers, client IP, or session IDs.

Reference spec: [`docs/notifier-api.md`](https://github.com/finch-xu/cc-router-community/blob/main/docs/notifier-api.md)
Official examples: [`examples/plugins/notifier-*`](https://github.com/finch-xu/cc-router/tree/main/examples/plugins) (ntfy, Bark, ServerChan, Feishu, DingTalk, Telegram, Slack)

## Files to create

1. `cc-router-plugin.json`: `"type": "notifier"`, `"entry": "notifier.json"`, `"assets": []`.
2. `notifier.json`:
   - `params` (max 20): `string` | `number` | `bool` | `enum` | `base_url` | `secret` (no `default` allowed on `secret`; mark non-mandatory params `"optional": true`).
   - `events`: subscribe only to the events that make sense for the channel (public list in `docs/notifier-api.md`).
   - `request`: `method` (`GET` | `POST` | `PUT`), `url`, optional `headers` (empty rendered headers are omitted automatically, ideal for `{{#if params.token}}Bearer {{params.token}}{{/if}}`), optional `body` (`text` | `json` | `form`).
   - `templates` (optional): override `title`/`body` per event or `default`; omitting uses cc-router's 4-language `{{event.title}}` and `{{event.text}}` via `{{title}}` and `{{body}}`.

## Validate locally

```bash
git clone --depth 1 https://github.com/finch-xu/cc-router
cargo run --release --manifest-path cc-router/src-tauri/Cargo.toml \
  -p cc-router-plugin-spec --bin ccr-plugin-check -- /path/to/your-plugin
```

Verify `"ok": true` and check `capabilities` (`hosts`, `base_url_params`, `events`, `fields`). Load in cc-router via **Plugins → Load from folder**, click **Save & send test** to verify live delivery, and publish with `cc-router-submit`.
