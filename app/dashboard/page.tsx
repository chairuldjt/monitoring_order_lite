'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import {
    FolderOpen, MessageSquare, Loader, CheckCircle, ShieldCheck, Clock,
    TrendingUp, AlertTriangle, Repeat, ArrowRight, Timer,
    RefreshCw, Wifi, WifiOff, BarChart2, Brain, Users, Medal
} from 'lucide-react';
import { OrderDetailModal } from '@/components/OrderDetailModal';

interface DashboardStats {
    counts: Record<string, number>;
    totalOrders: number;
    todayOrders: number;
    oldestOrderDate: string | null;
    followUpOverdue: any[];
    pendingOverdue: any[];
    repeatOrders: any[];
    recentOrders: any[];
}

export default function DashboardPage() {
    return (
        <ProtectedRoute>
            <DashboardContent />
        </ProtectedRoute>
    );
}

function DashboardContent() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    // AI Repeat Orders State
    const [aiRepeatOrders, setAiRepeatOrders] = useState<any[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiStatus, setAiStatus] = useState<'idle' | 'running' | 'success' | 'error' | 'not_set'>('idle');

    // Modal state
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

    const fetchStats = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        setError(null);
        try {
            const res = await fetch('/api/dashboard/stats');
            if (res.ok) {
                const data = await res.json();
                setStats(data);
                setLastRefresh(new Date());
            } else {
                const data = await res.json();
                setError(data.error || 'Gagal mengambil data');
            }
        } catch (err: any) {
            setError('Koneksi ke SIMRS gagal: ' + err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const fetchAiAnalysis = useCallback(async (triggerManual = false) => {
        if (triggerManual) setAiLoading(true);
        setAiStatus(triggerManual ? 'running' : 'idle');
        try {
            // First check if cached data exists
            const res = await fetch('/api/ai/analyze', { method: triggerManual ? 'POST' : 'GET' });
            if (res.ok) {
                const json = await res.json();
                setAiRepeatOrders(json.data || []);
                setAiStatus('success');
            } else if (res.status === 404 && !triggerManual) {
                setAiStatus('idle'); // Need manual trigger or auto first run
            } else if (res.status === 400) {
                setAiStatus('not_set'); // API Key not set
            } else {
                setAiStatus('error');
            }
        } catch (err) {
            setAiStatus('error');
        } finally {
            setAiLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        fetchAiAnalysis();
        // Auto-refresh stats every 2 minutes
        const interval = setInterval(() => fetchStats(true), 120000);
        return () => clearInterval(interval);
    }, [fetchStats, fetchAiAnalysis]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
                    <p className="text-slate-400 text-sm font-medium">Mengambil data dari SIMRS...</p>
                </div>
            </div>
        );
    }

    const statusCards = [
        { key: 'open', label: 'Open', icon: FolderOpen, gradient: 'from-blue-500 to-blue-700', shadow: 'shadow-blue-200', desc: 'Order baru' },
        { key: 'follow_up', label: 'Follow Up', icon: MessageSquare, gradient: 'from-amber-400 to-orange-600', shadow: 'shadow-amber-200', desc: 'Tindak lanjut' },
        { key: 'running', label: 'Running', icon: Loader, gradient: 'from-indigo-500 to-purple-700', shadow: 'shadow-indigo-200', desc: 'Dikerjakan' },
        { key: 'done', label: 'Done', icon: CheckCircle, gradient: 'from-emerald-500 to-green-700', shadow: 'shadow-emerald-200', desc: 'Selesai' },
        { key: 'verified', label: 'Verified', icon: ShieldCheck, gradient: 'from-teal-400 to-cyan-700', shadow: 'shadow-teal-200', desc: 'Terverifikasi' },
        { key: 'pending', label: 'Pending', icon: Clock, gradient: 'from-rose-500 to-red-700', shadow: 'shadow-rose-200', desc: 'Tertunda' },
    ];

    const getStatusColor = (status: string) => {
        const s = status?.toUpperCase().trim();
        const map: Record<string, string> = {
            'OPEN': 'bg-blue-100 text-blue-700 border-blue-200',
            'FOLLOW UP': 'bg-amber-100 text-amber-700 border-amber-200',
            'RUNNING': 'bg-indigo-100 text-indigo-700 border-indigo-200',
            'DONE': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'VERIFIED': 'bg-teal-100 text-teal-700 border-teal-200',
            'PENDING': 'bg-rose-100 text-rose-700 border-rose-200',
        };
        return map[s] || 'bg-slate-100 text-slate-600';
    };

    return (
        <div className="min-h-screen p-3 md:p-8 space-y-6 md:space-y-8 animate-fade-in pb-20 md:pb-8">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-white/40 backdrop-blur-md p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/20 shadow-xl">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-200 animate-float">
                        <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">
                            Selamat Datang, <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">{user?.username}!</span>
                        </h1>
                        <p className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-[9px] md:text-[10px] font-black opacity-60">
                            SIMRS Order Monitoring — Live View
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => fetchStats(true)}
                    disabled={refreshing}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-3 rounded-2xl hover:shadow-xl hover:shadow-emerald-200 transition-all font-bold flex items-center gap-2 active:scale-95 disabled:opacity-60 self-start"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Memuat...' : 'Refresh'}
                </button>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 animate-fade-in-up">
                    <WifiOff className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium">{error}</span>
                    <button onClick={() => fetchStats(true)} className="ml-auto text-xs font-bold bg-red-100 px-3 py-1 rounded-lg hover:bg-red-200">Coba Lagi</button>
                </div>
            )}

            {/* Live Indicator + Last Refresh */}
            <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                <Wifi className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-500 font-medium">
                    <strong className="text-emerald-600">Live</strong> dari SIMRS
                    {lastRefresh && (
                        <> • Diperbarui {lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</>
                    )}
                </span>
                <span className="ml-auto text-slate-400">Auto-refresh tiap 2 menit</span>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                {statusCards.map((card, i) => {
                    const Icon = card.icon;
                    const count = stats?.counts[card.key] || 0;
                    return (
                        <Link
                            key={card.key}
                            href={`/orders?status=${card.key}`}
                            className={`p-6 rounded-[2rem] bg-gradient-to-br ${card.gradient} text-white shadow-2xl ${card.shadow} relative overflow-hidden group hover:scale-105 transition-all duration-300`}
                            style={{ animationDelay: `${i * 100}ms` }}
                        >
                            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-20 bg-white group-hover:opacity-40 transition-opacity"></div>
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <Icon className="w-7 h-7 mb-3 opacity-80 group-hover:scale-110 transition-transform" />
                                <span className="text-4xl font-black mb-1 tabular-nums">{count}</span>
                                <span className="text-[9px] font-black uppercase tracking-[0.15em] opacity-80">{card.label}</span>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Analytics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Total Orders */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 relative overflow-hidden group hover:shadow-2xl transition-all h-full flex flex-col">
                    <div className="absolute -top-6 -right-6 w-32 h-32 bg-violet-50/50 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-fuchsia-50/50 rounded-full blur-3xl group-hover:bg-fuchsia-100/50 transition-colors duration-500"></div>
                    <div className="relative z-10 flex-1 flex flex-col">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 text-lg">Total Order</h3>
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Keseluruhan Order</p>
                                    <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                    <div className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-[9px] font-black text-emerald-600 uppercase">+{stats?.todayOrders || 0} HARI INI</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center flex-1">
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-6xl font-black text-slate-900 tabular-nums tracking-tight">{stats?.totalOrders || 0}</span>
                                <div className="flex flex-col">
                                    <span className="text-lg font-bold text-slate-400">order</span>
                                    {stats?.oldestOrderDate && (
                                        <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">terhitung dari {stats.oldestOrderDate}</span>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-4 w-full">
                                {/* Visual Progress Bar */}
                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                                    <div className="bg-emerald-500 h-full transition-all duration-1000 hover:opacity-80" style={{ width: `${((stats?.counts['done'] || 0) / (stats?.totalOrders || 1)) * 100}%` }} title="Selesai"></div>
                                    <div className="bg-blue-500 h-full transition-all duration-1000 hover:opacity-80 border-l border-white/20" style={{ width: `${((stats?.counts['open'] || 0) / (stats?.totalOrders || 1)) * 100}%` }} title="Open"></div>
                                    <div className="bg-indigo-500 h-full transition-all duration-1000 hover:opacity-80 border-l border-white/20" style={{ width: `${((stats?.counts['running'] || 0) / (stats?.totalOrders || 1)) * 100}%` }} title="Running"></div>
                                    <div className="bg-amber-500 h-full transition-all duration-1000 hover:opacity-80 border-l border-white/20" style={{ width: `${((stats?.counts['follow_up'] || 0) / (stats?.totalOrders || 1)) * 100}%` }} title="Follow Up"></div>
                                    <div className="bg-rose-500 h-full transition-all duration-1000 hover:opacity-80 border-l border-white/20" style={{ width: `${((stats?.counts['pending'] || 0) / (stats?.totalOrders || 1)) * 100}%` }} title="Pending"></div>
                                </div>

                                {/* Status Breakdown Grid */}
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    <div className="flex items-center justify-between bg-emerald-50/50 border border-emerald-100/50 p-3 rounded-xl hover:bg-emerald-50 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm animate-pulse"></div>
                                            <span className="text-[11px] font-bold text-slate-600 uppercase">Selesai</span>
                                        </div>
                                        <span className="text-sm font-black text-emerald-700 tabular-nums">{stats?.counts['done'] || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-indigo-50/50 border border-indigo-100/50 p-3 rounded-xl hover:bg-indigo-50 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm"></div>
                                            <span className="text-[11px] font-bold text-slate-600 uppercase">Proses</span>
                                        </div>
                                        <span className="text-sm font-black text-indigo-700 tabular-nums">{stats?.counts['running'] || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-blue-50/50 border border-blue-100/50 p-3 rounded-xl hover:bg-blue-50 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm"></div>
                                            <span className="text-[11px] font-bold text-slate-600 uppercase">Baru/Open</span>
                                        </div>
                                        <span className="text-sm font-black text-blue-700 tabular-nums">{stats?.counts['open'] || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-rose-50/50 border border-rose-100/50 p-3 rounded-xl hover:bg-rose-50 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm"></div>
                                            <span className="text-[11px] font-bold text-slate-600 uppercase">Kendala</span>
                                        </div>
                                        <span className="text-sm font-black text-rose-700 tabular-nums">{(stats?.counts['pending'] || 0) + (stats?.counts['follow_up'] || 0)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Link */}
                        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                            <Link href="/orders" className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1 group/link">
                                Lihat Semua Order
                                <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Follow Up Overdue Alert */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-50 rounded-full blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                                <AlertTriangle className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800">Follow-up Terlambat</h3>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Overdue &gt; 1 Hari</p>
                            </div>
                        </div>
                        {stats?.followUpOverdue && stats.followUpOverdue.length > 0 ? (
                            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                                {stats.followUpOverdue.map((order: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between bg-amber-50/60 hover:bg-amber-50 rounded-2xl p-4 border border-amber-100/50 transition-colors">
                                        <div className="min-w-0 flex-1 mr-4">
                                            <p className="text-[13px] font-bold text-slate-800 truncate mb-0.5">{order.title}</p>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                                                <span className="font-bold text-amber-600/80">{order.order_no}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                <span className="truncate">{order.teknisi || 'Belum ada teknisi'}</span>
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center justify-center bg-white border border-amber-100 shadow-sm px-3 py-1.5 rounded-xl">
                                            <Timer className="w-3.5 h-3.5 text-amber-500 mr-1.5" />
                                            <span className="text-xs font-black text-amber-700">{order.hours_overdue}j</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center py-6 text-center">
                                <span className="text-3xl mb-2">✅</span>
                                <p className="text-sm text-slate-400 font-medium">Tidak ada follow-up terlambat</p>
                            </div>
                        )}

                        {/* Navigation Link */}
                        <div className="mt-4 pt-4 border-t border-amber-100/50 flex justify-end">
                            <Link href="/overdue" className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 group/link">
                                Lihat Selengkapnya
                                <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Repeat Orders (AI Powered) */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 relative overflow-hidden h-full flex flex-col">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-indigo-50 rounded-full blur-2xl"></div>
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                                    <Brain className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800">Repeat Order AI</h3>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Deteksi Semantik Gemini</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col h-full min-h-0">
                            {aiStatus === 'not_set' ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                                    <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
                                    <p className="text-[11px] text-slate-500 font-bold mb-3 uppercase tracking-wider">Fitur AI Belum Siap</p>
                                    <Link href="/repeat" className="bg-slate-100 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-slate-200 transition-all uppercase tracking-widest">Detail di Repeat Orders</Link>
                                </div>
                            ) : aiStatus === 'running' ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-10">
                                    <div className="relative mb-4">
                                        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                        <Brain className="w-5 h-5 text-indigo-600 absolute inset-0 m-auto" />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Sedang Menganalisis...</p>
                                </div>
                            ) : aiRepeatOrders.length > 0 ? (
                                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar flex-1">
                                    {aiRepeatOrders.map((item: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between bg-indigo-50/60 hover:bg-indigo-50 rounded-2xl p-4 border border-indigo-100/50 transition-colors shadow-sm group">
                                            <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                                                <span className="shrink-0 w-8 h-8 bg-white border border-indigo-100 shadow-sm rounded-lg flex items-center justify-center text-sm font-black text-indigo-600">
                                                    #{i + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-[13px] font-bold text-slate-800 truncate mb-0.5 group-hover:text-indigo-700 transition-colors">{item.title}</p>
                                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                                        <p className="text-[9px] text-slate-400 font-black uppercase truncate tracking-wider">{item.units}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="shrink-0 flex items-center justify-center bg-white border border-indigo-100 shadow-sm px-3 py-1.5 rounded-xl">
                                                <span className="text-sm font-black text-indigo-600">{item.count}x</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : aiStatus === 'idle' ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-3">
                                        <Brain className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3 leading-relaxed px-4">Data repeat order belum tersedia, silahkan jalankan analisa dengan AI</p>
                                    <Link
                                        href="/repeat"
                                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black hover:shadow-lg transition-all uppercase tracking-widest flex items-center gap-2"
                                    >
                                        KE REPEAT ORDERS
                                    </Link>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center py-6 text-center">
                                    <span className="text-3xl mb-2">📋</span>
                                    <p className="text-sm text-slate-400 font-medium">Tidak ada repeat order terdeteksi</p>
                                </div>
                            )}

                            {/* Navigation Link */}
                            <div className="mt-4 pt-4 border-t border-indigo-100/50 flex justify-end">
                                <Link href="/repeat" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group/link">
                                    Lihat Selengkapnya
                                    <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Activity Log Widget (Replaces old Analytics position) */}
                <ActivityLogWidget recentOrders={stats?.recentOrders || []} />

            </div>

            {/* Pending Overdue Alert */}
            {stats?.pendingOverdue && stats.pendingOverdue.length > 0 && (
                <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-[2rem] border border-red-200 shadow-xl p-8 animate-slide-in-bottom">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-700 rounded-xl flex items-center justify-center shadow-lg animate-pulse-glow">
                            <Clock className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-red-800 text-lg">🚨 Pending Terlalu Lama</h3>
                            <p className="text-xs text-red-500 font-bold uppercase tracking-widest">Status Pending &gt; 1 Bulan</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                        {stats.pendingOverdue.map((order: any, i: number) => (
                            <div
                                key={i}
                                className="flex items-center justify-between bg-white hover:bg-red-50/50 rounded-2xl p-4 border border-red-100 transition-colors shadow-sm"
                            >
                                <div className="min-w-0 flex-1 mr-4">
                                    <p className="text-[13px] font-bold text-slate-800 truncate mb-0.5">{order.title}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                                        <span className="font-bold text-red-600/80">{order.order_no}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span className="truncate">{order.teknisi || 'Belum ada teknisi'}</span>
                                    </div>
                                </div>
                                <div className="shrink-0 flex items-center justify-center bg-red-50 border border-red-100 shadow-sm px-3 py-1.5 rounded-xl">
                                    <Clock className="w-3.5 h-3.5 text-red-500 mr-1.5" />
                                    <span className="text-xs font-black text-red-700">{order.days_overdue}hri</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Navigation Link */}
                    <div className="mt-4 pt-4 border-t border-red-200/50 flex justify-end">
                        <Link href="/pending" className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 group/link">
                            Lihat Selengkapnya
                            <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            )}

            {/* Bottom Section: Technician Breakdown & Analytics */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
                <div className="h-full">
                    <TechnicianBreakdownWidget />
                </div>
                <div className="h-full">
                    <AnalyticsMiniWidget />
                </div>
            </div>

            {/* Recent Orders */}

            {/* Recent Orders */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden">
                <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <span className="text-2xl">📋</span> Order Terbaru
                    </h2>
                    <Link
                        href="/orders"
                        className="text-blue-600 hover:text-blue-700 font-black text-sm flex items-center gap-2 hover:gap-3 transition-all"
                    >
                        Lihat Semua <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Order</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pemohon</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teknisi</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tanggal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                                stats.recentOrders.map((order: any, i: number) => (
                                    <tr
                                        key={i}
                                        onClick={() => setSelectedOrderId(order.order_id)}
                                        className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-8 py-4">
                                            <span className="text-sm font-bold text-blue-600 group-hover:underline">{order.order_no}</span>
                                        </td>
                                        <td className="px-4 py-4 text-sm font-medium text-slate-700 max-w-[200px] truncate">{order.title}</td>
                                        <td className="px-4 py-4 text-sm text-slate-500">{order.requester_name}</td>
                                        <td className="px-4 py-4 text-xs text-slate-400">{order.requester_unit}</td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-xs text-slate-500 font-medium">{order.teknisi || '-'}</td>
                                        <td className="px-8 py-4 text-right text-xs text-slate-400 font-medium">{order.create_date}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-8 py-20 text-center text-slate-400 font-medium">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-4xl shadow-sm">📋</div>
                                            <span>Belum ada data order</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <OrderDetailModal
                orderId={selectedOrderId}
                onClose={() => setSelectedOrderId(null)}
            />
        </div>
    );
}

// Komponen Widget Tersendiri agar tidak merusak performa loading Dashboard
function ActivityLogWidget({ recentOrders }: { recentOrders: any[] }) {
    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 relative overflow-hidden h-full flex flex-col group hover:shadow-2xl transition-all">
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-slate-50 rounded-full blur-3xl"></div>
            <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                        <Wifi className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 text-lg">Log Aktivitas</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Aktivitas Terkini</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {recentOrders.length > 0 ? (
                        <div className="space-y-4">
                            {recentOrders.slice(0, 5).map((order: any, i: number) => (
                                <div key={i} className="flex gap-4 items-start relative pb-4 last:pb-0">
                                    {i !== recentOrders.slice(0, 5).length - 1 && (
                                        <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-slate-100"></div>
                                    )}
                                    <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] text-white z-10 ${order.status?.toUpperCase() === 'DONE' ? 'bg-emerald-500' :
                                        order.status?.toUpperCase() === 'RUNNING' ? 'bg-indigo-500' :
                                            'bg-blue-500'
                                        }`}>
                                        {i + 1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-800 truncate">
                                            {order.teknisi || 'System'} <span className="font-medium text-slate-500">melakukan</span> {order.status}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase truncate tracking-tighter">#{order.order_no} • {order.title}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center py-10 opacity-40">
                            <span className="text-3xl mb-2">📡</span>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Monitoring Sinyal...</p>
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                    <Link href="/orders" className="text-xs font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1 group/link">
                        Lihat Log Lengkap
                        <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

// Komponen Widget Tersendiri agar tidak merusak performa loading Dashboard
function AnalyticsMiniWidget() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [thresholds, setThresholds] = useState({ excellent: 24, normal: 72 });

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                // Fetch analytic data
                const res = await fetch('/api/orders/analytics');
                if (res.ok) {
                    const json = await res.json();
                    if (isMounted) setData(json.data || []);
                }

                // Fetch thresholds from settings
                const sRes = await fetch('/api/settings');
                if (sRes.ok) {
                    const settings = await sRes.json();
                    if (isMounted) {
                        setThresholds({
                            excellent: Number(settings.performance_excellent_hours) || 24,
                            normal: Number(settings.performance_normal_hours) || 72
                        });
                    }
                }
            } catch (err) { }
            finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchData();
        return () => { isMounted = false; };
    }, []);

    const currentMonthData = data.length > 0 ? data[data.length - 1] : null;
    const previousMonthData = data.length > 1 ? data[data.length - 2] : null;

    // Calculate Trend
    let trend = 0;
    if (currentMonthData && previousMonthData && previousMonthData.averageHours > 0) {
        trend = ((currentMonthData.averageHours - previousMonthData.averageHours) / previousMonthData.averageHours) * 100;
    }

    // Mini Bar Chart Preview
    const getBarChartPreview = () => {
        if (data.length === 0) return null;
        const recentData = data.slice(-8); // Show more periods to fill width
        const max = Math.max(...recentData.map(d => d.averageHours), 1);
        const height = 40;
        const width = 140;
        const barWidth = 12;
        const gap = 4;

        return recentData.map((d, i) => {
            const barHeight = (d.averageHours / max) * height;
            const x = i * (barWidth + gap);
            const y = height - barHeight;
            return (
                <rect
                    key={i}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="2"
                    fill="url(#miniBarGradient)"
                    className="transition-all duration-700 ease-out"
                    opacity={i === recentData.length - 1 ? 1 : 0.5}
                />
            );
        });
    };

    const topTechs = currentMonthData?.technicians?.slice(0, 3) || [];
    const performanceLabel = currentMonthData ? (
        currentMonthData.averageHours <= thresholds.excellent ? { text: 'Sangat Baik', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' } :
            currentMonthData.averageHours <= thresholds.normal ? { text: 'Normal', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' } :
                { text: 'Perlu Perhatian', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' }
    ) : null;

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] border border-slate-700 shadow-xl p-8 relative overflow-hidden group h-full flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-colors duration-500"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-fuchsia-500/20 rounded-full blur-3xl"></div>

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
                            <BarChart2 className="w-6 h-6 text-indigo-300" />
                        </div>
                        <div>
                            <h3 className="font-black text-white text-lg">Waktu Penyelesaian</h3>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Respon Time Analysis</p>
                        </div>
                    </div>
                    {data.length > 1 && (
                        <div className={`px-2 py-1 rounded-lg text-[9px] font-black tracking-tighter flex items-center gap-1 ${trend <= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {trend <= 0 ? '↓' : '↑'} {Math.abs(trend).toFixed(1)}%
                        </div>
                    )}
                </div>

                <div className="flex-1 flex flex-col justify-center py-4">
                    {loading ? (
                        <div className="text-center py-6">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto mb-2"></div>
                            <span className="text-xs text-indigo-300 opacity-60">Menyinkronkan...</span>
                        </div>
                    ) : currentMonthData ? (
                        <div className="space-y-8">
                            <div className="flex items-end justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="text-6xl font-black text-white tabular-nums tracking-tighter drop-shadow-md">
                                            {currentMonthData.averageHours}
                                        </span>
                                        <span className="text-xl font-bold text-slate-400">Jam</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">RATA-RATA MINGGU INI</span>
                                        {performanceLabel && (
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border ${performanceLabel.color}`}>
                                                {performanceLabel.text}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Mini Bar Chart Preview */}
                                <div className="shrink-0 relative w-[130px] h-[40px] opacity-80 group-hover:opacity-100 transition-opacity">
                                    <svg width="130" height="40" viewBox="0 0 130 40">
                                        <defs>
                                            <linearGradient id="miniBarGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#8b5cf6" />
                                                <stop offset="100%" stopColor="#d946ef" />
                                            </linearGradient>
                                        </defs>
                                        {getBarChartPreview()}
                                    </svg>
                                </div>
                            </div>

                            {/* Top Performers Section to fill space */}
                            {topTechs.length > 0 && (
                                <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/5 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Medal className="w-3 h-3 text-amber-400" />
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Paling Responsif</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {topTechs.map((tech: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between text-[11px]">
                                                <span className="text-slate-300 font-bold truncate max-w-[140px]">{tech.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-slate-500 font-bold">{tech.orderCount} ord</span>
                                                    <span className="text-indigo-300 font-black w-14 text-right">{tech.averageHours}j</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-10 opacity-60">
                            <span className="text-sm font-medium text-slate-300 italic">Data tidak tersedia</span>
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Trend Mode Active</span>
                    </div>
                    <Link href="/analytics" className="text-xs font-bold text-indigo-300 hover:text-white flex items-center gap-1 group/link transition-colors">
                        Buka Detail
                        <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

function TechnicianBreakdownWidget() {
    const [data, setData] = useState<{ leaderboard: any[], total_orders: number, total_teknisi: number, data: any[] } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/technician-breakdown');
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (err) { }
        finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(), 30000);
        return () => clearInterval(interval);
    }, []);

    const handleToggleStatus = async (teknisiName: string, currentStatus: boolean) => {
        try {
            const res = await fetch('/api/technician-breakdown', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    technician_name: teknisiName,
                    is_off_order: !currentStatus
                })
            });
            if (res.ok) fetchData();
        } catch (err) { }
    };

    const topPerformers = data?.leaderboard?.slice(0, 5) || [];
    const maxOrder = Math.max(...(topPerformers.map(d => d.order) || [1]), 1);

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden h-full flex flex-col group hover:shadow-2xl transition-all">
            <div className="px-8 py-6 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                        <Users className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Technician Performance</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Live Breakdown</p>
                    </div>
                </div>
                <Link href="/breakdown" className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 transition-colors group/link">
                    Lihat Detail
                    <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                </Link>
            </div>

            <div className="px-2 pb-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-50">
                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Technician Name</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Orders Handled</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Progress</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="px-6 py-6 h-12"></td>
                                    </tr>
                                ))
                            ) : topPerformers.length > 0 ? (
                                topPerformers.map((tech: any, i: number) => (
                                    <tr key={i} className="group hover:bg-slate-50/30 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-700">{tech.teknisi}</span>
                                                <div className="flex gap-1">
                                                    {tech.jabatan === 'teknisi' && (
                                                        <span className="text-[7px] font-black bg-blue-50 text-blue-500 px-2 py-0.5 rounded-md border border-blue-100 uppercase">TEKNISI</span>
                                                    )}
                                                    {tech.jabatan === 'servicedesk' && (
                                                        <span className="text-[7px] font-black bg-emerald-50 text-emerald-500 px-2 py-0.5 rounded-md border border-emerald-100 uppercase">SD</span>
                                                    )}
                                                    {tech.isNightShift && (
                                                        <span className="text-[7px] font-black bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-md border border-indigo-100 uppercase">SHIFT MALAM KEMARIN</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <span className="text-xl font-black text-slate-900 leading-none">{tech.order}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="max-w-[120px] mx-auto">
                                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-blue-500 h-full rounded-full transition-all duration-1000"
                                                        style={{ width: `${(tech.order / maxOrder) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className={`text-[8px] font-black px-3 py-1 rounded-md border tracking-tighter shadow-sm inline-block ${tech.isOff
                                                ? 'bg-rose-50 text-rose-600 border-rose-200'
                                                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                }`}>
                                                {tech.isOff ? 'INACTIVE' : 'ACTIVE'}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs opacity-50">
                                        No technician activity detected
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
