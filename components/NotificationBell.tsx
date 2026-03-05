
import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { Communication } from '../types';

const categoryMeta: Record<string, { icon: string; color: string; bg: string }> = {
    WELCOME: { icon: 'fa-hand-wave', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    PAYMENT: { icon: 'fa-credit-card', color: 'text-blue-600', bg: 'bg-blue-50' },
    REMINDER: { icon: 'fa-clock', color: 'text-amber-600', bg: 'bg-amber-50' },
    ANNOUNCEMENT: { icon: 'fa-bullhorn', color: 'text-purple-600', bg: 'bg-purple-50' },
};

const STORAGE_KEY = 'if_read_notifications';

const getReadIds = (): Set<string> => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
};

const markAsRead = (ids: string[]) => {
    const existing = getReadIds();
    ids.forEach(id => existing.add(id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing]));
};

const NotificationBell: React.FC = () => {
    const { communications, currentUser } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const [readIds, setReadIds] = useState<Set<string>>(getReadIds);
    const panelRef = useRef<HTMLDivElement>(null);

    // Filter to only this user's notifications
    const myNotifs: Communication[] = communications
        .filter(c => c.userId === currentUser?.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 30);

    const unreadCount = myNotifs.filter(n => !readIds.has(n.id)).length;

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Mark all as read when opening
    const handleOpen = () => {
        setIsOpen(prev => {
            if (!prev) {
                const ids = myNotifs.map(n => n.id);
                markAsRead(ids);
                setReadIds(new Set(ids));
            }
            return !prev;
        });
    };

    const formatTime = (ts: string) => {
        try {
            const d = new Date(ts);
            const now = new Date();
            const diffMs = now.getTime() - d.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            const diffHrs = Math.floor(diffMins / 60);
            if (diffHrs < 24) return `${diffHrs}h ago`;
            const diffDays = Math.floor(diffHrs / 24);
            if (diffDays < 7) return `${diffDays}d ago`;
            return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        } catch { return ''; }
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={handleOpen}
                className="relative w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-slate-500 hover:text-slate-900"
                title="Notifications"
            >
                <i className={`fas fa-bell text-lg ${unreadCount > 0 ? 'animate-[bellShake_1.5s_ease-in-out_infinite]' : ''}`}></i>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm shadow-red-200 animate-[popIn_0.2s_ease-out]">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-3 w-[340px] md:w-[380px] bg-white rounded-[1.5rem] shadow-2xl shadow-slate-200 border border-slate-100 z-[200] animate-[slideDownFade_0.2s_ease-out] overflow-hidden">
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white rounded-t-[1.5rem]">
                        <div>
                            <h4 className="font-black text-sm uppercase tracking-widest">Notifications</h4>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                {myNotifs.length} total · {unreadCount} unread
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <i className="fas fa-bell text-slate-400 text-sm"></i>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-50">
                        {myNotifs.length === 0 ? (
                            <div className="py-14 flex flex-col items-center gap-3 text-center">
                                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                                    <i className="fas fa-bell-slash text-2xl text-slate-300"></i>
                                </div>
                                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">No notifications yet</p>
                                <p className="text-slate-300 text-[10px] font-medium">You're all caught up!</p>
                            </div>
                        ) : (
                            myNotifs.map(notif => {
                                const meta = categoryMeta[notif.category] || categoryMeta['ANNOUNCEMENT'];
                                const isUnread = !readIds.has(notif.id);
                                return (
                                    <div
                                        key={notif.id}
                                        className={`flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors ${isUnread ? 'bg-blue-50/30' : ''}`}
                                    >
                                        {/* Icon */}
                                        <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${meta.bg}`}>
                                            <i className={`fas ${meta.icon} text-sm ${meta.color}`}></i>
                                        </div>
                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${meta.color}`}>
                                                    {notif.category}
                                                </span>
                                                <span className="text-[9px] text-slate-300 font-bold shrink-0 ml-2">
                                                    {formatTime(notif.timestamp)}
                                                </span>
                                            </div>
                                            <p className="text-xs font-semibold text-slate-700 leading-snug whitespace-pre-wrap break-words mt-1">
                                                {notif.body}
                                            </p>
                                        </div>
                                        {/* Unread dot */}
                                        {isUnread && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5"></div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    {myNotifs.length > 0 && (
                        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-center">
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                Showing last {myNotifs.length} notifications
                            </span>
                        </div>
                    )}
                </div>
            )}

            <style>{`
        @keyframes bellShake {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(12deg); }
          20% { transform: rotate(-10deg); }
          30% { transform: rotate(8deg); }
          40% { transform: rotate(-6deg); }
          50% { transform: rotate(0deg); }
        }
        @keyframes popIn {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes slideDownFade {
          from { transform: translateY(-8px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
        </div>
    );
};

export default NotificationBell;
