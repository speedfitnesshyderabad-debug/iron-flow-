import React, { useEffect, useState } from 'react';
import { useAppContext } from '../AppContext';
import { ActiveSession, User } from '../types';

interface ActiveSessionsModalProps {
    user: User;
    onClose: () => void;
}

const ActiveSessionsModal: React.FC<ActiveSessionsModalProps> = ({ user, onClose }) => {
    const { getSessions, revokeSession, showToast, generateDeviceFingerprint } = useAppContext();
    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentFingerprint, setCurrentFingerprint] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const data = await getSessions(user.id);
            setSessions(data);
            const fp = await generateDeviceFingerprint();
            setCurrentFingerprint(fp);
            setLoading(false);
        };
        fetchData();
    }, [user.id, getSessions, generateDeviceFingerprint]);

    const handleRevoke = async (fingerprint: string) => {
        if (confirm('Are you sure you want to log out this device?')) {
            await revokeSession(user.id, fingerprint);
            showToast('Device logged out successfully');
            // Refresh
            const data = await getSessions(user.id);
            setSessions(data);
        }
    };

    const handleRevokeAll = async () => {
        if (confirm('Are you sure you want to log out ALL devices? The user will need to login again.')) {
            await revokeSession(user.id);
            showToast('All devices logged out');
            // Refresh
            const data = await getSessions(user.id);
            setSessions(data);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[5000] flex items-center justify-center p-4">
            <div className="bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <i className="fas fa-shield-alt text-blue-500"></i>
                            Active Sessions
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">Managing devices for <span className="text-white font-bold">{user.name}</span></p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                        <div className="flex items-center gap-2">
                            <i className="fas fa-users-cog text-slate-400"></i>
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Allowed Devices</span>
                        </div>
                        <span className="text-white font-black text-lg">{user.maxDevices || 1}</span>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <i className="fas fa-circle-notch fa-spin text-2xl mb-3"></i>
                            <p>Loading sessions...</p>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                            <i className="fas fa-laptop-slash text-4xl mb-3 opacity-50"></i>
                            <p>No active sessions found.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                    {sessions.length} Active {sessions.length === 1 ? 'Device' : 'Devices'}
                                </span>

                                {sessions.length > 0 && (
                                    <button
                                        onClick={handleRevokeAll}
                                        className="text-xs font-bold text-red-500 hover:text-red-400 uppercase tracking-widest hover:underline"
                                    >
                                        Logout All
                                    </button>
                                )}
                            </div>

                            {sessions.map((session) => (
                                <div
                                    key={session.id}
                                    className={`relative p-4 rounded-xl border flex justify-between items-center group transition-all ${session.deviceFingerprint === currentFingerprint
                                            ? 'bg-blue-500/10 border-blue-500/50'
                                            : 'bg-white/5 border-white/5 hover:border-white/10'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${session.deviceFingerprint === currentFingerprint ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
                                            }`}>
                                            <i className={`fas ${session.deviceName.toLowerCase().includes('mobile') || session.deviceName.toLowerCase().includes('phone')
                                                    ? 'fa-mobile-alt'
                                                    : 'fa-desktop'
                                                }`}></i>
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-bold text-white text-sm truncate">{session.deviceName}</h3>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]">
                                                {session.browserInfo}
                                            </p>
                                            <p className="text-[10px] text-slate-500 mt-1">
                                                Last active: {new Date(session.lastActivity).toLocaleDateString()} {new Date(session.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            {session.deviceFingerprint === currentFingerprint && (
                                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] uppercase font-black rounded tracking-wider border border-blue-500/30">
                                                    Current Device
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleRevoke(session.deviceFingerprint)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-100 sm:opacity-0 group-hover:opacity-100"
                                        title="Logout this device"
                                    >
                                        <i className="fas fa-sign-out-alt"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-black/20 text-[10px] text-slate-500 text-center">
                    Device limits ensure account security and prevent credential sharing.
                </div>
            </div>
        </div>
    );
};

export default ActiveSessionsModal;
