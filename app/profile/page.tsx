'use client';

import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import { ArrowLeft, Mail, Instagram } from "lucide-react";
import { motion, Variants } from "framer-motion";

export default function ProfilePage() {
    // Animation Variants
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.1,
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        show: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 20
            }
        }
    };

    const imageVariants: Variants = {
        hidden: { opacity: 0, scale: 0.9 },
        show: {
            opacity: 1,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 20
            }
        }
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <PublicHeader />

            <motion.main
                className="max-w-3xl mx-auto px-6 py-20 md:py-32"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                <motion.div variants={containerVariants} className="mb-16">
                    <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl font-bold mb-8 tracking-tight">
                        Profile
                    </motion.h1>

                    <motion.div variants={containerVariants} className="flex flex-col md:flex-row gap-12 items-start">
                        {/* Profile Image Placeholder */}
                        <motion.div variants={imageVariants} className="w-full md:w-1/3 aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden relative shadow-sm">
                            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                <span className="text-sm uppercase tracking-widest">Image</span>
                            </div>
                            {/* <img src="/path/to/profile.jpg" alt="Profile" className="w-full h-full object-cover" /> */}
                        </motion.div>

                        <motion.div variants={containerVariants} className="flex-1 space-y-8">
                            <motion.div variants={itemVariants}>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900">松本 友弥 <span className="text-base font-normal text-gray-500 ml-2">Yuya Matsumoto</span></h2>
                                <div className="text-gray-600 leading-relaxed text-sm space-y-4">
                                    <p>
                                        日本大学芸術学部写真学科 在籍
                                    </p>

                                    <div>
                                        <h3 className="font-bold text-gray-800 mb-1">現在の活動</h3>
                                        <ul className="list-disc list-inside space-y-1 pl-1">
                                            <li>株式会社GA technologies「RENOSY」建築写真・イベント撮影を担当</li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-gray-800 mb-1">過去の経験</h3>
                                        <ul className="list-disc list-inside space-y-1 pl-1">
                                            <li>apricot.h.sports：少年野球の試合撮影を担当</li>
                                            <li>第47回事実に基づく小論文・エッセー募集『わたしと「読書」』表紙写真 採用</li>
                                        </ul>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="space-y-4 pt-4 border-t border-gray-100">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Services</h3>
                                <ul className="grid grid-cols-2 gap-2 text-gray-700">
                                    <li>• アーティスト写真</li>
                                    <li>• ポートレート</li>
                                    <li>• イベント撮影</li>
                                    <li>• 建築・空間写真</li>
                                </ul>
                            </motion.div>

                            <motion.div variants={itemVariants} className="space-y-4 pt-4 border-t border-gray-100">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Contact</h3>
                                <div className="space-y-3">
                                    <p className="text-gray-600">
                                        撮影のご依頼・ご相談は、以下のメールアドレスまたはSNSのDMよりお気軽にご連絡ください。
                                    </p>
                                    <a href="mailto:syoumi613@gmail.com" className="flex w-fit items-center gap-3 text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors border-b-2 border-gray-200 hover:border-blue-600 pb-1">
                                        <Mail className="h-5 w-5" />
                                        syoumi613@gmail.com
                                    </a>
                                    <div className="flex gap-4 pt-2">
                                        <a href="https://www.instagram.com/yuya_photo_00/" target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-3 text-lg font-bold text-gray-900 hover:text-pink-600 transition-colors border-b-2 border-gray-200 hover:border-pink-600 pb-1">
                                            <Instagram className="h-5 w-5" />
                                            Instagram
                                        </a>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex justify-center mt-20">
                    <Link href="/" className="group flex items-center gap-2 text-gray-500 hover:text-black transition-colors">
                        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        ホームに戻る
                    </Link>
                </motion.div>
            </motion.main>


            <footer className="py-8 text-center text-xs text-gray-400 border-t border-gray-50">
                © {new Date().getFullYear()} Photographer Portfolio. All rights reserved.
            </footer>
        </div>
    );
}
