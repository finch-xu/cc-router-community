---
name: cc-router-provider
description: Build and validate a cc-router provider plugin (`type: "provider"`, `provider.yaml`) for an AI API vendor, relay, or aggregator. Use when the user wants to add a custom provider plugin, relay descriptor, or declarative JSON balance query for cc-router.
---

# Build a cc-router Provider Plugin

A provider plugin ships a declarative `provider.yaml` in the exact same format as cc-router's built-in providers — **data only, zero executable code**. Before installing, cc-router's Rust checker derives every domain that will receive the user's API key and shows it to the user.

Reference spec: [`docs/provider-api.md`](https://github.com/finch-xu/cc-router-community/blob/main/docs/provider-api.md)
Official example: [`examples/plugins/provider-example-relay`](https://github.com/finch-xu/cc-router/tree/main/examples/plugins/provider-example-relay)

## Files to create

1. `cc-router-plugin.json`:
```json
{
  "manifest": 1,
  "id": "my-relay",
  "type": "provider",
  "version": "1.0.0",
  "name": { "zh": "我的中转站", "en": "My Relay" },
  "description": { "zh": "一句话说明", "en": "One-line summary" },
  "author": "your-github-name",
  "license": "MIT",
  "homepage": "https://example.com",
  "entry": "provider.yaml",
  "assets": []
}
```
2. `provider.yaml` (or `.json`):
   - Prefer native Anthropic passthrough (`auth.type: api_key`) whenever the vendor offers an Anthropic Messages endpoint; only use translation `auth.type` (`openai_responses_api_key`, `openai_chat_completions_api_key`, `gemini_api_key`, `gemini_interactions_api_key`) when no Anthropic endpoint exists.
   - OAuth auth types (`chatgpt_oauth`, `kiro_oauth`) are built-in only and rejected in plugins.
   - Every URL must use `https://` (or `http://` to localhost / loopback for local runtimes) and **cannot** put placeholders in the hostname.
   - `assets` must be `[]`.
   - For balance queries, use `balance_discovery.parser: json` with declarative JSON paths.

## Validate locally

```bash
git clone --depth 1 https://github.com/finch-xu/cc-router
cargo run --release --manifest-path cc-router/src-tauri/Cargo.toml \
  -p cc-router-plugin-spec --bin ccr-plugin-check -- /path/to/your-plugin
```

Verify `"ok": true` and inspect `capabilities.key_hosts` to confirm every listed domain is expected. Then test in cc-router via **Plugins → Load from folder**, and use `cc-router-submit` to publish.
