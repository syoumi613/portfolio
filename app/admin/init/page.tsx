'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Shield, KeyRound, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';

export default function AdminInitPage() {
    const [adminCode, setAdminCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const router = useRouter();

    const handleInit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (adminCode.length !== 4) return;

        setLoading(true);
        setMessage(null);

        try {
            // Create Admin User
            const email = `admin_${adminCode}@portfolio.local`;
            const password = `password-${adminCode}`;

            await createUserWithEmailAndPassword(auth, email, password);

            setMessage({ type: 'success', text: 'Admin Code set successfully! Redirecting...' });

            // Delay to show success message
            setTimeout(() => {
                router.push('/admin');
            }, 1500);

        } catch (error: any) {
            console.error("Init failed", error);
            let errorMsg = "Failed to set Admin Code.";
            if (error.code === 'auth/email-already-in-use') {
                errorMsg = "This Admin Code is already in use.";
            }
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
                <div className="text-center mb-8">
                    <div className="mx-auto h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Setup</h1>
                    <p className="text-gray-500 text-sm mt-2">Set your 4-digit Admin Code.</p>
                </div>

                <form onSubmit={handleInit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">Desired Admin Code</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <Shield className="h-5 w-5" />
                            </div>
                            <input
                                type="text"
                                value={adminCode}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                                    setAdminCode(val);
                                }}
                                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-lg tracking-widest font-mono focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                                placeholder="0000"
                                required
                                pattern="\d{4}"
                                inputMode="numeric"
                            />
                        </div>
                        <p className="text-xs text-red-500 mt-2 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            This will create a permanent admin account.
                        </p>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg text-sm flex items-center justify-center ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.type === 'success' ? <CheckCircle className="h-4 w-4 mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || adminCode.length !== 4}
                        className="w-full flex items-center justify-center py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Setting up...' : (
                            <>
                                Set Code & Create Account
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
