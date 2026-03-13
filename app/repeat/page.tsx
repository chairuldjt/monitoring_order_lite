'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Repeat, MapPin, Search, ArrowDown, ArrowUp, X, Brain, AlertTriangle, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function RepeatOrdersPage() {
    return (
        <ProtectedRoute>
            <RepeatOrdersContent />
        </ProtectedRoute>
    );
}

function RepeatOrdersContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const idParam = searchParams.get('id');

    const [loading, setLoading] = useState(true);

    // AI State
    const [aiData, setAiData] = useState<any[]>([]);
    const [aiStatus, setAiStatus] = useState<'idle' | 'running' | 'success' | 'error' | 'not_set'>('idle');
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiMeta, setAiMeta] = useState<any>(null);
    const [aiHistory, setAiHistory] = useState<any[]>([]);
    const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(idParam ? parseInt(idParam) : null);

    // AI Parameters State
    const [showAiModal, setShowAiModal] = useState(false);
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]); // Default 30 days ago
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [estimating, setEstimating] = useState(false);
    const [estimation, setEstimation] = useState<{ orderCount: number, estimatedTokens: number } | null>(null);
    const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash-lite');
    const [requestStatus, setRequestStatus] = useState<{ status: string, message?: string, id?: number } | null>(null);

    const fetchAiAnalysis = useCallback(async (triggerManual = false, params: any = {}) => {
        if (!triggerManual) {
            try {
                const url = params.id ? `/api/ai/analyze?id=${params.id}` : '/api/ai/analyze';
                const res = await fetch(url);
                if (res.ok) {
                    const json = await res.json();
                    setAiHistory(json.history || []);

                    if (json.activeTask) {
                        setAiStatus('running');
                        setAiError(null);
                        return true;
                    }

                    if (params.id) {
                        setAiData(json.data || []);
                        setAiMeta(json);
                        setSelectedHistoryId(json.id);
                        setAiStatus('success');
                    } else {
                        setAiStatus('idle');
                        setAiData([]);
                        setSelectedHistoryId(null);
                    }
                }
            } catch (err) { /* ignore silent local error */ }
            return false;
        }

        setAiStatus('running');
        setAiError(null);
        setShowAiModal(false);
        try {
            const res = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'execute',
                    startDate: params.startDate,
                    endDate: params.endDate,
                    model: selectedModel
                })
            });
            const json = await res.json();
            if (res.ok) {
                setRequestStatus({ status: 'success', message: json.message });
            } else if (res.status === 400) {
                setAiStatus('not_set');
            } else {
                setAiStatus('error');
                setAiError(json.error || 'Terjadi kesalahan pada server AI.');
            }
        } catch (err: any) {
            setAiStatus('error');
            setAiError('Gagal menghubungi server. Pastikan internet lancar.');
        }
        return true;
    }, [selectedModel]);

    const handleEstimate = async () => {
        setEstimating(true);
        setEstimation(null);
        try {
            const res = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'estimate', startDate, endDate, model: selectedModel })
            });
            if (res.ok) {
                const json = await res.json();
                setEstimation(json);
            }
        } catch (err) {
            console.error('Estimation failed');
        } finally {
            setEstimating(false);
        }
    };

    const handleRequestAssistant = async () => {
        setEstimating(true);
        setRequestStatus(null);
        try {
            const res = await fetch('/api/ai/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate, endDate })
            });
            const json = await res.json();
            if (res.ok) {
                setRequestStatus({ status: 'success', message: json.message });
            } else {
                setRequestStatus({ status: 'error', message: json.error });
            }
        } catch (err) {
            setRequestStatus({ status: 'error', message: 'Gagal mengirim permintaan.' });
        } finally {
            setEstimating(false);
        }
    };

    useEffect(() => {
        const parsedId = idParam ? parseInt(idParam) : null;
        const id = (parsedId !== null && !isNaN(parsedId)) ? parsedId : null;
        setSelectedHistoryId(id);

        let isSubscribed = true;
        let interval: NodeJS.Timeout;

        const checkStatus = async () => {
            const isRunning = await fetchAiAnalysis(false, { id });
            if (isRunning && isSubscribed) {
                interval = setTimeout(checkStatus, 5000);
            }
        };

        setLoading(true);
        checkStatus().finally(() => {
            if (isSubscribed) setLoading(false);
        });

        return () => {
            isSubscribed = false;
            if (interval) clearTimeout(interval);
        };
    }, [fetchAiAnalysis, idParam]);

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-6 animate-fade-in relative">
            {/* Modal Analisa AI */}
            {showAiModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 animate-scale-in flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white relative flex-shrink-0">
                            <button onClick={() => setShowAiModal(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                    <Brain className="w-6 h-6 text-white" />
                                </div>
                                <h2 className="text-2xl font-black">Konfigurasi Analisa AI</h2>
                            </div>
                            <p className="text-indigo-100 text-sm font-medium">Tentukan rentang data SIMRS yang akan dianalisa secara cerdas.</p>
                        </div>

                        {/* Modal Content - Scrollable */}
                        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Tanggal Mulai</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => { setStartDate(e.target.value); setEstimation(null); }}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Tanggal Akhir</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => { setEndDate(e.target.value); setEstimation(null); }}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Pilih Model AI</label>
                                <select
                                    value={selectedModel}
                                    onChange={(e) => { setSelectedModel(e.target.value); setEstimation(null); }}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite (Terhemat - Rekomendasi Quota)</option>
                                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Cepat)</option>
                                    <option value="gemini-flash-lite-latest">Gemini 1.5 Flash-Lite Latest</option>
                                    <option value="gemini-flash-latest">Gemini 1.5 Flash Latest</option>
                                    <option value="gemini-pro-latest">Gemini 1.5 Pro (Paling Cerdas)</option>
                                </select>
                                <p className="text-[10px] text-slate-400 font-medium pl-1 italic">*Jika model Flash gagal, coba ganti ke Latest atau Pro.</p>
                            </div>

                            <button
                                onClick={handleEstimate}
                                disabled={estimating}
                                className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                            >
                                {estimating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                                Cek Estimasi Data
                            </button>

                            {estimation && (
                                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between animate-fade-in-up">
                                    <div className="flex gap-4">
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">Orders</p>
                                            <p className="text-xl font-black text-indigo-700">{estimation.orderCount}</p>
                                        </div>
                                        <div className="w-px h-8 bg-indigo-200 mt-2"></div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">Est. Tokens</p>
                                            <p className="text-xl font-black text-indigo-700">{estimation.estimatedTokens}</p>
                                        </div>
                                    </div>
                                    <AlertTriangle className="w-5 h-5 text-indigo-400 opacity-30" />
                                </div>
                            )}

                            <div className="space-y-4">
                                <button
                                    onClick={() => fetchAiAnalysis(true, { startDate, endDate })}
                                    disabled={!estimation || aiStatus === 'running'}
                                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                                >
                                    Jalankan Analisa API (Pakai Kuota)
                                </button>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                        <div className="w-full border-t border-slate-200"></div>
                                    </div>
                                    <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                                        <span className="bg-white px-4 text-slate-400">Atau Solusi Tanpa Kuota</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleRequestAssistant}
                                    disabled={!estimation || aiStatus === 'running' || estimating}
                                    className="w-full py-4 bg-emerald-50 text-emerald-700 border-2 border-emerald-100 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-emerald-100 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    <Brain className="w-5 h-5 text-emerald-500" />
                                    Request Analisa ke Assistant
                                </button>
                            </div>

                            {requestStatus && (
                                <div className="space-y-3 animate-fade-in-up">
                                    <div className={`p-4 rounded-2xl text-xs font-bold ${requestStatus.status === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-50 text-rose-600 border border-rose-100'
                                        }`}>
                                        {requestStatus.message}
                                    </div>

                                    {requestStatus.status === 'success' && (
                                        <button
                                            onClick={() => {
                                                const reqIdStr = requestStatus.id ? requestStatus.id : '(Lihat ID Request terakhir di Database/Logs)';
                                                const prompt = `Tolong proses request analisa ID: ${reqIdStr}.\nSaya sudah menjalankan fetch data terbaru (raw_data).\nGunakan data mentah tersebut untuk melakukan analisa semantik manual.`;
                                                navigator.clipboard.writeText(prompt);
                                                alert('Prompt berhasil disalin! Silakan paste ke chat Assistant.');
                                            }}
                                            className="w-full py-3 bg-white border-2 border-emerald-500 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Search className="w-3 h-3" /> {/* Using Search as a placeholder for Copy/Clipboard icon if not imported, but wait, Search is imported. Let's use Brain or Search. */}
                                            Salin Prompt untuk Assistant
                                        </button>
                                    )}
                                </div>
                            )}

                            <p className="text-[10px] text-slate-400 font-medium text-center leading-tight px-4 pb-2">
                                *Request ke Assistant tidak memakai kuota API Gemini Anda, tapi diproses manual oleh Assistant di chat.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/20 shadow-xl">
                <div className="flex flex-col gap-2">
                    <Link href="/dashboard" className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 w-fit">
                        <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                            <Repeat className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800">Repeat Orders</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Identifikasi Masalah Berulang</p>
                                {aiHistory.length > 0 && selectedHistoryId && (
                                    <>
                                        <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                        <button
                                            onClick={() => {
                                                router.push('/repeat');
                                            }}
                                            className="group flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full transition-all border border-indigo-100 font-black text-[9px] uppercase tracking-wider"
                                        >
                                            <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                                            Kembali ke History
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-start md:self-end">
                    <button
                        onClick={() => setShowAiModal(true)}
                        disabled={aiStatus === 'running'}
                        className={`${aiStatus === 'running'
                            ? 'bg-slate-100 text-slate-400'
                            : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:shadow-lg hover:scale-[1.02]'
                            } px-6 py-3 rounded-2xl transition-all font-black flex items-center gap-2 active:scale-95 text-sm shadow-xl shadow-indigo-100`}
                    >
                        {aiStatus === 'running' ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Brain className="w-5 h-5" />
                        )}
                        {aiStatus === 'running' ? 'AI Sedang Menganalisis...' : 'Mulai Analisa AI Baru'}
                    </button>
                </div>
            </div>

            {aiStatus === 'not_set' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-6 py-4 rounded-2xl flex items-center justify-between gap-4 animate-fade-in-up">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5" />
                        <p className="text-sm font-bold">API Key Gemini belum diatur. Analisa AI cerdas tidak tersedia.</p>
                    </div>
                    <Link href="/settings" className="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-700 transition-colors shrink-0 shadow-sm">Ke Pengaturan</Link>
                </div>
            )}

            {aiStatus === 'error' && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-2xl flex items-center gap-3 animate-fade-in-up">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-black">Analisa AI Gagal</p>
                        <p className="text-xs font-bold opacity-80">{aiError || 'Pastikan API Key benar dan internet lancar.'}</p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/20 p-20 flex flex-col items-center justify-center text-center shadow-xl">
                    <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
                        <Brain className="w-10 h-10 text-indigo-400 animate-bounce" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2">Menyiapkan Intelijen...</h3>
                    <p className="text-slate-500 font-medium max-w-xs">Sistem sedang memuat data analisa terakhir untuk Anda.</p>
                </div>
            ) : aiStatus === 'success' && aiData.length > 0 ? (
                <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-violet-100 shadow-2xl p-8 md:p-10 space-y-8 animate-fade-in-up border-l-8 border-l-violet-500 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-100 rounded-full blur-3xl opacity-30 -mr-20 -mt-20"></div>

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-violet-200">
                                <Brain className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-800">Hasil Analisa AI</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="bg-violet-100 text-violet-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">Semantic Analysis</span>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        Rentang: {aiMeta?.dateStart || '30 Hari Terakhir'} • {aiMeta?.totalOrders || aiData.reduce((acc, i) => acc + i.count, 0)} Order
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                        {([...aiData].sort((a, b) => (b.count || 0) - (a.count || 0))).map((item: any, i: number) => (
                            <div key={i} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-2xl transition-all group/item hover:-translate-y-2 flex flex-col border-b-4 border-b-transparent hover:border-b-violet-500">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center text-xs font-black italic group-hover/item:bg-violet-100 group-hover/item:text-violet-600 transition-colors">#{i + 1}</div>
                                    </div>
                                    <div className="bg-rose-50 text-rose-600 px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-2">
                                        <Repeat className="w-3 h-3" />
                                        {item.count}x Kejadian
                                    </div>
                                </div>

                                <h4 className="font-black text-slate-800 text-lg mb-4 leading-tight group-hover/item:text-violet-700 transition-colors uppercase tracking-tight">{item.title}</h4>

                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Brain className="w-3 h-3 text-violet-400" />
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Smart Context</p>
                                    </div>
                                    <p className="text-[12px] text-slate-600 leading-relaxed font-medium">"{item.reasoning || 'Ditemukan pola masalah yang serupa secara semantik di berbagai laporan unit.'}"</p>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lokasi Terdampak</p>
                                            <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold">{item.units?.split(',').length} Unit</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 font-bold line-clamp-2 uppercase tracking-widest leading-relaxed">{item.units}</p>
                                    </div>

                                    <Link
                                        href={
                                            item.order_nos && item.order_nos.length > 0
                                                ? `/orders?nos=${encodeURIComponent(item.order_nos.join(','))}`
                                                : `/orders?search=${encodeURIComponent(item.title)}&searchType=description`
                                        }
                                        className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-center block hover:bg-violet-600 transition-all shadow-lg shadow-slate-200"
                                    >
                                        Investigasi Detail
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : aiStatus === 'idle' || aiStatus === 'success' || aiData.length === 0 ? (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="flex items-center justify-between px-4">
                        <div>
                            <h3 className="text-xl font-black text-slate-800">History Analisa</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Pilih dari rekaman analisa sebelumnya</p>
                        </div>
                    </div>

                    {aiHistory.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {aiHistory.map((h: any, index: number) => (
                                <div key={h.id} className="bg-white/60 backdrop-blur-md rounded-[2rem] border border-white/20 p-6 shadow-xl hover:shadow-2xl transition-all group hover:-translate-y-1">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                                            <Brain className="w-6 h-6 text-indigo-500 group-hover:text-white transition-colors" />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{aiHistory.length - index}</span>
                                    </div>

                                    <div className="space-y-1 mb-6">
                                        <h4 className="text-lg font-black text-slate-800">Analisa AI SIMRS</h4>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <div className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1.5 border border-slate-200">
                                                <Search className="w-3 h-3" />
                                                {new Date(h.date_start).toLocaleDateString('id-ID')} - {new Date(h.date_end).toLocaleDateString('id-ID')}
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium py-1">Dijalankan: {new Date(h.last_run).toLocaleDateString('id-ID')}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Total Order</p>
                                            <p className="text-base font-black text-slate-700">{h.total_orders_analyzed}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 uppercase overflow-hidden">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Status</p>
                                            <p className="text-[10px] font-black text-emerald-600 truncate">Semantik Sukses</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            router.push(`/repeat?id=${h.id}`);
                                        }}
                                        className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200 active:scale-[0.98]"
                                    >
                                        Explore Hasil Analisa
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white/40 backdrop-blur-md rounded-[3rem] border-2 border-dashed border-slate-200 p-20 flex flex-col items-center justify-center text-center shadow-inner mt-4">
                            <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mb-8 animate-float">
                                <Brain className="w-12 h-12 text-violet-500" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-800 mb-4">Belum Ada Analisa AI</h3>
                            <p className="text-slate-500 font-medium max-w-md mb-10 leading-relaxed">
                                Gunakan kekuatan AI untuk mendeteksi masalah yang berulang bukan hanya dari teks, tapi juga dari makna keluhan pasien dan unit.
                            </p>
                            <button
                                onClick={() => setShowAiModal(true)}
                                className="bg-indigo-600 text-white px-10 py-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 hover:scale-105 active:scale-95 flex items-center gap-3"
                            >
                                <Brain className="w-6 h-6 text-white/50" />
                                Jalankan Analisa AI Pertama
                            </button>
                        </div>
                    )}
                </div>
            ) : null}

        </div>
    );
}
