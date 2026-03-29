'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useEffect, useState, use } from 'react';

import {
    User, Phone, MapPin, Clock, Calendar,
    ChevronLeft, Activity,
    ClipboardList, CheckCircle2, AlertTriangle,
    History, Info, ShieldCheck, Camera, ExternalLink, Loader2,
    Copy
} from 'lucide-react';
import Link from 'next/link';
import { StatusTimer } from '@/components/StatusTimer';
import { Lightbox } from '@/components/ui/Lightbox';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
    'OPEN': 'bg-blue-500',
    'FOLLOW UP': 'bg-purple-500',
    'RUNNING': 'bg-sky-500',
    'CHECKED': 'bg-sky-500',
    'DONE': 'bg-emerald-500',
    'VERIFIED': 'bg-teal-500',
    'PENDING': 'bg-amber-500',
};

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

function resolvePhotoUrl(photo: any): string {
    return photo?.thumbnail || photo?.full || photo?.image_url || photo?.url || '';
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
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

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

    const copyToClipboard = () => {
        if (!order) return;
        
        const technicians = (order.teknisi || '').split('|').map(t => t.trim()).filter(Boolean).join(', ');
        const isMaintenance = (order.service_name || '').toUpperCase().includes('MAINTENANCE') ? 'Ya' : 'Tidak';
        
        const text = `No.Order  : ${order.order_no}
Tgl.Order : ${order.create_date}
Service   : ${order.service_name || '-'}
Lokasi    : ${order.order_by ? order.order_by + ' - ' : ''}${order.location_desc || '-'}
Ext Telp  : ${order.ext_phone || '-'}
Catatan   : ${order.catatan || order.description || '-'}
Petugas   : ${technicians || '-'}
Status    : ${(order.status_desc || order.status || '-').toUpperCase()}
Photos    : ${order.photos?.length || 0}
Maintenance: ${isMaintenance}`;

        navigator.clipboard.writeText(text);
        toast.success('Informasi order berhasil disalin!');
    };

    useEffect(() => {
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
    const photoUrls = (order.photos || []).map(resolvePhotoUrl).filter(Boolean);

    return (
        <>
        <div className="min-h-screen bg-[#F1F5F9] relative flex flex-col font-sans">
            <div className="relative z-10 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-5 animate-fade-in pb-20">
                {/* Header Section */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/orders"
                            className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all text-slate-600"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Order #{order.order_no}</h1>
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${statusColors[order.status?.toUpperCase()] || 'bg-slate-600'} text-white shadow-sm`}>
                                    {order.status_desc || order.status?.replace('_', ' ')}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2 mt-0.5">
                                <Activity className="w-3.5 h-3.5 text-indigo-500" />
                                Sistem Pantauan Order
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-3">
                        <button 
                            onClick={copyToClipboard}
                            className="bg-slate-50 text-slate-500 border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 hover:text-slate-700 transition-all flex items-center gap-2 active:scale-95"
                        >
                            <Copy className="w-3.5 h-3.5" />
                            Salin Order
                        </button>
                        <div className="flex flex-col md:items-end">
                            <StatusTimer createDate={order.create_date} status={order.status} />
                        </div>
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    
                    {/* Left Panel: Primary Info (8 cols) */}
                    <div className="lg:col-span-8 space-y-5">
                        
                        {/* Summary Header Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                            <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 flex items-center gap-2">
                                <Info className="w-4 h-4 text-indigo-500" />
                                <h2 className="text-xs font-black uppercase tracking-widest text-slate-700">Informasi Utama</h2>
                            </div>
                            
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teknisi</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                                <User className="w-4 h-4 text-indigo-500" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-800 uppercase">{order.teknisi || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Layanan</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                                <Activity className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-800 uppercase">{order.service_name || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama / Lokasi</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-fuchsia-50 flex items-center justify-center">
                                                <MapPin className="w-4 h-4 text-fuchsia-500" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-800 uppercase">
                                                {order.order_by ? `${order.order_by} / ` : ''}{order.location_desc || '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ekstensi</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                                <Phone className="w-4 h-4 text-amber-500" />
                                            </div>
                                            <p className="text-sm font-black text-slate-800 tracking-wider">{(order.ext_phone || '-').toUpperCase()}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <ClipboardList className="w-3 h-3" />
                                        Catatan SIMRS
                                    </p>
                                    <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                                        "{order.catatan || order.description || 'Tidak ada catatan tambahan.'}"
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Progress Timeline Section */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-8">
                                <Activity className="w-4 h-4 text-indigo-500" />
                                <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Progres Update</h3>
                            </div>
                            
                            <div className="relative flex items-center justify-between px-2 pb-6 overflow-x-auto no-scrollbar min-w-[500px]">
                                <div className="absolute left-10 right-10 top-4 h-[2px] bg-slate-100 rounded-full"></div>

                                {[
                                    { id: 'OPEN', label: 'Open', icon: ClipboardList, internalStatuses: ['OPEN'] },
                                    { id: 'FOLLOW_UP', label: 'Follow Up', icon: User, internalStatuses: ['FOLLOW_UP'] },
                                    { id: 'RUNNING', label: 'Running', icon: Activity, internalStatuses: ['RUNNING', 'CHECKED', 'PENDING'] },
                                    { id: 'DONE', label: 'Done', icon: CheckCircle2, internalStatuses: ['DONE'] },
                                    { id: 'VERIFIED', label: 'Verified', icon: ShieldCheck, internalStatuses: ['VERIFIED'] },
                                ].map((step, idx) => {
                                    const activeHierarchy = ['OPEN', 'FOLLOW_UP', 'RUNNING', 'CHECKED', 'PENDING', 'DONE', 'VERIFIED'];
                                    const currentIndex = activeHierarchy.indexOf(st);
                                    const isActive = step.internalStatuses.includes(st);
                                    const maxStepRank = Math.max(...step.internalStatuses.map(s => activeHierarchy.indexOf(s)));
                                    const isCompleted = currentIndex > maxStepRank;
                                    const isHighlight = isActive || isCompleted;

                                    return (
                                        <div key={idx} className="relative flex flex-col items-center gap-3 z-10">
                                            <div className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-sm transition-all duration-300 ${isActive ? 'bg-indigo-600 scale-125 shadow-indigo-200' : isCompleted ? 'bg-emerald-500 shadow-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                                                <step.icon className={`w-3.5 h-3.5 ${isHighlight ? 'text-white' : 'text-slate-400'}`} />
                                            </div>
                                            <p className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-indigo-600' : isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {step.label}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Detailed History Log */}
                            <div className="mt-6 pt-6 border-t border-slate-50">
                                <div className="space-y-5">
                                    {order.history && order.history.length > 0 ? (
                                        order.history.map((h: any, i: number) => (
                                            <div key={i} className="flex gap-4 relative items-start">
                                                {i !== order.history.length - 1 && <div className="absolute left-[5px] top-4 bottom-[-20px] w-[1px] bg-slate-100"></div>}
                                                <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 z-10 border-2 border-white shadow-sm ${i === 0 ? 'bg-indigo-500 ring-2 ring-indigo-50' : 'bg-slate-300'}`}></div>
                                                <div className="flex-1 space-y-1.5">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shadow-sm ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                            {h.status_desc || h.status}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-400">
                                                            Pembaruan oleh <span className="text-slate-700">{h.changed_by_name}</span> • {h.created_at}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 italic">"{h.note || 'Pembaruan otomatis.'}"</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center py-8 text-slate-300">
                                            <History className="w-8 h-8 mb-2 opacity-20" />
                                            <p className="text-xs font-bold uppercase tracking-widest">Belum ada riwayat update</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Side Data (4 cols) */}
                    <div className="lg:col-span-4 space-y-5">
                        
                        {/* Waktu Metrics Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400" />
                                Informasi Waktu
                            </h3>
                            <div className="space-y-3">
                                <div className="flex flex-col gap-1 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu Masuk</span>
                                    <span className="text-sm font-bold text-slate-800">{order.create_date}</span>
                                </div>
                                <div className="flex flex-col gap-1 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 text-emerald-900">
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Waktu Selesai</span>
                                    <span className={`text-sm font-black ${order.tgl_selesai ? 'text-emerald-700' : 'text-emerald-300 italic'}`}>
                                        {order.tgl_selesai || 'BELUM TERSEDIA'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Dokumentasi Layout Simplifed */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Camera className="w-4 h-4 text-slate-400" />
                                    Dokumentasi
                                </h3>
                                {order.photos && order.photos.length > 0 && (
                                    <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full border border-indigo-100">
                                        {order.photos.length} Foto
                                    </span>
                                )}
                            </div>
                            
                            {order.photos && order.photos.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {order.photos.map((photo, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                setLightboxIndex(idx);
                                                setIsLightboxOpen(true);
                                            }}
                                            className="group relative aspect-square bg-slate-50 rounded-xl overflow-hidden border border-slate-200 p-1 transition-all hover:scale-105 active:scale-95 text-left"
                                        >
                                            <img src={resolvePhotoUrl(photo)} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                                            <div className="absolute inset-1 rounded-lg bg-slate-950/0 group-hover:bg-slate-950/20 transition-colors flex items-end justify-between p-2">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-white/0 group-hover:text-white transition-colors">
                                                    Lihat
                                                </span>
                                                <ExternalLink className="w-3.5 h-3.5 text-white/0 group-hover:text-white transition-colors" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                                    <Camera className="w-8 h-8 opacity-20 mb-2" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Tidak ada dokumentasi</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        {isLightboxOpen && photoUrls.length > 0 && (
            <Lightbox
                images={photoUrls}
                initialIndex={lightboxIndex}
                onClose={() => setIsLightboxOpen(false)}
            />
        )}
        </>
    );
}
