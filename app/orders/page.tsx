'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, RefreshCw, Wifi, ChevronDown, X, ArrowUp, ArrowDown, Phone } from 'lucide-react';
import { OrderDetailModal } from '@/components/OrderDetailModal';

interface Order {
    order_id: number;
    order_no: string;
    title: string;
    description: string;
    status: string;
    requester_name: string;
    requester_unit: string;
    ext_phone: string;
    teknisi: string;
    create_date: string;
}

export default function OrdersPage() {
    return (
        <ProtectedRoute>
            <OrdersContent />
        </ProtectedRoute>
    );
}

function OrdersContent() {
    const searchParams = useSearchParams();
    const initialStatus = searchParams.get('status') || '';
    const initialSearch = searchParams.get('search') || '';
    const initialSearchType = searchParams.get('searchType') || 'all';
    const initialNos = searchParams.get('nos') || '';

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState(initialSearch);
    const [searchType, setSearchType] = useState(initialSearchType);
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState(initialStatus);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [summary, setSummary] = useState<Record<string, number> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [nosFilter, setNosFilter] = useState(initialNos);

    // Modal state
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

    const fetchOrders = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.set('status', statusFilter);
            if (search) params.set('search', search);
            if (searchType !== 'all') params.set('searchType', searchType);
            if (startDate) params.set('startDate', startDate);
            if (endDate) params.set('endDate', endDate);
            if (nosFilter) params.set('nos', nosFilter);
            params.set('sort', sortOrder);
            params.set('page', page.toString());
            params.set('limit', '50');

            const res = await fetch(`/api/orders?${params}`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders || []);
                setTotal(data.total);
                setTotalPages(data.totalPages);
                if (data.summary) setSummary(data.summary);
            } else {
                const data = await res.json();
                setError(data.error || 'Gagal mengambil data');
            }
        } catch (err: any) {
            setError('Koneksi ke SIMRS gagal');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [statusFilter, search, searchType, startDate, endDate, nosFilter, sortOrder, page]);

    useEffect(() => {
        setLoading(true);
        fetchOrders();
    }, [fetchOrders]);

    const statuses = [
        { key: '', label: 'Semua' },
        { key: 'open', label: 'Open' },
        { key: 'follow_up', label: 'Follow Up' },
        { key: 'running', label: 'Running' },
        { key: 'done', label: 'Done' },
        { key: 'verified', label: 'Verified' },
        { key: 'pending', label: 'Pending' },
    ];

    const searchOptions = [
        { key: 'all', label: 'Semua Kolom' },
        { key: 'order_no', label: 'No Order' },
        { key: 'requester_name', label: 'Nama Pelapor' },
        { key: 'teknisi', label: 'Nama Teknisi' },
        { key: 'location', label: 'Lokasi Ruangan' },
        { key: 'ext_phone', label: 'Nomor Extensi' },
        { key: 'description', label: 'Catatan Keluhan' },
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
        <div className="min-h-screen p-4 md:p-8 space-y-6 animate-fade-in relative pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/20 shadow-xl">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">📋 Daftar Order SIMRS</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Wifi className="w-3 h-3 text-emerald-500" />
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Live dari SIMRS • {total} order</p>
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

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-2xl text-sm font-medium">
                    {error}
                </div>
            )}

            {/* Search + Status Filter */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search Bar with Dropdown */}
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
                                                setPage(1);
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
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Cari item..."
                                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-r-2xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                            />
                        </div>
                    </div>

                    {/* Date Filters */}
                    <div className="flex-1 flex flex-col sm:flex-row gap-2">
                        <div className="flex-1">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-slate-600"
                            />
                        </div>
                        <div className="hidden sm:flex items-center text-slate-400 font-bold">-</div>
                        <div className="flex-1">
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-slate-600"
                            />
                        </div>
                    </div>
                </div>

                {/* Filter Actions */}
                {(search || searchType !== 'all' || startDate || endDate || statusFilter !== initialStatus || nosFilter) && (
                    <div className="flex justify-end -mt-2 mb-2">
                        <button
                            onClick={() => {
                                setSearch('');
                                setSearchType('all');
                                setStartDate('');
                                setEndDate('');
                                setNosFilter('');
                                setStatusFilter(initialStatus);
                                setPage(1);
                            }}
                            className="text-xs font-bold text-slate-500 hover:text-red-500 flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
                        >
                            <X className="w-3.5 h-3.5" />
                            Hapus Semua Filter
                        </button>
                    </div>
                )}
            </div>

            {/* AI Filter Indicator */}
            {nosFilter && (
                <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between gap-4 animate-fade-in-up">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                            <Search className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-indigo-700 uppercase tracking-widest leading-none mb-1">Eksplorasi Analisa AI</p>
                            <p className="text-[10px] text-indigo-500 font-bold">Menampilkan {nosFilter.split(',').length} order spesifik hasil pengelompokan semantik.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setNosFilter(''); setPage(1); }}
                        className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors border border-indigo-100 shadow-sm"
                    >
                        Tampilkan Semua
                    </button>
                </div>
            )}

            {/* Status Pills */}
            <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
                {statuses.map(s => (
                    <button
                        key={s.key}
                        onClick={() => { setStatusFilter(s.key); setPage(1); }}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all border uppercase tracking-widest ${statusFilter === s.key
                            ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-200'
                            : 'bg-white text-slate-500 border-slate-100 hover:border-violet-300'
                            }`}
                    >
                        {s.label}
                        {summary && summary[s.key || 'all'] ? (
                            <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[9px] ${statusFilter === s.key ? 'bg-violet-400' : 'bg-slate-100'}`}>
                                {summary[s.key || 'all']}
                            </span>
                        ) : null}
                    </button>
                ))}
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
                            <X className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Tidak Ada Data</h3>
                        <p className="text-sm text-slate-500 font-medium">Coba sesuaikan filter pencarian atau tanggal.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Info Order</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Pelapor & Lokasi</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan Keluhan</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status & Teknisi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {orders.map((order) => (
                                    <tr
                                        key={order.order_id}
                                        className="hover:bg-violet-50/30 transition-colors cursor-pointer group"
                                        onClick={() => setSelectedOrderId(order.order_id)}
                                    >
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{order.order_no}</span>
                                                <span className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{order.create_date}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{order.requester_name}</span>
                                                <span className="text-[10px] text-violet-500 font-bold mt-0.5 uppercase tracking-wider">{order.requester_unit}</span>
                                                {order.ext_phone && (
                                                    <span className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider flex items-center gap-1">
                                                        <Phone className="w-3 h-3" />
                                                        Ext: {order.ext_phone}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 max-w-xs">
                                            <p className="text-xs font-bold text-slate-600 line-clamp-2 leading-relaxed">
                                                {order.title || order.description}
                                            </p>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex flex-col gap-2">
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border w-fit ${getStatusColor(order.status)}`}>
                                                    {order.status}
                                                </span>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] pl-0.5">
                                                    {order.teknisi || 'MENUNGGU TEKNISI'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-12">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/50 px-4 py-2 rounded-xl border border-white/20 shadow-sm">
                        Halaman {page} dari {totalPages} • <span className="text-slate-600">Total {total} item</span>
                    </p>
                    <div className="flex items-center gap-1.5 p-1.5 bg-white/60 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 disabled:opacity-30 hover:bg-violet-50 hover:text-violet-600 transition-all font-bold"
                        >
                            <ArrowUp className="-rotate-90 w-4 h-4" />
                        </button>
                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                            let p = page - 2 + i;
                            if (page <= 2) p = i + 1;
                            if (page >= totalPages - 1) p = totalPages - 4 + i;
                            if (p < 1 || p > totalPages) return null;
                            return (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-10 h-10 flex items-center justify-center rounded-xl text-[10px] font-black transition-all ${page === p ? 'bg-violet-600 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-400'}`}
                                >
                                    {p}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 disabled:opacity-30 hover:bg-violet-50 hover:text-violet-600 transition-all font-bold"
                        >
                            <ArrowDown className="-rotate-90 w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Modal */}
            {selectedOrderId && (
                <OrderDetailModal
                    orderId={selectedOrderId}
                    onClose={() => setSelectedOrderId(null)}
                />
            )}
        </div>
    );
}
