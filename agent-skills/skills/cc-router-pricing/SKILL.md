---
name: cc-router-pricing
description: Build and validate a cc-router pricing table plugin (`type: "pricing"`, `pricing.json`) for estimating API usage costs in USD or CNY. Use when the user wants to create or update a price table plugin for cc-router statistics, request logs, and usage receipts.
---

# Build a cc-router Pricing Plugin

A pricing plugin ships a `pricing.json` (`pricingApi: 1`) price table — **data only, zero network access, zero executable code**. cc-router ships no built-in prices; costs are computed on read using enabled pricing plugins (in priority order).

Reference spec: [`docs/pricing-api.md`](https://github.com/finch-xu/cc-router-community/blob/main/docs/pricing-api.md)
Official example: [`examples/plugins/pricing-sample`](https://github.com/finch-xu/cc-router/tree/main/examples/plugins/pricing-sample)

## Files to create

1. `cc-router-plugin.json`:
   - `"type": "pricing"`, `"entry": "pricing.json"`, `"assets": []`.
   - Include `homepage` pointing to the official pricing source or changelog.
2. `pricing.json`:
```json
{
  "pricingApi": 1,
  "currency": "USD",
  "per": 1000000,
  "prices": [
    {
      "provider": "anthropic",
      "model": "claude-sonnet-*",
      "input": 3.0,
      "output": 15.0,
      "cache_read": 0.3,
      "cache_write": 3.75
    }
  ]
}
```
- `currency`: `"USD"` or `"CNY"` (one currency per plugin).
- `provider`: built-in provider id, `plugin:<id>`, or `"*"` (exact provider wins over `"*"`).
- `model`: exact upstream model id or trailing `"*"` prefix (exact wins over longest prefix).
- Always specify `cache_read` and `cache_write` when the vendor discounts cache tokens (omitting them falls back to `input`).
- `input` is always uncached input tokens (cc-router normalizes translation providers automatically).

## Validate locally

```bash
git clone --depth 1 https://github.com/finch-xu/cc-router
cargo run --release --manifest-path cc-router/src-tauri/Cargo.toml \
  -p cc-router-plugin-spec --bin ccr-plugin-check -- /path/to/your-plugin
```

Verify `"ok": true` and check `capabilities` (`currency`, `rules`, `providers`). Document the official pricing source and last-verified date in the plugin description/README before publishing with `cc-router-submit`.
