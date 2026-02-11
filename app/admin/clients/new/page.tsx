'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, getApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { UserPlus, Save, ArrowLeft, CheckCircle, AlertCircle, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function CreateClientPage() {
    const [name, setName] = useState('');
    const [passcode, setPasscode] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const router = useRouter();

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passcode.length !== 4 || isNaN(Number(passcode))) {
            setMessage({ type: 'error', text: "アクセスコードは4桁の数字である必要があります。" });
            return;
        }

        setLoading(true);
        setMessage(null);

        // Use a secondary app to avoid logging out the current admin
        const firebaseConfig = {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        };

        const secondaryAppName = `secondaryApp-${Date.now()}`;
        let secondaryApp;

        try {
            // 0. Check if Passcode already exists in Firestore
            // (Optional but good for UX, though Auth will also fail on email collision)
            const docRef = doc(db, 'clients', passcode);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                throw new Error("このアクセスコードは既に使用されています。");
            }

            secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
            const secondaryAuth = getAuth(secondaryApp);

            // 1. Create Auth User
            // Strategy: Use passcode as email prefix: "{passcode}@portfolio.local"
            // Password: "pin-{passcode}" (to meet min length requirements)
            const email = `${passcode}@portfolio.local`;
            const derivedPassword = `pin-${passcode}`;

            await createUserWithEmailAndPassword(secondaryAuth, email, derivedPassword);
            await signOut(secondaryAuth); // Immediately sign out

            // 2. Create Firestore Profile
            // Client ID IS the passcode for simplicity in lookups
            await setDoc(doc(db, 'clients', passcode), {
                name,
                clientId: passcode, // legacy field name kept for compatibility
                email,
                createdAt: serverTimestamp(),
                isActive: true
            });

            setMessage({ type: 'success', text: `顧客 "${name}" (コード: ${passcode}) を作成しました！` });
            setName('');
            setPasscode('');

        } catch (error: any) {
            console.error("Creation failed", error);
            let errorMsg = error.message || "顧客の作成に失敗しました。";
            if (error.code === 'auth/email-already-in-use') {
                errorMsg = "このアクセスコードは既に使用されています。";
            }
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            if (secondaryApp) {
                await deleteApp(secondaryApp);
            }
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-4">
                <Link href="/admin/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-xl font-bold text-gray-900">新規顧客登録</h1>
            </div>

            <div className="flex-1 p-8">
                <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                    <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-100">
                        <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                            <UserPlus className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">顧客アクセス設定 (パスコード)</h2>
                            <p className="text-sm text-gray-500">ログイン用の4桁のコードを生成します。</p>
                        </div>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">顧客名</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                                    placeholder="例: 山田様"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">アクセスコード (4桁)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <KeyRound className="h-5 w-5" />
                                    </div>
                                    <input
                                        type="text"
                                        value={passcode}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                                            setPasscode(val);
                                        }}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-lg tracking-widest font-mono"
                                        placeholder="0000"
                                        required
                                        pattern="\d{4}"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">4桁の数字のみ入力可能です。</p>
                            </div>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                {message.text}
                            </div>
                        )}

                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading || passcode.length !== 4}
                                className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-md shadow-purple-500/20"
                            >
                                {loading ? '作成中...' : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        コードを保存
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
