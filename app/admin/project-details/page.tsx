'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { Upload, X, Check, Image as ImageIcon, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Gallery from '@/components/Gallery';

function ProjectDetailsContent() {
    const searchParams = useSearchParams();
    const projectId = searchParams.get('id');

    const [project, setProject] = useState<any>(null);
    const [photos, setPhotos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [success, setSuccess] = useState('');
    const router = useRouter();

    useEffect(() => {
        if (!projectId) return;

        const fetchData = async () => {
            try {
                // 1. Fetch Project Details
                const docRef = doc(db, 'projects', projectId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setProject({ id: docSnap.id, ...docSnap.data() });
                } else {
                    // Try legacy 'clients' check just in case or just 404
                    const clientRef = doc(db, 'clients', projectId);
                    const clientSnap = await getDoc(clientRef);
                    if (clientSnap.exists()) {
                        setProject({ id: clientSnap.id, ...clientSnap.data() });
                    }
                }

                // 2. Fetch Photos
                const q = query(
                    collection(db, 'albums'),
                    where('clientId', '==', projectId)
                );

                const querySnapshot = await getDocs(q);
                const fetchedPhotos: any[] = [];
                querySnapshot.forEach((doc) => {
                    fetchedPhotos.push({ id: doc.id, ...doc.data() });
                });
                // Manual sort if index missing
                fetchedPhotos.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

                setPhotos(fetchedPhotos);

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [projectId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (!projectId) {
            alert("プロジェクトIDが取得できませんでした。画面をリロードしてください。");
            return;
        }
        if (files.length === 0) return;

        setUploading(true);
        setSuccess('');

        try {
            // Verify Storage Path format
            console.log(`Starting upload to: projects/${projectId}/photos/`);

            const uploadPromises = files.map(async (file) => {
                const path = `projects/${projectId}/photos/${Date.now()}_${file.name}`;

                // Storage Upload
                const storageRef = ref(storage, path);
                const snapshot = await uploadBytes(storageRef, file);
                const downloadUrl = await getDownloadURL(snapshot.ref);

                // Firestore Meta
                const newDocRef = await addDoc(collection(db, 'albums'), {
                    clientId: projectId, // Legacy Support
                    projectId: projectId, // New Standard
                    fileName: file.name,
                    storagePath: snapshot.ref.fullPath,
                    url: downloadUrl,
                    createdAt: serverTimestamp(),
                    type: 'client_delivery'
                });

                return {
                    id: newDocRef.id,
                    clientId: projectId,
                    fileName: file.name,
                    url: downloadUrl,
                    storagePath: snapshot.ref.fullPath
                };
            });

            const newPhotos = await Promise.all(uploadPromises);
            setPhotos(prev => [...newPhotos, ...prev]);
            setSuccess(`${files.length}枚の写真をアップロードしました`);
            setFiles([]);
        } catch (error: any) {
            console.error("Upload failed", error);
            const msg = error.message || "予期せぬエラーが発生しました";
            alert(`アップロードエラー: ${msg}\n(Check Console for details)`);
        } finally {
            setUploading(false);
        }
    };

    const handleDeletePhoto = async (photoId: string, storagePath: string) => {
        if (!confirm('本当にこの写真を削除しますか？')) return;

        try {
            // 1. Delete from Firestore
            await deleteDoc(doc(db, 'albums', photoId));

            // 2. Delete from Storage
            if (storagePath) {
                const storageRef = ref(storage, storagePath);
                await deleteObject(storageRef).catch(err => console.warn("Storage delete error (might allow orphan logic):", err));
            }

            // Update State
            setPhotos(prev => prev.filter(p => p.id !== photoId));

        } catch (error) {
            console.error("Delete failed", error);
            alert("削除に失敗しました");
        }
    };

    const handleDeleteProject = async () => {
        if (!confirm('【警告】本当にこのプロジェクトを削除しますか？\n\n・プロジェクト登録情報\n・アップロードされた全ての写真\n\nこれらが完全に削除され、復元できません。')) return;

        setLoading(true);
        try {
            // 1. Delete all photos from Storage and Firestore
            // Use existing 'photos' state to know paths
            const deletePromises = photos.map(async (photo) => {
                // Delete from Storage
                if (photo.storagePath) {
                    const storageRef = ref(storage, photo.storagePath);
                    await deleteObject(storageRef).catch(err => console.warn("Storage delete warn:", err));
                }
                // Delete phot doc
                return deleteDoc(doc(db, 'albums', photo.id));
            });
            await Promise.all(deletePromises);

            // 2. Delete Project Document
            if (projectId) {
                await deleteDoc(doc(db, 'projects', projectId));
            }

            alert('プロジェクトを削除しました。ダッシュボードに戻ります。');
            router.push('/admin/dashboard/');

        } catch (error) {
            console.error("Delete failed", error);
            alert("削除に失敗しました");
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">読み込み中...</div>;
    if (!projectId) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">URLパラメータエラー: プロジェクトIDが指定されていません</div>;
    if (!project && !loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">プロジェクトが見つかりません</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/dashboard/" className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition-colors">
                            <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </Link>
                        <div>
                            <div className="flex items-baseline gap-3">
                                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-mono rounded-md border border-purple-200">
                                    Code: {project.id}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">プロジェクト詳細・写真管理</p>
                        </div>
                    </div>

                    <button
                        onClick={handleDeleteProject}
                        className="flex items-center px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors text-sm font-medium"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        プロジェクトを削除
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Upload */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Upload className="h-5 w-5 text-blue-600" />
                                写真を追加
                            </h2>

                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors relative">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                />
                                <div className="pointer-events-none">
                                    <div className="mx-auto h-10 w-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-3">
                                        <Upload className="h-5 w-5" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">ドラッグ＆ドロップ</p>
                                    <p className="text-xs text-gray-500 mt-1">またはクリックして選択</p>
                                </div>
                            </div>

                            {/* Staged Files Preview */}
                            {files.length > 0 && (
                                <div className="mt-6 border-t border-gray-100 pt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-700">選択中 ({files.length})</span>
                                        <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:text-red-600">全てクリア</button>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto space-y-2 mb-4 pr-1">
                                        {files.map((file, i) => (
                                            <div key={i} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded border border-gray-100">
                                                <span className="truncate max-w-[150px]">{file.name}</span>
                                                <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleUpload}
                                        disabled={uploading}
                                        className="w-full flex items-center justify-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'アップロード開始'}
                                    </button>
                                </div>
                            )}

                            {success && (
                                <div className="mt-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2">
                                    <Check className="h-4 w-4" />
                                    {success}
                                </div>
                            )}
                        </div>
                    </div>


                    {/* Right Column: Gallery */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <ImageIcon className="h-5 w-5 text-purple-600" />
                                    ギャラリー ({photos.length})
                                </h2>
                            </div>

                            <Gallery
                                photos={photos}
                                loading={loading}
                                onDelete={(photo) => handleDeletePhoto(photo.id, photo.storagePath)}
                                emptyMessage="写真はまだありません"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ProjectDetailsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <ProjectDetailsContent />
        </Suspense>
    );
}
