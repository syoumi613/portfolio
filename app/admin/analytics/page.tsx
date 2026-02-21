'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { Activity, BarChart3, Eye, Download, Server, Clock } from 'lucide-react';

interface ProjectStats {
    id: string;
    name: string;
    pageViews: number;
    downloadCount: number;
}

interface TimelineEvent {
    id: string;
    target: string;
    targetName: string;
    type: 'view' | 'download';
    timestamp: Date;
    details?: string;
}

export default function AnalyticsDashboard() {
    const [loading, setLoading] = useState(true);
    const [mainViews, setMainViews] = useState(0);
    const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);

    useEffect(() => {
        fetchAnalyticsData();
    }, []);

    const fetchAnalyticsData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Main Site Stats
            const mainStatsRef = doc(db, 'siteStats', 'main');
            const mainSnap = await getDoc(mainStatsRef);
            if (mainSnap.exists() && mainSnap.data().pageViews) {
                setMainViews(mainSnap.data().pageViews);
            }

            // 2. Fetch Project Stats
            const projectsQuery = query(collection(db, 'projects'));
            const projectsSnap = await getDocs(projectsQuery);
            const pStats: ProjectStats[] = [];

            projectsSnap.forEach(doc => {
                const data = doc.data();
                pStats.push({
                    id: doc.id,
                    name: data.name || doc.id,
                    pageViews: data.pageViews || 0,
                    downloadCount: data.downloadCount || 0
                });
            });
            // Sort by views DESC
            pStats.sort((a, b) => b.pageViews - a.pageViews);
            setProjectStats(pStats);

            // 3. Fetch logs from Main Site
            const allEvents: TimelineEvent[] = [];

            const mainLogsQuery = query(collection(db, 'siteStats', 'main', 'logs'), orderBy('timestamp', 'desc'), limit(50));
            const mainLogsSnap = await getDocs(mainLogsQuery);
            mainLogsSnap.forEach(doc => {
                const data = doc.data();
                if (data.timestamp) {
                    allEvents.push({
                        id: `main-${doc.id}`,
                        target: 'main',
                        targetName: 'メインサイト',
                        type: data.type as 'view' | 'download',
                        timestamp: data.timestamp.toDate(),
                        details: data.details
                    });
                }
            });

            // 4. Fetch logs from All Projects (can be heavy, optimized by recent limit per project)
            // Note: In a massive scale app, use a Cloud Function to aggregate this. Good enough for simple portfolio.
            for (const p of pStats) {
                const pLogsQuery = query(collection(db, 'projects', p.id, 'logs'), orderBy('timestamp', 'desc'), limit(20));
                const pLogsSnap = await getDocs(pLogsQuery);
                pLogsSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.timestamp) {
                        allEvents.push({
                            id: `proj-${p.id}-${doc.id}`,
                            target: p.id,
                            targetName: p.name,
                            type: data.type as 'view' | 'download',
                            timestamp: data.timestamp.toDate(),
                            details: data.details
                        });
                    }
                });
            }

            // 5. Combine and Sort All Events
            allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            // Keep top 100 for display
            setTimelineEvents(allEvents.slice(0, 100));

        } catch (error) {
            console.error("Failed to fetch analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date: Date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
    };

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-64px)] items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-gray-500">
                    <Activity className="h-8 w-8 animate-pulse text-blue-500" />
                    <p className="text-sm font-medium">データを集計中...</p>
                </div>
            </div>
        );
    }

    const totalProjectViews = projectStats.reduce((acc, curr) => acc + curr.pageViews, 0);
    const totalProjectDownloads = projectStats.reduce((acc, curr) => acc + curr.downloadCount, 0);

    return (
        <div className="min-h-[calc(100vh-64px)] bg-gray-50 p-6 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-2">
                        <BarChart3 className="h-6 w-6 text-blue-600" />
                        アクセス解析
                    </h1>
                    <p className="text-sm text-gray-500">サイト全体と各プロジェクトのアクセス・ダウンロード状況を確認できます。</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Server className="h-5 w-5" />
                            </div>
                            <h3 className="font-semibold text-gray-700">メインサイト総PV</h3>
                        </div>
                        <p className="text-4xl font-black text-gray-900">{mainViews.toLocaleString()}</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                <Eye className="h-5 w-5" />
                            </div>
                            <h3 className="font-semibold text-gray-700">プロジェクト総PV</h3>
                        </div>
                        <p className="text-4xl font-black text-gray-900">{totalProjectViews.toLocaleString()}</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                <Download className="h-5 w-5" />
                            </div>
                            <h3 className="font-semibold text-gray-700">総ダウンロード数</h3>
                        </div>
                        <p className="text-4xl font-black text-gray-900">{totalProjectDownloads.toLocaleString()}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Project Breakdown (1 column) */}
                    <div className="lg:col-span-1 border border-gray-200 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[600px]">
                        <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-gray-500" />
                            <h2 className="font-bold text-gray-800 text-sm">プロジェクト別集計</h2>
                        </div>
                        <div className="overflow-y-auto flex-1 p-2">
                            {projectStats.length === 0 ? (
                                <p className="text-center text-sm text-gray-400 py-8">データがありません</p>
                            ) : (
                                <ul className="space-y-1">
                                    {projectStats.map(p => (
                                        <li key={p.id} className="p-3 hover:bg-gray-50 rounded-lg transition-colors flex justify-between items-center group">
                                            <div className="min-w-0 pr-4">
                                                <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs font-mono text-gray-500 flex-shrink-0">
                                                <div className="flex items-center gap-1" title="Views">
                                                    <Eye className="h-3.5 w-3.5 text-gray-400 group-hover:text-green-500" />
                                                    {p.pageViews}
                                                </div>
                                                <div className="flex items-center gap-1" title="Downloads">
                                                    <Download className="h-3.5 w-3.5 text-gray-400 group-hover:text-orange-500" />
                                                    {p.downloadCount}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Right: Timeline Log (2 columns) */}
                    <div className="lg:col-span-2 border border-gray-200 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[600px]">
                        <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <h2 className="font-bold text-gray-800 text-sm">アクセス・タイムライン（最新100件）</h2>
                        </div>

                        <div className="overflow-y-auto flex-1 p-0">
                            {timelineEvents.length === 0 ? (
                                <p className="text-center text-sm text-gray-400 py-12">ログが存在しません</p>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {timelineEvents.map((event) => (
                                        <div key={event.id} className="p-4 flex items-center hover:bg-gray-50 transition-colors text-sm">
                                            <div className="w-36 flex-shrink-0 text-gray-400 font-mono text-xs">
                                                {formatDate(event.timestamp)}
                                            </div>

                                            <div className="w-48 flex-shrink-0 pr-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${event.target === 'main'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-purple-100 text-purple-700 truncate max-w-full'
                                                    }`}>
                                                    {event.targetName}
                                                </span>
                                            </div>

                                            <div className="flex-1 flex items-center gap-2 text-gray-700">
                                                {event.type === 'view' ? (
                                                    <><Eye className="h-3.5 w-3.5 text-gray-400" /> アクセス</>
                                                ) : (
                                                    <><Download className="h-3.5 w-3.5 text-orange-400" /> ダウンロード</>
                                                )}

                                                {event.details && (
                                                    <span className="text-gray-400 text-xs ml-2 border-l border-gray-200 pl-2">
                                                        {event.details}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
