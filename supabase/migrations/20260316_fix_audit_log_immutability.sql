-- =====================================================================
-- Fix Audit Log Immutability for User Deletion
-- 監査ログの不変制約トリガーを更新し、ユーザー削除時の NULL 化を許可する
-- =====================================================================

CREATE OR REPLACE FUNCTION public.prevent_audit_log_tampering()
RETURNS TRIGGER AS $$
BEGIN
    -- UPDATE時の制限。DELETEはRLSで既に禁止されている前提。
    IF (TG_OP = 'UPDATE') THEN
        -- 条件1: actor_auth_id を NULL に更新する場合（ユーザー物理削除時の参照切り離し）
        -- 条件2: 対応ステータス関連のカラムのみを変更する場合
        -- これら以外が含まれる場合は例外を投げる
        
        IF (NEW.actor_auth_id IS NULL AND OLD.actor_auth_id IS NOT NULL) THEN
            -- ユーザー情報の切り離しのための更新を許可
            -- ただし他の重要項目が書き換えられていないかチェック
            IF (
                OLD.id IS DISTINCT FROM NEW.id OR
                OLD.occurred_at IS DISTINCT FROM NEW.occurred_at OR
                OLD.action_type IS DISTINCT FROM NEW.action_type OR
                OLD.target_type IS DISTINCT FROM NEW.target_type
            ) THEN
                RAISE EXCEPTION 'Audit logs are immutable. Critical fields cannot be changed during unlinking.';
            END IF;
            RETURN NEW;
        ELSIF (
            OLD.id = NEW.id AND
            OLD.occurred_at = NEW.occurred_at AND
            OLD.actor_auth_id = NEW.actor_auth_id AND
            OLD.actor_name = NEW.actor_name AND
            OLD.actor_employee_code = NEW.actor_employee_code AND
            OLD.action_type = NEW.action_type AND
            OLD.target_type = NEW.target_type AND
            OLD.target_id = NEW.target_id AND
            OLD.result = NEW.result AND
            OLD.severity = NEW.severity AND
            OLD.details = NEW.details AND
            OLD.metadata = NEW.metadata AND
            OLD.ip_address = NEW.ip_address
        ) THEN
            -- 対応ステータス等の変更のみを許可（事実上、上記以外の更新を許可）
            RETURN NEW;
        ELSE
            RAISE EXCEPTION 'Audit logs are immutable. Only response/status columns and user unlinking are allowed.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 権限再付与
GRANT EXECUTE ON FUNCTION public.prevent_audit_log_tampering() TO service_role;
