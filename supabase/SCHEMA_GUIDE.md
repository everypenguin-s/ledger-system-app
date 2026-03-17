# Supabase データベース・スキーマガイド

このドキュメントでは、本システムで使用されている重要なデータベース内部ロジック（RPC、トリガー、制約）の役割とメンテナンス方法について説明します。

## 1. 重要な RPC (Stored Procedures)

### `force_delete_auth_user(target_user_id uuid)`
- **役割**: 指定された `auth.users` のレコードを物理削除します。
- **背景**: 監査ログ (`audit_logs`) やエラーログ (`system_error_logs`) 等にユーザーへの外部キーがあるため、通常の削除は失敗します。この関数は参照を NULL で切り離してから削除を実行します。
- **メンテナンス時の注意**:
  - `auth.users` を参照する新しいテーブルを追加した場合は、この関数内にその参照を NULL 更新する処理を追記する必要があります。
  - `admin` 権限（`SECURITY DEFINER`）で動作します。

## 2. 重要なトリガー・制約

### `prevent_audit_log_tampering()` (audit_logs テーブル)
- **役割**: 監査ログの改ざん（更新・削除）を防止します。
- **例外**: ユーザー削除に伴う `actor_auth_id` の NULL 化のみを許可するように設計されています。
- **メンテナンス時の注意**:
  - カラムを追加した際は、この関数の変更検知ロジック（比較部分）に新カラムを追加検討してください。

## 3. 運用・メンテナンス手順

### マイグレーションの管理
- 全てのスキーマ変更は `supabase/migrations` フォルダ内の SQL ファイルを通じて行います。
- 手動で SQL Editor から実行した変更も、必ずマイグレーションファイルとして Git に反映させてください。

### 環境間の同期
- `npm run db:diff` を定期的に実行し、DB 実環境とローカルのマイグレーションファイルの乖離を確認してください。
- `supabase/production_schema.sql` は、本番環境の最新スキーマのバックアップとして機能します。

## 4. テーブル構成（主要マスタ）
- `employees`: 社員情報（`employee_code` ユニーク）
- `iphones` / `tablets` / `featurephones` / `routers`: 各種デバイス管理
- `addresses`: 事業所・住所情報
- `areas`: エリア名
