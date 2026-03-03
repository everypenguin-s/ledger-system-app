-- -----------------------------------------------------------------------------
-- Migration: 20260303_seed_audit_anomaly_rules.sql
-- Description: 本番環境の audit_anomaly_rules テーブルに初期ルールデータを投入する
-- -----------------------------------------------------------------------------

-- 1. テーブル作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS public.audit_anomaly_rules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_key    TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    enabled     BOOLEAN NOT NULL DEFAULT true,
    severity    TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    params      JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. RLS を有効化
ALTER TABLE public.audit_anomaly_rules ENABLE ROW LEVEL SECURITY;

-- 3. RLS ポリシー（既存があれば再作成しないようにIF NOT EXISTS相当）
DO $$
BEGIN
    -- 管理者: SELECT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_anomaly_rules' AND policyname = 'audit_rules_admin_select'
    ) THEN
        CREATE POLICY "audit_rules_admin_select"
        ON public.audit_anomaly_rules FOR SELECT
        TO authenticated USING (public.is_admin());
    END IF;

    -- 管理者: UPDATE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_anomaly_rules' AND policyname = 'audit_rules_admin_update'
    ) THEN
        CREATE POLICY "audit_rules_admin_update"
        ON public.audit_anomaly_rules FOR UPDATE
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    END IF;

    -- service_role: INSERT（初期データ投入やバックエンドからの操作用）
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_anomaly_rules' AND policyname = 'audit_rules_service_insert'
    ) THEN
        CREATE POLICY "audit_rules_service_insert"
        ON public.audit_anomaly_rules FOR INSERT
        TO service_role WITH CHECK (true);
    END IF;
END $$;

-- 4. 初期ルールデータの投入（既存のものは更新しない）
INSERT INTO public.audit_anomaly_rules (rule_key, description, enabled, severity, params)
VALUES
    (
        'MULTIPLE_FAILED_LOGINS',
        '短時間内に同一ユーザーまたはIPからのログイン失敗が一定回数を超えた場合に検知します（ブルートフォース攻撃の疑い）。',
        true,
        'high',
        '{"threshold": 5, "window_minutes": 10}'::jsonb
    ),
    (
        'AFTER_HOURS_ACCESS',
        '設定した時間帯外のシステムアクセスを検知します（深夜・休日の不審なアクセスを監視）。',
        false,
        'medium',
        '{"start": "22:00", "end": "06:00"}'::jsonb
    )
ON CONFLICT (rule_key) DO NOTHING;
-- ↑ ON CONFLICT DO NOTHING: 既にデータが存在する場合は何もしない（冪等性確保）
