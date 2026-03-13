'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Package, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
            <LoginContent />
        </Suspense>
    );
}

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, user, isLoading } = useAuth();
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (!isLoading && user) {
            const redirect = searchParams.get('redirect') || '/dashboard';
            router.replace(redirect);
        }
    }, [user, isLoading, router, searchParams]);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Login gagal');
                return;
            }

            login(data.token, data.user);

            const redirect = searchParams.get('redirect') || '/dashboard';
            router.push(redirect);
        } catch (error) {
            setError('Terjadi kesalahan: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl animate-float"></div>
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 w-full max-w-md animate-fade-in-up">
                {/* Glass Card */}
                <div className="bg-white/[0.08] backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-10 border border-white/[0.12]">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-20 h-20 bg-gradient-to-br from-violet-500 via-violet-600 to-fuchsia-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-violet-500/30 mb-6 border border-white/20 animate-float">
                            <Package className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">
                            Order<span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Track</span>
                        </h1>
                        <p className="text-slate-400 text-sm mt-2 font-medium tracking-wider uppercase">SIMRS Monitoring System</p>
                        <div className="w-12 h-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full mt-4"></div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-5 py-3.5 rounded-2xl mb-6 text-sm font-medium animate-fade-in-up flex items-center gap-2">
                            <span className="text-lg">⚠️</span> {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-slate-300 font-bold mb-2 text-sm uppercase tracking-wider">
                                Username atau Email
                            </label>
                            <input
                                type="text"
                                name="email"
                                id="login-email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Masukkan username atau email"
                                required
                                className="w-full px-5 py-3.5 bg-white/[0.06] border border-white/[0.12] rounded-2xl focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 text-white placeholder-slate-500 transition-all font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-slate-300 font-bold mb-2 text-sm uppercase tracking-wider">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    id="login-password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Masukkan password"
                                    required
                                    className="w-full px-5 py-3.5 bg-white/[0.06] border border-white/[0.12] rounded-2xl focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 text-white placeholder-slate-500 transition-all font-medium pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            id="login-submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black py-3.5 rounded-2xl hover:shadow-xl hover:shadow-violet-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-widest active:scale-[0.98] mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-3">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Sedang login...
                                </span>
                            ) : (
                                'Masuk'
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                            © 2026 OrderTrack • SIMRS
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
