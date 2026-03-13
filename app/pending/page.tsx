'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Clock, ChevronDown, Search, X, ArrowDown, ArrowUp } from 'lucide-react';
import Link from 'next/link';
import { OrderDetailModal } from '@/components/OrderDetailModal';

export default function PendingOrdersPage() {
    return (
        <ProtectedRoute>
            <PendingOrdersContent />
        </ProtectedRoute>
    );
}

function PendingOrdersContent() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

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
            params.set('type', 'pending');
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

    const getStatusColor = (s: string) => {
        const map: Record<string, string> = {
            'OPEN': 'bg-rose-100 text-rose-700 border-rose-200',
            'FOLLOW UP': 'bg-amber-100 text-amber-700 border-amber-200',
            'RUNNING': 'bg-blue-100 text-blue-700 border-blue-200',
            'DONE': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'VERIFIED': 'bg-teal-100 text-teal-700 border-teal-200',
            'PENDING': 'bg-rose-100 text-rose-700 border-rose-200',
        };
        return map[s] || 'bg-slate-100 text-slate-600';
    };

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-6 animate-fade-in relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/20 shadow-xl">
                <div className="flex flex-col gap-2">
                    <Link href="/dashboard" className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 w-fit">
                        <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-700 rounded-xl flex items-center justify-center shadow-lg">
                            <Clock className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-800">Pending Terlalu Lama</h1>
                    </div>
                </div>
                <button
                    onClick={() => fetchOrders(true)}
                    disabled={refreshing}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-2.5 rounded-xl hover:shadow-lg transition-all font-bold flex items-center gap-2 active:scale-95 disabled:opacity-60 self-start md:self-end text-sm"
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

                    {/* Date Filters */}
                    <div className="flex-1 flex gap-2 z-10">
                        <div className="flex-1">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-slate-600"
                            />
                        </div>
                        <div className="flex items-center text-slate-400 font-bold">-</div>
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

                {/* Filter Actions */}
                {(search || searchType !== 'all' || startDate || endDate) && (
                    <div className="flex justify-end -mt-2 mb-2 z-0">
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
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden p-0 md:p-0">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto mb-3"></div>
                            <p className="text-sm text-slate-400">Mengambil data dari SIMRS...</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/80">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Order</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pembuat Order</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Extensi</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit / Lokasi</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teknisi</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th
                                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                        className="px-6 py-4 text-[10px] font-black hover:text-red-600 text-slate-400 uppercase tracking-widest text-right cursor-pointer transition-colors group select-none"
                                    >
                                        <div className="flex items-center justify-end gap-1.5">
                                            Tanggal
                                            <div className="bg-slate-100 p-1 rounded-md group-hover:bg-red-100 transition-colors">
                                                {sortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-slate-400 group-hover:text-red-600" /> : <ArrowUp className="w-3 h-3 text-slate-400 group-hover:text-red-600" />}
                                            </div>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {orders.length > 0 ? (
                                    orders.map((order, i) => (
                                        <tr
                                            key={i}
                                            onClick={() => setSelectedOrderId(order.order_id)}
                                            className="hover:bg-red-50/30 transition-colors group cursor-pointer"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-bold text-red-600 group-hover:underline">{order.order_no}</span>
                                                    <div className="flex items-center w-fit bg-red-50 border border-red-100 px-2 py-0.5 rounded-md">
                                                        <Clock className="w-3 h-3 text-red-500 mr-1" />
                                                        <span className="text-[10px] font-black text-red-600">{order.days_overdue} hari</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="text-sm font-medium text-slate-700 whitespace-normal break-words" title={order.description}>
                                                    {order.title}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-600">{order.requester_name}</td>
                                            <td className="px-4 py-4 text-xs font-bold text-slate-500">{order.ext_phone || '-'}</td>
                                            <td className="px-4 py-4 text-xs text-slate-400 max-w-[150px] truncate">{order.requester_unit}</td>
                                            <td className="px-4 py-4 text-xs text-slate-500 font-medium">{order.teknisi || '-'}</td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`text-[10px] font-black px-3 py-1 rounded-full border whitespace-nowrap ${getStatusColor(order.status)}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-xs text-slate-400 font-medium whitespace-nowrap">{order.create_date}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-20 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <span className="text-5xl mb-2">✅</span>
                                                <h3 className="text-xl font-black text-slate-800">Bersih!</h3>
                                                <p className="font-medium text-slate-400">Tidak ada order yang berstatus pending lebih dari 1 bulan.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <OrderDetailModal
                orderId={selectedOrderId}
                onClose={() => setSelectedOrderId(null)}
            />
        </div>
    );
}
