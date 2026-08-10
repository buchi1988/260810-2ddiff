# 260810-2ddiff

平面曲線の微分幾何学（接線・法線・曲率・接触円・縮閉線・曲率櫛）をインタラクティブに探索できる、モノクロでシンプルな静的Webページです。ビルド不要の素のHTML/CSS/JavaScript（ES Modules）で作られており、Cloudflare Workers（静的アセット配信）にそのままデプロイできます。

## 機能

- 円・楕円・放物線・正弦曲線・サイクロイド・アステロイド・カージオイド・対数螺旋・リサージュ曲線のプリセット、および `x(t)`, `y(t)` を自分で入力できるカスタム曲線
- パラメータ `t` をスライダーまたは曲線上のドラッグで操作
- 自動再生（速度調整可）
- 接線ベクトル・法線ベクトル・接触円（曲率円）・曲率櫛・縮閉線の表示切り替え
- 曲率 κ(t) のグラフ表示
- 位置・速さ・接線・法線・曲率・曲率半径・弧長の数値パネル

すべての導関数は中心差分による数値微分で計算しているため、プリセット曲線とカスタム曲線を同じロジックで扱っています。カスタム曲線の式は `eval` を使わない独自の再帰下降パーサーで安全に評価しています。

## ローカルで確認する

ビルド不要なので、任意の静的サーバーで `index.html` を配信するだけで動作します。

```sh
npx serve .
# もしくは
npm run dev
```

## Cloudflareへのデプロイ

このリポジトリの `wrangler.toml` は `[assets]` でルートディレクトリを静的アセットとして配信する設定になっています（Workerスクリプトは持たない、静的サイト用の構成）。`.assetsignore` で `.git` や `README.md` などサイトに不要なファイルをアップロード対象から除外しています。

### Wrangler CLIを使う場合

```sh
npm install
npx wrangler login
npm run deploy
```

### Git連携（ダッシュボード）を使う場合

1. Cloudflareダッシュボードで「Workers & Pages」からGitリポジトリを接続してプロジェクトを作成
2. ビルドコマンドは空欄のままでよい（`wrangler.toml` の設定がそのまま使われる）
3. デプロイコマンドが自動的に `npx wrangler deploy` として実行され、`wrangler.toml` の `[assets]` 設定によって静的サイトとして配信される

> `wrangler` はv4系（`package.json` で `^4.120.0` を指定）を使用してください。v3では `wrangler deploy` が `[assets]` 構成を認識せず、`It looks like you've run a Workers-specific command in a Pages project` のようなエラーになります。

## ファイル構成

```
index.html          エントリーポイント
style.css            モノクロのスタイル
js/curves.js         曲線プリセットの定義
js/expr.js            カスタム曲線用の安全な数式パーサー
js/geometry.js        数値微分・曲率・弧長などの微分幾何計算
js/render.js          Canvas描画（曲線・ベクトル・接触円・曲率グラフなど）
js/main.js            UIの状態管理とイベント配線
wrangler.toml         Cloudflare Workers（静的アセット配信）用の設定
.assetsignore          デプロイ時にアップロードしないファイルの指定
```
