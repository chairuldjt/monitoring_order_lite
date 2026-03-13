'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ArrowLeft, RefreshCw, BarChart2, Clock, ChevronDown, ChevronUp, User, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

interface TechnicianData {
    name: string;
    averageHours: number;
    orderCount: number;
}

interface AnalyticsData {
    rawKey: string;
    label: string;
    month: string;
    averageHours: number;
    orderCount: number;
    technicians: TechnicianData[];
    details: any[];
}

export default function AnalyticsPage() {
    return (
        <ProtectedRoute>
            <AnalyticsContent />
        </ProtectedRoute>
    );
}

function AnalyticsContent() {
    const [data, setData] = useState<AnalyticsData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [viewType, setViewType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
    const [expandedRows, setExpandedRows] = useState<string[]>([]);
    const [uniqueTechnicians, setUniqueTechnicians] = useState<string[]>([]);
    const [thresholds, setThresholds] = useState({ excellent: 24, normal: 72 });

    // New Technician State
    const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
    const [showAllOrders, setShowAllOrders] = useState<Record<string, boolean>>({});
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        setSortConfig(prev => {
            if (prev?.key === key) {
                if (prev.direction === 'asc') return { key, direction: 'desc' };
                return null; // Reset to default
            }
            return { key, direction: 'asc' };
        });
    };

    const toggleShowAll = (id: string) => {
        setShowAllOrders(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleRow = (id: string) => {
        setExpandedRows(prev =>
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        );
    };

    const fetchAnalytics = useCallback(async (isRefresh = false, type = viewType, month = selectedMonth, year = selectedYear) => {
        if (isRefresh) {
            setRefreshing(true);
            setLoading(true);
        }
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set('type', type);
            if (month && type !== 'monthly') params.set('month', month);
            if (year) params.set('year', year);
            if (isRefresh) params.set('action', 'recalculate'); // Add recalculate action

            const res = await fetch(`/api/orders/analytics?${params}`);
            if (res.ok) {
                const responseData = await res.json();
                setData(responseData.data || []);
                setUniqueTechnicians(responseData.technicians || []);
                setExpandedRows([]); // Collapse all rows on new data
            } else {
                const errData = await res.json();
                setError(errData.error || 'Gagal mengambil data analitik');
            }
        } catch (err: any) {
            setError('Koneksi ke server gagal');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [viewType, selectedMonth, selectedYear]);

    useEffect(() => {
        const fetchThresholds = async () => {
            try {
                const res = await fetch('/api/settings');
                if (res.ok) {
                    const settings = await res.json();
                    setThresholds({
                        excellent: Number(settings.performance_excellent_hours) || 24,
                        normal: Number(settings.performance_normal_hours) || 72
                    });
                }
            } catch (err) {
                console.error('Failed to fetch thresholds');
            }
        };
        fetchThresholds();
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchAnalytics(false, viewType, selectedMonth, selectedYear);
    }, [viewType, selectedMonth, selectedYear, fetchAnalytics]);

    // Compute display data based on selected technician
    const displayData = useMemo(() => {
        if (selectedTechnician === 'all') return data;

        return data.map(period => {
            const techData = period.technicians?.find(t => t.name.toUpperCase() === selectedTechnician.toUpperCase());
            return {
                ...period,
                averageHours: techData ? techData.averageHours : 0,
                orderCount: techData ? techData.orderCount : 0
            };
        });
    }, [data, selectedTechnician]);

    // Compute display data based on selected technician and sorting
    const sortedData = useMemo(() => {
        let baseData = displayData;

        if (!sortConfig) return baseData;

        return [...baseData].sort((a, b) => {
            const { key, direction } = sortConfig;
            let valA = a[key as keyof typeof a];
            let valB = b[key as keyof typeof b];

            if (typeof valA === 'string' && typeof valB === 'string') {
                return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }

            if (typeof valA === 'number' && typeof valB === 'number') {
                return direction === 'asc' ? valA - valB : valB - valA;
            }

            return 0;
        });
    }, [displayData, sortConfig]);

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-6 animate-fade-in relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/20 shadow-xl">
                <div className="flex flex-col gap-2">
                    <Link href="/dashboard" className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 w-fit">
                        <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 via-violet-600 to-fuchsia-700 rounded-xl flex items-center justify-center shadow-lg">
                            <BarChart2 className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-800">Analitik Penyelesaian Order</h1>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1">
                        {[
                            { id: 'daily', label: 'Harian' },
                            { id: 'weekly', label: 'Mingguan' },
                            { id: 'monthly', label: 'Bulanan' }
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                onClick={() => setViewType(btn.id as any)}
                                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all ${viewType === btn.id
                                    ? 'bg-white text-violet-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex gap-2 flex-1">
                            {viewType !== 'monthly' && (
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-500 sm:max-w-[120px]"
                                >
                                    {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => (
                                        <option key={i + 1} value={String(i + 1)}>{m}</option>
                                    ))}
                                </select>
                            )}

                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-500 sm:max-w-[90px]"
                            >
                                {[2024, 2025, 2026].map(y => (
                                    <option key={y} value={String(y)}>{y}</option>
                                ))}
                            </select>
                        </div>

                        <select
                            value={selectedTechnician}
                            onChange={(e) => setSelectedTechnician(e.target.value)}
                            className="bg-white border border-violet-200 rounded-xl px-3 py-2 text-xs font-bold text-violet-700 outline-none focus:ring-2 focus:ring-violet-500 w-full sm:max-w-[150px] shadow-sm"
                        >
                            <option value="all">Semua Teknisi</option>
                            {uniqueTechnicians.map(tech => (
                                <option key={tech} value={tech}>{tech}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => fetchAnalytics(true)}
                        disabled={refreshing || loading}
                        className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-2.5 rounded-xl hover:shadow-lg transition-all font-bold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 text-sm whitespace-nowrap"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Kalkulasi Ulang
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-2xl text-sm font-medium">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden p-6 md:p-8 lg:p-10">
                <div className="mb-6 flex items-center gap-3">
                    <Clock className="w-6 h-6 text-violet-500" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {selectedTechnician === 'all' ? 'Rata-Rata Waktu Tanggap (Follow Up - Selesai)' : `Rata-Rata Waktu Tanggap: ${selectedTechnician}`}
                        </h2>
                        <p className="text-slate-500 text-sm">
                            Menampilkan durasi rata-rata dalam ukuran Jam untuk order yang telah terselesaikan per {viewType === 'daily' ? 'hari' : viewType === 'weekly' ? 'minggu' : 'bulan'}.
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
                        <p className="text-sm font-bold text-slate-600">Sedang mengolah data ({viewType})...</p>
                        <p className="text-xs text-slate-400 mt-1">Ini mungkin memerlukan waktu sekitar 2-5 detik.</p>
                    </div>
                ) : displayData.length > 0 ? (
                    <div className="space-y-12">
                        {/* CHART SECTION */}
                        <div className="w-full h-[400px] border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/50">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={displayData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dx={-10} />
                                    <Tooltip
                                        cursor={{ fill: '#f1f5f9' }}
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                                        formatter={(value: any) => [`${value} Jam`, 'Rata-Rata Durasi']}
                                        labelStyle={{ color: '#475569', marginBottom: '8px' }}
                                    />
                                    <Bar dataKey="averageHours" fill="url(#colorGradient)" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                        <LabelList dataKey="averageHours" position="top" fill="#8b5cf6" fontSize={12} fontWeight="bold" formatter={(val: any) => `${val} Jam`} />
                                    </Bar>
                                    <defs>
                                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#8b5cf6" />
                                            <stop offset="100%" stopColor="#d946ef" />
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* TABLE SUMMARY SECTION */}
                        <div className="rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[600px] sm:min-w-0">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                                        <th
                                            className="px-6 py-4 font-black cursor-pointer hover:bg-slate-100 transition-colors group"
                                            onClick={() => handleSort('rawKey')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Periode
                                                {sortConfig?.key === 'label' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-violet-600" /> : <ArrowDown className="w-3 h-3 text-violet-600" />
                                                ) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />}
                                            </div>
                                        </th>
                                        <th
                                            className="px-6 py-4 font-black cursor-pointer hover:bg-slate-100 transition-colors group"
                                            onClick={() => handleSort('orderCount')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Total Order Selesai
                                                {sortConfig?.key === 'orderCount' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-violet-600" /> : <ArrowDown className="w-3 h-3 text-violet-600" />
                                                ) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />}
                                            </div>
                                        </th>
                                        <th
                                            className="px-6 py-4 font-black cursor-pointer hover:bg-slate-100 transition-colors group"
                                            onClick={() => handleSort('averageHours')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Rata-Rata Durasi
                                                {sortConfig?.key === 'averageHours' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-violet-600" /> : <ArrowDown className="w-3 h-3 text-violet-600" />
                                                ) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />}
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 font-black text-right">Performa</th>
                                        {selectedTechnician === 'all' && <th className="px-6 py-4"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {sortedData.map((row, idx) => {
                                        const isExpanded = expandedRows.includes(row.rawKey);
                                        return (
                                            <React.Fragment key={idx}>
                                                <tr className={`hover:bg-slate-50/80 transition-colors group ${selectedTechnician === 'all' ? 'cursor-pointer' : ''}`} onClick={() => selectedTechnician === 'all' && toggleRow(row.rawKey)}>
                                                    <td className="px-6 py-4 text-sm font-bold text-slate-700">{row.label}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">
                                                        <span className="bg-violet-50 text-violet-700 px-3 py-1 rounded-full font-bold">
                                                            {row.orderCount} Order
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-black text-violet-600">
                                                        {row.averageHours} Jam
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-right">
                                                        {row.averageHours <= thresholds.excellent && row.orderCount > 0 ? (
                                                            <span className="text-emerald-500 font-bold bg-emerald-50 px-3 py-1 rounded-full">Sangat Baik</span>
                                                        ) : row.averageHours <= thresholds.normal && row.orderCount > 0 ? (
                                                            <span className="text-amber-500 font-bold bg-amber-50 px-3 py-1 rounded-full">Normal</span>
                                                        ) : row.orderCount > 0 ? (
                                                            <span className="text-red-500 font-bold bg-red-50 px-3 py-1 rounded-full">Perlu Perhatian</span>
                                                        ) : (
                                                            <span className="text-slate-400 font-bold bg-slate-50 px-3 py-1 rounded-full">N/A</span>
                                                        )}
                                                    </td>
                                                    {selectedTechnician === 'all' && (
                                                        <td className="px-6 py-4 text-slate-400 group-hover:text-slate-600 text-right">
                                                            {isExpanded ? <ChevronUp className="w-5 h-5 inline" /> : <ChevronDown className="w-5 h-5 inline" />}
                                                        </td>
                                                    )}
                                                </tr>
                                                {/* Expanded Details Row */}
                                                {isExpanded && (
                                                    <tr className="bg-slate-50/50">
                                                        <td colSpan={5} className="px-6 py-6 border-b border-slate-100">
                                                            <div className="flex flex-col gap-6">

                                                                {/* Rata-Rata Per Teknisi Section */}
                                                                {selectedTechnician === 'all' && row.technicians && row.technicians.length > 0 && (
                                                                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                                                        <h4 className="text-xs font-black text-slate-500 uppercase flex items-center gap-2 mb-4">
                                                                            <User className="w-4 h-4" /> Rata-Rata Per Teknisi ({row.label})
                                                                        </h4>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                            {row.technicians.map((tech, i) => (
                                                                                <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-violet-200 transition-colors">
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{tech.name}</span>
                                                                                        <span className="text-xs text-slate-500">{tech.orderCount} order selesai</span>
                                                                                    </div>
                                                                                    <div className="flex flex-col items-end">
                                                                                        <span className={`text-sm font-black ${tech.averageHours <= thresholds.excellent ? 'text-emerald-600' : tech.averageHours <= thresholds.normal ? 'text-amber-600' : 'text-red-600'}`}>
                                                                                            {tech.averageHours} Jam
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {(() => {
                                                                    let orderDetails = row.details || [];
                                                                    if (selectedTechnician !== 'all') {
                                                                        orderDetails = orderDetails.filter(o => o.teknisi?.toUpperCase() === selectedTechnician.toUpperCase());
                                                                    }
                                                                    const top5Slowest = [...orderDetails].sort((a, b) => b.duration_hours - a.duration_hours).slice(0, 5);

                                                                    if (top5Slowest.length === 0) return null;

                                                                    const showAll = showAllOrders[row.rawKey] || false;
                                                                    const displayOrders = showAll ? [...orderDetails].sort((a, b) => b.duration_hours - a.duration_hours) : top5Slowest;

                                                                    return (
                                                                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                                                            <div className="flex items-center justify-between mb-4">
                                                                                <h4 className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                                                                    <Clock className="w-4 h-4 text-red-500" />
                                                                                    {showAll ? `Daftar Seluruh Order (${row.label})` : `Top 5 Order Terlama (${row.label})`}
                                                                                </h4>
                                                                                {orderDetails.length > 5 && (
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); toggleShowAll(row.rawKey); }}
                                                                                        className="text-[10px] font-black text-violet-600 uppercase tracking-widest hover:text-violet-800 transition-colors"
                                                                                    >
                                                                                        {showAll ? 'Tampilkan Lebih Sedikit' : `Lihat Selengkapnya (${orderDetails.length})`}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex flex-col gap-2">
                                                                                {displayOrders.map((order, idx) => (
                                                                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-red-50/50 border border-red-100 hover:border-red-200 transition-colors gap-3">
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-sm font-bold text-slate-800">{order.order_no}</span>
                                                                                            <span className="text-xs text-slate-500 line-clamp-1">{order.title}</span>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-4 sm:ml-auto">
                                                                                            <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-100">
                                                                                                {order.teknisi}
                                                                                            </span>
                                                                                            <span className="text-sm font-black text-red-600 bg-red-100 px-3 py-1 rounded-lg">
                                                                                                {order.duration_hours} Jam
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}

                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <span className="text-5xl mb-4">📊</span>
                        <h3 className="text-xl font-black text-slate-800">Belum Ada Cukup Data</h3>
                        <p className="text-slate-500 mt-2">Tidak ada riwayat pesanan (Selesai/Verified) yang dapat dikalkulasi dari SIMRS saat ini.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
