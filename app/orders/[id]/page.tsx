'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useEffect, useState, use } from 'react';
import {
    User, Phone, MapPin, Clock, Calendar,
    ChevronLeft, Activity,
    ClipboardList, CheckCircle2, AlertTriangle,
    History, Info, ShieldCheck, Camera, ExternalLink, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { StatusTimer } from '@/components/StatusTimer';

interface OrderDetail {
    order_id: number;
    order_no: string;
    order_by: string;
    location_desc: string;
    ext_phone: string;
    catatan: string;
    description: string;
    status: string;
    status_desc: string;
    teknisi: string;
    create_date: string;
    service_name?: string;
    tgl_selesai?: string;
    history: any[];
    photos?: any[];
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    return (
        <ProtectedRoute>
            <OrderDetailContent id={id} />
        </ProtectedRoute>
    );
}

function OrderDetailContent({ id }: { id: string }) {
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrder = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/orders/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setOrder(data.data);
                } else {
                    setError('Order tidak ditemukan');
                }
            } catch (err) {
                setError('Gagal memuat data dari server');
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                    <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Sinkronisasi Data SIMRS...</p>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen p-8 flex flex-col items-center justify-center text-center bg-[#F8FAFC]">
                <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl border border-red-100">
                    <AlertTriangle className="w-12 h-12" />
                </div>
                <h1 className="text-2xl font-black text-slate-800 mb-2">Terjadi Kesalahan</h1>
                <p className="text-slate-500 mb-8 max-w-sm font-medium">{error || 'Data order tidak ditemukan'}</p>
                <Link
                    href="/orders"
                    className="bg-slate-800 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-lg"
                >
                    <ChevronLeft className="w-5 h-5" />
                    Kembali ke Daftar
                </Link>
            </div>
        );
    }

    // Normalized Status for Logic
    const st = (order.status || '').toUpperCase().trim().replace(/[\s\.\-]+/g, '_');

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/orders"
                        className="w-10 h-10 flex items-center justify-center bg-white rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-all opacity-80 hover:opacity-100"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight">Detail Order #{order.order_no}</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Manajemen Monitoring Order SIMRS</p>
                    </div>
                </div>
                {/* Status Timer Header */}
                <div className="mt-2 md:mt-0">
                    <StatusTimer createDate={order.create_date} status={order.status} />
                </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* Column Left (Customer Info) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                        <div className="p-6 md:p-8 space-y-8">
                            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <User className="w-4 h-4 text-violet-500" />
                                Informasi Order
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">

                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No. Extension</p>
                                    <p className="text-sm font-black text-slate-700">{order.ext_phone || '-'}</p>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teknisi</p>
                                    <p className="text-sm font-black text-blue-600 uppercase tracking-wide">{order.teknisi || 'Belum Ditentukan'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Layanan (Service)</p>
                                    <p className="text-sm font-black text-indigo-600 uppercase tracking-wide">{order.service_name || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama / Lokasi</p>
                                    <p className="text-sm font-black text-slate-700 uppercase tracking-wide">
                                        {order.order_by ? `${order.order_by} / ` : ''}{order.location_desc || '-'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal Order</p>
                                    <p className="text-sm font-black text-slate-700 uppercase tracking-wide">{order.create_date}</p>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-slate-50">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Catatan Pelapor / SIMRS</p>
                                    <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                                        <p className="text-xs text-slate-600 font-medium leading-relaxed italic">
                                            "{order.catatan || 'Tidak ada catatan tambahan yang tersedia.'}"
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column Right (Waktu) */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 transition-all hover:shadow-md">
                        <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            Waktu Order
                        </h3>
                        <div className="space-y-5">
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order Masuk</span>
                                <span className="text-[11px] font-black text-slate-700">{order.create_date}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selesai</span>
                                <span className="text-[11px] font-black text-slate-700">
                                    {(order.history?.find((h: any) => h.status === 'done' || h.status_desc?.toUpperCase() === 'DONE')?.created_at) || '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline Status */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 transition-all hover:shadow-md">
                        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-12">Progres Order</h3>
                        <div className="relative flex items-center justify-between px-10 pb-4 overflow-x-auto no-scrollbar min-w-[600px]">
                            <div className="absolute left-20 right-20 top-5 h-1 bg-slate-50"></div>

                            {[
                                { id: 'OPEN', label: 'Open', icon: ClipboardList, internalStatuses: ['OPEN'] },
                                { id: 'FOLLOW_UP', label: 'Follow Up', icon: MapPin, internalStatuses: ['FOLLOW_UP'] },
                                { id: 'RUNNING', label: 'Running', icon: Activity, internalStatuses: ['RUNNING', 'CHECKED', 'PENDING'] },
                                { id: 'DONE', label: 'Done', icon: CheckCircle2, internalStatuses: ['DONE'] },
                                { id: 'VERIFIED', label: 'Verified', icon: ShieldCheck, internalStatuses: ['VERIFIED'] },
                            ].map((step, idx) => {
                                const activeHierarchy = ['OPEN', 'FOLLOW_UP', 'RUNNING', 'CHECKED', 'PENDING', 'DONE', 'VERIFIED'];
                                const currentIndex = activeHierarchy.indexOf(st);

                                const isActive = step.internalStatuses.includes(st);

                                // Logic for completion: if current status is after the highest possible internal status for this step
                                const maxStepRank = Math.max(...step.internalStatuses.map(s => activeHierarchy.indexOf(s)));
                                const isCompleted = currentIndex > maxStepRank;

                                const isHighlight = isActive || isCompleted;

                                return (
                                    <div key={idx} className="relative flex flex-col items-center gap-4 z-10 bg-white px-2">
                                        <div className={`w-11 h-11 rounded-full border-4 border-white flex items-center justify-center shadow-md transition-all duration-500 ${isActive ? 'bg-blue-600 scale-125 ring-4 ring-blue-50' : isCompleted ? 'bg-emerald-500' : 'bg-slate-50'}`}>
                                            <step.icon className={`w-4 h-4 ${isHighlight ? 'text-white' : 'text-slate-300'}`} />
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <p className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-blue-600' : isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {step.label}
                                            </p>
                                            {isActive && st === 'PENDING' && (
                                                <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">On Hold</span>
                                            )}
                                            {isActive && st === 'CHECKED' && (
                                                <span className="text-[8px] font-black bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Dikerjakan</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* History */}
                        <div className="mt-14 pt-10 border-t border-slate-50">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2"><History className="w-4 h-4" />Riwayat Pembaruan Terakhir</h4>
                            <div className="space-y-8 ml-4">
                                {order.history && order.history.length > 0 ? (
                                    order.history.map((h: any, i: number) => (
                                        <div key={i} className="flex gap-6 relative">
                                            {i !== order.history.length - 1 && <div className="absolute left-1.5 top-4 bottom-[-32px] w-0.5 bg-slate-50"></div>}
                                            <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 z-10 border-2 border-white shadow-sm ${i === 0 ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <p className={`text-xs font-black uppercase tracking-wide ${i === 0 ? 'text-blue-700' : 'text-slate-700'}`}>{h.status_desc || h.status}</p>
                                                    <span className="text-[10px] font-bold text-slate-400 lowercase italic">oleh {h.changed_by_name} • {h.created_at}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed max-w-2xl bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">"{h.note || 'Status diperbarui oleh sistem.'}"</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center py-6 text-slate-300"><Info className="w-8 h-8 mb-2 opacity-20" /><p className="text-[10px] font-black uppercase tracking-widest italic">Belum ada riwayat aktivitas</p></div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Documentation Section */}
                <div className="lg:col-span-3 pb-10">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                        <div className="p-6 md:p-8 space-y-6">
                            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Camera className="w-4 h-4 text-emerald-500" />Lampiran Foto Dokumentasi</h2>
                            {order.photos && order.photos.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                                    {order.photos.map((photo, idx) => (
                                        <div key={idx} className="group relative aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm transition-all hover:scale-105 hover:shadow-lg">
                                            <img src={photo.image_url || photo.url} alt={`Lampiran ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                                                <a href={photo.image_url || photo.url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/90 backdrop-blur rounded-full shadow-lg"><ExternalLink className="w-4 h-4 text-slate-900" /></a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 bg-slate-50/30 rounded-3xl border-2 border-dashed border-slate-100"><Camera className="w-10 h-10 text-slate-200 mb-2" /><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">Tidak ada foto dokumentasi<br />untuk order ini.</p></div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
