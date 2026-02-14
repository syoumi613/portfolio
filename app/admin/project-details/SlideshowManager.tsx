'use client';

import { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Plus, Trash2, Image as ImageIcon, Video, FileText, Loader2, GripVertical } from 'lucide-react';

export interface SlideshowSlide {
    id: string;
    type: 'MOVIE' | 'AFTER' | 'DESCRIPTION';
    title: string; // Internal label for admin
    content: string; // URL or Text. For AFTER, this might be unused or legacy.
    storagePath?: string; // If image upload
    // For Before/After
    beforeUrl?: string;
    afterUrl?: string;
    beforeStoragePath?: string;
    afterStoragePath?: string;
    // For Description
    imageUrl?: string;
}

interface SlideshowManagerProps {
    projectId: string;
    slides: SlideshowSlide[];
    onUpdate: () => void;
}

const TYPE_LABELS: Record<string, string> = {
    'MOVIE': '動画',
    'AFTER': '現像後',
    'DESCRIPTION': '説明'
};

export default function SlideshowManager({ projectId, slides, onUpdate }: SlideshowManagerProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [uploading, setUploading] = useState(false);

    // New Slide Form State
    const [newType, setNewType] = useState<'MOVIE' | 'AFTER' | 'DESCRIPTION'>('MOVIE');
    const [newContent, setNewContent] = useState('');
    // For AFTER type
    const [beforeFile, setBeforeFile] = useState<File | null>(null);
    const [afterFile, setAfterFile] = useState<File | null>(null);
    // For DESCRIPTION type
    const [descBgFile, setDescBgFile] = useState<File | null>(null);

    const handleAddSlide = async () => {
        if (!projectId) return;
        setUploading(true);

        try {
            const newSlide: SlideshowSlide = {
                id: Date.now().toString(),
                type: newType,
                title: TYPE_LABELS[newType],
                content: ''
            };

            if (newType === 'MOVIE') {
                newSlide.content = newContent; // YouTube URL etc.
            } else if (newType === 'DESCRIPTION') {
                // Upload Background Image if exists
                if (descBgFile) {
                    const storageRef = ref(storage, `projects/${projectId}/slideshow/${Date.now()}_desc_${descBgFile.name}`);
                    const snapshot = await uploadBytes(storageRef, descBgFile);
                    const downloadUrl = await getDownloadURL(snapshot.ref);
                    newSlide.imageUrl = downloadUrl;
                    newSlide.storagePath = snapshot.ref.fullPath;
                }
                newSlide.content = newContent; // Short Message
            } else if (newType === 'AFTER' && beforeFile && afterFile) {
                // Upload Before Image
                const beforePath = `projects/${projectId}/slideshow/${Date.now()}_before_${beforeFile.name}`;
                const beforeStorageRef = ref(storage, beforePath);
                const beforeSnapshot = await uploadBytes(beforeStorageRef, beforeFile);
                const beforeUrl = await getDownloadURL(beforeSnapshot.ref);

                // Upload After Image
                const afterPath = `projects/${projectId}/slideshow/${Date.now()}_after_${afterFile.name}`;
                const afterStorageRef = ref(storage, afterPath);
                const afterSnapshot = await uploadBytes(afterStorageRef, afterFile);
                const afterUrl = await getDownloadURL(afterSnapshot.ref);

                newSlide.beforeUrl = beforeUrl;
                newSlide.afterUrl = afterUrl;
                newSlide.beforeStoragePath = beforeSnapshot.ref.fullPath;
                newSlide.afterStoragePath = afterSnapshot.ref.fullPath;

                // Legacy support / fallback for content field if needed
                newSlide.content = afterUrl;
            }

            // Update Firestore
            await updateDoc(doc(db, 'projects', projectId), {
                slideshowSettings: arrayUnion(newSlide)
            });

            onUpdate();
            setIsAdding(false);
            setNewContent('');
            setBeforeFile(null);
            setAfterFile(null);
            setDescBgFile(null);
            alert('スライドを追加しました');

        } catch (error) {
            console.error("Error adding slide:", error);
            alert('スライドの追加に失敗しました');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteSlide = async (slide: SlideshowSlide) => {
        if (!confirm('このスライドを削除しますか？')) return;

        try {
            // Delete images from storage if applicable
            if (slide.storagePath) {
                const storageRef = ref(storage, slide.storagePath);
                await deleteObject(storageRef).catch(err => console.warn("Storage delete warn:", err));
            }
            if (slide.beforeStoragePath) {
                const storageRef = ref(storage, slide.beforeStoragePath);
                await deleteObject(storageRef).catch(err => console.warn("Storage delete warn:", err));
            }
            if (slide.afterStoragePath) {
                const storageRef = ref(storage, slide.afterStoragePath);
                await deleteObject(storageRef).catch(err => console.warn("Storage delete warn:", err));
            }

            // Remove from Firestore
            await updateDoc(doc(db, 'projects', projectId), {
                slideshowSettings: arrayRemove(slide)
            });

            onUpdate();

        } catch (error) {
            console.error("Error deleting slide:", error);
            alert('削除に失敗しました');
        }
    };

    return (
        <div className="space-y-6">
            {/* List Existing Slides */}
            {slides.length > 0 ? (
                <div className="space-y-3">
                    {slides.map((slide, index) => (
                        <div key={slide.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-300 transition-colors group">
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className={`p-2 rounded-lg flex-shrink-0 ${slide.type === 'MOVIE' ? 'bg-red-100 text-red-600' :
                                        slide.type === 'AFTER' ? 'bg-blue-100 text-blue-600' :
                                            'bg-green-100 text-green-600'
                                    }`}>
                                    {slide.type === 'MOVIE' && <Video className="h-5 w-5" />}
                                    {slide.type === 'AFTER' && <ImageIcon className="h-5 w-5" />}
                                    {slide.type === 'DESCRIPTION' && <FileText className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-900">
                                        {TYPE_LABELS[slide.type] || slide.type}
                                    </p>
                                    <p className="text-sm text-gray-500 truncate mt-0.5">
                                        {slide.type === 'DESCRIPTION' ? slide.content : slide.type === 'AFTER' ? '画像2枚セット' : slide.content}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => handleDeleteSlide(slide)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                title="削除"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-sm text-gray-500">スライドショー設定はまだありません</p>
                </div>
            )}

            {/* Add New Slide Form */}
            {!isAdding ? (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 font-medium"
                >
                    <Plus className="h-5 w-5" />
                    新しいスライドを追加
                </button>
            ) : (
                <div className="bg-white border border-blue-200 rounded-xl p-6 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-gray-900">新規スライド作成</h3>
                        <button onClick={() => setIsAdding(false)} className="text-xs text-gray-400 hover:text-gray-600">キャンセル</button>
                    </div>

                    <div className="space-y-4">
                        {/* Type Selector */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">種類を選択</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['MOVIE', 'AFTER', 'DESCRIPTION'] as const).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setNewType(type)}
                                        className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${newType === type
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        {TYPE_LABELS[type]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dynamic Input */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">
                                {newType === 'MOVIE' && '動画のURL (YouTube/Vimeo)'}
                                {newType === 'AFTER' && 'Before/After画像のアップロード'}
                                {newType === 'DESCRIPTION' && 'メッセージ設定'}
                            </label>

                            {newType === 'MOVIE' && (
                                <input
                                    type="text"
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    placeholder="https://youtu.be/..."
                                />
                            )}

                            {newType === 'AFTER' && (
                                <div className="space-y-3">
                                    {/* Before Image Input */}
                                    <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                                        <p className="text-xs font-bold text-gray-500 mb-2">1. Before画像（現像前）</p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setBeforeFile(e.target.files?.[0] || null)}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                                        />
                                    </div>

                                    {/* After Image Input */}
                                    <div className="border border-gray-300 rounded-lg p-3 bg-blue-50">
                                        <p className="text-xs font-bold text-blue-500 mb-2">2. After画像（現像後）</p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setAfterFile(e.target.files?.[0] || null)}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                                        />
                                    </div>
                                </div>
                            )}

                            {newType === 'DESCRIPTION' && (
                                <div className="space-y-3">
                                    <div className="border border-gray-300 rounded-lg p-3">
                                        <p className="text-xs font-bold text-gray-600 mb-2">背景画像のアップロード</p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setDescBgFile(e.target.files?.[0] || null)}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        value={newContent}
                                        onChange={(e) => setNewContent(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="一言メッセージを入力 (例: Thank you!)"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleAddSlide}
                            disabled={
                                uploading ||
                                (newType === 'MOVIE' && !newContent) ||
                                (newType === 'DESCRIPTION' && !newContent) ||
                                (newType === 'AFTER' && (!beforeFile || !afterFile))
                            }
                            className={`w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 ${(uploading ||
                                    (newType === 'MOVIE' && !newContent) ||
                                    (newType === 'DESCRIPTION' && (!newContent || !descBgFile)) ||
                                    (newType === 'AFTER' && (!beforeFile || !afterFile))) ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : '追加する'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
