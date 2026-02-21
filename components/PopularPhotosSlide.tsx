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
        <div className="absolute inset-0 w-full h-full bg-gray-50 flex items-center justify-center p-4 md:p-8">
            <div className="w-full h-full max-w-6xl mx-auto flex flex-col md:flex-row gap-4">

                {/* 1st Place Photo (Left on Desktop, Top on Mobile) */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative w-full md:w-2/3 h-1/2 md:h-full rounded-2xl overflow-hidden shadow-lg group"
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
                    <div className="absolute bottom-6 left-6 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 bg-gradient-to-r from-amber-200 to-yellow-500 text-yellow-900 border border-yellow-200/50 text-sm font-extrabold px-3.5 py-1.5 rounded-full tracking-wider shadow-md">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="m2 4 3 12h14l3-12-6 7-4-11-4 11zM19.98 18H4.02A2.001 2.001 0 0 0 2 20v2h20v-2a2.005 2.005 0 0 0-2.02-2z" /></svg>
                                No.1
                            </span>
                            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                                <span className="text-white text-sm font-bold">{topPhoto.likeCount}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 2nd, 3rd, 4th Place Photos (Right on Desktop, Bottom on Mobile) */}
                {remainingPhotos.length > 0 && (
                    <div className="w-full md:w-1/3 h-1/2 md:h-full flex flex-row md:flex-col gap-4">
                        {remainingPhotos.map((photo, index) => (
                            <motion.div
                                key={photo.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 + (index * 0.1) }}
                                className="relative w-full h-full rounded-2xl overflow-hidden shadow-md group flex-1"
                            >
                                <Image
                                    src={photo.url}
                                    alt={`Popular Photo ${index + 2}`}
                                    fill
                                    sizes="(max-width: 768px) 33vw, 33vw"
                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                                <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                                    <span className="bg-white/90 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                        No.{index + 2}
                                    </span>
                                    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                                        <span className="text-white text-[10px] font-bold">{photo.likeCount}</span>
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
