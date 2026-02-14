'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { Upload, X, Check, Image as ImageIcon, Trash2, ArrowLeft, Loader2, FolderArchive, FileArchive, Plus, FileText, MonitorPlay } from 'lucide-react';
import Link from 'next/link';
import Gallery from '@/components/Gallery';
import SlideshowManager, { SlideshowSlide } from './SlideshowManager';
import { updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import JSZip from 'jszip';

interface DownloadSection {
    title: string;
    url: string;
    fileName: string;
    size: string;
    count: number;
    storagePath: string;
}

function DownloadManager({ projectId, downloadSections, onUpdate }: { projectId: string; downloadSections: DownloadSection[]; onUpdate: () => void }) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState<{ label: string; percent: number }>({ label: '', percent: 0 });
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [title, setTitle] = useState('');
    const [count, setCount] = useState<number>(0);

    const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            setSelectedFiles(files);

            // Auto-fill title and count
            if (!title) {
                if (files.length === 1) {
                    setTitle(files[0].name.replace(/\.[^/.]+$/, ""));
                } else {
                    setTitle(`${files.length}枚のセット`);
                }
            }
            if (count === 0) {
                setCount(files.length);
            }
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0 || !title) return;
        setUploading(true);
        setProgress({ label: '準備中...', percent: 0 });

        try {
            let fileToUpload: Blob | File = selectedFiles[0];
            let fileName = selectedFiles[0].name;

            // If multiple files, ZIP them
            if (selectedFiles.length > 1) {
                setProgress({ label: 'ファイルを圧縮中...', percent: 10 });
                const zip = new JSZip();

                // Add files to root of zip
                selectedFiles.forEach(file => {
                    zip.file(file.name, file);
                });

                fileToUpload = await zip.generateAsync({
                    type: 'blob',
                    compression: 'DEFLATE',
                    compressionOptions: { level: 6 }
                }, (metadata) => {
                    setProgress({ label: '圧縮中...', percent: metadata.percent });
                });

                fileName = `${title}.zip`;
            }

            setProgress({ label: 'アップロード中...', percent: 0 });

            // Upload to Firebase Storage
            const path = `projects/${projectId}/downloads/${Date.now()}_${fileName}`;
            const storageRef = ref(storage, path);

            // Use uploadBytesResumable for progress (optional but good for large files)
            // For simplicity in this implementation we use uploadBytes but we can't track upload progress easily without 'uploadBytesResumable'
            // Let's use uploadBytes for now as it's simpler and 'uploading' state handles the UI spinner
            const snapshot = await uploadBytes(storageRef, fileToUpload);

            setProgress({ label: 'URL取得中...', percent: 90 });
            const downloadUrl = await getDownloadURL(snapshot.ref);

            // Format size
            const sizeInBytes = fileToUpload.size;
            let sizeStr = '';
            if (sizeInBytes < 1024 * 1024) {
                sizeStr = `${(sizeInBytes / 1024).toFixed(1)} KB`;
            } else {
                sizeStr = `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
            }

            const newSection: DownloadSection = {
                title,
                url: downloadUrl,
                fileName: fileName,
                size: sizeStr,
                count: count || selectedFiles.length,
                storagePath: snapshot.ref.fullPath
            };

            await updateDoc(doc(db, 'projects', projectId), {
                downloadSections: arrayUnion(newSection)
            });

            setProgress({ label: '完了！', percent: 100 });
            alert('納品用データを追加しました');

            // Reset form
            setSelectedFiles([]);
            setTitle('');
            setCount(0);
            setProgress({ label: '', percent: 0 });

            // Reload parent to show new item
            onUpdate();
        } catch (error) {
            console.error("Upload Failed", error);
            alert("アップロードに失敗しました");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (section: DownloadSection) => {
        if (!confirm(`「${section.title}」を削除しますか？`)) return;

        try {
            const storageRef = ref(storage, section.storagePath);
            await deleteObject(storageRef).catch(err => console.warn("Storage delete warn:", err));

            await updateDoc(doc(db, 'projects', projectId), {
                downloadSections: arrayRemove(section)
            });

            onUpdate();
        } catch (error) {
            console.error("Delete Failed", error);
            alert("削除に失敗しました");
        }
    };

    return (
        <div className="space-y-6">
            {/* List Existing Sections */}
            {downloadSections.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">登録済みデータ</h3>
                    {downloadSections.map((section, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white hover:bg-orange-50 rounded-lg border border-gray-200 hover:border-orange-200 transition-colors group">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-orange-100 text-orange-600 rounded-md">
                                    <FolderArchive className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate">{section.title}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{section.fileName}</span>
                                        <span>•</span>
                                        <span>{section.count}枚 / {section.size}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(section)}
                                className="text-gray-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                title="削除"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload New Area */}
            <div className={`border-2 border-dashed rounded-xl p-6 transition-colors ${selectedFiles.length > 0 ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 bg-gray-50 hover:bg-gray-100/50'}`}>
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">新規データの追加</h3>
                    <p className="text-xs text-gray-500">
                        複数の写真を選択すると、自動的にZIPファイルに圧縮してアップロードされます。
                    </p>
                </div>

                {!selectedFiles.length ? (
                    <div className="relative group cursor-pointer text-center py-8">
                        <input
                            type="file"
                            multiple
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={handleFilesChange}
                        />
                        <div className="mx-auto h-12 w-12 bg-white text-blue-500 rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Plus className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-medium text-gray-700">ファイルを選択 または ドロップ</p>
                        <p className="text-xs text-gray-400 mt-1">画像複数, ZIPファイルなど</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    {selectedFiles.length > 1 ? <FolderArchive className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                                        {selectedFiles.length > 1 ? `${selectedFiles.length}個のファイル` : selectedFiles[0].name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {selectedFiles.length > 1 ? '自動的にZIP化されます' : (selectedFiles[0].size / 1024 / 1024).toFixed(2) + ' MB'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => { setSelectedFiles([]); setTitle(''); setCount(0); }} className="text-gray-400 hover:text-red-500 p-1">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-3 pl-1">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">ボタンの表示タイトル</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
                                    placeholder="例: 全データ一括ダウンロード"
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">写真枚数</label>
                                    <input
                                        type="number"
                                        value={count}
                                        onChange={(e) => setCount(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleUpload}
                            disabled={uploading || !title}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>{progress.label} {progress.percent > 0 && `(${progress.percent.toFixed(0)}%)`}</span>
                                </>
                            ) : (
                                'この内容で追加'
                            )}
                        </button>

                        {uploading && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
                                <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress.percent}%` }}></div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function ProjectDetailsContent() {
    const searchParams = useSearchParams();
    const projectId = searchParams.get('id');

    const [project, setProject] = useState<any>(null);
    const [photos, setPhotos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [success, setSuccess] = useState('');
    // Slideshow state
    const [slides, setSlides] = useState<SlideshowSlide[]>([]);

    const router = useRouter();

    const fetchData = async () => {
        if (!projectId) return;
        try {
            // 1. Fetch Project Details
            const docRef = doc(db, 'projects', projectId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setProject({ id: docSnap.id, ...data });
                // Set initial slides
                if (data.slideshowSettings) {
                    setSlides(data.slideshowSettings);
                } else {
                    setSlides([]);
                }
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

    useEffect(() => {
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

    const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({ width: img.width, height: img.height });
                URL.revokeObjectURL(img.src);
            };
            img.onerror = (error) => reject(error);
            img.src = URL.createObjectURL(file);
        });
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

                // Get Dimensions
                const { width, height } = await getImageDimensions(file);

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
                    width,
                    height,
                    createdAt: serverTimestamp(),
                    type: 'client_delivery'
                });

                return {
                    id: newDocRef.id,
                    clientId: projectId,
                    fileName: file.name,
                    url: downloadUrl,
                    storagePath: snapshot.ref.fullPath,
                    width,
                    height
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
                    {/* Left Column: Upload & Downloads & Slideshow */}
                    <div className="lg:col-span-1 space-y-6">

                        {/* 0. Slideshow Settings */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <MonitorPlay className="h-5 w-5 text-blue-600" />
                                スライドショー設定
                            </h2>
                            <p className="text-xs text-gray-500 mb-4">
                                納品ページのトップに表示するコンテンツ（動画、現像後比較、メッセージなど）を管理します。
                            </p>

                            <SlideshowManager
                                projectId={projectId}
                                slides={slides}
                                onUpdate={fetchData}
                            />
                        </div>

                        {/* 1. Photo Upload */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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

                        {/* 2. Download Data Management */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <FolderArchive className="h-5 w-5 text-orange-500" />
                                納品用データ管理
                            </h2>
                            <p className="text-xs text-gray-500 mb-4">
                                ここにアップロードされたファイルは、クライアントポータルのボタンに直接紐付きます。
                            </p>

                            <DownloadManager projectId={projectId} downloadSections={project?.downloadSections || []} onUpdate={() => window.location.reload()} />
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
