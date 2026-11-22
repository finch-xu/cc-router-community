<p align="center">
  <img src="assets/header-cc-router.svg" alt="cc-router" width="300" height="130">&emsp;<img src="assets/header-divider.svg" alt="" width="2" height="130">&emsp;<img src="assets/header-sparrow-bakery.svg" alt="Sparrow Bakery" width="300" height="130">
</p>
<p align="center">
  <b>cc-router コミュニティ創作センター</b>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;<b>スズメベーカリー</b>&emsp;&emsp;&emsp;&emsp;
</p>

<p align="center">
  <a href="README.md">中文</a> · <a href="README.en.md">English</a> · <strong>日本語</strong>
</p>

# Sparrow Bakery

ここは [cc-router](https://github.com/finch-xu/cc-router) のプラグインストア用カタログ、**Sparrow Bakery（スズメベーカリー）** です。アプリの「プラグイン」ページは、このリポジトリから生成される `index.json` を読み込みます。

現在対応しているプラグインの種類：

| 種類 | ディレクトリ | 内容 |
|---|---|---|
| UIテーマ | `plugins/theme/` | 色・形・テクスチャ・フォント |
| レシートテーマ | `plugins/receipt/` | HTML テンプレート + CSS + フォント（仕様は [docs/receipt-api.md](docs/receipt-api.md) を参照） |
| プロバイダー | `plugins/provider/` | cc-router 内蔵プロバイダーと同じ形式のプロバイダー記述（仕様は [docs/provider-api.md](docs/provider-api.md)、中国語）。プロバイダープラグインに対応した cc-router が必要です |

**プラグインに含まれるのはデータのみで、コードは一切実行されません。** テーマは公開済みのトークン表（[docs/theme-api.md](docs/theme-api.md) を参照）を埋めるだけで、CSS セレクタの記述・ネットワーク通信・スクリプト実行はすべて不可となっています。そのため将来 cc-router の UI が刷新されても、テーマが「半分だけ崩れる」ことはありません。レシートは制限付きの HTML テンプレート + CSS で、公開済みのデータ項目表のみを参照できます（[docs/receipt-api.md](docs/receipt-api.md) を参照）。プロバイダープラグインはプロバイダーの記述で、cc-router の Rust チェッカーで検証されます。インストール前に、入力した API キーがどのドメインに送信されるかが表示されます。

## このリポジトリに置くもの

**「ポインタ」と紹介用画像だけ**を置き、プラグイン本体は作者自身のリポジトリに残します：

```
plugins/theme/<プラグイン id>.json   ← リポジトリ名 + コミットハッシュ + タグ（レシートは plugins/receipt/、プロバイダーは plugins/provider/）
media/<プラグイン id>/logo.png        ← 任意、100 KB 以下
media/<プラグイン id>/shot-1.png      ← 任意、各 500 KB 以下、最大 4 枚
```

`index.json` は CI が自動生成するため、手動で編集しないでください。

## AI にプラグインを作ってもらう

このリポジトリは Claude Code のプラグインマーケットプレイスも兼ねています。含まれている **cc-router プラグインキット** には 3 つの skill が入っており、必要に応じて自動で有効になります：

| skill | 用途 |
|---|---|
| `cc-router-theme` | UIテーマを作成：配色の設計、`theme.json` の記述、コントラスト比チェック、ライト／ダーク両方のプレビュー生成 |
| `cc-router-receipt` | レシートテーマを作成：テンプレートと CSS を記述し、サンプルデータで 3 通りの表示設定それぞれのプレビューを生成 |
| `cc-router-submit` | 完成したプラグインを GitHub にプッシュし、コミットを固定してこのリポジトリへ PR を作成。新バージョンの公開にも対応 |

Claude Code でインストール：

```
/plugin install cc-router-plugin-kit --marketplace finch-xu/cc-router-community
```

旧バージョンの Claude Code では 2 ステップに分けて実行します：`/plugin marketplace add finch-xu/cc-router-community` のあと、`/plugin install cc-router-plugin-kit@cc-router-community`。

インストール後は「森っぽいグリーンの cc-router テーマを作って」「電車の切符風のレシートを作って」などと話しかけるだけです。skill に同梱された検証スクリプトは cc-router と**まったく同じ**検証コードを実行します（初回実行時に `~/.cache/cc-router-plugin-kit/` へ浅くクローンするため、git と Node 22.18+ が必要です）。そのため、このスクリプトを通過すればアプリ本体とこのリポジトリの CI でも問題なく通ります。

Agent Skills に対応した他の AI ツールを使う場合は、[`agent-skills/skills/`](agent-skills/skills/) 配下のフォルダをそのツールの skills ディレクトリにコピーしてください。

## テーマを作る

1. **公開（Public）** の GitHub リポジトリを作成し、ルートディレクトリ（または任意のサブディレクトリ）に 2 つのファイルを置きます：

   `cc-router-plugin.json`（プラグインマニフェスト）

   ```json
   {
     "manifest": 1,
     "id": "my-theme",
     "type": "theme",
     "version": "1.0.0",
     "name": { "ja": "マイテーマ", "en": "My Theme" },
     "description": { "ja": "ひとこと紹介", "en": "One-line description" },
     "author": "your-github-name",
     "license": "MIT",
     "entry": "theme.json",
     "assets": []
   }
   ```

   `theme.json`（テーマ本体。書き方は [docs/theme-api.md](docs/theme-api.md) を参照）

   ```json
   {
     "themeApi": 1,
     "base": "quiet",
     "light": { "colors": { "canvas": "#fffaf1", "accent": "#b9501c" } },
     "dark":  { "colors": { "canvas": "#1e1813", "accent": "#ff9a5c" } }
   }
   ```

   完全な見本：cc-router リポジトリの [`examples/plugins/sparrow-sun`](https://github.com/finch-xu/cc-router/tree/main/examples/plugins/sparrow-sun)（内蔵テーマ「スズメ」のプラグイン版）。

2. ローカルでデバッグ：cc-router →「プラグイン」→「フォルダから読み込む」でフォルダを選び、まず「試着」で確認してからインストールできます。
3. プッシュ後は「リンクからインストール」に `https://github.com/あなた/リポジトリ/tree/<コミットハッシュ>` を貼り付けて試してください。ユーザーが実際にインストールするのと同じ経路で確認できます。

`id` には英小文字・数字・ハイフンのみ使用できます（2〜40 文字）。内蔵テーマと重複する名前は使えません。

レシートプラグインを作る場合は、マニフェストに `"type": "receipt"` と `"entry": "receipt.json"` を指定し、[docs/receipt-api.md](docs/receipt-api.md) に沿ってテンプレートとスタイルを記述してください。完全な見本は cc-router リポジトリの [`examples/plugins/receipt-sparrow-bakery`](https://github.com/finch-xu/cc-router/tree/main/examples/plugins/receipt-sparrow-bakery) にあります。インストール確認ダイアログではサンプルデータによるプレビューが表示されます。

プロバイダープラグインを作る場合は、マニフェストに `"type": "provider"` と `"entry": "provider.yaml"` を指定し、[docs/provider-api.md](docs/provider-api.md) に沿って記述してください（cc-router 内蔵プロバイダーと同じ形式）。完全な見本は [`examples/plugins/provider-example-relay`](https://github.com/finch-xu/cc-router/tree/main/examples/plugins/provider-example-relay) にあります。CI はチェック結果に「API キーの送信先」ドメインを表示し、レビュアーはそれを確認します。

## コミュニティに投稿する

1. このリポジトリを Fork します。
2. `plugins/theme/<id>.json`（レシートプラグインは `plugins/receipt/<id>.json`、プロバイダープラグインは `plugins/provider/<id>.json`）を新規作成します：

   ```json
   {
     "repo": "your-github-name/my-theme",
     "tags": ["warm", "light"],
     "versions": [{ "commit": "完全な 40 桁のコミットハッシュ" }]
   }
   ```

   - 1 つのリポジトリに複数のプラグインを入れる場合は `"path": "サブディレクトリ"` を追加してください。
   - タグは [`schema/tags.json`](schema/tags.json) から最大 5 つまで選べます。新しいタグが必要な場合は同じ PR で追加できます。
3. 任意：`media/<id>/logo.png` や `media/<id>/shot-1.png`… を追加します（png / jpg / webp）。
4. PR を作成します。CI が指定コミットのファイルをダウンロードし、アプリ本体と**同じ検証コード**でチェックします。結果は PR のチェックサマリーに表示されます。

名前・説明・バージョンはマニフェストから読み込まれるため、ここで重複して書く必要はありません。パッケージのハッシュも CI が計算します。

### 新しいバージョンを公開する

自分のリポジトリを更新してマニフェストの `version` を上げたあと、`versions` の**末尾**に新しいコミットハッシュを追加する PR を作成します。インストール済みのユーザーにはプラグインページで「更新あり」と表示されます。

## ルール

- 公開リポジトリであること（オープンソースライセンスの付与を推奨します）。
- cc-router 公式や他ブランドになりすます名前・ロゴは禁止です。
- スクリーンショットはテーマの実際の見た目を使用してください。
- フォントのライセンスは作者自身の責任で管理してください。
- ルール違反や問題のあるプラグインは公開停止となります。エントリに `"revoked": "理由"` が記載され、インストール済みのユーザーに通知されます。

## セキュリティ

- アプリはインストール時に指定されたコミットに固定し、内容のハッシュを照合します。あとから作者がリポジトリを変更しても、インストール済みユーザーに無断で影響することはありません。
- テーマのすべての値は構文の許可リスト（色・長さ・影など）を通過する必要があり、画像とフォントはプラグインパッケージ内に含まれるもののみ使用できます。SVG にはスクリプトや外部リンクを含められません。
- プロバイダープラグインの URL は https（またはローカルホストへの http）のみで、ホスト名にプレースホルダーは使えません。インストール前に API キーの送信先ドメインが表示され、更新時は追加されたドメインが通知されます。プラグインが更新されても、既存のサブスクの接続先が勝手に変わることはありません。
- ユーザーはこのカタログを経由せず、任意のリポジトリを「リンクからインストール」で直接導入することもできます。その場合、アプリに「コミュニティの審査を受けていません」という注意が表示されます。
