'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Heart } from 'lucide-react';

interface Photo {
    id: string;
    url: string;
    likeCount: number;
}

interface PopularPhotosSlideProps {
    photos: Photo[];
}

export default function PopularPhotosSlide({ photos }: PopularPhotosSlideProps) {
    if (!photos || photos.length === 0) {
        return (
            <div className="absolute inset-0 w-full h-full bg-gray-50 flex flex-col items-center justify-center p-6 md:p-8 text-center overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="flex flex-col items-center w-full max-w-lg px-2"
                >
                    <div className="w-24 h-24 mb-6 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100">
                        <Heart className="w-10 h-10 text-gray-300 stroke-[1.5]" />
                    </div>
                    <h3 className="w-full text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-4 tracking-wider break-words">
                        まだ人気の写真はありません
                    </h3>
                    <p className="w-full text-xs sm:text-sm md:text-base text-gray-500 leading-relaxed font-medium break-words">
                        ギャラリーからお気に入りの写真を見つけて、<br className="hidden md:block" />最初の「いいね」を押してみましょう！
                    </p>
                </motion.div>
            </div>
        );
    }

    // Separate the top photo and the remaining photos (up to 3)
    const topPhoto = photos[0];
    const remainingPhotos = photos.slice(1, 4);

    return (
        <div className="absolute inset-0 w-full h-full bg-gray-50 flex items-center justify-center p-2 sm:p-4 md:p-8">
            <div className="w-full h-full max-w-6xl mx-auto flex flex-row gap-2 sm:gap-4">

                {/* 1st Place Photo (Left side on all devices) */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative w-2/3 h-full rounded-xl sm:rounded-2xl overflow-hidden shadow-lg group"
                >
                    <Image
                        src={topPhoto.url}
                        alt="Most Popular Photo"
                        fill
                        sizes="(max-width: 768px) 100vw, 66vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        priority
                    />
                    {/* Dark gradient for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                    {/* 1st Place Badge & Text */}
                    <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 flex flex-col gap-1.5 sm:gap-2">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="flex items-center gap-1 sm:gap-1.5 bg-gradient-to-r from-amber-200 to-yellow-500 text-yellow-900 border border-yellow-200/50 text-xs sm:text-sm font-extrabold px-2 py-1 sm:px-3.5 sm:py-1.5 rounded-full tracking-wider shadow-md">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-3 h-3 sm:w-4 sm:h-4"><path d="m2 4 3 12h14l3-12-6 7-4-11-4 11zM19.98 18H4.02A2.001 2.001 0 0 0 2 20v2h20v-2a2.005 2.005 0 0 0-2.02-2z" /></svg>
                                No.1
                            </span>
                            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1 sm:px-3 sm:py-1.5 shadow-md">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 sm:w-3.5 sm:h-3.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                                <span className="text-white text-xs sm:text-sm font-bold">{topPhoto.likeCount}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 2nd, 3rd Place Photos (Right side on all devices) */}
                {remainingPhotos.length > 0 && (
                    <div className="w-1/3 h-full flex flex-col gap-2 sm:gap-4">
                        {remainingPhotos.map((photo, index) => (
                            <motion.div
                                key={photo.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 + (index * 0.1) }}
                                className="relative w-full h-full rounded-xl sm:rounded-2xl overflow-hidden shadow-md group flex-1"
                            >
                                <Image
                                    src={photo.url}
                                    alt={`Popular Photo ${index + 2}`}
                                    fill
                                    sizes="(max-width: 768px) 33vw, 33vw"
                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                                <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 flex flex-wrap items-center gap-1 sm:gap-1.5">
                                    <span className="bg-white/90 text-gray-800 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 rounded-full shadow-sm">
                                        No.{index + 2}
                                    </span>
                                    <div className="flex items-center gap-0.5 sm:gap-1 bg-black/40 backdrop-blur-sm rounded-full px-1.5 py-0.5 sm:px-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 sm:w-2.5 sm:h-2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                                        <span className="text-white text-[9px] sm:text-[10px] font-bold">{photo.likeCount}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
}
