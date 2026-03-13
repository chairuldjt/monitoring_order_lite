'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LayoutDashboard, Package, Search, Settings, ClipboardList, AlertTriangle, Repeat, Clock, BarChart2, Users } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { user } = useAuth();

    if (!user) return null;

    const menuItems = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Orders', path: '/orders', icon: ClipboardList },
        { name: 'Overdue Follow Up', path: '/overdue', icon: AlertTriangle },
        { name: 'Repeat Orders', path: '/repeat', icon: Repeat },
        { name: 'Pending Lama', path: '/pending', icon: Clock },
        { name: 'Analitik Order', path: '/analytics', icon: BarChart2 },
        { name: 'Tech Breakdown', path: '/breakdown', icon: Users },
        { name: 'Tracking', path: '/tracking', icon: Search },
        { name: 'Pengaturan', path: '/settings', icon: Settings },
    ];

    // Add Admin-only menu items
    if (user.role === 'admin') {
        const settingsIndex = menuItems.findIndex(item => item.name === 'Pengaturan');
        if (settingsIndex !== -1) {
            menuItems.splice(settingsIndex, 0, { name: 'Manajemen User', path: '/users', icon: Users });
        } else {
            menuItems.push({ name: 'Manajemen User', path: '/users', icon: Users });
        }
    }

    const isActive = (path: string) => {
        if (path === '/orders') {
            return pathname === '/orders' || (pathname?.startsWith('/orders/') && !['/overdue', '/repeat', '/pending', '/analytics', '/create'].includes(pathname));
        }
        if (pathname === path) return true;
        if (path !== '/' && pathname?.startsWith(path + '/')) return true;
        return false;
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col shadow-2xl transition-all duration-300 ease-in-out lg:relative ${isOpen ? 'translate-x-0 ml-0 shadow-xl' : '-translate-x-full lg:-ml-[260px] shadow-none'
                }`}>
                {/* Logo Section */}
                <div className="h-20 flex items-center justify-between px-6 border-b border-slate-700/50 shrink-0 bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 via-violet-600 to-fuchsia-700 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-violet-500/20 border border-white/10 group">
                            <Package className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-lg font-black bg-gradient-to-r from-white via-violet-200 to-fuchsia-200 bg-clip-text text-transparent leading-none">
                                OrderTrack
                            </h1>
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">SIMRS Monitor</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="lg:hidden text-slate-400 hover:text-white p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Navigation Section */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                    <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                        Main Menu
                    </p>
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => {
                                    if (window.innerWidth < 1024) onClose();
                                }}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive(item.path)
                                    ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30'
                                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                    }`}
                            >
                                {isActive(item.path) && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-violet-400/20 to-fuchsia-400/20 animate-pulse"></div>
                                )}
                                <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110 relative z-10" />
                                <span className="font-bold relative z-10">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Info Footer */}
                <div className="p-6 border-t border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-sm font-black text-white shadow-lg">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{user.username}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user.role}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-[10px] font-medium uppercase tracking-widest">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span>© 2026 OrderTrack</span>
                    </div>
                </div>
            </aside>
        </>
    );
}
