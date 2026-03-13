'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { User, Mail, Shield, Calendar } from 'lucide-react';

export default function ProfilePage() {
    return (
        <ProtectedRoute>
            <ProfileContent />
        </ProtectedRoute>
    );
}

function ProfileContent() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen p-4 md:p-8 animate-fade-in">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-black text-slate-800 mb-8">👤 Detail Account</h1>

                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden">
                    {/* Profile Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 flex items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-black text-white border-4 border-white/30 shadow-xl">
                            {user?.profile_image ? (
                                <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover rounded-full" />
                            ) : (
                                user?.username.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white">{user?.username}</h2>
                            <p className="text-blue-200 text-sm font-medium capitalize">{user?.role}</p>
                        </div>
                    </div>

                    {/* Profile Details */}
                    <div className="p-8 space-y-6">
                        <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-5">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <User className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Username</p>
                                <p className="text-lg font-bold text-slate-800">{user?.username}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-5">
                            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                                <Mail className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Email</p>
                                <p className="text-lg font-bold text-slate-800">{user?.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-5">
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <Shield className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Role</p>
                                <p className="text-lg font-bold text-slate-800 capitalize">{user?.role}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
