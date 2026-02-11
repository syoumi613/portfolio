'use client';

import { useState, useEffect } from 'react';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { Upload, X, Check, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface Client {
    id: string; // Firestore Doc ID (Access Code)
    name: string;
    clientId: string; // Legacy field match
}

export default function UploadPage() {
    const [clientId, setClientId] = useState('');
    const [clients, setClients] = useState<Client[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState('');
    const [loadingClients, setLoadingClients] = useState(true);

    // Fetch Clients on Mount
    useEffect(() => {
        const fetchClients = async () => {
            try {
                // Note: 'orderBy' might require an index. If it fails, remove orderBy temporarily or create index.
                // For now, let's try safely without orderBy if we suspect index issues, but user asked for list.
                // Let's try with orderBy('createdAt', 'desc') as usually desired.
                const q = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                const loadedClients: Client[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    loadedClients.push({
                        id: doc.id,
                        name: data.name || 'Unknown',
                        clientId: data.clientId || doc.id
                    });
                });
                setClients(loadedClients);
            } catch (error) {
                console.warn("Client fetch warning (might be missing index):", error);
                // Fallback fetch without sort if index error happens (common in Dev)
                try {
                    const qFallback = collection(db, 'clients');
                    const querySnapshot = await getDocs(qFallback);
                    const loadedClients: Client[] = [];
                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        loadedClients.push({
                            id: doc.id,
                            name: data.name || 'Unknown',
                            clientId: data.clientId || doc.id
                        });
                    });
                    setClients(loadedClients);
                } catch (fallbackError: any) {
                    console.error("Critical error loading clients:", fallbackError);
                    alert(`Failed to load clients: ${fallbackError.message}`);
                }
            } finally {
                setLoadingClients(false);
            }
        };
        fetchClients();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (!clientId || files.length === 0) return;
        setUploading(true);
        setSuccess('');

        try {
            const uploadPromises = files.map(async (file) => {
                // Storage Path: /clients/{clientId}/photos/{filename}
                const storageRef = ref(storage, `clients/${clientId}/photos/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                const downloadUrl = await getDownloadURL(snapshot.ref);

                // Save Metadata to Firestore
                await addDoc(collection(db, 'albums'), {
                    clientId,
                    fileName: file.name,
                    storagePath: snapshot.ref.fullPath,
                    url: downloadUrl,
                    createdAt: serverTimestamp(),
                    type: 'client_delivery'
                });
            });

            await Promise.all(uploadPromises);
            setSuccess(`Successfully uploaded ${files.length} photos.`);
            setFiles([]);
        } catch (error: any) {
            console.error("Upload failed", error);
            alert(`Upload failed: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Upload Photos</h1>
                    <div className="flex gap-2">
                        {/* Manually using window.location or router for Back mostly useful if not in dashboard */}
                        {/* Since this is a sub-page, we can link back to dashboard */}
                        <a href="/admin/dashboard" className="text-sm bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg transition-colors">
                            Back to Dashboard
                        </a>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                    {/* Client Selection (Dropdown) */}
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Client</label>
                        <div className="relative">
                            <select
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                className="block w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none text-gray-900 icon-arrow-down"
                                disabled={loadingClients}
                            >
                                <option value="">-- Choose a Client --</option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.name} ({client.id})
                                    </option>
                                ))}
                            </select>
                        </div>
                        {loadingClients && <p className="text-xs text-gray-500 mt-2">Loading clients list...</p>}
                    </div>

                    {/* Drop Zone / File Input */}
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:bg-gray-50 transition-colors">
                        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                            <Upload className="h-full w-full" />
                        </div>
                        <div className="text-gray-600 mb-4">
                            <span className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer relative">
                                <span>Click to upload</span>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                />
                            </span>
                            <span className="pl-1">or drag and drop</span>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                        <div className="mt-8">
                            <h3 className="text-sm font-medium text-gray-900 mb-4">Selected Files ({files.length})</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {files.map((file, index) => (
                                    <div key={index} className="relative group bg-gray-100 rounded-lg p-2 aspect-square flex items-center justify-center overflow-hidden">
                                        <ImageIcon className="h-8 w-8 text-gray-400" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={() => removeFile(index)}
                                                className="p-1 bg-white rounded-full text-red-600 hover:bg-red-50"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <span className="absolute bottom-1 left-2 right-2 text-xs text-gray-500 truncate pointer-events-none">{file.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                        <div>
                            {success && (
                                <div className="flex items-center text-green-600 text-sm">
                                    <Check className="h-4 w-4 mr-2" />
                                    {success}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleUpload}
                            disabled={uploading || files.length === 0 || !clientId}
                            className="flex items-center px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {uploading ? 'Uploading...' : 'Start Upload'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
