'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import {
    Settings, ShieldCheck, Save, RefreshCw,
    AlertTriangle, CheckCircle2, Info, Medal, Clock
} from 'lucide-react';

// Re-export components for the second tab
import { UserManagementContent } from './UserManagementContent';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'general' | 'users'>('general');

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 space-y-8 animate-fade-in pb-20">
                {/* Unified Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 backdrop-blur-md p-8 rounded-[2rem] border border-white/20 shadow-xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl transition-colors duration-500"></div>
                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Settings className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Pengaturan</h1>
                            <p className="text-slate-500 font-medium mt-1 uppercase tracking-[0.2em] text-[10px] font-black opacity-60">
                                Konfigurasi Sistem Monitoring & Manajemen Akses
                            </p>
                        </div>
                    </div>
                    
                    {/* Tab Switcher */}
                    <div className="flex p-1.5 bg-slate-100 rounded-[1.5rem] w-fit border border-slate-200 relative z-10">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-white text-violet-600 shadow-md scale-100' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Umum
                        </button>
                        {user?.role === 'admin' && (
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-white text-indigo-600 shadow-md scale-100' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                User
                            </button>
                        )}
                    </div>
                </div>

                {activeTab === 'general' ? <SettingsContent /> : <UserManagementContent />}
            </div>
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
        <div className="space-y-8 animate-fade-in">
            {/* Header section removed as it's now unified */}
            <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800">Pengaturan Sistem</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Konfigurasi Operasional Monitoring</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-6 py-3 rounded-xl hover:shadow-xl transition-all font-bold flex items-center gap-2 active:scale-95 disabled:opacity-60 text-sm"
                >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
                            <h2 className="text-xl font-black text-slate-800">SLA & Ambang Batas</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Durasi Overdue & Target Penyelesaian</p>
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
                                Target Cepat Selesai (Jam)
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
                                Target Normal Selesai (Jam)
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
                            Pengaturan ini dipakai untuk menghitung order yang melewati batas waktu pada Dashboard dan halaman monitoring lainnya. Gunakan standar SLA yang berlaku di unit kerja Anda agar indikator keterlambatan tetap konsisten.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
