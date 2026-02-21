'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, doc, getDoc, limit, addDoc, serverTimestamp, setDoc, increment, deleteDoc, updateDoc } from 'firebase/firestore';
import { LogOut, Download, FolderDown, Loader2, Archive, FolderArchive, X, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Gallery from '@/components/Gallery';
import HeroSlider from '@/components/HeroSlider';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import PopularPhotosSlide from '@/components/PopularPhotosSlide';

interface Photo {
    id: string;
    url: string;
    fileName: string;
    clientId: string;
    width?: number;
    height?: number;
    category?: string;
}

interface DownloadSection {
    title: string;
    url: string;
    fileName: string;
    size: string;
    count: number;
    storagePath: string;
}

interface SlideshowSlide {
    id: string;
    type: 'MOVIE' | 'AFTER' | 'DESCRIPTION' | 'OFFER' | 'POPULAR';
    title: string;
    content: string;
    storagePath?: string;
    beforeUrl?: string;
    afterUrl?: string;
    imageUrl?: string;
    buttonText?: string;
    linkUrl?: string;
}

export default function ClientDashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [downloadSections, setDownloadSections] = useState<DownloadSection[]>([]);
    const [slideshowSettings, setSlideshowSettings] = useState<SlideshowSlide[]>([]);
    const [projectName, setProjectName] = useState('');
    const [projectData, setProjectData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [topPhotos, setTopPhotos] = useState<any[]>([]);

    // Preloader State
    const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);

    // Like State
    const [likedPhotoIds, setLikedPhotoIds] = useState<Set<string>>(new Set());
    const processingLikesRef = useRef<Set<string>>(new Set());

    // Tab State
    const [activeTabId, setActiveTabId] = useState<string>('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDownload, setSelectedDownload] = useState<DownloadSection | null>(null);
    const [downloading, setDownloading] = useState(false);

    // Opening Movie State
    const [showOpening, setShowOpening] = useState(true);
    const [openingVideoUrl, setOpeningVideoUrl] = useState<string | null>(null);
    const openingVideoRef = useRef<HTMLVideoElement>(null);

    const router = useRouter();
    const isTracked = useRef(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push('/portal/login');
                return;
            }
            setUser(currentUser);

            const clientId = currentUser.email?.split('@')[0];

            if (clientId) {
                try {
                    let getName = clientId;
                    const projectRef = doc(db, 'projects', clientId);
                    const projectSnap = await getDoc(projectRef);
                    let slides: SlideshowSlide[] = [];

                    if (projectSnap.exists()) {
                        const data = projectSnap.data();
                        getName = data.name;
                        if (data.downloadSections) {
                            setDownloadSections(data.downloadSections);
                        }

                        // Parse Slideshow Settings with "Video First" Safety Sort
                        if (data.slideshowSettings && Array.isArray(data.slideshowSettings) && data.slideshowSettings.length > 0) {
                            const sortedSettings = [...data.slideshowSettings].sort((a: SlideshowSlide, b: SlideshowSlide) => {
                                if (a.type === 'MOVIE' && b.type !== 'MOVIE') return -1;
                                if (a.type !== 'MOVIE' && b.type === 'MOVIE') return 1;
                                return 0;
                            });

                            // Filter out POPULAR slide if likes are disabled at the project level
                            const finalSlides = data.isLikeEnabled === false
                                ? sortedSettings.filter(s => s.type !== 'POPULAR')
                                : sortedSettings;

                            slides = finalSlides;
                            setSlideshowSettings(finalSlides);
                            if (finalSlides.length > 0) {
                                setActiveTabId(finalSlides[0].id);
                            }

                            // Check for MOVIE slide for Opening
                            const movieSlide = sortedSettings.find((s: SlideshowSlide) => s.type === 'MOVIE');
                            if (movieSlide && !movieSlide.content.includes('youtube') && !movieSlide.content.includes('youtu.be')) {
                                setOpeningVideoUrl(movieSlide.content);
                                setShowOpening(true);
                            } else {
                                setShowOpening(false);
                            }
                        } else {
                            setSlideshowSettings([]);
                            setShowOpening(false);
                        }
                    } else {
                        const legacyRef = doc(db, 'clients', clientId);
                        const legacySnap = await getDoc(legacyRef);
                        if (legacySnap.exists()) {
                            getName = legacySnap.data().name;
                        }
                        setShowOpening(false);
                    }
                    setProjectName(getName);
                    if (projectSnap.exists()) {
                        setProjectData(projectSnap.data());
                    }

                    // Analytics Tracking
                    if (!isTracked.current) {
                        isTracked.current = true;

                        // Exclude Admin Tracking
                        const isAdmin = typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true';

                        if (!isAdmin) {
                            try {
                                await setDoc(doc(db, 'projects', clientId), {
                                    pageViews: increment(1)
                                }, { merge: true });

                                await addDoc(collection(db, 'projects', clientId, 'logs'), {
                                    type: 'view',
                                    timestamp: serverTimestamp()
                                });
                            } catch (e) {
                                console.error("Failed to track view analytics", e);
                            }
                        } else {
                            console.log('Skipping project page tracking for Admin');
                        }
                    }

                    const q = query(
                        collection(db, 'albums'),
                        where('clientId', '==', clientId)
                    );

                    const querySnapshot = await getDocs(q);
                    const fetchedPhotos: Photo[] = [];
                    querySnapshot.forEach((doc) => {
                        fetchedPhotos.push({ id: doc.id, ...doc.data() } as Photo);
                    });

                    fetchedPhotos.sort((a, b) => {
                        return (a.fileName || '').localeCompare(b.fileName || '', undefined, { numeric: true, sensitivity: 'base' });
                    });

                    setPhotos(fetchedPhotos);

                    // Fetch Top 4 Popular Photos
                    try {
                        const likesQ = query(
                            collection(db, 'image_likes'),
                            orderBy('likeCount', 'desc'),
                            limit(4)
                        );
                        const likesSnap = await getDocs(likesQ);
                        const popularList: any[] = [];

                        likesSnap.forEach(d => {
                            const data = d.data();
                            // Only include if count > 0 and the photo belongs to this album
                            if (data.likeCount > 0) {
                                const matchingPhoto = fetchedPhotos.find(p => p.id === d.id);
                                if (matchingPhoto) {
                                    popularList.push({
                                        id: matchingPhoto.id,
                                        url: matchingPhoto.url,
                                        likeCount: data.likeCount
                                    });
                                }
                            }
                        });

                        setTopPhotos(popularList);

                    } catch (e) {
                        console.error("Failed to fetch popular photos", e);
                    }

                    // Fetch user's favorite photos
                    try {
                        const favQ = query(
                            collection(db, 'favorites'),
                            where('userId', '==', currentUser.uid),
                            where('clientId', '==', clientId)
                        );
                        const favSnap = await getDocs(favQ);
                        const newLikedIds = new Set<string>();
                        favSnap.forEach(d => {
                            newLikedIds.add(d.data().photoId);
                        });
                        setLikedPhotoIds(newLikedIds);
                    } catch (e) {
                        console.error("Failed to fetch favorites", e);
                    }

                    setLoading(false);

                    // --- PRELOADING LOGIC ---
                    const preloadAssets = async () => {
                        // Start Fake Progress with Multi-Stage Easing
                        // 0-50%: Fast
                        // 50-80%: Medium
                        // 80-90%: Slow (Crawl)
                        // 90%: Stop
                        const progressInterval = setInterval(() => {
                            setLoadingProgress(prev => {
                                if (prev >= 90) return prev; // Stop at 90%

                                let increment = 0;
                                if (prev < 50) {
                                    increment = Math.random() * 5 + 2; // Fast: 2-7% per tick
                                } else if (prev < 80) {
                                    increment = Math.random() * 2 + 1; // Medium: 1-3% per tick
                                } else {
                                    increment = Math.random() * 0.5 + 0.1; // Slow: 0.1-0.6% per tick
                                }

                                return Math.min(prev + increment, 90);
                            });
                        }, 200);

                        const promises: Promise<void>[] = [];

                        // 1. Preload Images (Slideshow)
                        slides.forEach(slide => {
                            if (slide.type === 'AFTER' && slide.beforeUrl && slide.afterUrl) {
                                promises.push(new Promise((resolve) => {
                                    const img1 = new Image();
                                    img1.src = slide.beforeUrl!;
                                    img1.onload = () => resolve();
                                    img1.onerror = () => resolve(); // Don't block on error
                                }));
                                promises.push(new Promise((resolve) => {
                                    const img2 = new Image();
                                    img2.src = slide.afterUrl!;
                                    img2.onload = () => resolve();
                                    img2.onerror = () => resolve();
                                }));
                            } else if (slide.type === 'DESCRIPTION' && slide.imageUrl) {
                                promises.push(new Promise((resolve) => {
                                    const img = new Image();
                                    img.src = slide.imageUrl!;
                                    img.onload = () => resolve();
                                    img.onerror = () => resolve();
                                }));
                            }
                        });


                        // 2. Preload Video (Opening)
                        // If we have an opening video, we want to wait a bit for it to buffer effectively.
                        // However, waiting for 'canplaythrough' might be too strict on slow connections.
                        // We'll use a Promise race with a timeout.
                        const movieSlide = slides.find(s => s.type === 'MOVIE');
                        if (movieSlide && !movieSlide.content.includes('youtube') && !movieSlide.content.includes('youtu.be')) {
                            const videoPromise = new Promise<void>((resolve) => {
                                const video = document.createElement('video');
                                video.src = movieSlide.content;
                                video.preload = 'auto';
                                video.muted = true; // Crucial for auto-buffer
                                video.onloadeddata = () => resolve(); // Slightly faster than canplaythrough
                                video.onerror = () => resolve();
                            });
                            // Timeout fallback (e.g., 5 seconds max wait for video)
                            const timeoutPromise = new Promise<void>(resolve => setTimeout(resolve, 5000));
                            promises.push(Promise.race([videoPromise, timeoutPromise]));
                        }

                        // Minimum wait time for aesthetic purposes (e.g. 1.5s loader)
                        promises.push(new Promise(resolve => setTimeout(resolve, 1500)));

                        try {
                            await Promise.all(promises);
                        } catch (e) {
                            console.error("Asset preload error", e);
                        } finally {
                            clearInterval(progressInterval);
                            setLoadingProgress(100);

                            // Wait for 100% animation + small delay
                            setTimeout(() => {
                                setIsAssetsLoaded(true);
                            }, 800);
                        }
                    };

                    preloadAssets();

                } catch (error) {
                    console.error("Error fetching data:", error);
                    setShowOpening(false);
                    setLoading(false);
                    setIsAssetsLoaded(true); // Ensure entry on error
                }
            } else {
                setShowOpening(false);
                setLoading(false);
                setIsAssetsLoaded(true);
            }
        });

        return () => unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/portal/login');
    };

    const openDownloadModal = (section: DownloadSection) => {
        setSelectedDownload(section);
        setIsModalOpen(true);
        setDownloading(false);
    };

    const closeDownloadModal = () => {
        setIsModalOpen(false);
        setSelectedDownload(null);
    };

    const executeDownload = () => {
        if (!selectedDownload) return;
        setDownloading(true);

        const link = document.createElement('a');
        link.href = selectedDownload.url;
        link.download = selectedDownload.fileName;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
            // Track Analytics
            (async () => {
                // Exclude Admin Tracking
                if (typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true') {
                    console.log('Skipping ZIP download tracking for Admin');
                    return;
                }

                try {
                    const clientId = user?.email?.split('@')[0];
                    if (clientId) {
                        await setDoc(doc(db, 'projects', clientId), {
                            downloadCount: increment(1)
                        }, { merge: true });

                        await addDoc(collection(db, 'projects', clientId, 'logs'), {
                            type: 'download',
                            timestamp: serverTimestamp(),
                            details: `ZIP: ${selectedDownload.title} (${selectedDownload.count}枚)`
                        });
                    }
                } catch (e) {
                    console.error("Failed to track download analytics", e);
                }
            })();

            closeDownloadModal();
            setDownloading(false);
        }, 1500);
    };

    const getActiveSlide = () => {
        return slideshowSettings.find(s => s.id === activeTabId);
    };

    const handleOpeningEnded = () => {
        setShowOpening(false);
    };

    const handleSkipOpening = () => {
        if (openingVideoRef.current) {
            openingVideoRef.current.pause();
        }
        setShowOpening(false);
    };

    const handleDownloadLog = async (details: string) => {
        // Exclude Admin Tracking
        if (typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true') {
            console.log('Skipping gallery bulk download tracking for Admin');
            return;
        }

        try {
            const clientId = user?.email?.split('@')[0];
            if (clientId) {
                await setDoc(doc(db, 'projects', clientId), {
                    downloadCount: increment(1)
                }, { merge: true });

                await addDoc(collection(db, 'projects', clientId, 'logs'), {
                    type: 'download',
                    timestamp: serverTimestamp(),
                    details
                });
            }
        } catch (e) {
            console.error("Failed to track gallery download analytics", e);
        }
    };

    // Combined Loading Logic: Show Preloader if initial auth loading OR assets not loaded
    // This prevents the legacy spinner from flashing.
    const showPreloader = loading || !isAssetsLoaded;

    const handleToggleLike = async (photo: any) => {
        if (!user) return;
        const clientId = user.email?.split('@')[0];
        if (!clientId) return;

        // 二重クリック（連打）防止のための処理中フラグ判定
        if (processingLikesRef.current.has(photo.id)) return;
        processingLikesRef.current.add(photo.id);

        const isLiked = likedPhotoIds.has(photo.id);
        const favoriteDocId = `${user.uid}_${photo.id}`;

        // 楽観的更新 (Optimistic Update): Firestoreの完了を待たずにUI状態を反転
        setLikedPhotoIds(prev => {
            const newSet = new Set(prev);
            if (isLiked) {
                newSet.delete(photo.id);
            } else {
                newSet.add(photo.id);
            }
            return newSet;
        });

        try {
            if (isLiked) {
                // Remove like
                await deleteDoc(doc(db, 'favorites', favoriteDocId));
                // Decrement global like count
                const likeRef = doc(db, 'image_likes', photo.id);
                const likeSnap = await getDoc(likeRef);
                if (likeSnap.exists() && likeSnap.data().likeCount > 0) {
                    await updateDoc(likeRef, {
                        likeCount: increment(-1)
                    });
                }
            } else {
                // Add like
                await setDoc(doc(db, 'favorites', favoriteDocId), {
                    userId: user.uid,
                    clientId: clientId,
                    photoId: photo.id,
                    createdAt: serverTimestamp()
                });
                // Increment global like count
                await setDoc(doc(db, 'image_likes', photo.id), {
                    likeCount: increment(1)
                }, { merge: true });
            }
        } catch (error) {
            console.error('Failed to toggle like', error);
            // エラーが発生した場合は、楽観的更新をロールバック（元の状態に戻す）
            setLikedPhotoIds(prev => {
                const newSet = new Set(prev);
                if (isLiked) {
                    newSet.add(photo.id);
                } else {
                    newSet.delete(photo.id);
                }
                return newSet;
            });
            alert('通信エラーが発生しました。いいねの状態を元に戻しました。');
        } finally {
            // 処理中フラグの解除
            processingLikesRef.current.delete(photo.id);
        }
    };

    // Determine if we should render content (only if user exists and not in initial auth load)
    // Note: showPreloader handles the visual overlay, but we need to prevent content rendering errors if user is null during loading.
    if (!loading && !user) return null;

    return (
        <>
            {/* FULLSCREEN PRELOADER */}
            <AnimatePresence>
                {showPreloader && (
                    <motion.div
                        key="preloader"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center"
                    >
                        <div className="w-64 relative">
                            {/* Percentage Text */}
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-white/60 text-xs font-light tracking-[0.2em] uppercase">Loading</span>
                                <span className="text-white text-sm font-light tracking-widest tabular-nums">
                                    {Math.round(loadingProgress)}%
                                </span>
                            </div>

                            {/* Progress Bar Track */}
                            <div className="w-full h-[2px] bg-white/20 overflow-hidden relative">
                                {/* Moving Bar */}
                                <motion.div
                                    className="h-full bg-white absolute left-0 top-0"
                                    initial={{ width: "0%" }}
                                    animate={{ width: `${loadingProgress}%` }}
                                    transition={{ ease: "easeOut", duration: 0.5 }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* OPENING MOVIE */}
            <AnimatePresence>
                {isAssetsLoaded && showOpening && openingVideoUrl && (
                    <motion.div
                        key="opening-movie"
                        initial={{ opacity: 0 }} // Start invisible, fade in after loader
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.0, ease: "easeInOut" }}
                        className="fixed inset-0 z-50 bg-black flex items-center justify-center cursor-pointer"
                        onClick={handleSkipOpening}
                    >
                        <video
                            ref={openingVideoRef}
                            src={openingVideoUrl}
                            className="w-full h-full object-cover"
                            autoPlay
                            muted
                            playsInline
                            onEnded={handleOpeningEnded}
                        />

                        {/* Cinematic Overlay (Vignette) */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none z-10" />

                        {/* Cinematic Title Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <motion.h2
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: [0, 1, 1, 0], scale: [0.95, 1, 1, 1.05], y: [10, 0, 0, -10] }}
                                transition={{
                                    duration: 10,
                                    times: [0, 0.1, 0.9, 1],
                                    delay: 0.4,
                                    ease: "easeInOut"
                                }}
                                className="relative z-20 w-full overflow-hidden text-ellipsis whitespace-nowrap px-4 text-center font-sans font-black text-white mix-blend-difference text-xl tracking-[0.1em] sm:text-2xl sm:tracking-[0.15em] md:px-6 md:text-5xl md:tracking-[0.3em] lg:text-7xl lg:tracking-[0.4em]"
                            >
                                {projectName}
                            </motion.h2>
                        </div>

                        <button
                            className="absolute bottom-8 right-8 text-white/50 flex items-center gap-2 text-sm font-light tracking-widest z-50 uppercase pointer-events-none"
                        >
                            Skip <SkipForward className="h-4 w-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MAIN DASHBOARD */}
            {isAssetsLoaded && (
                <motion.div
                    className="min-h-screen bg-white"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: showOpening ? 0 : 1 }} // Stay hidden while opening plays
                    transition={{ duration: 1.5, ease: "easeInOut", delay: showOpening ? 0.5 : 0 }}
                >
                    <main className="w-full pt-20">
                        {/* Project Title Header */}
                        <div className="pt-6 pb-2 text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <h2 className="text-xl md:text-2xl font-bold text-gray-800 tracking-[0.2em] uppercase">
                                {projectName}
                            </h2>
                        </div>
                        {/* Slideshow Config */}
                        {slideshowSettings.length > 0 && (
                            <section className="px-4 pt-4 pb-4">
                                <div className="max-w-4xl mx-auto space-y-4">
                                    {/* Content Container */}
                                    <div className="w-full aspect-video relative rounded-lg overflow-hidden shadow-2xl bg-gray-100">
                                        <AnimatePresence mode="wait">
                                            {(() => {
                                                const activeSlide = getActiveSlide();

                                                if (!activeSlide) return null;

                                                return (
                                                    <motion.div
                                                        key={activeSlide.id}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="absolute inset-0 w-full h-full"
                                                    >
                                                        {(() => {
                                                            switch (activeSlide.type) {
                                                                case 'MOVIE':
                                                                    return (
                                                                        <div className="absolute inset-0 flex items-center justify-center bg-black">
                                                                            {activeSlide.content.includes('youtube') || activeSlide.content.includes('youtu.be') ? (
                                                                                <iframe
                                                                                    width="100%"
                                                                                    height="100%"
                                                                                    src={activeSlide.content.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                                                                                    title="YouTube video player"
                                                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                                    allowFullScreen
                                                                                    className="w-full h-full"
                                                                                />
                                                                            ) : (
                                                                                /* Updated Direct Video Support */
                                                                                <video
                                                                                    src={activeSlide.content}
                                                                                    className="w-full h-full object-cover"
                                                                                    autoPlay
                                                                                    muted
                                                                                    loop
                                                                                    playsInline
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    );
                                                                case 'AFTER':
                                                                    if (activeSlide.beforeUrl && activeSlide.afterUrl) {
                                                                        return (
                                                                            <div className="absolute inset-0">
                                                                                <BeforeAfterSlider
                                                                                    beforeUrl={activeSlide.beforeUrl}
                                                                                    afterUrl={activeSlide.afterUrl}
                                                                                />
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return (
                                                                        <div className="absolute inset-0">
                                                                            <img
                                                                                src={activeSlide.content}
                                                                                alt="Main Visual"
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                        </div>
                                                                    );
                                                                case 'DESCRIPTION':
                                                                    return (
                                                                        <div className="absolute inset-0 w-full h-full relative">
                                                                            {activeSlide.imageUrl && (
                                                                                <div className="absolute inset-0">
                                                                                    <img
                                                                                        src={activeSlide.imageUrl}
                                                                                        alt="Background"
                                                                                        className="w-full h-full object-cover"
                                                                                    />
                                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                                                                                </div>
                                                                            )}

                                                                            <div className="absolute bottom-8 left-8 md:bottom-12 md:left-12 text-left z-10 pr-8">
                                                                                <motion.div
                                                                                    initial={{ opacity: 0, x: 0, y: 40 }}
                                                                                    animate={{ opacity: 1, x: 0, y: 0 }}
                                                                                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                                                                                    className="max-w-[85vw] md:max-w-none"
                                                                                >
                                                                                    <h3 className="text-xl sm:text-2xl md:text-4xl font-bold text-white tracking-wider md:tracking-widest drop-shadow-md leading-relaxed break-words whitespace-pre-wrap">
                                                                                        {activeSlide.content}
                                                                                    </h3>
                                                                                </motion.div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                case 'OFFER':
                                                                    return (
                                                                        <div className="absolute inset-0 w-full h-full relative group">
                                                                            {/* Background Image */}
                                                                            {activeSlide.imageUrl && (
                                                                                <div className="absolute inset-0">
                                                                                    <img
                                                                                        src={activeSlide.imageUrl}
                                                                                        alt="Offer Background"
                                                                                        className="w-full h-full object-cover transition-transform duration-[3s] ease-out group-hover:scale-105"
                                                                                    />
                                                                                    {/* Dark Overlay for readability */}
                                                                                    <div className="absolute inset-0 bg-black/40" />
                                                                                </div>
                                                                            )}

                                                                            {/* Content Center */}
                                                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 sm:p-8 z-10 w-full overflow-hidden">
                                                                                <motion.div
                                                                                    initial={{ opacity: 0, y: 20 }}
                                                                                    animate={{ opacity: 1, y: 0 }}
                                                                                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                                                                                    className="w-full max-w-[95%] sm:max-w-[90%] mx-auto px-2"
                                                                                >
                                                                                    <h3 className="text-xl sm:text-2xl md:text-4xl font-bold text-white tracking-wider md:tracking-widest mb-2 sm:mb-4 drop-shadow-md break-words whitespace-pre-wrap w-full">
                                                                                        {activeSlide.title || 'ご案内'}
                                                                                    </h3>
                                                                                </motion.div>

                                                                                <motion.div
                                                                                    initial={{ opacity: 0 }}
                                                                                    animate={{ opacity: 1 }}
                                                                                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
                                                                                    className="w-full max-w-[95%] sm:max-w-lg mx-auto px-2"
                                                                                >
                                                                                    <p className="text-white/90 text-xs sm:text-sm md:text-base font-medium leading-relaxed mb-6 sm:mb-8 whitespace-pre-line drop-shadow-sm break-words w-full">
                                                                                        {activeSlide.content}
                                                                                    </p>
                                                                                </motion.div>

                                                                                {activeSlide.buttonText && activeSlide.linkUrl && (
                                                                                    <motion.div
                                                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                                        transition={{ duration: 0.4, ease: "easeOut", delay: 0.6 }}
                                                                                        className="px-2 w-full flex justify-center"
                                                                                    >
                                                                                        <a
                                                                                            href={activeSlide.linkUrl}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="inline-block bg-white text-gray-900 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold tracking-widest hover:bg-gray-100 hover:scale-105 transition-all shadow-lg text-center max-w-full break-normal"
                                                                                        >
                                                                                            {activeSlide.buttonText}
                                                                                        </a>
                                                                                    </motion.div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                case 'POPULAR':
                                                                    return <PopularPhotosSlide photos={topPhotos} />;
                                                                default:
                                                                    return null;
                                                            }
                                                        })()}
                                                    </motion.div>
                                                );
                                            })()}
                                        </AnimatePresence>
                                    </div>

                                    <div className="flex justify-start md:justify-center overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-b border-gray-100 pb-6 mt-4 w-full">
                                        <div className="inline-flex bg-gray-100/80 backdrop-blur-sm p-1 md:p-1.5 rounded-full relative shadow-inner min-w-max mx-auto md:mx-0">
                                            {slideshowSettings.map((slide) => {
                                                const LABEL_MAP: Record<string, string> = {
                                                    'MOVIE': '動画',
                                                    'AFTER': '現像後',
                                                    'DESCRIPTION': '説明',
                                                    'OFFER': 'ご案内',
                                                    'POPULAR': '人気の写真'
                                                };

                                                return (
                                                    <button
                                                        key={slide.id}
                                                        onClick={() => setActiveTabId(slide.id)}
                                                        className={`relative px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors duration-200 z-10 ${activeTabId === slide.id
                                                            ? 'text-white'
                                                            : 'text-gray-500 hover:text-black'
                                                            }`}
                                                        style={{ WebkitTapHighlightColor: "transparent" }}
                                                    >
                                                        {activeTabId === slide.id && (
                                                            <motion.span
                                                                layoutId="activeSlideshowTab"
                                                                className="absolute inset-0 bg-black rounded-full shadow-md -z-10"
                                                                initial={false}
                                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                            />
                                                        )}
                                                        <span className="relative z-10">
                                                            {LABEL_MAP[slide.type] || slide.type}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        <section className="px-4 py-8 pb-4">
                            {downloadSections.length > 0 ? (
                                <div className="max-w-lg mx-auto">
                                    <div className="bg-gray-50/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                                        <h3 className="text-blue-600 font-bold mb-4 flex items-center gap-2 text-sm md:text-base">
                                            <span>一括ダウンロード</span>
                                        </h3>
                                        <div className="flex flex-col gap-4">
                                            {downloadSections.map((section, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => openDownloadModal(section)}
                                                    className="group relative flex items-center justify-between w-full p-4 bg-white border border-blue-100 text-gray-800 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 transition-all duration-300 decoration-0"
                                                >
                                                    <div className="flex items-center gap-4 overflow-hidden">
                                                        <div className="flex-shrink-0 bg-blue-50 p-2.5 rounded-lg group-hover:bg-blue-100 transition-colors">
                                                            <FolderArchive className="h-6 w-6 text-blue-600" />
                                                        </div>
                                                        <div className="min-w-0 text-left">
                                                            <p className="text-base font-bold truncate text-gray-900">
                                                                {section.title}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium">{section.count}枚</span>
                                                                <span>{section.size}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex-shrink-0 ml-4 text-gray-300 group-hover:text-blue-500 transition-colors">
                                                        <Download className="h-5 w-5" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-gray-400 text-xs py-4"></div>
                            )}
                        </section>

                        <section className="px-2 sm:px-4 py-8">
                            <Gallery
                                photos={photos}
                                loading={loading}
                                emptyMessage="写真はまだありません。"
                                enableMultiSelect={true}
                                enableLikes={projectData?.isLikeEnabled !== false}
                                likedPhotoIds={likedPhotoIds}
                                onToggleLike={handleToggleLike}
                                onDownloadLog={handleDownloadLog}
                            />
                        </section>
                    </main>

                    {isModalOpen && selectedDownload && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">写真をダウンロードしますか？</h3>
                                    <button onClick={closeDownloadModal} className="text-gray-400 hover:text-gray-500">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="mb-6">
                                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg mb-2">
                                        <FolderArchive className="h-6 w-6 text-blue-600" />
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{selectedDownload.title}</p>
                                            <p className="text-xs text-gray-500">{selectedDownload.count}枚 / {selectedDownload.size}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        上記のファイルをZIP形式で保存します。
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={executeDownload}
                                        disabled={downloading}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        {downloading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>準備中...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Download className="h-4 w-4" />
                                                <span>ダウンロードを開始する</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={closeDownloadModal}
                                        disabled={downloading}
                                        className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                                    >
                                        キャンセル
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div >
            )
            }
        </>
    );
}
