'use client';

import { useState, useEffect } from 'react';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, getDocs, query, where, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { Upload, X, Check, Image as ImageIcon, Trash2, Loader2, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Photo Component
export function SortablePhoto({ photo, onDelete, children, className }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: photo.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={className}>
            {children}
        </div>
    );
}

export default function PortfolioManagement() {
    const [photos, setPhotos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [category, setCategory] = useState('portrait');
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Avoid drag triggering on simple clicks
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchPhotos();
    }, []);

    const fetchPhotos = async () => {
        try {
            const q = query(
                collection(db, 'albums'),
                where('type', '==', 'public')
            );
            const querySnapshot = await getDocs(q);
            let fetchedPhotos: any[] = [];
            querySnapshot.forEach((doc) => {
                fetchedPhotos.push({ id: doc.id, ...doc.data() });
            });

            // Apply Sort: Order ASC, then CreatedAt DESC
            fetchedPhotos.sort((a, b) => {
                if (a.order !== undefined && b.order !== undefined) {
                    return a.order - b.order;
                }
                // Fallback to CreatedAt if no order (Backfill logic implicitly handled by saving order later if needed, but for display we assume order is key)
                return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            });

            setPhotos(fetchedPhotos);
        } catch (error) {
            console.error("Error fetching portfolio:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            // Find indices in the ENTIRE photo list for simplicity, but we're rendering filtered.
            // Better to operate on the filtered list, but we need to update the main list 'photos'.

            // 1. Get current category photos
            const categoryPhotos = photos.filter(p => (p.category || 'portrait').toLowerCase() === category);

            // 2. Find indices within this category
            const oldIndex = categoryPhotos.findIndex((p) => p.id === active.id);
            const newIndex = categoryPhotos.findIndex((p) => p.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                // 3. Move in local state (Optimistic UI)
                const newCategoryOrder = arrayMove(categoryPhotos, oldIndex, newIndex);

                // Re-merge with other photos
                const otherPhotos = photos.filter(p => (p.category || 'portrait').toLowerCase() !== category);
                const newPhotos = [...otherPhotos, ...newCategoryOrder];

                setPhotos(newPhotos);

                // 4. Batch update to Firestore
                try {
                    const batch = writeBatch(db);

                    // We only need to update the order for the photos in this category
                    // It's safest to re-assign 'order' based on their new index in the list
                    // Warning: If we have multiple categories, 'order' should probably be per-category or global?
                    // Usually 'order' is global if we just show everything, but here we have tabs.
                    // If we want independent ordering per category, we should just update order for these items.
                    // Let's assume order is global but valid within category context for now, or just simply
                    // incrementing numbers. To support per-category sorting simply, we can just update the 'order' field
                    // of these specific docs to be their index.

                    newCategoryOrder.forEach((photo, index) => {
                        const ref = doc(db, 'albums', photo.id);
                        batch.update(ref, { order: index });
                        // Also update local photo object to match
                        photo.order = index;
                    });

                    await batch.commit();
                    console.log("Order updated successfully");
                } catch (error) {
                    console.error("Error updating order:", error);
                    alert("並び替えの保存に失敗しました");
                    // Revert? (Optional: fetchPhotos() to revert)
                    fetchPhotos();
                }
            }
        }
    };

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
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    };

    const handleUpload = async () => {
        if (files.length === 0) return;
        setUploading(true);


        try {
            // Find max order to append at end
            const maxOrder = photos.reduce((max, p) => (p.order > max ? p.order : max), -1);
            let currentOrder = maxOrder + 1;

            const uploadPromises = files.map(async (file, index) => {
                // Storage Path: /public/portfolio/{filename}
                const storageRef = ref(storage, `public/portfolio/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                const downloadUrl = await getDownloadURL(snapshot.ref);

                // Get dimensions
                const { width, height } = await getImageDimensions(file);

                const order = currentOrder + index;

                // Firestore: 'albums' collection with type 'public'
                const newDocRef = await addDoc(collection(db, 'albums'), {
                    type: 'public',
                    category: category,
                    fileName: file.name,
                    storagePath: snapshot.ref.fullPath,
                    url: downloadUrl,
                    width,
                    height,
                    order: order,
                    createdAt: serverTimestamp(),
                });

                return {
                    id: newDocRef.id,
                    type: 'public',
                    fileName: file.name,
                    url: downloadUrl,
                    width,
                    height,
                    order: order
                };
            });

            await Promise.all(uploadPromises);
            await fetchPhotos(); // Refresh list to get updated order/data
            setFiles([]);
        } catch (error: any) {
            console.error("Upload failed", error);
            alert(`アップロードエラー: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleDeletePhoto = async (photoId: string, storagePath: string) => {
        if (!confirm('本当にこの写真を削除しますか？\n（一般公開サイトから非表示になります）')) return;

        try {
            await deleteDoc(doc(db, 'albums', photoId));
            if (storagePath) {
                const storageRef = ref(storage, storagePath);
                await deleteObject(storageRef).catch(err => console.warn("Storage delete error:", err));
            }
            setPhotos(prev => prev.filter(p => p.id !== photoId));
        } catch (error) {
            console.error("Delete failed", error);
            alert("削除に失敗しました");
        }
    };



    if (loading) return <div className="p-8 text-center text-gray-500">読み込み中...</div>;

    const filteredPhotos = photos.filter(p => (p.category || 'portrait').toLowerCase() === category);

    return (
        <div className="p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Globe className="h-6 w-6 text-green-600" />
                        ポートフォリオ管理
                    </h1>
                    <p className="text-gray-500 mt-2">一般公開ウェブサイトのギャラリーに表示する写真を管理します。ドラッグ＆ドロップで並び替えが可能です。</p>
                </div>

                {/* Category Tabs */}
                <div className="flex flex-wrap gap-2 mb-8 bg-gray-100/50 p-1.5 rounded-full w-fit">
                    {['portrait', 'architecture', 'event', 'food'].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 relative ${category === cat
                                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                                }`}
                        >
                            {category === cat && (
                                <motion.div
                                    layoutId="adminCategoryTab"
                                    className="absolute inset-0 bg-white rounded-full shadow-sm ring-1 ring-black/5 z-0"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10">
                                {cat === 'food' ? '料理' :
                                    cat === 'event' ? 'イベント' :
                                        cat === 'architecture' ? '建築' : 'ポートレート'}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:col-span-3 gap-8">
                    {/* Left Column: Upload */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Upload className="h-5 w-5 text-blue-600" />
                                {category === 'food' ? '料理' :
                                    category === 'event' ? 'イベント' :
                                        category === 'architecture' ? '建築' : 'ポートレート'}
                                に写真を追加
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
                                    <div className="mx-auto h-10 w-10 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-3">
                                        <ImageIcon className="h-5 w-5" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">ドラッグ＆ドロップ</p>
                                    <p className="text-xs text-gray-500 mt-1">一般公開用写真</p>
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
                                        className="w-full flex items-center justify-center py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : '公開ギャラリーに追加'}
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Right Column: Gallery */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Globe className="h-5 w-5 text-purple-600" />
                                    公開中 ({filteredPhotos.length})
                                </h2>
                            </div>

                            {filteredPhotos.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                                    <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
                                    <p>このカテゴリーに写真はありません</p>
                                </div>
                            ) : (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={filteredPhotos.map(p => p.id)}
                                        strategy={rectSortingStrategy}
                                    >
                                        <div className="grid grid-cols-2 md:grid-cols-3 auto-rows-[200px] gap-4 w-full grid-flow-dense px-2">
                                            {filteredPhotos.map((photo, index) => {
                                                const isVertical = photo.width && photo.height && photo.width < photo.height;

                                                return (
                                                    <SortablePhoto
                                                        key={photo.id}
                                                        photo={photo}
                                                        className={`
                                                            relative group cursor-grab active:cursor-grabbing
                                                            h-full w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200
                                                            ${isVertical ? 'row-span-2' : 'col-span-1 row-span-1 aspect-[3/2]'}
                                                        `}
                                                    >
                                                        <div className="w-full h-full relative">
                                                            <div className="absolute top-2 left-2 z-10 flex items-center justify-center w-8 h-8 bg-blue-600 text-white font-bold rounded-full shadow-md border-2 border-white pointer-events-none">
                                                                {index + 1}
                                                            </div>
                                                            <img
                                                                src={photo.url}
                                                                alt={photo.fileName}
                                                                className="w-full h-full object-cover"
                                                                loading="lazy"
                                                            />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all opacity-0 group-hover:opacity-100 flex items-start justify-end p-2 gap-2">
                                                                <button
                                                                    onPointerDown={(e) => e.stopPropagation()} // Prevent drag start when clicking delete
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeletePhoto(photo.id, photo.storagePath);
                                                                    }}
                                                                    className="p-1.5 bg-white text-red-600 rounded-full shadow-sm hover:bg-red-50"
                                                                    title="削除"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>

                                                            <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <p className="text-white text-[10px] truncate">{photo.fileName}</p>
                                                            </div>
                                                        </div>
                                                    </SortablePhoto>
                                                );
                                            })}
                                        </div>
                                    </SortableContext>

                                    {/* Optional Drag Overlay for better visual feedback */}
                                    <DragOverlay>
                                        {
                                            activeId ? (
                                                <div className="w-32 h-32 bg-black/50 rounded-lg border-2 border-green-500 shadow-xl" />
                                            ) : null
                                        }
                                    </DragOverlay>

                                </DndContext>
                            )}
                        </div>
                    </div>
                </div>


            </div>
        </div>
    );
}
