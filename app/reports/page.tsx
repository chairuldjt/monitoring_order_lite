'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useEffect, useState, useCallback } from 'react';
import { 
    BarChart3, PieChart, TrendingUp, 
    ArrowLeft, RefreshCw, LayoutGrid, MapPin, 
    ClipboardList, CheckCircle, Clock,
    FileSpreadsheet
} from 'lucide-react';
import Link from 'next/link';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart as RePieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function ReportsPage() {
    return (
        <ProtectedRoute>
            <ReportsContent />
        </ProtectedRoute>
    );
}

function ReportsContent() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncResult, setSyncResult] = useState<{ message: string; count: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [days, setDays] = useState<any>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const formatDuration = (hours: number) => {
        if (!hours) return '0h';
        if (hours < 24) return `${hours}h`;
        const d = Math.floor(hours / 24);
        const h = Math.round(hours % 24);
        return h > 0 ? `${d}d ${h}h` : `${d}d`;
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (startDate && endDate) {
                params.set('startDate', startDate);
                params.set('endDate', endDate);
            } else {
                params.set('days', days);
            }
            
            window.location.href = `/api/reports/export?${params}`;
        } catch (error) {
            console.error('Failed to export:', error);
            setError('Gagal mengunduh laporan');
        } finally {
            setTimeout(() => setExporting(false), 2000);
        }
    };

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (startDate && endDate) {
                params.set('startDate', startDate);
                params.set('endDate', endDate);
            } else {
                params.set('days', days);
            }

            const res = await fetch(`/api/reports/stats?${params}`);
            if (res.ok) {
                const json = await res.json();
                setData(json.data);
            } else {
                const json = await res.json();
                setError(json.error || 'Gagal memuat statistik');
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            setError('Koneksi ke server gagal');
        } finally {
            setLoading(false);
        }
    }, [days, startDate, endDate]);

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
                fetchStats();
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
        fetchStats();
    }, [fetchStats]);

    if (loading && !data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin" />
                    <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Menyiapkan Laporan Grafis...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-8 animate-fade-in relative pb-20 bg-[#F8FAFC]">
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex flex-col gap-2">
                    <Link href="/dashboard" className="text-[10px] font-black text-slate-400 hover:text-slate-800 flex items-center gap-1 uppercase tracking-widest transition-colors w-fit">
                        <ArrowLeft className="w-3 h-3" /> Kembali ke Dashboard
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-200 border border-white/20">
                            <BarChart3 className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Analytics & Reports</h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                                Real-time Optimization Insights
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:shadow-lg transition-all font-bold flex items-center gap-2 active:scale-95 disabled:opacity-60 text-sm h-11"
                    >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync SIMRS'}
                    </button>

                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 hover:shadow-lg transition-all font-bold flex items-center gap-2 active:scale-95 disabled:opacity-60 text-sm h-11"
                    >
                        <FileSpreadsheet className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
                        {exporting ? 'Exporting...' : 'Excel Report'}
                    </button>

                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex-wrap">
                        <div className="flex bg-slate-100 rounded-xl p-0.5">
                            {['all', 7, 30, 90].map((d) => (
                                <button
                                    key={d}
                                    onClick={() => {
                                        setDays(d);
                                        setStartDate('');
                                        setEndDate('');
                                    }}
                                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${days === d && !startDate ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {d === 'all' ? 'Semua' : `${d} Hari`}
                                </button>
                            ))}
                        </div>

                        <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden md:block"></div>

                        <div className="flex items-center gap-2 px-2">
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setDays('');
                                }}
                                className="text-[10px] font-bold bg-slate-50 border-none rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <span className="text-slate-300 font-black text-[10px]">-</span>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setDays('');
                                }}
                                className="text-[10px] font-bold bg-slate-50 border-none rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={fetchStats}
                        disabled={loading}
                        className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50 h-11 w-11 flex items-center justify-center"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-2xl text-sm font-medium">
                    {error}
                </div>
            )}

            {/* Top Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {[
                    { label: 'Total Orders', value: data?.summary?.total || 0, icon: ClipboardList, color: 'indigo', subtitle: 'Seluruh pesanan masuk' },
                    { label: 'Selesai', value: data?.summary?.completed || 0, icon: CheckCircle, color: 'emerald', subtitle: 'Order terselesaikan' },
                    { label: 'Running', value: data?.summary?.running || 0, icon: TrendingUp, color: 'sky', subtitle: 'Follow Up & Checked' },
                    { label: 'Pending', value: data?.summary?.pending || 0, icon: Clock, color: 'amber', subtitle: 'Menunggu respon' },
                    { label: 'Avg. Time', value: formatDuration(data?.summary?.averageCompletionTime), icon: TrendingUp, color: 'purple', subtitle: 'Rata-rata penyelesaian' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-${stat.color}-500/5 rounded-full blur-3xl -mr-16 -mt-16`}></div>
                        <div className="flex flex-col gap-4 relative z-10">
                            <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600 border border-${stat.color}-100 shadow-sm`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                <h3 className={`font-black text-slate-800 tracking-tight ${stat.label === 'Avg. Time' ? 'text-2xl' : 'text-3xl'}`}>
                                    {stat.value}
                                </h3>
                                <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-wide">{stat.subtitle}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Trend Chart */}
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-8 lg:p-10 space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                                <TrendingUp className="w-5 h-5 text-indigo-500" />
                                Tren Volume Order
                            </h2>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 ml-8">Aktivitas harian {days} hari terakhir</p>
                        </div>
                    </div>
                    
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data?.trends || []}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                    tickFormatter={(val: any) => new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Chart */}
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-8 lg:p-10 space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                                <PieChart className="w-5 h-5 text-indigo-500" />
                                Distribusi Status
                            </h2>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 ml-8">Persentase berdasarkan kondisi saat ini</p>
                        </div>
                    </div>
                    
                    <div className="h-[300px] w-full flex flex-col md:flex-row items-center gap-8">
                        <div className="flex-1 h-full w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                    <Pie
                                        data={data?.statusDist || []}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        cornerRadius={8}
                                    >
                                        {(data?.statusDist || []).map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                </RePieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-col gap-3 min-w-[150px]">
                            {(data?.statusDist || []).map((entry: any, index: number) => (
                                <div key={index} className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{entry.name}</span>
                                        <span className="text-[9px] text-slate-400 font-bold">{entry.value} Unit</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Top Locations */}
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-8 lg:p-10 space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                                <MapPin className="w-5 h-5 text-indigo-500" />
                                Unit / Ruangan Teraktif
                            </h2>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 ml-8">Top 10 lokasi dengan order terbanyak</p>
                        </div>
                    </div>
                    
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.topLocations || []} layout="vertical" margin={{ left: 40, right: 40 }}>
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    width={140}
                                    tick={{ fontSize: 9, fontWeight: 900, fill: '#334155', textAnchor: 'start', dx: -130 }}
                                />
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={20}>
                                    {(data?.topLocations || []).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#4338ca' : '#e2e8f0'} className="hover:fill-indigo-500 transition-all duration-300" />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Services */}
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-8 lg:p-10 space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                                <LayoutGrid className="w-5 h-5 text-indigo-500" />
                                Layanan Paling Diminta
                            </h2>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 ml-8">Kategori layanan paling sering dilaporkan</p>
                        </div>
                    </div>
                    
                    <div className="h-[350px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.topServices || []} layout="vertical" margin={{ left: 40, right: 40 }}>
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    width={140}
                                    tick={{ fontSize: 9, fontWeight: 900, fill: '#334155', textAnchor: 'start', dx: -130 }}
                                />
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="value" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={20}>
                                    {(data?.topServices || []).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#1e1b4b' : index < 3 ? '#6366f1' : '#cbd5e1'} className="hover:fill-indigo-400 transition-all duration-300" />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

        </div>
    );
}
