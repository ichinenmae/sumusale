# 売上管理 Webアプリ（GitHub Pages / 完全クライアントサイド）

## 概要
Uber Eats等のCSV（`trip_activity` / `payments_order`）をブラウザで読み込み、売上推移（積み上げステップチャート）と詳細表を表示します。
サーバー処理は不要で、CSVは外部へ送信しません。

## 使い方
1. `index.html`, `app.js`, `styles.css` を同一フォルダに置きます。
2. GitHub Pagesで公開する場合は、この3ファイルをリポジトリの `docs/` か root に配置してください。
3. ブラウザで開き、CSVをドラッグ&ドロップします（複数同時OK、追加ドロップでマージ）。

## 集計ルール
- 結合キー: `trip_activity` の「乗車の UUID」 ↔ `payments_order` の「乗車ID」
- 配達報酬: `payments_order` で「乗車ID」がある行の「支払い額」合計
- プロモーション: `payments_order` で「乗車ID」が空欄の行の「支払い額」合計
- 業務日付: 午前4:00 で日付切替
- 週の開始: 月曜始まり

## 注意
- CSVの列名が異なる場合は `app.js` の `findCol()` 候補を増やしてください。
- データが非常に多い場合、詳細表は描画負荷を抑えるため一部のみ表示します。
