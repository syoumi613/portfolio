'use client';

import { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from 'firebase/storage';
import { Trash2, Upload, Loader2, Image as ImageIcon, CheckCircle } from 'lucide-react';
import Image from 'next/image';

interface Slide {
    id: string;
    url: string;
    path: string;
    createdAt: Timestamp;
    title?: string;
    subtitle?: string;
    textColor?: string;
}

export default function SlidesPage() {
    const [slides, setSlides] = useState<Slide[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // New state for metadata and file selection
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [textColor, setTextColor] = useState('white');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        fetchSlides();
    }, []);

    // Clean up preview URL when component unmounts or selectedFile changes
    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl(null);
            return;
        }

        const objectUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [selectedFile]);

    const fetchSlides = async () => {
        try {
            const q = query(collection(db, 'hero_slides'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const fetchedSlides: Slide[] = [];
            querySnapshot.forEach((doc) => {
                fetchedSlides.push({ id: doc.id, ...doc.data() } as Slide);
            });
            setSlides(fetchedSlides);
        } catch (error) {
            console.error("Error fetching slides:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('画像ファイルのみアップロード可能です。');
            return;
        }
        setSelectedFile(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!selectedFile) {
            alert('画像を選択してください');
            return;
        }

        setIsUploading(true);
        try {
            // 1. Upload to Storage
            const storagePath = `hero-slides/${Date.now()}_${selectedFile.name}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, selectedFile);
            const downloadURL = await getDownloadURL(storageRef);

            // 2. Add to Firestore
            await addDoc(collection(db, 'hero_slides'), {
                url: downloadURL,
                path: storagePath,
                createdAt: serverTimestamp(),
                title: title,
                subtitle: subtitle,
                textColor: textColor
            });

            // Reset form
            setTitle('');
            setSubtitle('');
            setTextColor('white');
            setSelectedFile(null);

            // 3. Refresh list
            await fetchSlides();
            alert('スライドを追加しました！');
        } catch (error) {
            console.error("Error uploading slide:", error);
            alert('アップロードに失敗しました。');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (slide: Slide) => {
        if (!confirm('このスライドを削除しますか？')) return;

        try {
            // 1. Delete from Storage
            const storageRef = ref(storage, slide.path);
            await deleteObject(storageRef);

            // 2. Delete from Firestore
            await deleteDoc(doc(db, 'hero_slides', slide.id));

            // 3. Update local state
            setSlides(prev => prev.filter(s => s.id !== slide.id));
        } catch (error) {
            console.error("Error deleting slide:", error);
            alert('削除に失敗しました。');
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">スライドショー管理</h1>
                <span className="text-sm text-gray-500">
                    推奨サイズ: 1920x1080px (16:9)
                </span>
            </div>

            {/* Input Form */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                <h2 className="text-lg font-semibold mb-4">新規スライド追加</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Left: Metadata Inputs */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    キャッチコピー (Title)
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="例: 記憶より、鮮明に。"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    サブコピー (Subtitle)
                                </label>
                                <input
                                    type="text"
                                    value={subtitle}
                                    onChange={(e) => setSubtitle(e.target.value)}
                                    placeholder="例: BEYOND MEMORY"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                文字色
                            </label>
                            <select
                                value={textColor}
                                onChange={(e) => setTextColor(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                            >
                                <option value="white">白 (White)</option>
                                <option value="black">黒 (Black)</option>
                            </select>
                        </div>
                    </div>

                    {/* Right: Upload Area */}
                    <div>
                        <div
                            className={`
                                relative h-48 border-2 border-dashed rounded-xl flex items-center justify-center text-center transition-colors cursor-pointer overflow-hidden
                                ${dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-gray-400'}
                                ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                                ${selectedFile ? 'border-purple-500 bg-purple-50' : ''}
                            `}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => !selectedFile && document.getElementById('file-upload')?.click()}
                        >
                            <input
                                id="file-upload"
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer hidden"
                                onChange={handleFileChange}
                                disabled={isUploading}
                            />

                            {selectedFile && previewUrl ? (
                                <div className="absolute inset-0 w-full h-full">
                                    <Image
                                        src={previewUrl}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                    />
                                    {/* Delete Button for Preview - Needs z-index and click stopPropagation */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            setSelectedFile(null);
                                        }}
                                        className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 z-10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="p-4 flex flex-col items-center justify-center space-y-2 pointer-events-none">
                                    {isUploading ? (
                                        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                                    ) : (
                                        <Upload className="w-8 h-8 text-gray-400" />
                                    )}
                                    <div className="text-sm font-medium text-gray-700">
                                        {isUploading ? 'アップロード中...' : '画像を配置'}
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        またはクリック
                                    </p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={!selectedFile || isUploading}
                            className={`
                                mt-4 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-all shadow-sm
                                ${!selectedFile || isUploading
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-md'}
                            `}
                        >
                            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                            {isUploading ? '送信中...' : 'スライドを追加する'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Slides Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-gray-500" />
                        登録済みスライド ({slides.length})
                    </h2>
                </div>

                {isLoading ? (
                    <div className="p-12 flex justify-center">
                        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                    </div>
                ) : slides.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        まだスライド画像が登録されていません。
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                        {slides.map((slide) => (
                            <div key={slide.id} className="group relative aspect-video bg-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <Image
                                    src={slide.url}
                                    alt="Slide"
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />

                                {/* Overlay Actions */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <button
                                        onClick={() => handleDelete(slide)}
                                        className="p-3 bg-white text-red-600 rounded-full hover:bg-red-50 transition-colors shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform"
                                        title="削除"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent text-white text-xs truncate">
                                    <div className="flex justify-between items-end">
                                        <span>{slide.createdAt?.toDate().toLocaleString()}</span>
                                        {slide.title && <span className="font-bold text-xs bg-white/20 px-2 py-0.5 rounded">{slide.title}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
