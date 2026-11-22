---
name: cc-router-rules
description: Build and validate a cc-router rules plugin (`type: "rules"`, `rules.json`) for declarative request routing, parameter tuning, tool filtering, redaction, or guardrails. Use when the user wants to create a shareable routing/rewriting rule plugin for cc-router.
---

# Build a cc-router Rules Plugin

A rules plugin ships a `rules.json` (`rulesApi: 1`) containing declarative `when` conditions and closed-set `do` actions executed in Rust — **data only, zero executable code**. Rules plugins install **disabled by default** and auto-disable if an update expands hooks or actions.

Reference spec: [`docs/rules-api.md`](https://github.com/finch-xu/cc-router-community/blob/main/docs/rules-api.md)
Official example: [`examples/plugins/rules-side-tasks`](https://github.com/finch-xu/cc-router/tree/main/examples/plugins/rules-side-tasks)

## Files to create

1. `cc-router-plugin.json`: `"type": "rules"`, `"entry": "rules.json"`, `"assets": []`.
2. `rules.json`:
   - `params` (max 20): `string` | `number` | `bool` | `enum` | `virtual_model`. Omit `default` to make a param required before enabling. Reference params with `{{params.<id>}}` in action strings or `when.param: "<bool_param_id>"` for toggles.
   - `rules` (max 100): each rule has `id`, `hook` (`"route"` or `"request"`), `when` (AND of optional conditions: `purpose`, `purpose_guessed`, `virtual_model`, `client_tool`, `entry`, `model_requested`, `stream`, `has_tools`, `has_images`, `thinking`, `approx_input_tokens`, `time`, `param`), and `do` (1–20 actions).
   - `route` hook allows `use_virtual_model` and `reject`.
   - `request` hook allows `system_append`, `set_param`, `clamp_param`, `remove_tools`, `redact`, and `reject`.
   - Never duplicate per-subscription features (`slot_schedules`, `slot_efforts`, `extra_headers`, `header_policy`); focus on cross-subscription, purpose-aware, shareable policies.

## Validate locally

```bash
git clone --depth 1 https://github.com/finch-xu/cc-router
cargo run --release --manifest-path cc-router/src-tauri/Cargo.toml \
  -p cc-router-plugin-spec --bin ccr-plugin-check -- /path/to/your-plugin
```

Verify `"ok": true` and inspect `capabilities` (`hooks`, `actions`, `redirects_to`). Test in cc-router via **Plugins → Load from folder**, run a dry run in plugin settings, and publish with `cc-router-submit`.
