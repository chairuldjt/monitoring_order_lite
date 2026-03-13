'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Notification {
    id: number;
    title: string;
    message: string;
    type: string;
    order_id: number | null;
    is_read: boolean;
    created_at: string;
}

export function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            // Trigger overdue check
            await fetch('/api/notifications/check');

            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.data || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id: number) => {
        try {
            await fetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, is_read: true }),
            });
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const markAllRead = async () => {
        try {
            await fetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAll: true }),
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'follow_up_overdue': return '⚠️';
            case 'pending_overdue': return '🚨';
            case 'status_change': return '🔄';
            default: return '📢';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'follow_up_overdue': return 'bg-amber-50 border-amber-200';
            case 'pending_overdue': return 'bg-red-50 border-red-200';
            case 'status_change': return 'bg-blue-50 border-blue-200';
            default: return 'bg-slate-50 border-slate-200';
        }
    };

    const timeAgo = (dateStr: string) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Baru saja';
        if (mins < 60) return `${mins}m lalu`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}j lalu`;
        const days = Math.floor(hours / 24);
        return `${days}h lalu`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600 hover:text-slate-800"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse-glow">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 animate-fade-in-up overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-violet-50/50 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                            <Bell className="w-4 h-4" />
                            Notifikasi
                            {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                                    {unreadCount}
                                </span>
                            )}
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-[11px] text-violet-600 hover:text-violet-700 font-bold hover:underline"
                            >
                                Tandai semua dibaca
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="py-12 text-center">
                                <div className="text-4xl mb-3">🔔</div>
                                <p className="text-slate-400 text-sm font-medium">Tidak ada notifikasi</p>
                            </div>
                        ) : (
                            notifications.slice(0, 20).map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => !notif.is_read && markAsRead(notif.id)}
                                    className={`px-5 py-4 border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer ${!notif.is_read ? 'bg-violet-50/30' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border ${getTypeColor(notif.type)}`}>
                                            {getTypeIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${!notif.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                                                {notif.title}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{notif.message}</p>
                                            <p className="text-[10px] text-slate-400 mt-1 font-medium uppercase tracking-wider">
                                                {timeAgo(notif.created_at)}
                                            </p>
                                        </div>
                                        {!notif.is_read && (
                                            <div className="w-2.5 h-2.5 bg-violet-500 rounded-full shrink-0 mt-1.5 animate-pulse"></div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
