'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import {
    Users, UserPlus, Search, Edit2, Trash2, Shield,
    Mail, Calendar, RefreshCw, X, Save, AlertCircle,
    CheckCircle2, ShieldCheck, User
} from 'lucide-react';

export default function UsersPage() {
    return (
        <ProtectedRoute>
            <UserManagementContent />
        </ProtectedRoute>
    );
}

function UserManagementContent() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'user'
    });
    const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/user/list');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (err) {
            console.error('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (user: any = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                username: user.username,
                email: user.email,
                password: '',
                role: user.role
            });
        } else {
            setEditingUser(null);
            setFormData({
                username: '',
                email: '',
                password: '',
                role: 'user'
            });
        }
        setIsModalOpen(true);
        setStatus(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setStatus(null);

        try {
            const url = editingUser ? `/api/user/${editingUser.id}` : '/api/user/list';
            const method = editingUser ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setStatus({ type: 'success', msg: editingUser ? 'User berhasil diperbarui' : 'User berhasil ditambahkan' });
                fetchUsers();
                setTimeout(() => setIsModalOpen(false), 1500);
            } else {
                const data = await res.json();
                setStatus({ type: 'error', msg: data.error || 'Terjadi kesalahan' });
            }
        } catch (err) {
            setStatus({ type: 'error', msg: 'Koneksi gagal' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) return;

        try {
            const res = await fetch(`/api/user/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.error || 'Gagal menghapus user');
            }
        } catch (err) {
            alert('Koneksi gagal');
        }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-8 animate-fade-in relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 backdrop-blur-md p-8 rounded-[2rem] border border-white/20 shadow-xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors duration-500"></div>
                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
                        <Users className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Manajemen User</h1>
                        <p className="text-slate-500 font-medium mt-1 uppercase tracking-[0.2em] text-[10px] font-black opacity-60">
                            Kelola Hak Akses & Akun Sistem
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
                    <div className="relative group/search">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/search:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cari username atau email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-11 pr-5 py-3.5 bg-white/80 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 w-full sm:w-72 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-4 rounded-2xl hover:shadow-xl transition-all font-black text-sm flex items-center justify-center gap-2 active:scale-95 group/btn"
                    >
                        <UserPlus className="w-5 h-5 group-hover/btn:translate-x-0.5 transition-transform" />
                        Tambah User
                    </button>
                </div>
            </div>

            {/* User List Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden relative">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-indigo-600 mb-4"></div>
                        <p className="text-slate-500 font-bold text-sm tracking-widest uppercase opacity-60">Memuat Data User...</p>
                    </div>
                ) : filteredUsers.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">User Profile</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Email</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Role</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Created At</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center overflow-hidden shadow-inner border-2 border-white">
                                                    {user.profile_image ? (
                                                        <img src={user.profile_image} alt={user.username} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-6 h-6 text-slate-400" />
                                                    )}
                                                </div>
                                                <span className="text-sm font-black text-slate-700 tracking-tight">{user.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 font-bold text-slate-500 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-3.5 h-3.5 opacity-50" />
                                                {user.email}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${user.role === 'admin'
                                                ? 'bg-rose-50 text-rose-600 border-rose-100'
                                                : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                }`}>
                                                <Shield className="w-3 h-3" />
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 font-bold text-slate-500 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 opacity-50" />
                                                {new Date(user.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 transition-all">
                                                <button
                                                    onClick={() => handleOpenModal(user)}
                                                    className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                    title="Edit User"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                                    title="Hapus User"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <Users className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800">Tidak Ada User</h3>
                        <p className="text-slate-400 mt-2 font-bold max-w-sm px-6">Belum ada user yang terdaftar atau hasil pencarian tidak ditemukan.</p>
                    </div>
                )}
            </div>

            {/* Modal Create/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl border border-white/20 overflow-hidden animate-zoom-in">
                        <div className="px-8 py-6 bg-gradient-to-r from-indigo-600 to-violet-600 flex items-center justify-between text-white">
                            <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                                {editingUser ? <Edit2 className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                                {editingUser ? 'Edit User' : 'Tambah User Baru'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            {status && (
                                <div className={`p-4 rounded-2xl flex items-center gap-3 border animate-shake ${status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
                                    }`}>
                                    {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                    <span className="text-xs font-black uppercase tracking-wider">{status.msg}</span>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Username</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700"
                                        placeholder="Username"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700"
                                        placeholder="email@example.com"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                                        Password {editingUser && <span className="text-[8px] opacity-70">(Kosongkan jika tidak ingin mengubah)</span>}
                                    </label>
                                    <input
                                        type="password"
                                        required={!editingUser}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">User Role</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: 'user' })}
                                            className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 transition-all flex items-center justify-center gap-2 ${formData.role === 'user'
                                                ? 'bg-indigo-50 border-indigo-500 text-indigo-600 shadow-inner'
                                                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                                }`}
                                        >
                                            <Users className="w-4 h-4" />
                                            Standard User
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: 'admin' })}
                                            className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 transition-all flex items-center justify-center gap-2 ${formData.role === 'admin'
                                                ? 'bg-rose-50 border-rose-500 text-rose-600 shadow-inner'
                                                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                                }`}
                                        >
                                            <ShieldCheck className="w-4 h-4" />
                                            Administrator
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-3 shadow-lg"
                                >
                                    {submitting ? (
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Save className="w-5 h-5" />
                                    )}
                                    {editingUser ? 'Perbarui User' : 'Simpan User Baru'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
