'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { Users, Upload, Image as ImageIcon, LogOut } from 'lucide-react';

export default function AdminDashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            // Basic check: if strictly needed, check specific admin email here
            if (!currentUser) {
                router.push('/admin/');
            } else {
                setUser(currentUser);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/admin');
    };

    if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
    if (!user) return null;

    return (
        <div className="bg-gray-100 md:bg-transparent min-h-full">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-light text-gray-900">ホーム</h2>
                    <Link href="/admin/projects/new/" className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-all shadow-md hover:shadow-lg">
                        <Users className="h-4 w-4" />
                        <span>新規プロジェクト作成</span>
                    </Link>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Project List */}
                    <ProjectList />
                </div>
            </main>
        </div>
    );
}

// Subcomponent for fetching projects
function ProjectList() {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                // Should use 'projects' collection. Fallback to 'clients' if needed but we are moving forward.
                const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);
                let loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // If empty, try legacy clients just in case? Or just strict.
                // Strict 'projects' is better as we refactored.

                setProjects(loaded);
            } catch (err) {
                console.error("Failed to load projects", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    if (loading) return <div className="text-center py-10 text-gray-500">プロジェクトを読み込み中...</div>;

    if (projects.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
                <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">プロジェクトがありません</h3>
                <p className="text-gray-500 mt-2 mb-6">新しいプロジェクトを作成して写真をアップロードしましょう。</p>
                <Link href="/admin/projects/new/" className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium">
                    プロジェクトを作成する <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">プロジェクト一覧</h3>
                <span className="text-xs text-gray-500">{projects.length} 件</span>
            </div>
            <div className="divide-y divide-gray-100">
                {projects.map((project) => (
                    <div
                        key={project.id}
                        onClick={() => router.push(`/admin/project-details?id=${project.id}`)}
                        className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group flex items-center justify-between"
                    >
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                                {project.id.slice(-2)}
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900 group-hover:text-purple-600 transition-colors">
                                    {project.name}
                                </h4>
                                <div className="flex items-center gap-4 mt-1">
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-mono">
                                        Code: {project.id}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {/* Display date if possible */}
                                        {project.createdAt?.seconds ? new Date(project.createdAt.seconds * 1000).toLocaleDateString('ja-JP') : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-purple-400" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// Add Imports
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowRight } from 'lucide-react';
