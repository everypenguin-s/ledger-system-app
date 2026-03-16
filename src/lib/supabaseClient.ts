import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase environment variables. ' +
        'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
}

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
    if (supabaseInstance) return supabaseInstance;
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseInstance;
}

// 互換性のためのゲッター
// 【警告】クライアントサイドでのトップレベル参照は 'Multiple GoTrueClient instances' 警告の原因となるため制限しています。
// ブラウザ環境では src/lib/supabase/client.ts の getSupabaseBrowserClient() を使用してください。
export const supabase = (typeof window === 'undefined') 
    ? getSupabase() 
    : new Proxy({} as SupabaseClient, {
        get(_, prop) {
            throw new Error(
                `Supabase client error: Direct access to 'supabase' from supabaseClient.ts is disabled on client-side. ` +
                `Property '${String(prop)}' was accessed. Please use 'getSupabaseBrowserClient()' instead.`
            );
        }
    });

