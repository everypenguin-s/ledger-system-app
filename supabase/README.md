# Supabase メンテナンスガイド

このディレクトリ配下には、データベースの構成を Git で管理するための設定とドキュメントが含まれています。

## ファイル構成
- `SCHEMA_GUIDE.md`: 関数・トリガー等の詳細仕様
- `migrations/`: SQLマイグレーションファイル
- `production_schema.sql`: スキーマのフルバックアップ

## よく使うコマンド (package.json から実行)

### 1. DBの状態を確認する
```bash
npm run db:diff
```
リモートDBとローカルの設定（migrations）の差分を表示します。考慮漏れの変更がないか確認します。

### 2. スキーマを取得する
```bash
npm run db:pull
```
リモートDBから最新のスキーマを `production_schema.sql` に吸い出します。

### 3. 新しいマイグレーションを作成する
```bash
supabase migration new [name]
```
新しい変更用の空ファイルを作成します。

## 注意事項
- **本番DBへの直接変更は避ける**: SQL Editor での直接編集は、緊急時を除き避けてください。
- **物理削除の追加**: 新しいマスタやトランザクションテーブルを追加した際は、必ず `SCHEMA_GUIDE.md` を確認し、削除プロセスの影響を確認してください。
