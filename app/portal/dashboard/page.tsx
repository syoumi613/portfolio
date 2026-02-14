'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { LogOut, Download, FolderDown, Loader2, Archive, FolderArchive, X } from 'lucide-react';
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
    storagePath: string; // Add this if needed for types, though client doesn't need to delete
}

interface SlideshowSlide {
    id: string;
    type: 'MOVIE' | 'AFTER' | 'DESCRIPTION';
    title: string;
    content: string;
    storagePath?: string;
    // For Before/After
    beforeUrl?: string;
    afterUrl?: string;
    // For Description
    imageUrl?: string;
}

export default function ClientDashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [downloadSections, setDownloadSections] = useState<DownloadSection[]>([]);
    const [slideshowSettings, setSlideshowSettings] = useState<SlideshowSlide[]>([]);
    const [projectName, setProjectName] = useState('');
    const [loading, setLoading] = useState(true);

    // Tab State (Dynamic)
    const [activeTabId, setActiveTabId] = useState<string>('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDownload, setSelectedDownload] = useState<DownloadSection | null>(null);
    const [downloading, setDownloading] = useState(false);

    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push('/portal/login');
                return;
            }
            setUser(currentUser);

            // Extract clientId from email (e.g. client123@portfolio.local -> client123)
            const clientId = currentUser.email?.split('@')[0];

            if (clientId) {
                try {
                    // 1. Fetch Project Details (Name & Download Sections)
                    let getName = clientId; // fallback
                    const projectRef = doc(db, 'projects', clientId);
                    const projectSnap = await getDoc(projectRef);

                    if (projectSnap.exists()) {
                        const data = projectSnap.data();
                        getName = data.name;
                        if (data.downloadSections) {
                            setDownloadSections(data.downloadSections);
                        }
                        // Fetch Slideshow Settings
                        if (data.slideshowSettings && Array.isArray(data.slideshowSettings) && data.slideshowSettings.length > 0) {
                            setSlideshowSettings(data.slideshowSettings);
                            // Set initial active tab to the first one
                            setActiveTabId(data.slideshowSettings[0].id);
                        } else {
                            setSlideshowSettings([]);
                        }
                    } else {
                        // Legacy check
                        const legacyRef = doc(db, 'clients', clientId);
                        const legacySnap = await getDoc(legacyRef);
                        if (legacySnap.exists()) {
                            getName = legacySnap.data().name;
                        }
                    }
                    setProjectName(getName);

                    // 2. Fetch Photos
                    const q = query(
                        collection(db, 'albums'),
                        where('clientId', '==', clientId)
                    );

                    const querySnapshot = await getDocs(q);
                    const fetchedPhotos: Photo[] = [];
                    querySnapshot.forEach((doc) => {
                        fetchedPhotos.push({ id: doc.id, ...doc.data() } as Photo);
                    });

                    // Sort by fileName (Natural Sort: 1.jpg, 2.jpg, 10.jpg)
                    fetchedPhotos.sort((a, b) => {
                        return (a.fileName || '').localeCompare(b.fileName || '', undefined, { numeric: true, sensitivity: 'base' });
                    });

                    setPhotos(fetchedPhotos);
                } catch (error) {
                    console.error("Error fetching data:", error);
                }
            }
            setLoading(false);
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

        // Create a temporary link to trigger download
        const link = document.createElement('a');
        link.href = selectedDownload.url;
        link.download = selectedDownload.fileName;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Close modal after a short delay (showing "Started" state briefly if desired, or just close)
        setTimeout(() => {
            closeDownloadModal();
            setDownloading(false);
        }, 1500);
    };

    const getActiveSlide = () => {
        return slideshowSettings.find(s => s.id === activeTabId);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!user) return null;

    return (
        <div className="min-h-screen bg-white">
            <nav className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-10">
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
                {/* 1. Dynamic Slideshow Section */}
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
                                                                        <div className="text-center text-white">
                                                                            <p className="text-lg font-bold tracking-widest">VIDEO CONTENT</p>
                                                                            <a href={activeSlide.content} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline mt-2 block">
                                                                                Watch Video
                                                                            </a>
                                                                        </div>
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
                                                            // Fallback for legacy single image
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
                                                                    {/* Background Image */}
                                                                    {activeSlide.imageUrl && (
                                                                        <div className="absolute inset-0">
                                                                            <img
                                                                                src={activeSlide.imageUrl}
                                                                                alt="Background"
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                            {/* Gradient Overlay (Bottom-up) */}
                                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                                                                        </div>
                                                                    )}

                                                                    {/* Text Message (Bottom-Left) */}
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

                            {/* Control Buttons (Synced with Slideshow Width) */}
                            <div className="flex items-center justify-center gap-2 sm:gap-6 flex-wrap border-b border-gray-100 pb-4">
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
                                            className={`px-6 py-2 text-sm font-medium rounded-full transition-all tracking-widest relative group whitespace-nowrap ${activeTabId === slide.id
                                                    ? 'bg-blue-600 text-white shadow-md'
                                                    : 'bg-white text-gray-500 hover:text-black hover:bg-gray-50'
                                                }`}
                                        >
                                            <span className="relative z-10">
                                                {LABEL_MAP[slide.type] || slide.type}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}

                {/* 2. Pre-defined Download Section (Blue Folder Style) */}
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
                                            {/* Folder Icon */}
                                            <div className="flex-shrink-0 bg-white/20 p-3 rounded-md group-hover:bg-white/30 transition-colors">
                                                <FolderArchive className="h-8 w-8 text-white" />
                                            </div>

                                            {/* Text Content */}
                                            <div className="min-w-0 text-left">
                                                <p className="text-lg font-bold truncate tracking-wide">
                                                    {section.title} <span className="text-sm font-normal ml-1 opacity-90">(全{section.count}枚)</span>
                                                </p>
                                                <p className="text-sm font-medium text-blue-100 mt-0.5">
                                                    {section.size}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Download Icon */}
                                        <div className="flex-shrink-0 ml-4 bg-white/10 p-2 rounded-full group-hover:bg-white/20 transition-colors">
                                            <Download className="h-5 w-5 text-white" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Fallback message if no download sections configured */
                        <div className="text-center text-gray-400 text-xs py-4">
                            {/* Optional: Show nothing or a placeholder */}
                        </div>
                    )}
                </section>

                {/* 3. Gallery Section */}
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

            {/* Download Confirmation Modal */}
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
        </div>
    );
}
