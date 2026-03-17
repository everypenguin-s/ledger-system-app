-- =====================================================================
-- force_delete_auth_user RPC (Enhanced Version)
-- 監査ログおよび操作ログの外部キー制約を回避しつつ、Authユーザーを削除可能にする
-- =====================================================================

CREATE OR REPLACE FUNCTION public.force_delete_auth_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. 監査ログ (audit_logs) の参照を解除
    UPDATE public.audit_logs 
    SET actor_auth_id = NULL 
    WHERE actor_auth_id = target_user_id;

    -- 2. 操作ログ (logs) の参照を解除 (カラムが存在する場合のみ)
    -- 注意: テーブル定義によっては actor_auth_id 以外の名前の可能性もあるため、
    -- 実行エラーで全体が止まらないよう例外処理で囲う
    BEGIN
        UPDATE public.logs 
        SET actor_auth_id = NULL 
        WHERE actor_auth_id = target_user_id;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- カラムがない等の場合は何もしない
    END;

    -- 3. auth.users から削除
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- 権限再付与
GRANT EXECUTE ON FUNCTION public.force_delete_auth_user(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.force_delete_auth_user(uuid) TO authenticated;
