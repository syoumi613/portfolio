'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

interface Slide {
    id: string;
    url: string;
    title?: string;
    subtitle?: string;
    textColor?: string;
}

const DEFAULT_SLIDES: Slide[] = [
    {
        id: 'default-1',
        url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1920&auto=format&fit=crop',
        title: '記憶より、鮮明に。',
        subtitle: 'BEYOND MEMORY'
    },
    {
        id: 'default-2',
        url: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1920&auto=format&fit=crop'
    },
    {
        id: 'default-3',
        url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1920&auto=format&fit=crop'
    },
    {
        id: 'default-4',
        url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?q=80&w=1920&auto=format&fit=crop'
    },
];

export default function HeroSlider() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [slides, setSlides] = useState<Slide[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSlides = async () => {
            try {
                const q = query(collection(db, 'hero_slides'), orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                const fetchedSlides: Slide[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    fetchedSlides.push({
                        id: doc.id,
                        url: data.url,
                        title: data.title,
                        subtitle: data.subtitle,
                        textColor: data.textColor
                    });
                });

                if (fetchedSlides.length > 0) {
                    setSlides(fetchedSlides);
                } else {
                    setSlides(DEFAULT_SLIDES);
                }
            } catch (error) {
                console.error("Error fetching slides:", error);
                setSlides(DEFAULT_SLIDES);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSlides();
    }, []);

    useEffect(() => {
        if (slides.length === 0) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [slides]);

    if (isLoading && slides.length === 0) {
        return <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl bg-gray-100 animate-pulse" />;
    }

    const currentSlides = slides.length > 0 ? slides : DEFAULT_SLIDES;
    const currentSlide = currentSlides[currentIndex];

    // Determine default text if missing
    const displayTitle = currentSlide.title || "記憶より、鮮明に。";
    const displaySubtitle = currentSlide.subtitle || "BEYOND MEMORY";
    const textColorClass = currentSlide.textColor === 'black' ? 'text-black' : 'text-white';

    return (
        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl bg-gray-100 group">
            <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1.0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className="absolute inset-0 w-full h-full"
                >
                    <Image
                        src={currentSlide.url}
                        alt={`Slide ${currentIndex + 1}`}
                        fill
                        className="object-cover object-center"
                        priority={currentIndex === 0}
                        sizes="(max-width: 768px) 100vw, 80vw"
                    />
                    {/* Subtle Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/10" />
                </motion.div>
            </AnimatePresence>

            {/* A. Left Text Overlay (Dynamic) */}
            <div className="absolute left-[8%] md:left-[10%] top-[50%] -translate-y-1/2 z-20 pointer-events-none">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`text-${currentIndex}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className={`flex flex-col gap-2 ${textColorClass}`}
                    >
                        <p className="text-sm md:text-base tracking-[0.2em] font-light opacity-90 uppercase">
                            {displaySubtitle}
                        </p>
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight drop-shadow-lg whitespace-pre-wrap">
                            {displayTitle}
                        </h2>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* B. Right Photographer Credit (Static) */}
            <div className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 z-20 pointer-events-none hidden md:block">
                <div className="flex flex-col items-center gap-2">
                    {/* Rotated Container */}
                    <div className="flex items-center gap-4 origin-center -rotate-90 translate-x-1/2">
                        <span className="text-sm font-medium text-white tracking-widest whitespace-nowrap">MATSUMOTO YUYA</span>
                        <span className="text-xs text-white/70 tracking-widest whitespace-nowrap">PHOTOGRAPHER</span>
                    </div>
                </div>
            </div>

            {/* Mobile Credit (Horizontal bottom right) */}
            <div className="absolute bottom-4 right-4 z-20 md:hidden text-white/80 text-[10px] tracking-widest pointer-events-none">
                PHOTOGRAPHER : MATSUMOTO YUYA
            </div>

            {/* Progress Indicators */}
            {currentSlides.length > 1 && (
                <div className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 md:gap-4 z-20">
                    {currentSlides.map((_, idx) => (
                        <motion.div
                            key={idx}
                            initial={false}
                            animate={{
                                height: idx === currentIndex ? 48 : 12,
                                opacity: idx === currentIndex ? 1 : 0.5,
                            }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className="w-1 bg-white rounded-full cursor-pointer shadow-sm backdrop-blur-sm"
                            onClick={() => setCurrentIndex(idx)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
