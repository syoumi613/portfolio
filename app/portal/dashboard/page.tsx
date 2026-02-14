'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { LogOut, Download, FolderDown, Loader2, Archive, FolderArchive, X, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Gallery from '@/components/Gallery';
import HeroSlider from '@/components/HeroSlider';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';

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
    type: 'MOVIE' | 'AFTER' | 'DESCRIPTION';
    title: string;
    content: string;
    storagePath?: string;
    beforeUrl?: string;
    afterUrl?: string;
    imageUrl?: string;
}

export default function ClientDashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [downloadSections, setDownloadSections] = useState<DownloadSection[]>([]);
    const [slideshowSettings, setSlideshowSettings] = useState<SlideshowSlide[]>([]);
    const [projectName, setProjectName] = useState('');
    const [loading, setLoading] = useState(true);

    // Preloader State
    const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);

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

                            slides = sortedSettings;
                            setSlideshowSettings(sortedSettings);
                            setActiveTabId(sortedSettings[0].id);

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

    // Combined Loading Logic: Show Preloader if initial auth loading OR assets not loaded
    // This prevents the legacy spinner from flashing.
    const showPreloader = loading || !isAssetsLoaded;

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
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <motion.h2
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: [0, 1, 1, 0], scale: [0.95, 1, 1, 1.05], y: [10, 0, 0, -10] }}
                                transition={{
                                    duration: 6,
                                    times: [0, 0.15, 0.85, 1],
                                    delay: 0.4,
                                    ease: "easeInOut"
                                }}
                                className="text-3xl md:text-5xl text-white font-sans font-medium tracking-[0.2em] text-center px-4 [text-shadow:0_4px_24px_rgba(0,0,0,0.8)]"
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
                    <nav className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-40">
                        <div className="w-full px-4 sm:px-6 lg:px-8">
                            <div className="flex justify-between h-16 items-center">
                                <div className="flex items-center gap-4">
                                    <h1 className="text-xl font-light text-gray-900 tracking-wide">プロジェクトアルバム</h1>
                                    <div className="flex gap-2 ml-4">
                                        <button onClick={() => router.push('/')} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-full transition-colors">
                                            トップ
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <span className="text-sm font-medium text-gray-900 hidden sm:block">
                                        {projectName}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </nav>

                    <main className="w-full">
                        {/* Slideshow Config */}
                        {slideshowSettings.length > 0 && (
                            <section className="px-4 pt-8 pb-4">
                                <div className="max-w-[1200px] mx-auto space-y-4">
                                    {/* Content Container */}
                                    <div className="w-full aspect-[3/2] relative rounded-lg overflow-hidden shadow-2xl bg-gray-100">
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
                                                                                >
                                                                                    <h3 className="text-2xl md:text-4xl font-bold text-white tracking-widest drop-shadow-md leading-relaxed">
                                                                                        {activeSlide.content}
                                                                                    </h3>
                                                                                </motion.div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                default:
                                                                    return null;
                                                            }
                                                        })()}
                                                    </motion.div>
                                                );
                                            })()}
                                        </AnimatePresence>
                                    </div>

                                    <div className="flex justify-center border-b border-gray-100 pb-6 mt-4">
                                        <div className="inline-flex bg-gray-100/80 backdrop-blur-sm p-1.5 rounded-full relative shadow-inner">
                                            {slideshowSettings.map((slide) => {
                                                const LABEL_MAP: Record<string, string> = {
                                                    'MOVIE': '動画',
                                                    'AFTER': '現像後',
                                                    'DESCRIPTION': '説明'
                                                };

                                                return (
                                                    <button
                                                        key={slide.id}
                                                        onClick={() => setActiveTabId(slide.id)}
                                                        className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors duration-200 z-10 ${activeTabId === slide.id
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
                                    <div className="flex flex-col gap-4">
                                        {downloadSections.map((section, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => openDownloadModal(section)}
                                                className="group relative flex items-center justify-between w-full p-6 bg-blue-600 text-white rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 decoration-0"
                                            >
                                                <div className="flex items-center gap-5 overflow-hidden">
                                                    <div className="flex-shrink-0 bg-white/20 p-3 rounded-md group-hover:bg-white/30 transition-colors">
                                                        <FolderArchive className="h-8 w-8 text-white" />
                                                    </div>
                                                    <div className="min-w-0 text-left">
                                                        <p className="text-lg font-bold truncate tracking-wide">
                                                            {section.title} <span className="text-sm font-normal ml-1 opacity-90">(全{section.count}枚)</span>
                                                        </p>
                                                        <p className="text-sm font-medium text-blue-100 mt-0.5">
                                                            {section.size}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0 ml-4 bg-white/10 p-2 rounded-full group-hover:bg-white/20 transition-colors">
                                                    <Download className="h-5 w-5 text-white" />
                                                </div>
                                            </button>
                                        ))}
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
                                renderOverlay={(photo) => (
                                    <a
                                        href={photo.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 bg-white/90 rounded-full hover:bg-white text-gray-900 shadow-sm transition-colors"
                                        download={photo.fileName}
                                        title="Download"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Download className="h-4 w-4" />
                                    </a>
                                )}
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
                </motion.div>
            )}
        </>
    );
}
