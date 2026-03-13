'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, CheckCircle, AlertTriangle, Info, MapPin, Phone, User, Activity, Image as ImageIcon, X, History } from 'lucide-react';

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    return (
        <ProtectedRoute>
            <OrderDetailContent id={resolvedParams.id} />
        </ProtectedRoute>
    );
}

function OrderDetailContent({ id }: { id: string }) {
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'order' | 'history' | 'photos'>('order');
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [loadingPhotos, setLoadingPhotos] = useState(false);

    const fetchOrder = async () => {
        try {
            const res = await fetch(`/api/orders/${id}`);
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

    useEffect(() => { fetchOrder(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const statusColors: Record<string, string> = {
        open: 'bg-blue-500',
        follow_up: 'bg-amber-500',
        running: 'bg-indigo-500',
        done: 'bg-emerald-500',
        verified: 'bg-teal-500',
        pending: 'bg-rose-500',
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-400 text-sm font-medium">Mengambil data SIMRS...</p>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="text-center max-w-sm bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
                    <span className="text-5xl block mb-4">📭</span>
                    <h2 className="text-xl font-black text-slate-800">Order Tidak Ditemukan</h2>
                    <p className="text-slate-500 mt-2 font-medium">ID order ini mungkin tidak valid atau sudah dihapus di SIMRS.</p>
                    <Link href="/orders" className="mt-6 inline-flex items-center gap-2 text-white bg-blue-600 px-6 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all active:scale-95">
                        <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8 animate-fade-in space-y-6">
            <div className="max-w-4xl mx-auto">
                <Link href="/orders" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 font-bold text-sm group mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Kembali ke Daftar
                </Link>

                {/* Info Bar */}
                <div className="flex items-center gap-2 px-6 py-3 bg-white/40 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
                    <Activity className="w-3 h-3 animate-pulse" />
                    Live View SIMRS Order
                </div>

                {/* Order Header Card */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden transition-all hover:shadow-blue-500/5 mb-6">
                    <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-black p-8 md:p-10 text-white relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>

                        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-blue-400 font-black text-sm tracking-widest uppercase">{order.order_no}</span>
                                    <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${statusColors[order.status] || 'bg-slate-600'} text-white shadow-lg`}>
                                        {order.status_desc || order.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <h1 className="text-3xl font-black leading-tight drop-shadow-sm">{order.catatan?.split('\n')[0] || `Order ${order.order_no}`}</h1>
                                <div className="flex items-center gap-4 mt-4 text-slate-400 font-medium text-sm">
                                    <div className="flex items-center gap-1.5">
                                        <User className="w-4 h-4 opacity-70" />
                                        {order.order_by || order.requester_name}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4 opacity-70" />
                                        {order.location_desc || order.requester_unit}
                                    </div>
                                    {order.ext_phone && (
                                        <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                                            <Phone className="w-3 h-3 text-blue-400" />
                                            <span className="text-[11px] font-bold text-blue-100 uppercase">{order.ext_phone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabbed Navigation */}
                <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-sm mb-6">
                    {[
                        { id: 'order', label: 'Order', icon: Info },
                        { id: 'history', label: 'Riwayat', icon: History },
                        { id: 'photos', label: 'Photo', icon: ImageIcon },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            {tab.id === 'photos' && order.photos?.length > 0 && (
                                <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded text-[10px]">{order.photos.length}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Contents */}
                <div className="animate-fade-in-up">
                    {/* Order Tab */}
                    {activeTab === 'order' && (
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 md:p-10 space-y-10">
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                        <Info className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Catatan Lengkap SIMRS</h3>
                                </div>
                                <div className="bg-slate-50/80 rounded-3xl p-6 border border-slate-100">
                                    <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                                        {order.catatan || order.description || 'Tidak ada catatan'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
                                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-1.5 opacity-70">Teknisi</p>
                                    <p className="text-sm font-black text-slate-800">{order.teknisi || '-'}</p>
                                </div>
                                <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
                                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-1.5 opacity-70">Waktu Order</p>
                                    <p className="text-sm font-black text-slate-800">{order.create_date || '-'}</p>
                                </div>
                                <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
                                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-1.5 opacity-70">Selesai</p>
                                    <p className={`text-sm font-black mt-0.5 ${order.tgl_selesai ? 'text-emerald-600' : 'text-slate-400 italic font-medium'}`}>
                                        {order.tgl_selesai || 'Belum selesai'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* History Tab */}
                    {activeTab === 'history' && (
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden p-8 md:p-10">
                            {order.history && order.history.length > 0 ? (
                                <div className="space-y-4">
                                    {order.history.map((h: any, i: number) => (
                                        <div key={h.id} className="bg-slate-50/50 hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all rounded-3xl p-6 border border-transparent group">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                                                <p className="text-sm font-black text-slate-800">
                                                    {h.changed_by_name} <span className="mx-2 text-slate-300 font-medium">—</span> <span className="text-[10px] text-slate-400 font-bold tracking-tight">{h.created_at}</span>
                                                </p>
                                            </div>
                                            <p className="text-[13px] text-slate-700 font-medium leading-relaxed bg-white/80 p-4 rounded-2xl border border-slate-100 shadow-sm">
                                                <span className="font-black text-blue-600 uppercase mr-1">({h.status_desc || h.status.replace('_', ' ')})</span> : {h.note || '-'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center py-12 text-center">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-3xl mb-4">⌛</div>
                                    <p className="text-slate-400 font-medium italic">Tidak ada rincian riwayat status untuk order ini.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Photos Tab */}
                    {activeTab === 'photos' && (
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 md:p-10">
                            {!order.photos ? (
                                <div className="flex flex-col items-center py-20 text-center">
                                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center shadow-sm mb-6">
                                        <ImageIcon className="w-10 h-10 text-blue-600" />
                                    </div>
                                    <h3 className="text-slate-800 font-black text-lg uppercase tracking-widest">Dokumentasi Foto</h3>
                                    <p className="text-slate-400 text-sm mt-3 font-medium max-w-xs mb-8">Klik tombol di bawah untuk memuat dokumentasi foto dari SIMRS.</p>
                                    <button
                                        onClick={async () => {
                                            setLoadingPhotos(true);
                                            try {
                                                const res = await fetch(`/api/orders/${id}/photos`);
                                                const data = await res.json();
                                                setOrder({ ...order, photos: data.data || [] });
                                            } catch (err) {
                                                console.error(err);
                                            } finally {
                                                setLoadingPhotos(false);
                                            }
                                        }}
                                        disabled={loadingPhotos}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                    >
                                        {loadingPhotos ? 'Memuat...' : 'Muat Foto Dokumentasi'}
                                    </button>
                                </div>
                            ) : order.photos.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {order.photos.map((photo: any) => (
                                        <div
                                            key={photo.id}
                                            className="group relative aspect-square bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-100 cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 transition-all duration-300"
                                            onClick={() => setSelectedPhoto(photo.full || photo.thumbnail)}
                                        >
                                            <img
                                                src={photo.thumbnail || photo.full}
                                                alt="SIMRS Documentation"
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                                <p className="text-[10px] font-black text-white uppercase tracking-wider truncate">{photo.user_name}</p>
                                                <p className="text-[8px] text-slate-300 font-bold uppercase truncate">{photo.created_at}</p>
                                            </div>
                                            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md rounded-xl p-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300 shadow-lg">
                                                <ImageIcon className="w-4 h-4 text-blue-600" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center py-20 text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 text-4xl">📷</div>
                                    <h3 className="text-slate-800 font-black text-lg uppercase tracking-widest">Belum Ada Foto</h3>
                                    <p className="text-slate-400 text-sm mt-3 font-medium max-w-xs">Teknisi belum mengunggah foto dokumentasi untuk order ini di SIMRS.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Photo Lightbox Modal */}
            {selectedPhoto && (
                <div
                    className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setSelectedPhoto(null)}
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
