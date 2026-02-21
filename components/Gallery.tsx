'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, increment } from 'firebase/firestore';

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
    categories?: { id: string; label: string }[];
    onDelete?: (photo: GalleryPhoto) => void;
    renderOverlay?: (photo: GalleryPhoto) => React.ReactNode;
    emptyMessage?: string;
    enableMultiSelect?: boolean;
    onDownloadLog?: (details: string) => void;
    enableLikes?: boolean;
    likedPhotoIds?: Set<string>;
    onToggleLike?: (photo: GalleryPhoto) => void;
}

export default function Gallery({
    photos,
    loading,
    categories,
    onDelete,
    renderOverlay,
    emptyMessage = "No photos found.",
    enableMultiSelect = false,
    onDownloadLog,
    enableLikes = false,
    likedPhotoIds = new Set(),
    onToggleLike
}: GalleryProps) {
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    const [direction, setDirection] = useState(0);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDownloading, setIsDownloading] = useState(false);

    const selectedPhoto = selectedIndex >= 0 ? photos[selectedIndex] : null;

    // Handle Keyboard Navigation
    useEffect(() => {
        if (!selectedPhoto) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') setSelectedPhoto(null);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedPhoto, selectedIndex]);

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

    const setSelectedPhoto = (photo: GalleryPhoto | null) => {
        if (photo) {
            const index = photos.findIndex(p => p.id === photo.id);
            setSelectedIndex(index);
            setDirection(0);
        } else {
            setSelectedIndex(-1);
        }
    };

    const handleNext = () => {
        setDirection(1);
        setSelectedIndex((prev) => (prev + 1) % photos.length);
    };

    const handlePrev = () => {
        setDirection(-1);
        setSelectedIndex((prev) => (prev - 1 + photos.length) % photos.length);
    };

    const toggleSelection = (e: React.MouseEvent | null, photoId: string) => {
        if (e) e.stopPropagation();
        const newSelected = new Set(selectedIds);
        if (newSelected.has(photoId)) {
            newSelected.delete(photoId);
        } else {
            newSelected.add(photoId);
        }
        setSelectedIds(newSelected);
    };

    const handlePhotoClick = (photo: GalleryPhoto) => {
        if (selectedIds.size > 0 && enableMultiSelect) {
            toggleSelection(null, photo.id);
        } else {
            setSelectedPhoto(photo);
        }
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
    };

    const handleBulkDownload = async () => {
        if (selectedIds.size === 0) {
            alert("画像が選択されていません。");
            return;
        }
        setIsDownloading(true);

        try {
            // Pre-flight Validation
            if (!photos || photos.length === 0) {
                throw new Error("写真データが見つかりません。");
            }

            const selectedPhotos = photos.filter(p => selectedIds.has(p.id));
            if (selectedPhotos.length === 0) {
                throw new Error("選択された写真データが見つかりません。内部IDエラーの可能性があります。");
            }

            // Check for invalid URLs
            const invalidPhotos = selectedPhotos.filter(p => !p.url);
            if (invalidPhotos.length > 0) {
                console.error("Invalid Photos:", invalidPhotos);
                throw new Error(`${invalidPhotos.length}枚の写真のURLが無効です。管理者にお問い合わせください。`);
            }

            const total = selectedPhotos.length;
            let successCount = 0;
            let failCount = 0;

            console.log(`Starting bulk download for ${total} photos.`);

            // STRICT LOGIC START
            if (total === 1) {
                // 1. Single Image Download
                const photo = selectedPhotos[0];
                try {
                    console.log(`[1/1] Fetching: ${photo.fileName || photo.id}`);

                    // CORSエラー回避: mode: 'cors' とキャッシュ無効化クエリ
                    const fetchUrl = `${photo.url}${photo.url.includes('?') ? '&' : '?'}t=${Date.now()}`;
                    const response = await fetch(fetchUrl, {
                        mode: 'cors',
                    });

                    if (!response.ok) {
                        throw new Error(`Fetch error: ${response.status} ${response.statusText}`);
                    }

                    const blob = await response.blob();
                    if (!blob) throw new Error("Blob creation failed (empty response).");

                    const fileName = photo.fileName || `photo-${photo.id}.jpg`;
                    saveAs(blob, fileName);

                    successCount++;
                    console.log(`[1/1] Saved: ${fileName}`);

                } catch (error) {
                    failCount++;
                    console.error(`[1/1] Failed to load ${photo.id}:`, error);
                }
            } else {
                // 2. ZIP Download Logic (>= 2 items)
                const zip = new JSZip();
                const folder = zip.folder("photos");
                if (!folder) throw new Error("ZIPフォルダの作成に失敗しました。");

                await Promise.all(selectedPhotos.map(async (photo, index) => {
                    try {
                        console.log(`[${index + 1}/${total}] Fetching for ZIP: ${photo.fileName || photo.id}`);

                        // CORSエラー回避: mode: 'cors' とキャッシュ無効化クエリ
                        const fetchUrl = `${photo.url}${photo.url.includes('?') ? '&' : '?'}t=${Date.now()}`;
                        const response = await fetch(fetchUrl, {
                            mode: 'cors',
                        });

                        if (!response.ok) {
                            throw new Error(`Fetch error: ${response.status} ${response.statusText}`);
                        }

                        const blob = await response.blob();
                        if (!blob) throw new Error("Blob creation failed (empty response).");

                        const fileName = photo.fileName || `photo-${photo.id}.jpg`;
                        folder.file(fileName, blob);

                        successCount++;
                        console.log(`[${index + 1}/${total}] Added to ZIP: ${fileName}`);
                    } catch (error) {
                        failCount++;
                        console.error(`[${index + 1}/${total}] Failed to load ${photo.id}:`, error);
                    }
                }));

                if (successCount === 0) {
                    throw new Error("すべての画像のダウンロードに失敗しました。接続環境や画像URLを確認してください。");
                }

                console.log(`ZIP generation started for ${successCount} files.`);

                // Generate Dynamic Filename: photos_YYYYMMDD_HHmm.zip
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const zipFilename = `photos_${year}${month}${day}_${hours}${minutes}.zip`;

                const content = await zip.generateAsync({ type: "blob" });
                saveAs(content, zipFilename);
            }

            if (failCount > 0) {
                alert(`${failCount}枚の画像のダウンロードに失敗しましたが、${successCount}枚を保存しました。`);
            } else {
                // Success Toast could go here
            }

            if (successCount > 0 && onDownloadLog) {
                onDownloadLog(`選択写真一括保存 (${successCount}枚)`);
            }

            clearSelection();

        } catch (error: any) {
            console.error("Critical download error:", error);
            alert(`エラーが発生しました: ${error.message || "不明なエラー"}`);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <>
            {/* Action Bar for Multi-Select */}
            <AnimatePresence>
                {enableMultiSelect && selectedIds.size > 0 && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className="fixed top-20 left-0 right-0 z-40 flex justify-center pointer-events-none"
                    >
                        <div className="bg-white/90 backdrop-blur-md shadow-lg rounded-full px-6 py-3 flex items-center gap-6 pointer-events-auto border border-gray-200">
                            <span className="font-medium text-gray-700">
                                {selectedIds.size} 枚選択中
                            </span>
                            <div className="h-4 w-px bg-gray-300"></div>
                            <button
                                onClick={clearSelection}
                                className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
                            >
                                解除
                            </button>
                            <button
                                onClick={handleBulkDownload}
                                disabled={isDownloading}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors flex items-center gap-2"
                            >
                                {isDownloading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        作成中...
                                    </>
                                ) : (
                                    <>
                                        {selectedIds.size > 1 ? `${selectedIds.size}枚をZIPで一括保存` : `選択した1枚を保存`}
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                variants={galleryContainerVariant}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-10%" }}
                className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full p-4 grid-flow-dense pb-24"
            >
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        <div className="col-span-full h-64 flex items-center justify-center text-gray-400">
                            Loading photos...
                        </div>
                    ) : (
                        <>
                            {photos.map((photo, index) => {
                                const isPortrait = photo.width && photo.height && photo.width < photo.height;
                                const isSelected = selectedIds.has(photo.id);
                                const isLiked = likedPhotoIds.has(photo.id);

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
                                            } ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2' : ''}`}
                                    >
                                        <Image
                                            src={photo.url}
                                            alt={photo.fileName || 'Photo'}
                                            fill
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            priority={index < 6}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />

                                        {/* Actions: Select - Maintained at Bottom Right */}
                                        <div className="absolute bottom-2 right-2 z-30 flex items-center gap-2">
                                            {/* Like Button */}
                                            {enableLikes && (
                                                <button
                                                    type="button"
                                                    title={isLiked ? "お気に入りから削除" : "お気に入りに追加"}
                                                    className="flex items-center justify-center w-8 h-8 md:w-11 md:h-11 bg-black/30 hover:bg-black/50 backdrop-blur-md rounded-full border border-white/30 transition-all duration-200 hover:scale-105"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onToggleLike?.(photo);
                                                    }}
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 24 24"
                                                        fill={isLiked ? "#ef4444" : "none"}
                                                        stroke={isLiked ? "#ef4444" : "currentColor"}
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        className={`w-4 h-4 md:w-5 md:h-5 transition-colors duration-200 drop-shadow-md ${isLiked ? "" : "text-white/90"}`}
                                                    >
                                                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                                                    </svg>
                                                </button>
                                            )}
                                            {/* Selection Checkbox (Bookmark Style) */}
                                            {enableMultiSelect && (
                                                <button
                                                    type="button"
                                                    title="ダウンロード用に選択"
                                                    className="flex items-center justify-center w-8 h-8 md:w-11 md:h-11 bg-black/30 hover:bg-black/50 backdrop-blur-md rounded-full border border-white/30 transition-all duration-200 hover:scale-105"
                                                    onClick={(e) => toggleSelection(e, photo.id)}
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 24 24"
                                                        fill={isSelected ? "currentColor" : "none"}
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        className={`w-4 h-4 md:w-5 md:h-5 transition-colors duration-200 drop-shadow-md ${isSelected ? "text-white" : "text-white/90"}`}
                                                    >
                                                        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>

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

                                                {/* Actions Row - Moved to Bottom Left */}
                                                <div className="flex justify-start pointer-events-auto">
                                                    {renderOverlay && renderOverlay(photo)}
                                                </div>
                                            </div>
                                        )}
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
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md"
                        onClick={() => setSelectedPhoto(null)}
                    >
                        {/* Close Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPhoto(null);
                            }}
                            className="absolute top-4 right-4 text-white/70 hover:text-white z-50 p-2 transition-colors bg-white/10 rounded-full hover:bg-white/20"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>

                        {/* Navigation Buttons (Desktop) */}
                        <button
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-50 p-4 transition-colors hidden md:block hover:bg-white/10 rounded-full"
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePrev();
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>

                        <button
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-50 p-4 transition-colors hidden md:block hover:bg-white/10 rounded-full"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleNext();
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>

                        {/* Image Container with Swipe */}
                        <div
                            className="relative w-full h-full flex items-center justify-center overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <AnimatePresence initial={false} custom={direction} mode="popLayout">
                                <motion.div
                                    key={selectedPhoto.id}
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{
                                        x: { type: "spring", stiffness: 300, damping: 30 },
                                        opacity: { duration: 0.2 }
                                    }}
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    dragElastic={1}
                                    onDragEnd={(e, { offset, velocity }) => {
                                        const swipe = swipePower(offset.x, velocity.x);

                                        if (swipe < -swipeConfidenceThreshold) {
                                            handleNext();
                                        } else if (swipe > swipeConfidenceThreshold) {
                                            handlePrev();
                                        }
                                    }}
                                    className="absolute w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                                    onClick={() => setSelectedPhoto(null)}
                                >
                                    <Image
                                        src={selectedPhoto.url}
                                        width={selectedPhoto.width || 1920}
                                        height={selectedPhoto.height || 1080}
                                        alt={selectedPhoto.fileName || 'Photo'}
                                        sizes="100vw"
                                        className="max-h-[85vh] w-auto max-w-[95vw] object-contain shadow-2xl rounded-sm transition-opacity duration-200"
                                        priority
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// Animation Variants
const slideVariants = {
    enter: (direction: number) => {
        return {
            x: direction > 0 ? 1000 : -1000,
            opacity: 0
        };
    },
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1
    },
    exit: (direction: number) => {
        return {
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0
        };
    }
};

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
};
