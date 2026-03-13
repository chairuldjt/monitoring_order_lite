'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, RefreshCw, AlertTriangle, Timer, ChevronDown, Search, X, ArrowDown, ArrowUp, Phone, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { StatusTimer } from '@/components/StatusTimer';

export default function OverdueOrdersPage() {
    return (
        <ProtectedRoute>
            <OverdueOrdersContent />
        </ProtectedRoute>
    );
}

function OverdueOrdersContent() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter states
    const [search, setSearch] = useState('');
    const [searchType, setSearchType] = useState('all');
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    const searchOptions = [
        { key: 'all', label: 'Semua Kolom' },
        { key: 'order_no', label: 'No Order' },
        { key: 'requester_name', label: 'Pembuat Order' },
        { key: 'teknisi', label: 'Nama Teknisi' },
        { key: 'location', label: 'Lokasi / Unit' },
        { key: 'ext_phone', label: 'Nomor Extensi' },
        { key: 'description', label: 'Catatan' }
    ];

    const fetchOrders = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set('type', 'overdue');
            if (search) params.set('search', search);
            if (searchType !== 'all') params.set('searchType', searchType);
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
    }, [search, searchType, startDate, endDate, sortOrder]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const getStatusColor = (status: string) => {
        const s = status?.toUpperCase().trim();
        const map: Record<string, string> = {
            'OPEN': 'bg-blue-100 text-blue-700 border-blue-200',
            'FOLLOW UP': 'bg-purple-100 text-purple-700 border-purple-200',
            'RUNNING': 'bg-sky-100 text-sky-700 border-sky-200',
            'CHECKED': 'bg-sky-100 text-sky-700 border-sky-200',
            'DONE': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'VERIFIED': 'bg-teal-100 text-teal-700 border-teal-200',
            'PENDING': 'bg-amber-100 text-amber-700 border-amber-200',
        };
        return map[s] || 'bg-slate-100 text-slate-600';
    };

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-6 animate-fade-in relative pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/20 shadow-xl">
                <div className="flex flex-col gap-2">
                    <Link href="/dashboard" className="text-[10px] font-black text-slate-400 hover:text-slate-800 flex items-center gap-1 uppercase tracking-widest transition-colors w-fit">
                        <ArrowLeft className="w-3 h-3" /> Kembali ke Dashboard
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg border border-white/20">
                            <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800">Over Follow Up</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{orders.length} order perlu tindakan</p>
                            </div>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => fetchOrders(true)}
                    disabled={refreshing}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-2.5 rounded-xl hover:shadow-lg transition-all font-bold flex items-center gap-2 active:scale-95 disabled:opacity-60 self-start text-sm"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-2xl text-sm font-medium">
                    {error}
                </div>
            )}

            {/* Search + Date Filter */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-[2] relative flex z-20">
                        <div className="relative">
                            <button
                                onClick={() => setIsSearchDropdownOpen(!isSearchDropdownOpen)}
                                className="h-full px-4 py-3 bg-slate-50 border border-slate-200 border-r-0 rounded-l-2xl text-sm font-bold text-slate-600 flex items-center gap-2 hover:bg-slate-100 transition-colors"
                            >
                                {searchOptions.find(o => o.key === searchType)?.label}
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            </button>

                            {isSearchDropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-100 shadow-xl rounded-xl py-2 z-50">
                                    {searchOptions.map(opt => (
                                        <button
                                            key={opt.key}
                                            onClick={() => {
                                                setSearchType(opt.key);
                                                setIsSearchDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${searchType === opt.key ? 'bg-violet-50 text-violet-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="relative flex-1">
                            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari item..."
                                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-r-2xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col sm:flex-row gap-2">
                        <div className="flex-1">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-slate-600"
                            />
                        </div>
                        <div className="hidden sm:flex items-center text-slate-400 font-bold">-</div>
                        <div className="flex-1">
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-slate-600"
                            />
                        </div>
                    </div>
                </div>

                {(search || searchType !== 'all' || startDate || endDate) && (
                    <div className="flex justify-end -mt-2 mb-2">
                        <button
                            onClick={() => {
                                setSearch('');
                                setSearchType('all');
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

            {/* Orders Table */}
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
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Semua Terkendali!</h3>
                        <p className="text-sm text-slate-500 font-medium">Tidak ada order yang melewati batas waktu follow up.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="w-32 px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Info Order</th>
                                    <th className="w-1/4 px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Pelapor & Lokasi</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan Keluhan</th>
                                    <th className="w-72 px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status & Teknisi</th>
                                    <th 
                                        className="w-40 px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-violet-600 transition-colors group"
                                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                    >
                                        <div className="flex items-center justify-end gap-2">
                                            Tanggal
                                            {sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                                        </div>
                                    </th>
                                    <th className="w-32 px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {orders.map((order, i) => (
                                    <tr key={i} className="hover:bg-amber-50/30 transition-colors group">
                                        <td className="px-6 py-5 align-top">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-amber-600 uppercase tracking-wider">{order.order_no}</span>
                                                <div className="flex items-center gap-1 mt-1 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md w-fit">
                                                    <Timer className="w-2.5 h-2.5 text-rose-500" />
                                                    <span className="text-[9px] font-black text-rose-600 uppercase tracking-tighter">{order.hours_overdue}j Overdue</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 align-top">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-700 uppercase tracking-widest truncate max-w-[200px] block" title={order.requester_name}>{order.requester_name}</span>
                                                <span className="text-[10px] text-violet-500 font-bold mt-0.5 uppercase tracking-wider truncate max-w-[200px] block" title={order.requester_unit}>{order.requester_unit}</span>
                                                {order.ext_phone && (
                                                    <span className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider flex items-center gap-1">
                                                        <Phone className="w-3 h-3" />
                                                        Ext: {order.ext_phone}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 align-top">
                                            <p className="text-xs font-bold text-slate-600 line-clamp-3 leading-relaxed">
                                                {order.title || order.description}
                                            </p>
                                        </td>
                                        <td className="px-6 py-5 align-top">
                                            <div className="flex flex-col gap-2 min-h-[80px]">
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border w-fit ${getStatusColor(order.status)}`}>
                                                    {order.status}
                                                </span>
                                                <div className="min-h-[32px]">
                                                    <StatusTimer createDate={order.create_date} status={order.status} />
                                                </div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] pl-0.5 truncate max-w-[220px]" title={order.teknisi}>
                                                    {order.teknisi || 'MENUNGGU TEKNISI'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right align-top">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{order.create_date}</span>
                                        </td>
                                        <td className="px-6 py-5 text-center align-top">
                                            <Link 
                                                href={`/orders/${order.order_id}`}
                                                className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 hover:text-white hover:border-slate-800 transition-all shadow-sm active:scale-95 group/btn"
                                            >
                                                Detail
                                                <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
