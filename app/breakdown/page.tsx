'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Users, Clock, RefreshCw, Filter, ShieldCheck, ShieldAlert } from 'lucide-react';

interface LeaderboardItem {
    teknisi: string;
    order: number;
    isOff?: boolean;
    jabatan?: string;
    isNightShift?: boolean;
}

interface MonitoringData {
    date: string;
    total_orders: number;
    total_teknisi: number;
    leaderboard: LeaderboardItem[];
    data: LeaderboardItem[];
}

export default function TechnicianBreakdownPage() {
    const [data, setData] = useState<MonitoringData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchData = useCallback(async (nocache = false, date?: string) => {
        if (!data) setLoading(true);

        try {
            let url = `/api/technician-breakdown?`;
            if (nocache) url += `nocache=1&`;
            if (date) url += `date=${date}&`;

            const res = await fetch(url);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to fetch data');
            setData(json);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [data]);

    useEffect(() => {
        fetchData(false, selectedDate);
    }, [selectedDate, fetchData]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchData(true, selectedDate);
    };

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

            if (res.ok) {
                fetchData(true, selectedDate);
            } else {
                const err = await res.json();
                alert(err.error || 'Gagal mengubah status');
            }
        } catch (err) {
            console.error('Error toggling status:', err);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/10 backdrop-blur-md p-8 rounded-[2rem] border border-white/20 shadow-xl">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-violet-500/20">
                        👨‍🔧
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800">
                            Technician Breakdown
                        </h1>
                        <p className="text-slate-500 font-medium mt-1 flex items-center gap-2">
                            Performance analysis from EServiceDesk
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white transition-all shadow-sm font-medium text-slate-700"
                        />
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={loading || isRefreshing}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${isRefreshing || loading
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:shadow-violet-500/25 hover:-translate-y-0.5'
                            }`}
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl text-rose-700 font-medium flex items-center gap-3 shadow-sm animate-in slide-in-from-left duration-300">
                    <ShieldAlert className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
                    <p className="text-violet-100 font-bold tracking-wider uppercase text-xs">Total Orders Today</p>
                    <div className="mt-4 flex items-end gap-3">
                        <h2 className="text-6xl font-black italic tracking-tighter">
                            {loading ? '...' : data?.total_orders || 0}
                        </h2>
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-violet-100/70 text-sm font-medium">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        Live data from EServiceDesk
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
                    <p className="text-emerald-100 font-bold tracking-wider uppercase text-xs">Technicians On Duty</p>
                    <div className="mt-4 flex items-end gap-3">
                        <h2 className="text-6xl font-black italic tracking-tighter">
                            {loading ? '...' : data?.total_teknisi || 0}
                        </h2>
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-emerald-100/70 text-sm font-medium">
                        <Users className="w-4 h-4 text-white" />
                        Technicians with logged activities
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Leaderboard */}
                <div className="lg:col-span-1 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl self-start">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Top Performance</h3>
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                            🏆
                        </div>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            [1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-20 bg-slate-50 animate-pulse rounded-2xl border border-slate-100"></div>
                            ))
                        ) : data?.leaderboard && data.leaderboard.length > 0 ? (
                            data.leaderboard.map((item, index) => (
                                <div
                                    key={item.teknisi}
                                    className={`flex items-center p-4 rounded-2xl border transition-all hover:scale-[1.02] cursor-default group ${index === 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-100'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl mr-4 shadow-sm ${index === 0 ? 'bg-amber-100 text-amber-600' : 'bg-white text-slate-400'
                                        }`}>
                                        #{index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-bold text-slate-800 truncate">{item.teknisi}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {item.jabatan === 'servicedesk' && (
                                                <span className="bg-emerald-100 text-emerald-700 text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase border border-emerald-200">SD</span>
                                            )}
                                            {item.jabatan === 'teknisi' && (
                                                <span className="bg-blue-100 text-blue-700 text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase border border-blue-200">TEK</span>
                                            )}
                                            {item.isNightShift && (
                                                <span className="bg-indigo-100 text-indigo-700 text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase border border-indigo-200">NIGHT</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right ml-4">
                                        <p className="text-2xl font-black text-slate-900 leading-none">{item.order}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Orders</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-4">
                                <Users className="w-12 h-12 text-slate-200" />
                                <p className="font-medium">No performance data</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Detailed Breakdown</h3>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{data?.data?.length || 0} Technicians Total</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Technician</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Orders</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-1/3">Activity</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status Control</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-8 py-6"><div className="h-4 w-32 bg-slate-100 rounded-lg"></div></td>
                                            <td className="px-8 py-6"><div className="h-4 w-8 bg-slate-100 rounded-lg ml-auto"></div></td>
                                            <td className="px-8 py-6"><div className="h-2 w-full bg-slate-100 rounded-full"></div></td>
                                            <td className="px-8 py-6"><div className="h-8 w-24 bg-slate-100 rounded-lg mx-auto"></div></td>
                                        </tr>
                                    ))
                                ) : data?.data && data.data.length > 0 ? (
                                    data.data.map((item) => {
                                        const maxOrder = Math.max(...(data.data.map(d => d.order) || [1]));
                                        const percentage = (item.order / maxOrder) * 100;

                                        return (
                                            <tr key={item.teknisi} className={`hover:bg-slate-50/50 transition-all group ${item.isOff ? 'bg-rose-50/30' : ''}`}>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2 h-2 rounded-full ${item.isOff ? 'bg-rose-500' : 'bg-emerald-500'} animate-pulse`} />
                                                        <div>
                                                            <span className={`font-bold transition-colors block ${item.isOff ? 'text-rose-600' : 'text-slate-700 group-hover:text-violet-600'}`}>
                                                                {item.teknisi}
                                                            </span>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {item.jabatan === 'teknisi' && (
                                                                    <span className="text-[7px] font-black bg-blue-50 text-blue-500 px-2 py-0.5 rounded-md border border-blue-100 uppercase">TEKNISI</span>
                                                                )}
                                                                {item.jabatan === 'servicedesk' && (
                                                                    <span className="text-[7px] font-black bg-emerald-50 text-emerald-500 px-2 py-0.5 rounded-md border border-emerald-100 uppercase">SD</span>
                                                                )}
                                                                {item.isOff && (
                                                                    <span className="text-[7px] bg-rose-600 text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">OFF ORDER</span>
                                                                )}
                                                                {item.isNightShift && (
                                                                    <span className="text-[7px] font-black bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-md border border-indigo-100 uppercase">SHIFT MALAM KEMARIN</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <span className="text-xl font-black text-slate-900 font-mono tracking-tighter">{item.order}</span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                                                        <div
                                                            className={`${item.isOff ? 'bg-rose-400' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'} h-full rounded-full transition-all duration-1000 ease-out shadow-sm`}
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <div className={`text-[9px] font-black px-4 py-2 rounded-xl border-2 tracking-[0.1em] inline-block ${item.isOff
                                                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                                                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                                        {item.isOff ? 'INACTIVE' : 'ACTIVE'}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-32 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl">
                                                    📅
                                                </div>
                                                <p className="font-bold text-lg">No data for {new Date(selectedDate).toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
                                                <p className="text-sm">Try selecting another date or check EServiceDesk directly.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
