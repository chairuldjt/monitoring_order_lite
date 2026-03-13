'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';

export default function CreateOrderPage() {
    return (
        <ProtectedRoute>
            <CreateOrderContent />
        </ProtectedRoute>
    );
}

function CreateOrderContent() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        requester_name: '',
        requester_unit: '',
        priority: 'medium',
        assigned_to: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Gagal membuat order');
                return;
            }

            router.push(`/orders/${data.data.id}`);
        } catch (err) {
            setError('Terjadi kesalahan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8 animate-fade-in">
            <div className="max-w-3xl mx-auto">
                <Link href="/orders" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-bold text-sm mb-6 group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Kembali ke Daftar Order
                </Link>

                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
                        <h1 className="text-2xl font-black flex items-center gap-3">✏️ Buat Order Baru</h1>
                        <p className="text-blue-100 text-sm mt-2">Isi form berikut untuk membuat order monitoring baru</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm border border-red-100 font-medium">⚠️ {error}</div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Judul Order *</label>
                            <input
                                type="text" name="title" value={formData.title} onChange={handleChange} required
                                placeholder="Contoh: Perbaikan Printer Lantai 3"
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Deskripsi</label>
                            <textarea
                                name="description" value={formData.description} onChange={handleChange} rows={4}
                                placeholder="Jelaskan detail permasalahan..."
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Nama Pemohon *</label>
                                <input
                                    type="text" name="requester_name" value={formData.requester_name} onChange={handleChange} required
                                    placeholder="Dr. Bambang" className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Unit / Bagian</label>
                                <input
                                    type="text" name="requester_unit" value={formData.requester_unit} onChange={handleChange}
                                    placeholder="Poliklinik" className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Prioritas</label>
                                <select
                                    name="priority" value={formData.priority} onChange={handleChange}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Ditugaskan Ke</label>
                                <input
                                    type="text" name="assigned_to" value={formData.assigned_to} onChange={handleChange}
                                    placeholder="Nama teknisi" className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Link href="/orders" className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all font-bold text-center">
                                Batal
                            </Link>
                            <button
                                type="submit" disabled={loading}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:shadow-xl hover:shadow-blue-200 transition-all font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                            >
                                {loading ? (
                                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Memproses...</>
                                ) : (
                                    <><Send className="w-4 h-4" /> Buat Order</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
