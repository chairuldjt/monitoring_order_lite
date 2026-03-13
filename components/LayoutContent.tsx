'use client';

import { useState, useRef, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Package, User, Settings, LogOut } from 'lucide-react';

export function LayoutContent({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Default sidebar state based on screen size
    useEffect(() => {
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        }
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isPublicPage = pathname === '/login' || pathname === '/register' || pathname === '/tracking';

    if (!user || isPublicPage) {
        return <main className="min-h-screen">{children}</main>;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-30 shadow-sm shrink-0">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                            title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        <Link href="/dashboard" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-lg flex items-center justify-center shadow-md shadow-violet-200/50 transition-transform group-hover:scale-110">
                                <Package className="w-4 h-4 text-white" />
                            </div>
                            <h1 className="font-bold text-slate-800 tracking-tight text-base sm:text-lg">
                                Order<span className="text-violet-600">Track</span>
                            </h1>
                        </Link>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <NotificationBell />

                        <div className="text-right hidden sm:block mr-2">
                            <p className="text-sm font-semibold text-slate-900">{user.username}</p>
                            <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                        </div>

                        {/* User Profile Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 transition-all flex items-center justify-center text-white font-bold shadow-md shadow-violet-200 overflow-hidden ring-2 ring-white"
                            >
                                {user.profile_image ? (
                                    <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    user.username.charAt(0).toUpperCase()
                                )}
                            </button>

                            {isProfileOpen && (
                                <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 z-50 animate-fade-in-up">
                                    <div className="px-4 py-3 border-b border-slate-50 lg:hidden">
                                        <p className="text-sm font-bold text-slate-900">{user.username}</p>
                                        <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                                    </div>

                                    <Link
                                        href="/profile"
                                        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-violet-600 transition"
                                        onClick={() => setIsProfileOpen(false)}
                                    >
                                        <User className="w-4 h-4" /> Detail Account
                                    </Link>
                                    <Link
                                        href="/settings"
                                        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-violet-600 transition"
                                        onClick={() => setIsProfileOpen(false)}
                                    >
                                        <Settings className="w-4 h-4" /> Account Setting
                                    </Link>
                                    <hr className="my-1 border-slate-50" />
                                    <button
                                        onClick={() => {
                                            setIsProfileOpen(false);
                                            logout();
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition"
                                    >
                                        <LogOut className="w-4 h-4" /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto bg-slate-50">
                    <div className="p-0">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
