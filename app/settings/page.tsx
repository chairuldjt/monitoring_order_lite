'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import {
    Settings, Brain, ShieldCheck, Save, RefreshCw, Key,
    AlertTriangle, CheckCircle2, TrendingUp, Info, Medal, Clock
} from 'lucide-react';

export default function SettingsPage() {
    return (
        <ProtectedRoute>
            <SettingsContent />
        </ProtectedRoute>
    );
}

function SettingsContent() {
    const [settings, setSettings] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            }
        } catch (err) {
            console.error('Failed to fetch settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setStatus(null);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings }),
            });
            if (res.ok) {
                setStatus({ type: 'success', msg: 'Pengaturan berhasil disimpan' });
            } else {
                const data = await res.json();
                setStatus({ type: 'error', msg: data.error || 'Gagal menyimpan pengaturan' });
            }
        } catch (err) {
            setStatus({ type: 'error', msg: 'Koneksi gagal' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 backdrop-blur-md p-8 rounded-[2rem] border border-white/20 shadow-xl">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Settings className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800">Pengaturan</h1>
                        <p className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-[10px] font-black opacity-60">
                            Konfigurasi Aplikasi & Integrasi AI
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-8 py-4 rounded-2xl hover:shadow-xl transition-all font-bold flex items-center gap-2 active:scale-95 disabled:opacity-60"
                >
                    {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Simpan Perubahan
                </button>
            </div>

            {status && (
                <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-fade-in-up ${status.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}>
                    {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    <span className="font-bold text-sm">{status.msg}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* SLA & Thresholds Configuration */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 space-y-6 relative overflow-hidden group lg:col-span-2">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">SLA & Ambang Batas (Thresholds)</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Durasi Overdue & Klasifikasi Performa</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                Overdue Follow Up (Hari)
                            </label>
                            <input
                                type="number"
                                value={settings.overdue_followup_days || '1'}
                                onChange={(e) => setSettings({ ...settings, overdue_followup_days: e.target.value })}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-700"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="w-3 h-3 text-rose-500" />
                                Overdue Pending (Bulan)
                            </label>
                            <input
                                type="number"
                                value={settings.overdue_pending_months || '1'}
                                onChange={(e) => setSettings({ ...settings, overdue_pending_months: e.target.value })}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold text-slate-700"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Medal className="w-3 h-3 text-emerald-500" />
                                Performa: Sangat Baik (Jam)
                            </label>
                            <input
                                type="number"
                                value={settings.performance_excellent_hours || '24'}
                                onChange={(e) => setSettings({ ...settings, performance_excellent_hours: e.target.value })}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-700"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Medal className="w-3 h-3 text-amber-500" />
                                Performa: Normal (Jam)
                            </label>
                            <input
                                type="number"
                                value={settings.performance_normal_hours || '72'}
                                onChange={(e) => setSettings({ ...settings, performance_normal_hours: e.target.value })}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-slate-700"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-indigo-50 rounded-[1.5rem] border border-indigo-100 flex gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-indigo-100 flex items-center justify-center shrink-0">
                            <Info className="w-5 h-5 text-indigo-500" />
                        </div>
                        <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">
                            Pengaturan ambang batas ini akan mempengaruhi perhitungan jumlah order yang terlambat di Dashboard (Overdue Follow Up & Pending) serta klasifikasi indikator performa pada laporan Analitik. Gunakan standar SLA yang berlaku di unit kerja Anda.
                        </p>
                    </div>
                </div>

                {/* AI Configuration */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 space-y-6 relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-50 rounded-full blur-3xl opacity-50"></div>

                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                            <Brain className="w-6 h-6 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">Kecerdasan Buatan (AI)</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Semantic Detection</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                                <Key className="w-4 h-4 text-violet-500" />
                                Gemini API Key
                            </label>
                            <input
                                type="password"
                                value={settings.gemini_api_key || ''}
                                onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })}
                                placeholder="Masukkan API Key dari Google AI Studio..."
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium text-slate-600"
                            />
                            <p className="text-[10px] text-slate-400 leading-relaxed pl-1">
                                <Info className="w-3 h-3 inline mr-1 mb-0.5" />
                                API Key ini digunakan untuk mendeteksi repeat order secara semantik. Dapatkan secara gratis di <a href="https://aistudio.google.com/" target="_blank" className="text-violet-600 hover:underline">Google AI Studio</a>.
                            </p>
                        </div>

                        <div className="p-6 bg-slate-900 rounded-[1.5rem] border border-slate-800 shadow-inner relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl"></div>
                            <div className="relative z-10 space-y-6">
                                {/* API Details Table-like view */}
                                {settings.gemini_api_key && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-white/5">
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Key</p>
                                            <p className="text-xs text-indigo-300 font-mono">...{settings.gemini_api_key.slice(-4)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Project</p>
                                            <p className="text-xs text-slate-300">{settings.ai_project_name || 'monitoring-order-ai'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Created on</p>
                                            <p className="text-xs text-slate-300">
                                                {settings.gemini_api_key_created_at
                                                    ? new Date(settings.gemini_api_key_created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Quota tier</p>
                                            <div className="flex flex-col">
                                                <p className="text-xs text-violet-300 font-bold">Standard</p>
                                                <p className="text-[9px] text-slate-500">Free Tier</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between">
                                    <h4 className="text-white text-sm font-black flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-violet-400" />
                                        Status Analisis harian
                                    </h4>
                                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">Aktif</span>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase mb-1">
                                        <span>Quota Pemakaian ({settings.ai_usage_today || 0} / {settings.ai_usage_limit || 1500})</span>
                                        <span>{Math.round(((settings.ai_usage_today || 0) / (settings.ai_usage_limit || 1500)) * 100)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, ((settings.ai_usage_today || 0) / (settings.ai_usage_limit || 1500)) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium">
                                    Analisis dijalankan otomatis sekali sehari untuk menyeimbangkan akurasi dan penggunaan rate limit.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Other Settings Placeholder */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 space-y-6 relative overflow-hidden">
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-fuchsia-50 rounded-full blur-3xl opacity-50"></div>

                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-fuchsia-100 rounded-xl flex items-center justify-center">
                            <ShieldCheck className="w-6 h-6 text-fuchsia-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">Keamanan & Sistem</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Application Core Settings</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] space-y-3">
                            <h4 className="text-slate-800 text-sm font-black">Mode Aplikasi</h4>
                            <div className="flex items-center gap-3">
                                <div className="px-4 py-2 bg-white border-2 border-violet-500 rounded-xl text-xs font-black text-violet-600 shadow-sm">Live View Mode</div>
                                <p className="text-[10px] text-slate-400 font-medium italic">Data diambil langsung dari SIMRS API.</p>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] space-y-3">
                            <h4 className="text-slate-800 text-sm font-black">Versi Sistem</h4>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">v1.2.0-stable</span>
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md uppercase">Terbaru</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
