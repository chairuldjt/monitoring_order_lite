'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import {
    FolderOpen, MessageSquare, Loader, CheckCircle, ShieldCheck, Clock,
    TrendingUp, AlertTriangle, Repeat, ArrowRight, Timer,
    RefreshCw, Wifi, WifiOff, Users
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


    useEffect(() => {
        fetchStats();
        // Auto-refresh stats every 2 minutes
        const interval = setInterval(() => fetchStats(true), 120000);
        return () => clearInterval(interval);
    }, [fetchStats]);

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
        <div className="min-h-screen p-4 md:p-8 space-y-6 animate-fade-in pb-20 md:pb-8">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-white/40 backdrop-blur-md p-6 md:p-8 rounded-[2rem] border border-white/20 shadow-xl">
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

            {/* Status Cards */}
            <div className="grid grid-cols-2 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {statusCards.map((card, i) => {
                    const Icon = card.icon;
                    const count = stats?.counts[card.key] || 0;
                    return (
                        <Link
                            key={card.key}
                            href={`/orders?status=${card.key}`}
                            className={`p-5 rounded-[2rem] bg-gradient-to-br ${card.gradient} text-white shadow-lg ${card.shadow} relative overflow-hidden group hover:scale-105 transition-all duration-300 flex flex-col items-center text-center`}
                            style={{ animationDelay: `${i * 100}ms` }}
                        >
                            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-20 bg-white"></div>
                            <Icon className="w-6 h-6 mb-2 opacity-80" />
                            <span className="text-3xl font-black mb-0.5 tabular-nums">{count}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-80">{card.label}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Analytics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Total Orders Card */}
                <div className="bg-white rounded-[1.5rem] border-t-4 border-t-violet-600 border-x border-b border-slate-100 shadow-xl p-5 flex flex-col h-[340px] relative overflow-hidden group hover:shadow-violet-100 transition-all">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-violet-50 rounded-full blur-3xl opacity-50"></div>
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200">
                                    <TrendingUp className="w-4 h-4 text-white" />
                                </div>
                                <h3 className="font-black text-slate-800 text-sm tracking-tight">Total Order</h3>
                            </div>
                            <span className="text-[10px] font-black text-white bg-violet-600 px-2 py-0.5 rounded-full shadow-sm">+{stats?.todayOrders || 0} New</span>
                        </div>

                        <div className="flex items-baseline gap-1.5 mb-4">
                            <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-violet-800 tabular-nums tracking-tighter">{stats?.totalOrders || 0}</span>
                            <span className="text-xs font-black text-violet-400 uppercase tracking-widest">Orders</span>
                        </div>

                        <div className="space-y-4 flex-1">
                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-50">
                                <div className="bg-emerald-500 h-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${((stats?.counts['done'] || 0) / (stats?.totalOrders || 1)) * 100}%` }}></div>
                                <div className="bg-blue-500 h-full" style={{ width: `${((stats?.counts['open'] || 0) / (stats?.totalOrders || 1)) * 100}%` }}></div>
                                <div className="bg-rose-500 h-full" style={{ width: `${(((stats?.counts['pending'] || 0) + (stats?.counts['follow_up'] || 0)) / (stats?.totalOrders || 1)) * 100}%` }}></div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-emerald-50/50 border border-emerald-100 p-2 rounded-xl group-hover:bg-emerald-50 transition-colors">
                                    <p className="text-[8px] font-black text-emerald-600 uppercase mb-0.5 tracking-tighter">Selesai</p>
                                    <p className="text-sm font-black text-emerald-700">{stats?.counts['done'] || 0}</p>
                                </div>
                                <div className="bg-indigo-50/50 border border-indigo-100 p-2 rounded-xl group-hover:bg-indigo-50 transition-colors">
                                    <p className="text-[8px] font-black text-indigo-600 uppercase mb-0.5 tracking-tighter">Running</p>
                                    <p className="text-sm font-black text-indigo-700">{stats?.counts['running'] || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-50">
                            <Link href="/orders" className="text-[10px] font-black text-violet-600 flex items-center gap-1 uppercase tracking-widest hover:translate-x-1 transition-transform">
                                Dashboard Detail <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Repeat Orders Card */}
                <div className="bg-white rounded-[1.5rem] border-t-4 border-t-indigo-600 border-x border-b border-slate-100 shadow-xl p-5 flex flex-col h-[340px] relative overflow-hidden group hover:shadow-indigo-100 transition-all">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                <Repeat className="w-4 h-4 text-white" />
                            </div>
                            <h3 className="font-black text-slate-800 text-sm tracking-tight">Repeat Order</h3>
                        </div>

                        <div className="flex-1 min-h-0">
                            {stats?.repeatOrders && stats.repeatOrders.length > 0 ? (
                                <div className="space-y-1.5 overflow-y-auto pr-1 custom-scrollbar max-h-[200px]">
                                    {stats.repeatOrders.slice(0, 5).map((item: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between bg-gradient-to-r from-slate-50 to-white hover:from-indigo-50 hover:to-white rounded-xl p-2.5 border border-slate-100 group/item transition-all">
                                            <div className="min-w-0 flex-1 mr-2">
                                                <p className="text-[11px] font-bold text-slate-800 truncate group-hover/item:text-indigo-700">{item.title}</p>
                                                <p className="text-[8px] text-slate-400 font-black uppercase truncate">{item.units}</p>
                                            </div>
                                            <span className="shrink-0 text-[10px] font-black text-white bg-indigo-500 px-1.5 py-0.5 rounded-lg shadow-sm border border-indigo-400">{item.count}x</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">No repeat issues</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-50">
                            <Link href="/repeat" className="text-[10px] font-black text-indigo-600 flex items-center gap-1 uppercase tracking-widest hover:translate-x-1 transition-transform">
                                Full Analysis <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Follow-up Overdue Card */}
                <div className="bg-white rounded-[1.5rem] border-t-4 border-t-amber-500 border-x border-b border-slate-100 shadow-xl p-5 flex flex-col h-[340px] relative overflow-hidden group hover:shadow-amber-100 transition-all">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-50 rounded-full blur-3xl opacity-50"></div>
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
                                <AlertTriangle className="w-4 h-4 text-white" />
                            </div>
                            <h3 className="font-black text-slate-800 text-sm tracking-tight">Over Follow up</h3>
                        </div>

                        <div className="flex-1 min-h-0">
                            {stats?.followUpOverdue && stats.followUpOverdue.length > 0 ? (
                                <div className="space-y-1.5 overflow-y-auto pr-1 custom-scrollbar max-h-[200px]">
                                    {stats.followUpOverdue.slice(0, 5).map((order: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between bg-gradient-to-r from-amber-50/30 to-white hover:from-amber-50 hover:to-white rounded-xl p-2.5 border border-amber-100/30 transition-all">
                                            <div className="min-w-0 flex-1 mr-2">
                                                <p className="text-[11px] font-bold text-slate-800 truncate">{order.title}</p>
                                                <p className="text-[8px] text-amber-600 font-black uppercase">{order.order_no}</p>
                                            </div>
                                            <span className="shrink-0 text-[10px] font-black text-amber-700 bg-amber-100/50 px-2 py-0.5 rounded-lg border border-amber-200">{order.hours_overdue}j</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                    <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mb-2">
                                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">All updated</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-50">
                            <Link href="/overdue" className="text-[10px] font-black text-amber-600 flex items-center gap-1 uppercase tracking-widest hover:translate-x-1 transition-transform">
                                Lihat Selengkapnya <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Pending Overdue Card */}
                <div className="bg-white rounded-[1.5rem] border-t-4 border-t-rose-600 border-x border-b border-slate-100 shadow-xl p-5 flex flex-col h-[340px] relative overflow-hidden group hover:shadow-rose-100 transition-all">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-50 rounded-full blur-3xl opacity-50"></div>
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-200">
                                <Clock className="w-4 h-4 text-white" />
                            </div>
                            <h3 className="font-black text-slate-800 text-sm tracking-tight">Over Pending</h3>
                        </div>

                        <div className="flex-1 min-h-0">
                            {stats?.pendingOverdue && stats.pendingOverdue.length > 0 ? (
                                <div className="space-y-1.5 overflow-y-auto pr-1 custom-scrollbar max-h-[200px]">
                                    {stats.pendingOverdue.slice(0, 5).map((order: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between bg-gradient-to-r from-rose-50/30 to-white hover:from-rose-50 hover:to-white rounded-xl p-2.5 border border-rose-100/30 transition-all">
                                            <div className="min-w-0 flex-1 mr-2">
                                                <p className="text-[11px] font-bold text-slate-800 truncate">{order.title}</p>
                                                <p className="text-[8px] text-rose-600 font-black uppercase">{order.order_no}</p>
                                            </div>
                                            <span className="shrink-0 text-[10px] font-black text-rose-700 bg-rose-100/50 px-2 py-0.5 rounded-lg border border-rose-200">{order.days_overdue}h</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                    <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mb-2">
                                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">No blockers</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-50">
                            <Link href="/pending" className="text-[10px] font-black text-rose-600 flex items-center gap-1 uppercase tracking-widest hover:translate-x-1 transition-transform">
                                Lihat Selengkapnya <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Technician Breakdown & Activity Log */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
                <div className="xl:col-span-2">
                    <TechnicianBreakdownWidget />
                </div>
                <div>
                    <ActivityLogWidget recentOrders={stats?.recentOrders || []} />
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
