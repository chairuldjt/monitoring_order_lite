'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Repeat, MapPin, Search, ArrowDown, ArrowUp, X, Phone, LayoutGrid, ListFilter, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function RepeatOrdersPage() {
    return (
        <ProtectedRoute>
            <RepeatOrdersContent />
        </ProtectedRoute>
    );
}

function RepeatOrdersContent() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncResult, setSyncResult] = useState<{ message: string; count: number } | null>(null);

    // Filter states
    const [search, setSearch] = useState('');
    const [groupBy, setGroupBy] = useState<'location' | 'extension' | 'service'>('location');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    const fetchOrders = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true); // Always show loading when fetching non-refresh
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set('type', 'repeat');
            params.set('groupBy', groupBy);
            if (search) params.set('search', search);
            if (startDate) params.set('startDate', startDate);
            if (endDate) params.set('endDate', endDate);
            params.set('sort', sortOrder);

            const res = await fetch(`/api/orders/specific?${params}`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data.data || []);
            } else {
                const data = await res.json();
                setError(data.error || 'Gagal mengambil data');
            }
        } catch (err: any) {
            setError('Koneksi ke server gagal');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [search, groupBy, startDate, endDate, sortOrder]);

    const handleSync = async () => {
        setSyncing(true);
        setError(null);
        try {
            const res = await fetch('/api/orders/sync', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setSyncResult({ 
                    message: data.message || 'Sinkronisasi berhasil', 
                    count: data.count || 0 
                });
                setShowSyncModal(true);
                fetchOrders(true);
            } else {
                setError(data.error || 'Gagal sinkronisasi');
            }
        } catch (err) {
            setError('Gagal menghubungi server sync');
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-6 animate-fade-in relative pb-20">
            {/* Sync Modal */}
            {showSyncModal && syncResult && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowSyncModal(false)}></div>
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative z-10 w-full max-w-sm animate-scale-in text-center border border-slate-100">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-100 shadow-inner">
                            <CheckCircle className="w-10 h-10 text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">Sync Berhasil!</h2>
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-8">
                            <p className="text-slate-600 font-bold text-sm leading-relaxed">
                                {syncResult.message}
                            </p>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{syncResult.count} Order diproses</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowSyncModal(false)}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/20 shadow-xl">
                <div className="flex flex-col gap-2">
                    <Link href="/dashboard" className="text-[10px] font-black text-slate-400 hover:text-slate-800 flex items-center gap-1 uppercase tracking-widest transition-colors w-fit">
                        <ArrowLeft className="w-3 h-3" /> Kembali ke Dashboard
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg border border-white/20">
                            <Repeat className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800">Repeat Orders</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{orders.length} kelompok masalah berulang (Data Lokal)</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:shadow-lg transition-all font-bold flex items-center gap-2 active:scale-95 disabled:opacity-60 text-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync SIMRS'}
                    </button>
                    <button
                        onClick={() => fetchOrders(true)}
                        disabled={refreshing}
                        className="bg-white text-slate-800 border border-slate-200 px-5 py-2.5 rounded-xl hover:shadow-md transition-all font-bold flex items-center gap-2 active:scale-95 disabled:opacity-60 text-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-2xl text-sm font-medium">
                    {error}
                </div>
            )}

            {/* Tabs & Search */}
            <div className="space-y-4">
                <div className="flex flex-col lg:flex-row gap-6 lg:items-end">
                    {/* Tabs */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Grouping Berdasarkan</label>
                        <div className="flex p-1.5 bg-slate-100 rounded-[1.5rem] w-fit border border-slate-200 shadow-inner">
                            <button
                                onClick={() => {
                                    if (groupBy !== 'location') {
                                        setLoading(true);
                                        setGroupBy('location');
                                    }
                                }}
                                className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${groupBy === 'location' ? 'bg-white text-indigo-600 shadow-md scale-100' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                <MapPin className="w-3.5 h-3.5" />
                                Ruangan
                            </button>
                            <button
                                onClick={() => {
                                    if (groupBy !== 'extension') {
                                        setLoading(true);
                                        setGroupBy('extension');
                                    }
                                }}
                                className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${groupBy === 'extension' ? 'bg-white text-emerald-600 shadow-md scale-100' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                <Phone className="w-3.5 h-3.5" />
                                Ekstensi
                            </button>
                            <button
                                onClick={() => {
                                    if (groupBy !== 'service') {
                                        setLoading(true);
                                        setGroupBy('service');
                                    }
                                }}
                                className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${groupBy === 'service' ? 'bg-white text-violet-600 shadow-md scale-100' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                Layanan
                            </button>
                        </div>
                    </div>

                    {/* Search & Date Filter */}
                    <div className="flex-1 flex flex-col sm:flex-row gap-2 lg:items-end">
                        <div className="flex-1 relative">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Cari & Filter</label>
                            <div className="relative">
                                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={`Cari ${groupBy === 'location' ? 'Ruangan' : groupBy === 'extension' ? 'Ekstensi' : 'Nama Layanan'}...`}
                                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex-1 flex gap-2">
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Mulai</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Akhir</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {(search || startDate || endDate) && (
                    <div className="flex justify-end -mt-2 mb-2">
                        <button
                            onClick={() => {
                                setSearch('');
                                setStartDate('');
                                setEndDate('');
                                setSortOrder('desc');
                            }}
                            className="text-xs font-bold text-slate-500 hover:text-red-500 flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
                        >
                            <X className="w-3.5 h-3.5" />
                            Hapus Semua Filter
                        </button>
                    </div>
                )}
            </div>

            {/* Repeat Orders Grid */}
            <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-white/20 shadow-xl overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
                            <RefreshCw className="w-8 h-8 text-slate-300 animate-spin" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Memuat Data...</h3>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="p-20 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 text-slate-300">
                            <LayoutGrid className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Tidak Ada Duplikasi</h3>
                        <p className="text-sm text-slate-500 font-medium">Belum ditemukan order berulang dalam rentang waktu ini.</p>
                    </div>
                ) : (
                    <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {orders.map((group, idx) => (
                            <div key={idx} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col border-b-4 border-b-transparent hover:border-b-indigo-500">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-2 rounded-xl ${groupBy === 'location' ? 'bg-indigo-50 text-indigo-600' : groupBy === 'extension' ? 'bg-emerald-50 text-emerald-600' : 'bg-violet-50 text-violet-600'}`}>
                                        {groupBy === 'location' ? <MapPin className="w-5 h-5" /> : groupBy === 'extension' ? <Phone className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                                    </div>
                                    <div className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                        <Repeat className="w-3 h-3" />
                                        {group.count} Kejadian
                                    </div>
                                </div>

                                <h3 className="text-lg font-black text-slate-800 mb-2 truncate" title={group.label}>
                                    {group.label}
                                </h3>
                                
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">
                                    Histori Terakhir:
                                </p>

                                <div className="space-y-3 mb-6 flex-1">
                                    {group.items.map((item: any, i: number) => (
                                        <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className="flex justify-between items-start gap-2 mb-1">
                                                <span className="text-[10px] font-black text-indigo-600 uppercase">{item.order_no}</span>
                                                <span className="text-[9px] text-slate-400 font-bold">{item.create_date}</span>
                                            </div>
                                            <p className="text-[11px] font-medium text-slate-600 line-clamp-1 italic">
                                                "{item.title}"
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <Link
                                    href={`/orders?search=${encodeURIComponent(group.key)}&searchType=${groupBy === 'location' ? 'location' : groupBy === 'extension' ? 'ext_phone' : 'service'}`}
                                    className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest text-center block hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
                                >
                                    Lihat Semua Detail
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
