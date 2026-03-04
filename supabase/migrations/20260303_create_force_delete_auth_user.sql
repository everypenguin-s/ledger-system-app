-- =====================================================================
-- force_delete_auth_user RPC
-- Service Role 権限で auth.users テーブルのユーザーを強制削除する関数
-- 社員削除時に Supabase Auth ユーザーを合わせて削除するために使用
-- =====================================================================

CREATE OR REPLACE FUNCTION public.force_delete_auth_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Service Role として実行
SET search_path = public
AS $$
BEGIN
    -- auth.users から指定ユーザーを削除（関連する auth.sessions, auth.identities も CASCADE 削除される）
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- 実行権限: authenticated ユーザー（Admin のみが呼び出す想定）と service_role に付与
GRANT EXECUTE ON FUNCTION public.force_delete_auth_user(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.force_delete_auth_user(uuid) TO authenticated;
