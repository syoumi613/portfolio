'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Home } from 'lucide-react';

export default function HomeButton() {
    const pathname = usePathname();
    // Show button only if NOT on homepage
    const isNotHomePage = pathname !== '/';

    return (
        <AnimatePresence>
            {isNotHomePage && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="fixed bottom-4 left-4 md:bottom-8 md:left-8 z-50"
                >
                    <Link href="/" passHref>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="flex items-center justify-center w-14 h-14 bg-white text-black rounded-full shadow-xl cursor-pointer group ring-1 ring-gray-100"
                            aria-label="Return to Home"
                        >
                            <Home className="w-6 h-6 text-black" />
                        </motion.button>
                    </Link>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
