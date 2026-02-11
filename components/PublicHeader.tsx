'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import LoginModal from '@/components/LoginModal';

export default function PublicHeader() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const pathname = usePathname();

    if (pathname.startsWith('/admin')) {
        return null;
    }


    return (
        <>
            <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            <header className="fixed top-0 left-0 w-full z-40 h-20 bg-white/90 backdrop-blur-md border-b border-gray-100 flex items-center justify-center px-6 transition-all duration-300 pointer-events-auto">
                <nav className="flex items-center gap-12">
                    {/* 1. ホーム (アイコン) */}
                    <Link
                        href="/"
                        aria-label="ホーム"
                        className="text-gray-800 hover:text-gray-500 transition-colors hover:scale-110 transform"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                    </Link>

                    {/* 2. プロフィール */}
                    <Link
                        href="/profile"
                        className="text-sm font-medium text-gray-800 hover:text-gray-500 transition-colors"
                    >
                        プロフィール
                    </Link>



                    {/* 4. ご依頼の流れ */}
                    <Link
                        href="/service#flow"
                        className="text-sm font-medium text-gray-800 hover:text-gray-500 transition-colors"
                    >
                        ご依頼の流れ
                    </Link>

                    {/* 3. 写真を受け取る (Button invoking LoginModal) */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-block px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
                    >
                        写真を受け取る
                    </button>
                </nav>
            </header>
        </>
    );
}
