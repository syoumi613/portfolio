'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { X, ArrowRight, Loader2 } from 'lucide-react';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const [passcode, setPasscode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    if (!isOpen) return null;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passcode.length !== 4) return;

        setLoading(true);
        setError('');

        try {
            const email = `${passcode}@portfolio.local`;
            const derivedPassword = `pin-${passcode}`;

            // 1. Auth Login
            await signInWithEmailAndPassword(auth, email, derivedPassword);

            // 2. Verify Project Existence in Firestore (Ghost Login Prevention)
            const docRef = doc(db, 'projects', passcode);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                // Check legacy collection just in case
                const legacyRef = doc(db, 'clients', passcode);
                const legacySnap = await getDoc(legacyRef);

                if (!legacySnap.exists()) {
                    throw new Error("Project deleted");
                }
            }

            router.push('/portal/dashboard');
        } catch (err: any) {
            console.error(err);
            // Ignore Auth details, generic error for security/UX
            if (err.message === "Project deleted" || err.code === 'auth/user-not-found') {
                setError('このアクセスコードは無効です');
            } else {
                setError('ログインに失敗しました');
            }

            // Ensure sign out if we managed to auth but failed project check
            if (auth.currentUser) {
                await signOut(auth);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">プロジェクトログイン</h2>
                    <p className="text-gray-500 text-sm mt-2">4桁のアクセスコードを入力してください</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="flex justify-center">
                        <input
                            type="text"
                            value={passcode}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                                setPasscode(val);
                            }}
                            className="w-48 text-center text-3xl font-mono tracking-[0.5em] py-3 border-b-2 border-gray-300 focus:border-black focus:outline-none bg-white text-gray-900 transition-colors placeholder:text-gray-400"
                            placeholder="0000"
                            autoFocus
                            pattern="\d{4}"
                            inputMode="numeric"
                        />
                    </div>

                    {error && (
                        <div className="text-center text-red-500 text-sm py-2 bg-red-50 rounded-lg animate-pulse">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || passcode.length !== 4}
                        className="w-full flex items-center justify-center py-3.5 bg-black text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-gray-200"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                アルバムを見る <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
