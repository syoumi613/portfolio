'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import LoginModal from '@/components/LoginModal';
import { motion, AnimatePresence, Variants } from "framer-motion";

export default function PublicHeader() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();

    if (pathname.startsWith('/admin')) {
        return null;
    }

    // Common Button Component to avoid duplication code
    const ReceivePhotosButton = ({ className, onClick }: { className?: string, onClick?: () => void }) => (
        <button
            onClick={() => {
                setIsModalOpen(true);
                if (onClick) onClick();
            }}
            className={`inline-block px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 min-w-max ${className}`}
        >
            写真を受け取る
        </button>
    );

    // Menu Variants for Animation
    const menuVariants: Variants = {
        closed: {
            opacity: 0,
            y: -20,
            transition: {
                duration: 0.2,
                ease: "easeInOut"
            }
        },
        open: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.3,
                ease: "easeOut",
                staggerChildren: 0.1,
                delayChildren: 0.1
            }
        }
    };

    const itemVariants: Variants = {
        closed: { opacity: 0, y: -10 },
        open: { opacity: 1, y: 0 }
    };

    return (
        <>
            <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

            <header className="fixed top-0 left-0 w-full z-50 h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-6 h-full relative">

                    {/* --- MOBILE VIEW (Grid Layout) --- */}
                    <div className="md:hidden grid grid-cols-3 items-center h-full w-full">
                        {/* Left: Logo */}
                        <div className="flex items-center justify-start">
                            <Link href="/" aria-label="ホーム" className="text-gray-800 hover:text-gray-500 transition-colors z-50 relative" onClick={() => setIsMenuOpen(false)}>
                                <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                    </svg>
                                </div>
                            </Link>
                        </div>

                        {/* Center: Button */}
                        <div className="flex items-center justify-center">
                            <ReceivePhotosButton />
                        </div>

                        {/* Right: Hamburger */}
                        <div className="flex items-center justify-end">
                            <button
                                className="z-50 relative p-2 text-gray-800 focus:outline-none"
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                aria-label="Menu"
                            >
                                <div className="w-6 h-6 flex flex-col justify-center items-center gap-1.5">
                                    <motion.span
                                        animate={isMenuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                                        className="w-6 h-0.5 bg-gray-800 block transition-transform"
                                    />
                                    <motion.span
                                        animate={isMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                                        className="w-6 h-0.5 bg-gray-800 block transition-opacity"
                                    />
                                    <motion.span
                                        animate={isMenuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
                                        className="w-6 h-0.5 bg-gray-800 block transition-transform"
                                    />
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* --- DESKTOP VIEW (Grid Layout for Perfect Centering between Profile & Flow) --- */}
                    <nav className="hidden md:grid grid-cols-2 gap-12 w-full h-full">
                        {/* Left Side: Icon & Profile (Right aligned to center gap) */}
                        <div className="flex items-center justify-end gap-24">
                            <Link href="/" aria-label="ホーム" className="text-gray-800 hover:text-gray-500 transition-colors hover:scale-110 transform">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                </svg>
                            </Link>

                            <Link href="/profile" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
                                プロフィール
                            </Link>
                        </div>

                        {/* Right Side: Flow & Button (Left aligned to center gap) */}
                        <div className="flex items-center justify-start gap-16">
                            <Link href="/service#flow" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
                                ご依頼の流れ
                            </Link>

                            <ReceivePhotosButton />
                        </div>
                    </nav>

                    {/* --- MOBILE MENU OVERLAY (Common logic, trigger is in mobile view) --- */}
                    <AnimatePresence>
                        {isMenuOpen && (
                            <motion.div
                                initial="closed"
                                animate="open"
                                exit="closed"
                                variants={menuVariants}
                                className="fixed top-20 left-0 w-full h-[calc(100vh-5rem)] bg-white/95 backdrop-blur-xl z-40 flex flex-col items-center justify-start pt-12 md:hidden"
                            >
                                <nav className="flex flex-col items-center gap-10">
                                    <motion.div variants={itemVariants}>
                                        <Link
                                            href="/profile"
                                            onClick={() => setIsMenuOpen(false)}
                                            className="text-2xl font-medium text-gray-800 hover:text-gray-500 transition-colors"
                                        >
                                            プロフィール
                                        </Link>
                                    </motion.div>
                                    <motion.div variants={itemVariants}>
                                        <Link
                                            href="/service#flow"
                                            onClick={() => setIsMenuOpen(false)}
                                            className="text-2xl font-medium text-gray-800 hover:text-gray-500 transition-colors"
                                        >
                                            ご依頼の流れ
                                        </Link>
                                    </motion.div>
                                </nav>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </header>
        </>
    );
}
