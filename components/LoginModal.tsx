'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
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
    const [validProjects, setValidProjects] = useState<Set<string>>(new Set());
    const router = useRouter();

    // Pre-fetch valid project IDs on modal open for Zero Latency
    useEffect(() => {
        if (isOpen) {
            setPasscode('');
            setError('');
            setLoading(false);

            const fetchValidProjects = async () => {
                try {
                    // Fetch all project IDs (lightweight)
                    const projectsSnap = await getDocs(collection(db, 'projects'));
                    const pIds = new Set<string>();
                    projectsSnap.forEach(doc => pIds.add(doc.id));

                    // Fallback for legacy clients
                    const clientsSnap = await getDocs(collection(db, 'clients'));
                    clientsSnap.forEach(doc => pIds.add(doc.id));

                    setValidProjects(pIds);
                } catch (err) {
                    console.error("Failed to pre-fetch project IDs", err);
                }
            };

            fetchValidProjects();
        }
    }, [isOpen]);

    // Synchronous Derived State (Zero Latency)
    const isCodeValid = passcode.length === 4 && validProjects.has(passcode);

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

            // 2. Verify Project Existence (Ghost Login Prevention)
            // Use Client-side Cache for speed, or fallback to Auth success
            if (!validProjects.has(passcode)) {
                // If not in cache (extremely rare if pre-fetched correctly), re-verify
                const docRef = doc(db, 'projects', passcode);
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) {
                    const legacyRef = doc(db, 'clients', passcode);
                    const legacySnap = await getDoc(legacyRef);
                    if (!legacySnap.exists()) throw new Error("Project deleted");
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
                                    type="text"
                                    inputMode="text"
                                    autoCapitalize="none"
                                    maxLength={4}
                                    value={passcode}
                                    onChange={(e) => {
                                        let val = e.target.value;
                                        // 1. Full-width to Half-width conversion
                                        val = val.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
                                            return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
                                        });
                                        // 2. Remove non-alphanumeric characters
                                        val = val.replace(/[^0-9a-zA-Z]/g, '');
                                        // 3. Normalize to lowercase (Case-insensitive)
                                        val = val.toLowerCase();

                                        setPasscode(val.slice(0, 4));
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
                                disabled={loading || !isCodeValid}
                                className={`
                                    group w-full flex items-center justify-center py-4 rounded-full font-medium tracking-widest text-xs
                                    transition-all duration-200 shadow-lg 
                                    ${isCodeValid
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl opacity-100 translate-y-0 cursor-pointer'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'}
                                `}
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <span className="flex items-center gap-2">
                                        アルバムを見る
                                        <ArrowRight className={`h-3 w-3 transform transition-transform ${isCodeValid ? 'group-hover:translate-x-1' : ''}`} />
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
