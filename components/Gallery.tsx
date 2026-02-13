'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export interface GalleryPhoto {
    id: string;
    url: string;
    fileName?: string;
    category?: string;
    width?: number; // Optional: If missing, defaults to landscape/square style
    height?: number; // Optional
    [key: string]: any; // Allow other properties (like storagePath for admin)
}

interface GalleryProps {
    photos: GalleryPhoto[];
    loading: boolean;
    categories?: { id: string; label: string }[]; // Made optional
    onDelete?: (photo: GalleryPhoto) => void; // Admin Action
    renderOverlay?: (photo: GalleryPhoto) => React.ReactNode; // Client Portal Action
    emptyMessage?: string;
}

export default function Gallery({
    photos,
    loading,
    categories,
    onDelete,
    renderOverlay,
    emptyMessage = "No photos found."
}: GalleryProps) {
    const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Reset loading state when opening a new photo
    useEffect(() => {
        if (selectedPhoto) setIsLoading(true);
    }, [selectedPhoto]);

    // Premium Animation Settings (Fast & Snappy)
    const fastEase = [0.16, 1, 0.3, 1] as const;
    const fastTransition = { duration: 0.4, ease: fastEase };

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
                staggerChildren: 0.05,
                delayChildren: 0.1
            }
        }
    };

    const handlePhotoClick = (photo: GalleryPhoto) => {
        setSelectedPhoto(photo);
    };

    return (
        <>
            <motion.div
                variants={galleryContainerVariant}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-10%" }}
                className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full p-4 grid-flow-dense"
            >
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        <div className="col-span-full h-64 flex items-center justify-center text-gray-400">
                            Loading photos...
                        </div>
                    ) : (
                        <>
                            {photos.map((photo, index) => {
                                // Logic: width < height is Portrait.
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

                                        {/* Hover Overlay for Actions (Delete / Download) */}
                                        {(onDelete || renderOverlay) && (
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all opacity-0 group-hover:opacity-100 flex flex-col justify-between p-3 pointer-events-none">
                                                <div className="flex justify-end pointer-events-auto">
                                                    {onDelete && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDelete(photo);
                                                            }}
                                                            className="p-2 bg-white text-red-600 rounded-full shadow-md hover:bg-red-50 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="flex justify-end pointer-events-auto">
                                                    {renderOverlay && renderOverlay(photo)}
                                                </div>
                                            </div>
                                        )}

                                        {/* Filename Overlay (Bottom) - Optional, maybe only for Admin? 
                                            Currently keeping it consistent with public design (clean) unless specifically requested. 
                                            Public design has NO text overlay usually. 
                                            Let's add a subtle gradient if needed, but for now kept clean.
                                        */}

                                    </motion.div>
                                );
                            })}

                            {!loading && photos.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="col-span-full h-64 flex items-center justify-center text-gray-400"
                                >
                                    {emptyMessage}
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
