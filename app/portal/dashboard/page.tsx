'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { LogOut, Download } from 'lucide-react';

interface Photo {
    id: string;
    url: string;
    fileName: string;
    clientId: string;
}

export default function ClientDashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [projectName, setProjectName] = useState('');
    const [loading, setLoading] = useState(true);
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
                    // 1. Fetch Project Name
                    // Check 'projects' first, then 'clients'
                    let projectName = clientId; // fallback
                    const projectRef = doc(db, 'projects', clientId);
                    const projectSnap = await getDoc(projectRef);

                    if (projectSnap.exists()) {
                        projectName = projectSnap.data().name;
                    } else {
                        const legacyRef = doc(db, 'clients', clientId);
                        const legacySnap = await getDoc(legacyRef);
                        if (legacySnap.exists()) {
                            projectName = legacySnap.data().name;
                        }
                    }

                    // We can store project info in a state if needed, or just use it here.
                    // For now, let's just use it for display? proper way is state.
                    setProjectName(projectName);

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

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!user) return null;

    return (
        <div className="min-h-screen bg-white">
            <nav className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {photos.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-gray-500 font-light">写真はまだありません。</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {photos.map((photo) => (
                            <div key={photo.id} className="group relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
                                {/* Image Placeholder - In real app use Next.js Image */}
                                <img
                                    src={photo.url}
                                    alt={photo.fileName}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    loading="lazy"
                                />

                                {/* Overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-between p-4 opacity-0 group-hover:opacity-100">
                                    <span className="text-white text-xs truncate max-w-[70%]">{photo.fileName}</span>
                                    <a
                                        href={photo.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 bg-white/90 rounded-full hover:bg-white text-gray-900 shadow-sm"
                                        download={photo.fileName} // Note: download attr works best for same-origin
                                    >
                                        <Download className="h-4 w-4" />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
