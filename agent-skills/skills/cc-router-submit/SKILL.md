---
name: cc-router-submit
description: Publish a finished cc-router plugin (UI theme, receipt theme or provider) to the cc-router community catalog, or release a new version of one — push it to a public GitHub repo, pin a commit, and open a pull request to finch-xu/cc-router-community with the catalog entry, tags and screenshots. Use when the user wants to share, publish, submit, list, 上架, 提交, or update their cc-router theme, receipt or provider plugin in the community store.
---

# Submit a cc-router plugin to the community

The community catalog ([finch-xu/cc-router-community](https://github.com/finch-xu/cc-router-community)) stores **only pointers and showcase images**. The plugin itself stays in the author's own public GitHub repo, pinned to an exact commit. cc-router installs from that commit and checks the package hash, so later changes to the author's repo never reach users silently.

## Before you start

1. The plugin must pass validation. Run the `validate.mjs` from the `cc-router-theme` or `cc-router-receipt` skill and make sure it prints `✅`.
   For a provider plugin (`"type": "provider"`), run the Rust checker instead (needs Rust): `git clone --depth 1 https://github.com/finch-xu/cc-router && cargo run --release --manifest-path cc-router/src-tauri/Cargo.toml -p cc-router-plugin-spec --bin ccr-plugin-check -- <plugin-dir>` and make sure it prints `"ok": true`. See `docs/provider-api.md` in the community repo.
2. The plugin must live in a **public** GitHub repo, at the repo root or in a subfolder.
3. You need the **full 40-character commit SHA** that contains the version to publish (`git rev-parse HEAD` after pushing).

If the plugin isn't in a repo yet, help the user create one. With the GitHub CLI that's `gh repo create <name> --public --source . --push`. Add a short README and a license.

## The catalog entry

Create `plugins/<type>/<id>.json` in the community repo. `<type>` is `theme`, `receipt` or `provider`, and the file name must equal the manifest `id`:

```json
{
  "repo": "owner/repo",
  "path": "optional/subfolder",
  "tags": ["warm", "light"],
  "versions": [{ "commit": "<full 40-character SHA>" }]
}
```

- Omit `path` when the manifest is at the repo root.
- Pick tags only from [`schema/tags.json`](https://github.com/finch-xu/cc-router-community/blob/main/schema/tags.json), at most 5. A new tag can be added to that file in the same PR.
- Don't copy the name, description or version here; CI reads them from the manifest. The package hash is computed by CI as well.

Optional showcase images go in `media/<id>/`:

- `logo.png` (or .jpg / .webp), at most 100 KB.
- `shot-1.png` … `shot-4.png`, at most 500 KB each.
- Screenshots must show the real plugin. Ask the user to take them in cc-router (after **Load from folder → Install**). Don't fabricate or generate mock-ups and present them as screenshots.

## Open the pull request

With the GitHub CLI:

```bash
gh repo fork finch-xu/cc-router-community --clone
cd cc-router-community
git checkout -b add-<id>
# add plugins/<type>/<id>.json and optional media/<id>/…
git add . && git commit -m "Add <id>"
git push -u origin add-<id>
gh pr create --repo finch-xu/cc-router-community --title "Add <id>" --body "<one-line description>"
```

Without the CLI, guide the user through the same steps on github.com: fork, add the files, then open a pull request.

The PR's **validate** check downloads the plugin at the pinned commit and runs the same validator the app uses; results appear in the check summary. Once a maintainer merges it, the catalog is rebuilt automatically, and the plugin shows up under **Plugins → Community** in cc-router.

## Releasing a new version

1. Change the plugin in the author's repo and bump `version` in `cc-router-plugin.json`.
2. Validate again, push, and take the new commit SHA.
3. Open a PR that **appends** `{ "commit": "<new SHA>" }` to the end of `versions` in the catalog entry. Never edit or remove earlier entries.

Users who installed from the community will see "update available".

## Rules to mention to the user

- Public repo; an open-source license is recommended. Font licensing is the author's responsibility.
- Don't impersonate cc-router or other brands.
- Problematic plugins are withdrawn by adding `"revoked": "<reason>"` to the entry, and the app warns everyone who installed them.
