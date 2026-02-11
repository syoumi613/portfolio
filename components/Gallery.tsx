'use client';

import { useState, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface Photo {
    id: string;
    url: string;
    fileName?: string;
    category?: string;
    width?: number;
    height?: number;
    isMain?: boolean; // Optional flag for "Main" photo
}

interface GalleryProps {
    photos: Photo[];
    loading: boolean;
    categories: { id: string; label: string }[];
}

export default function Gallery({ photos, loading, categories }: GalleryProps) {
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Reset loading state when opening a new photo
    useEffect(() => {
        if (selectedPhoto) setIsLoading(true);
    }, [selectedPhoto]);

    // Premium Animation Settings (Fast & Snappy)
    const fastEase = [0.16, 1, 0.3, 1] as const;
    const fastTransition = { duration: 0.4, ease: fastEase }; // sped up from 1.8s to 0.4s

    const photoVariant = {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        show: {
            opacity: 1,
            scale: 1.0,
            y: 0,
            transition: fastTransition
        }
    };

    const galleryContainerVariant = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05, // faster stagger
                delayChildren: 0.1
            }
        }
    };

    const handlePhotoClick = (photo: Photo) => {
        setSelectedPhoto(photo);
        // Loading state is reset by useEffect
    };



    return (
        <>
            <motion.div
                variants={galleryContainerVariant}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-10%" }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full p-4 grid-flow-dense"
            >
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        <div className="col-span-full h-64 flex items-center justify-center text-gray-400">
                            Loading photos...
                        </div>
                    ) : (
                        <>
                            {photos.map((photo, index) => {
                                // Match Admin logic: width < height is Portrait.
                                // If dimensions are missing, default to Landscape (same as Admin which requires all 3 conditions).
                                // Admin: const isVertical = photo.width && photo.height && photo.width < photo.height;
                                const isPortrait = photo.width && photo.height && photo.width < photo.height;

                                return (
                                    <motion.div
                                        layoutId={`photo-${photo.id}`}
                                        key={photo.id}
                                        variants={photoVariant}
                                        initial="hidden"
                                        whileInView="show"
                                        viewport={{ once: true }}
                                        onClick={() => handlePhotoClick(photo)}
                                        className={`relative overflow-hidden rounded-xl bg-gray-100 cursor-pointer shadow-sm hover:shadow-xl transition-shadow duration-300 group ${!isPortrait
                                            ? 'col-span-1 row-span-1 aspect-[3/2]'
                                            : 'col-span-1 row-span-2 aspect-[3/4] h-full w-full'
                                            }`}
                                    >
                                        {/* Image */}
                                        <Image
                                            src={photo.url}
                                            alt={photo.fileName || 'Photo'}
                                            fill
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            priority={index < 6}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />


                                    </motion.div>
                                );
                            })}

                            {!loading && photos.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="col-span-full h-64 flex items-center justify-center text-gray-400"
                                >
                                    No photos in this category.
                                </motion.div>
                            )}
                        </>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Lightbox Modal */}
            <AnimatePresence>
                {selectedPhoto && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.3 } }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-zoom-out"
                        onClick={() => setSelectedPhoto(null)}
                    >
                        {/* Close Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPhoto(null);
                            }}
                            className="absolute top-4 right-4 text-white/50 hover:text-white z-50 p-2 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>

                        <motion.div
                            layoutId={`photo-${selectedPhoto.id}`}
                            className="relative flex items-center justify-center pointer-events-none"
                            transition={fastTransition}
                        >
                            {/* High-Quality Image */}
                            <Image
                                src={selectedPhoto.url}
                                width={selectedPhoto.width || 1920}
                                height={selectedPhoto.height || 1080}
                                alt={selectedPhoto.fileName || 'Photo'}
                                className={`
                                    h-[85vh] w-auto max-w-[90vw] object-contain pointer-events-auto shadow-2xl rounded-lg bg-gray-900/50
                                    transition-opacity duration-200 ease-out
                                    ${isLoading ? 'opacity-0' : 'opacity-100'}
                                `}
                                onClick={(e) => e.stopPropagation()}
                                priority
                                onLoadingComplete={() => setIsLoading(false)}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
