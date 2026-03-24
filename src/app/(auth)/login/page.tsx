'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../features/context/AuthContext';
import { useToast } from '../../../features/context/ToastContext';
import { Database, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const { showToast, dismissToast, dismissAll } = useToast();
    const router = useRouter();
    const isMountedRef = React.useRef(false);

    // Reset local state on mount (handle back-button cache) - STRICTLY ONCE
    // NOTE: supabase.auth.signOut() はここでは呼ばない。
    //       AuthContext の initSession がタブセッションフラグを見てサインアウトを担う。
    //       ここで logout() を呼ぶと signInWithPassword の直前に signOut 通信が走り、
    //       Supabase のレートリミット(429)が発動する原因となるため除去。
    React.useEffect(() => {
        if (isMountedRef.current) return;
        isMountedRef.current = true;

        if (dismissAll) dismissAll(); // Clear any stale toasts (e.g. previous success)
        setCode('');
        setPassword('');
        setError('');
        setIsSubmitting(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        const toastId = showToast('ログイン中...', 'loading', undefined, 0); // Persistent toast

        try {
            const { user, errorType } = await login(code, password);

            if (user) {
                dismissToast(toastId);
                showToast('ログイン完了', 'success');
                const destination = user.role === 'admin' ? '/' : '/dashboard';
                router.refresh();
                await new Promise(resolve => setTimeout(resolve, 300));
                router.push(destination);
                // バッジ再取得通知（ナビゲーション後）
                setTimeout(() => window.dispatchEvent(new CustomEvent('notification-refresh')), 500);
                // No setIsSubmitting(false) here because we are redirecting away
            } else {
                dismissToast(toastId);
                setIsSubmitting(false);

                let errorMsg = '社員番号またはパスワードが間違っています';
                if (errorType === 'AUTH_RATE_LIMIT') {
                    errorMsg = '短時間に試行回数が多すぎます。しばらく待ってから再度お試しください。';
                } else if (errorType === 'PROFILE_ERROR') {
                    errorMsg = 'プロフィール情報の取得に失敗しました';
                } else if (errorType === 'UNEXPECTED') {
                    errorMsg = 'ログイン処理中に予期せぬエラーが発生しました';
                }

                setError(errorMsg);
                showToast(errorMsg, 'error');
            }
        } catch (err: any) {
            dismissToast(toastId);
            setIsSubmitting(false);
            const errorMsg = 'ログイン処理中にエラーが発生しました';
            setError(errorMsg);
            showToast(errorMsg, 'error');
        }
    };

    const handleHalfWidthChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const filteredValue = e.target.value.replace(/[^\x20-\x7e]/g, '');
        setter(filteredValue);
    };

    return (

        <div className="bg-white p-10 w-full max-w-md border-2 border-ink shadow-offset relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-ink"></div>
            <div className="absolute top-0 right-0 -mr-2 -mt-2 w-8 h-8 bg-accent-electric border-2 border-ink z-10"></div>

            <div className="flex justify-center mb-8">
                <div className="p-4 bg-ink text-white border-2 border-transparent">
                    <Database size={40} />
                </div>
            </div>

            <h1 className="text-3xl font-bold text-center text-ink font-display tracking-tighter mb-2">LEDGER LOGIN</h1>
            <p className="text-center text-ink-light font-mono text-xs tracking-widest mb-10">AUTHORIZED PERSONNEL ONLY</p>

            <form onSubmit={handleSubmit} className="space-y-8" autoComplete="off">
                <div className="relative group">
                    <label className="block text-xs font-bold text-ink uppercase tracking-widest mb-2 font-display">
                        Employee ID
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={code}
                            onChange={handleHalfWidthChange(setCode)}
                            className="w-full pl-4 pr-4 py-3 border-2 border-ink bg-background-subtle focus:bg-white focus:outline-none focus:shadow-offset transition-all font-mono text-ink placeholder-ink-light/50"
                            placeholder="EMP001"
                            name="employee-code"
                            autoComplete="off"
                            data-lpignore="true"
                            data-form-type="other"
                            inputMode="text"
                            pattern="[\x20-\x7e]*"
                            required
                            suppressHydrationWarning
                        />
                    </div>
                </div>

                <div className="relative group">
                    <label className="block text-xs font-bold text-ink uppercase tracking-widest mb-2 font-display">
                        Password
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={handleHalfWidthChange(setPassword)}
                            className="w-full pl-4 pr-12 py-3 border-2 border-ink bg-background-subtle focus:bg-white focus:outline-none focus:shadow-offset transition-all font-mono text-ink placeholder-ink-light/50"
                            placeholder="••••••••"
                            name="employee-password"
                            autoComplete="new-password"
                            data-lpignore="true"
                            data-form-type="other"
                            pattern="[\x20-\x7e]*"
                            required
                            suppressHydrationWarning
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-ink-light hover:text-ink hover:bg-black/5 transition-colors rounded"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="text-white bg-accent-coral border-2 border-ink p-3 text-sm font-bold text-center shadow-sm">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-ink text-white py-4 px-6 border-2 border-transparent hover:bg-accent-electric hover:text-ink hover:border-ink hover:shadow-offset transition-all duration-300 font-bold tracking-widest font-display text-lg uppercase disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-ink disabled:hover:text-white disabled:hover:border-transparent disabled:hover:shadow-none"
                >
                    {isSubmitting ? 'Processing...' : 'Access System'}
                </button>
            </form>


        </div>
    );
}
