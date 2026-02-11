'use client';
import { motion, useScroll, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollProgressBtn() {
    const { scrollYProgress } = useScroll();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 100) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    onClick={scrollToTop}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50 flex items-center justify-center w-14 h-14 bg-white rounded-full shadow-xl cursor-pointer group ring-1 ring-gray-100"
                >
                    {/* Ring SVG */}
                    <svg className="absolute w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                        {/* Background Circle */}
                        <circle
                            cx="50"
                            cy="50"
                            r="45"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            className="text-gray-100"
                        />
                        {/* Progress Circle */}
                        <motion.circle
                            cx="50"
                            cy="50"
                            r="45"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            className="text-black"
                            style={{ pathLength: scrollYProgress }}
                        />
                    </svg>

                    {/* Center Icon */}
                    <ArrowUp className="h-6 w-6 text-black" />
                </motion.button>
            )}
        </AnimatePresence>
    );
}
