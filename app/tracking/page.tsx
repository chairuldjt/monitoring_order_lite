'use client';

import { useState } from 'react';
import { Search, Package, Clock, CheckCircle, AlertTriangle, ArrowRight, Activity, Wifi, Image as ImageIcon, X } from 'lucide-react';

export default function TrackingPage() {
    const [orderNo, setOrderNo] = useState('');
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [loadingPhotos, setLoadingPhotos] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orderNo.trim()) return;

        setLoading(true);
        setError('');
        setOrder(null);
        setSearched(true);

        try {
            const res = await fetch(`/api/tracking/${encodeURIComponent(orderNo.trim())}`);
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Order tidak ditemukan di SIMRS');
                return;
            }

            setOrder(data.data);
        } catch (err) {
            setError('Koneksi ke sistem SIMRS gagal. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    const statusColors: Record<string, string> = {
        open: 'bg-blue-500', follow_up: 'bg-amber-500', running: 'bg-indigo-500',
        done: 'bg-emerald-500', verified: 'bg-teal-500', pending: 'bg-rose-500',
    };

    const getStatusStep = (status: string) => {
        const steps = ['open', 'follow_up', 'running', 'done', 'verified'];
        return steps.indexOf(status);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0a192f] to-[#0f172a] relative overflow-hidden flex flex-col items-center justify-center p-4">
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="relative z-10 w-full max-w-xl">
                {/* Header Section */}
                <div className="text-center mb-10 animate-fade-in">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-[2rem] shadow-[0_0_50px_rgba(37,99,235,0.3)] border border-white/20 mb-8 transform hover:scale-110 transition-transform cursor-pointer group">
                        <Package className="w-12 h-12 text-white group-hover:rotate-12 transition-transform" />
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tighter mb-4">
                        Order<span className="bg-gradient-to-r from-blue-400 to-teal-300 bg-clip-text text-transparent">Track</span>
                    </h1>
                    <div className="flex items-center justify-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Live SIMRS Monitoring</p>
                    </div>
                </div>

                {/* Search Interaction */}
                <form onSubmit={handleSearch} className="mb-10 group animate-fade-in-up">
                    <div className="relative flex items-center bg-white/[0.03] backdrop-blur-2xl rounded-[2rem] border border-white/10 p-2 shadow-2xl transition-all group-focus-within:border-blue-500/50 group-focus-within:bg-white/[0.05]">
                        <div className="absolute left-6 text-slate-500 group-focus-within:text-blue-400">
                            <Search className="w-6 h-6" />
                        </div>
                        <input
                            type="text"
                            value={orderNo}
                            onChange={(e) => setOrderNo(e.target.value)}
                            placeholder="Masukkan No. Order (e.g. 20.54198)"
                            className="w-full bg-transparent pl-16 pr-6 py-5 text-white font-black text-lg placeholder-slate-600 outline-none"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:shadow-[0_10px_30px_rgba(37,99,235,0.4)] hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Lacak'}
                        </button>
                    </div>
                </form>

                {/* Error Box */}
                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-8 py-5 rounded-3xl mb-8 flex items-center gap-4 animate-shake">
                        <AlertTriangle className="w-6 h-6 shrink-0" />
                        <span className="font-bold text-sm tracking-tight">{error}</span>
                    </div>
                )}

                {/* Result Logic */}
                {order ? (
                    <div className="space-y-6 animate-fade-in-up">
                        {/* Summary Card */}
                        <div className="bg-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-3xl overflow-hidden group">
                            <div className="p-8 md:p-10">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] bg-blue-400/10 px-3 py-1 rounded-full w-fit">
                                            <Wifi className="w-3 h-3" /> {order.order_no}
                                        </div>
                                        <h2 className="text-xl font-black text-white leading-tight mt-2">{order.title}</h2>
                                    </div>
                                    <div className="shrink-0 flex items-center justify-center p-1 bg-white/[0.05] rounded-full border border-white/10 px-6 py-2">
                                        <span className={`w-2.5 h-2.5 rounded-full mr-3 shadow-lg ${statusColors[order.status] || 'bg-slate-500 animate-pulse'}`}></span>
                                        <span className="text-xs font-black text-white uppercase tracking-widest">{order.status_desc}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1.5 grayscale opacity-60">Pemohon</p>
                                        <p className="text-sm font-black text-slate-200">{order.requester_name}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1.5 grayscale opacity-60">Lokasi</p>
                                        <p className="text-sm font-black text-slate-200 truncate">{order.requester_unit || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Dynamic Progress Timeline */}
                            {order.status !== 'pending' && (
                                <div className="px-8 md:px-10 py-8 bg-white/[0.02] border-t border-white/5">
                                    <div className="relative flex justify-between items-center px-2">
                                        <div className="absolute left-8 right-8 top-4 h-0.5 bg-white/10"></div>
                                        {['open', 'follow_up', 'running', 'done', 'verified'].map((step, i) => {
                                            const current = getStatusStep(order.status);
                                            const isActive = i <= current;
                                            const isNow = i === current;
                                            return (
                                                <div key={step} className="relative z-10 flex flex-col items-center group/step">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isActive
                                                        ? `${statusColors[step]} border-white/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]`
                                                        : 'bg-[#0a0a0a] border-white/10 grayscale opacity-40'
                                                        } ${isNow ? 'scale-125 ring-4 ring-white/5' : ''}`}>
                                                        {isActive ? <CheckCircle className="w-5 h-5 text-white" /> : <span className="text-[10px] font-black text-slate-500">{i + 1}</span>}
                                                    </div>
                                                    <span className={`absolute top-12 text-[8px] font-black uppercase tracking-tighter whitespace-nowrap transition-colors ${isActive ? 'text-white' : 'text-slate-700'}`}>
                                                        {step.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Recent Activity Timeline */}
                        {order.history && order.history.length > 0 && (
                            <div className="bg-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] border border-white/10 overflow-hidden animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                                <div className="px-8 py-6 border-b border-white/5 flex items-center gap-3">
                                    <Clock className="w-5 h-5 text-blue-400" />
                                    <h3 className="font-black text-xs uppercase tracking-widest text-white">Riwayat Terkini</h3>
                                </div>
                                <div className="p-4 space-y-3 relative">
                                    {order.history.map((h: any, i: number) => (
                                        <div key={h.id} className="bg-white/5 rounded-xl p-4 border border-white/5 group hover:bg-white/[0.07] transition-all">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-black text-slate-200">
                                                    {h.changed_by_name} <span className="mx-2 text-slate-600 font-medium">—</span> <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{h.created_at}</span>
                                                </p>
                                            </div>
                                            <p className="text-[11px] text-slate-300 font-medium leading-relaxed bg-slate-900/40 p-2.5 rounded-lg border border-white/5 shadow-inner">
                                                <span className="font-black text-blue-400 uppercase mr-1">({h.status_desc || h.status.replace('_', ' ')})</span> {h.note ? `: ${h.note}` : ''}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Photo Gallery Section */}
                        <div className="bg-white/[0.03] backdrop-blur-3xl rounded-3xl border border-white/10 overflow-hidden animate-fade-in-up" style={{ animationDelay: '600ms' }}>
                            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                                    <h3 className="font-black text-xs uppercase tracking-widest text-white">Dokumentasi Foto</h3>
                                </div>
                                {!order.photos && (
                                    <button
                                        onClick={async () => {
                                            setLoadingPhotos(true);
                                            try {
                                                const res = await fetch(`/api/orders/${order.order_id}/photos`);
                                                const data = await res.json();
                                                setOrder({ ...order, photos: data.data || [] });
                                            } catch (err) {
                                                console.error(err);
                                            } finally {
                                                setLoadingPhotos(false);
                                            }
                                        }}
                                        disabled={loadingPhotos}
                                        className="text-[9px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                                    >
                                        {loadingPhotos ? 'Memuat...' : 'Muat Foto'}
                                    </button>
                                )}
                            </div>

                            {order.photos && (
                                <div className="p-4">
                                    {order.photos.length > 0 ? (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                                            {order.photos.map((photo: any) => (
                                                <div
                                                    key={photo.id}
                                                    className="group relative aspect-square bg-white/5 rounded-xl overflow-hidden border border-white/10 cursor-pointer hover:border-blue-500/50 transition-all"
                                                    onClick={() => setSelectedPhoto(photo.full || photo.thumbnail)}
                                                >
                                                    <img
                                                        src={photo.thumbnail || photo.full}
                                                        alt="SIMRS Documentation"
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                                        <p className="text-[7px] font-black text-white uppercase tracking-wider truncate">{photo.user_name}</p>
                                                        <p className="text-[6px] text-slate-400 font-bold uppercase truncate">{photo.created_at}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 opacity-50">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Belum ada foto dokumentasi</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : searched && !loading && !error && (
                    <div className="text-center py-20 animate-fade-in bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🕵️‍♂️</div>
                        <h3 className="text-white font-black text-lg">Order Tidak Ditemukan</h3>
                        <p className="text-slate-500 text-sm mt-2 font-medium">Coba cek kembali nomor order Anda atau hubungi Helpdesk.</p>
                    </div>
                )}

                {/* Footer Section */}
                <div className="text-center mt-16 pb-10 opacity-40 hover:opacity-100 transition-opacity">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] mb-4">Developed for RSUP Dr. Kariadi</p>
                    <div className="flex items-center justify-center gap-6">
                        <div className="h-px w-8 bg-slate-800"></div>
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">© 2026 OrderTrack Live</span>
                        <div className="h-px w-8 bg-slate-800"></div>
                    </div>
                </div>
            </div>

            {/* Photo Lightbox Modal */}
            {selectedPhoto && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPhoto(null);
                    }}
                >
                    <button
                        className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
                        onClick={() => setSelectedPhoto(null)}
                    >
                        <X className="w-10 h-10" />
                    </button>
                    <img
                        src={selectedPhoto}
                        alt="SIMRS Full Detail"
                        className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl animate-scale-up"
                    />
                </div>
            )}
        </div>
    );
}
