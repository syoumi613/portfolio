'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { X, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const [passcode, setPasscode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    // Reset state when modal opens
    // Using useEffect ensures we start fresh every time the modal is shown
    useEffect(() => {
        if (isOpen) {
            setPasscode('');
            setError('');
            setLoading(false);
        }
    }, [isOpen]);

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

            // Close modal and reset state after a short delay to allow transition to start
            setTimeout(() => {
                onClose();
                setPasscode('');
            }, 100);

        } catch (err: any) {
            console.error(err);
            // Ignore Auth details, generic error for security/UX
            if (err.message === "Project deleted" || err.code === 'auth/user-not-found') {
                setError('このアクセスコードは無効です');
            } else {
                setError('ログインに失敗しました');
            }
            setLoading(false);

            // Ensure sign out if we managed to auth but failed project check
            if (auth.currentUser) {
                await signOut(auth);
            }
        }
        // Note: We don't set loading(false) on success to prevent UI flicker before transition
    };

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-white/40 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{
                            type: "spring",
                            damping: 25,
                            stiffness: 300
                        }}
                        className="relative bg-white w-full max-w-[360px] rounded-[32px] shadow-2xl p-10 overflow-hidden border border-gray-100/50"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black rounded-full hover:bg-gray-50 transition-colors duration-300"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="text-center mb-12 mt-4">
                            <h2 className="text-2xl font-medium text-gray-900 tracking-widest uppercase">
                                写真を受け取る
                            </h2>
                            <p className="text-gray-400 text-xs mt-3 tracking-widest font-light">
                                4桁のアクセスコードを入力してください
                            </p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-10">
                            {/* Segmented Input */}
                            <div className="relative flex justify-center gap-3">
                                {/* Invisible Input specifically for mobile keyboard handling */}
                                <input
                                    type="tel" // Changed to tel for reliable number pad on iOS/Android
                                    pattern="[0-9]*" // Ensures number pad on iOS
                                    inputMode="numeric"
                                    maxLength={4}
                                    value={passcode}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                                        setPasscode(val);
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                    autoFocus
                                    autoComplete="off"
                                />

                                {/* Visual Display for Digits */}
                                {[0, 1, 2, 3].map((index) => {
                                    const digit = passcode[index] || '';
                                    const isActive = passcode.length === index;
                                    const isFilled = passcode.length > index;

                                    return (
                                        <div
                                            key={index}
                                            className={`
                                                w-12 h-16 flex items-center justify-center 
                                                text-3xl font-sans text-gray-900
                                                border-b-[1.5px] transition-all duration-200
                                                ${isActive ? 'border-black' : isFilled ? 'border-gray-800' : 'border-gray-200'}
                                            `}
                                        >
                                            <AnimatePresence mode="popLayout">
                                                {digit ? (
                                                    <motion.span
                                                        key={`digit-${index}-${digit}`}
                                                        initial={{ opacity: 0, y: 5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0 }}
                                                        className="block text-center w-full"
                                                    >
                                                        {digit}
                                                    </motion.span>
                                                ) : (
                                                    // Placeholder: faint dot "・"
                                                    <motion.span
                                                        key={`placeholder-${index}`}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 0.15 }} // Very low opacity
                                                        exit={{ opacity: 0 }}
                                                        className="block text-center w-full text-gray-400 font-light select-none"
                                                    >
                                                        ・
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center text-red-500 text-xs py-2 bg-red-50 rounded-lg"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || passcode.length !== 4}
                                className={`
                                    group w-full flex items-center justify-center py-4 rounded-full font-medium tracking-widest text-xs
                                    transition-all duration-300 shadow-lg 
                                    ${passcode.length === 4
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl opacity-100 translate-y-0'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}
                                `}
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <span className="flex items-center gap-2">
                                        アルバムを見る
                                        <ArrowRight className={`h-3 w-3 transform transition-transform ${passcode.length === 4 ? 'group-hover:translate-x-1' : ''}`} />
                                    </span>
                                )}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
