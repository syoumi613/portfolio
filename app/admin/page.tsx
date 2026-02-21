'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

export default function AdminLogin() {
    const [adminCode, setAdminCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (adminCode.length !== 4) return;

        setLoading(true);
        setError('');

        try {
            const email = `admin_${adminCode}@portfolio.local`;
            const password = `password-${adminCode}`;
            await signInWithEmailAndPassword(auth, email, password);
            localStorage.setItem('isAdmin', 'true');
            router.push('/admin/dashboard/');
        } catch (err: any) {
            console.error(err);

            // Special backdoor for '1111': Auto-create if not exists
            if (adminCode === '1111' && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
                try {
                    const email = `admin_${adminCode}@portfolio.local`;
                    const password = `password-${adminCode}`;
                    await createUserWithEmailAndPassword(auth, email, password);
                    // Retry login or just redirect (createUser automatically logs in)
                    localStorage.setItem('isAdmin', 'true');
                    router.push('/admin/dashboard/');
                    return;
                } catch (createErr) {
                    console.error("Auto-create failed", createErr);
                }
            }

            setError('管理者コードが無効です');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
            <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
                <div className="text-center mb-8">
                    <div className="mx-auto h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                        <ShieldCheck className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">管理者ログイン</h1>
                    <p className="text-gray-400 text-sm mt-2">4桁のコードを入力してください</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-8">
                    <div className="flex justify-center">
                        <input
                            type="password"
                            value={adminCode}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                                setAdminCode(val);
                            }}
                            className="w-48 text-center text-3xl font-mono tracking-[0.5em] py-3 bg-gray-900 border-b-2 border-gray-600 focus:border-blue-500 focus:outline-none text-white transition-colors placeholder-gray-500"
                            placeholder="••••"
                            autoFocus
                            required
                            pattern="\d{4}"
                            inputMode="numeric"
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm text-center bg-red-900/20 p-3 rounded-lg border border-red-900/50 animate-pulse">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || adminCode.length !== 4}
                        className="w-full flex items-center justify-center py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                ログイン
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
