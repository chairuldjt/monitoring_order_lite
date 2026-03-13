'use client';

import { useEffect, useState } from 'react';
import { Clock, CheckCircle, AlertTriangle, Info, MapPin, Phone, User, Activity, Image as ImageIcon, X, History } from 'lucide-react';

interface OrderDetailModalProps {
    orderId: string | number | null;
    onClose: () => void;
}

export function OrderDetailModal({ orderId, onClose }: OrderDetailModalProps) {
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'order' | 'history' | 'photos'>('order');
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [loadingPhotos, setLoadingPhotos] = useState(false);

    useEffect(() => {
        if (!orderId) {
            setOrder(null);
            setError(null);
            setActiveTab('order');
            return;
        }

        const fetchOrder = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/orders/${orderId}`);
                if (res.ok) {
                    const data = await res.json();
                    setOrder(data.data);
                } else {
                    setError('Order tidak ditemukan');
                }
            } catch (err) {
                console.error(err);
                setError('Gagal memuat data');
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId]);

    const statusColors: Record<string, string> = {
        open: 'bg-blue-500',
        follow_up: 'bg-amber-500',
        running: 'bg-indigo-500',
        done: 'bg-emerald-500',
        verified: 'bg-teal-500',
        pending: 'bg-rose-500',
    };

    if (!orderId) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-fade-in" onClick={onClose}>
            <div
                className="bg-slate-50 w-full max-w-2xl max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative animate-scale-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header actions */}
                <div className="absolute top-4 right-4 z-50 flex gap-2">
                    <button onClick={onClose} className="p-3 bg-white hover:bg-slate-100 text-slate-500 hover:text-red-500 rounded-2xl shadow-sm transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                    {loading ? (
                        <div className="flex items-center justify-center py-32">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-slate-400 text-sm font-medium">Mengambil data SIMRS...</p>
                            </div>
                        </div>
                    ) : error || !order ? (
                        <div className="flex items-center justify-center py-32">
                            <div className="text-center max-w-sm bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                                <span className="text-5xl block mb-4">📭</span>
                                <h2 className="text-xl font-black text-slate-800">Order Tidak Ditemukan</h2>
                                <p className="text-slate-500 mt-2 font-medium">ID order ini mungkin tidak valid atau sudah dihapus di SIMRS.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 pt-8 md:pt-4">
                            {/* Info Bar */}
                            <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-white rounded-2xl border border-slate-100 shadow-sm mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
                                <Activity className="w-3 h-3 animate-pulse" />
                                Live View SIMRS Order
                            </div>

                            {/* Order Header Card */}
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden transition-all">
                                <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-black p-8 text-white relative">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-blue-400 font-black text-sm tracking-widest uppercase">{order.order_no}</span>
                                            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${statusColors[order.status] || 'bg-slate-600'} text-white shadow-lg`}>
                                                {order.status_desc || order.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <h1 className="text-xl font-black leading-tight drop-shadow-sm pr-12 line-clamp-2">
                                            {order.catatan || order.description || `Order ${order.order_no}`}
                                        </h1>
                                        <div className="flex flex-wrap items-center gap-4 mt-5 text-slate-400 font-medium text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5 opacity-70" />
                                                {order.order_by || order.requester_name}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5 opacity-70" />
                                                {order.location_desc || order.requester_unit}
                                            </div>
                                            {order.ext_phone && (
                                                <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-lg border border-white/5 text-blue-100">
                                                    <Phone className="w-3 h-3" />
                                                    <span className="font-bold uppercase tracking-wide">{order.ext_phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tabbed Navigation */}
                            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto custom-scrollbar">
                                {[
                                    { id: 'order', label: 'Rincian', icon: Info },
                                    { id: 'history', label: 'Riwayat', icon: History },
                                    { id: 'photos', label: 'Foto', icon: ImageIcon },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === tab.id
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                            }`}
                                    >
                                        <tab.icon className="w-4 h-4 shrink-0" />
                                        {tab.label}
                                        {tab.id === 'photos' && order.photos?.length > 0 && (
                                            <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded text-[10px]">{order.photos.length}</span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Contents */}
                            <div className="animate-fade-in-up pb-4">
                                {/* Order Tab */}
                                {activeTab === 'order' && (
                                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-5">
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-6 h-6 bg-blue-50 rounded-md flex items-center justify-center">
                                                    <Info className="w-3.5 h-3.5 text-blue-600" />
                                                </div>
                                                <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-widest">Catatan Lengkap SIMRS</h3>
                                            </div>
                                            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                                                <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap text-xs">
                                                    {order.catatan || order.description || 'Tidak ada catatan'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                            <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                                                <p className="text-[8px] text-slate-400 uppercase tracking-widest font-black mb-1 opacity-70">Teknisi</p>
                                                <p className="text-xs font-black text-slate-800">{order.teknisi || '-'}</p>
                                            </div>
                                            <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                                                <p className="text-[8px] text-slate-400 uppercase tracking-widest font-black mb-1 opacity-70">Waktu Order</p>
                                                <p className="text-xs font-black text-slate-800 truncate">{order.create_date || '-'}</p>
                                            </div>
                                            <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 hover:col-span-1 lg:hover:shadow-sm transition-all">
                                                <p className="text-[8px] text-slate-400 uppercase tracking-widest font-black mb-1 opacity-70">Selesai</p>
                                                <p className={`text-xs font-black mt-0.5 truncate ${order.tgl_selesai ? 'text-emerald-600' : 'text-slate-400 italic font-medium'}`}>
                                                    {order.tgl_selesai || 'Belum selesai'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* History Tab */}
                                {activeTab === 'history' && (
                                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                                        {order.history && order.history.length > 0 ? (
                                            <div className="space-y-3">
                                                {order.history.map((h: any) => (
                                                    <div key={h.id} className="bg-slate-50/50 hover:bg-slate-50 hover:shadow-sm transition-all rounded-2xl p-4 border border-slate-100">
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 mb-2">
                                                            <p className="text-xs font-black text-slate-800">
                                                                {h.changed_by_name} <span className="mx-2 text-slate-300 font-medium">—</span> <span className="text-[9px] text-slate-400 font-bold tracking-tight">{h.created_at}</span>
                                                            </p>
                                                        </div>
                                                        <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white/80 p-3 rounded-xl border border-slate-100 shadow-sm">
                                                            <span className="font-black text-blue-600 uppercase mr-1">({h.status_desc || h.status?.replace('_', ' ') || 'UNKNOWN'})</span> {h.note ? `: ${h.note}` : ''}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center py-8 text-center">
                                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-2xl mb-3">⌛</div>
                                                <p className="text-slate-400 text-xs font-medium italic">Tidak ada rincian riwayat status untuk order ini.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Photos Tab */}
                                {activeTab === 'photos' && (
                                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                                        {!order.photos ? (
                                            <div className="flex flex-col items-center py-8 text-center">
                                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center shadow-sm mb-4">
                                                    <ImageIcon className="w-8 h-8 text-blue-600" />
                                                </div>
                                                <h3 className="text-slate-800 font-black text-sm uppercase tracking-widest">Dokumentasi Foto</h3>
                                                <p className="text-slate-400 text-xs mt-2 font-medium max-w-xs mb-6">Data foto tidak dimuat otomatis. Muat manual sekarang.</p>
                                                <button
                                                    onClick={async () => {
                                                        setLoadingPhotos(true);
                                                        try {
                                                            const res = await fetch(`/api/orders/${orderId}/photos`);
                                                            const data = await res.json();
                                                            setOrder({ ...order, photos: data.data || [] });
                                                        } catch (err) {
                                                            console.error(err);
                                                        } finally {
                                                            setLoadingPhotos(false);
                                                        }
                                                    }}
                                                    disabled={loadingPhotos}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                                >
                                                    {loadingPhotos ? 'Memuat...' : 'Muat Foto'}
                                                </button>
                                            </div>
                                        ) : order.photos.length > 0 ? (
                                            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                                                {order.photos.map((photo: any) => (
                                                    <div
                                                        key={photo.id}
                                                        className="group relative aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                                                        onClick={() => setSelectedPhoto(photo.full || photo.thumbnail)}
                                                    >
                                                        <img
                                                            src={photo.thumbnail || photo.full}
                                                            alt="SIMRS Documentation"
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                                                            <p className="text-[8px] font-black text-white uppercase tracking-wider truncate">{photo.user_name}</p>
                                                            <p className="text-[7px] text-slate-300 font-bold uppercase truncate">{photo.created_at}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-2xl">📷</div>
                                                <h3 className="text-slate-800 font-black text-sm uppercase tracking-widest">Belum Ada Foto</h3>
                                                <p className="text-slate-400 text-[10px] mt-1.5 font-medium max-w-[200px]">Teknisi belum mengunggah dokumentasi untuk order ini.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Photo Lightbox inside Modal */}
            {selectedPhoto && (
                <div
                    className="fixed inset-0 z-[110] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in"
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPhoto(null);
                    }}
                >
                    <button
                        className="absolute top-8 right-8 text-white/50 hover:text-white transition-all bg-white/10 hover:bg-white/20 p-3 rounded-2xl"
                        onClick={() => setSelectedPhoto(null)}
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <img
                        src={selectedPhoto}
                        alt="SIMRS Full Documentation"
                        className="max-w-full max-h-[85vh] object-contain rounded-[2rem] shadow-2xl border-4 border-white/10 animate-scale-up"
                    />
                </div>
            )}
        </div>
    );
}
