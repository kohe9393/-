# 日本史 一問一答（坂本先生プリント）

スマホのブラウザで使う、日本史の一問一答学習アプリ。難関私大レベル。

- `index.html` … アプリ本体（Phase 3 で作成）
- `sw.js` … オフライン用 Service Worker（Phase 3 で作成）
- `data/questions.json` … 問題本体（唯一の正データ）
- `data/history.json` / `data/stats.json` … 学習記録のバックアップ兼分析用
- `CLAUDE.md` … Claude が守る運用ルール

学習中の正データは端末の localStorage。リポジトリ側はバックアップなので、
アプリの「エクスポート」→ チャットに貼る → Claude が更新、の一方向でのみ同期する。

公開 URL: （Phase 3 で GitHub Pages を有効化してから記載）
