
import React from 'react';
import { User, Subscription, Plan, SubscriptionStatus, Attendance, Sale } from '../types';

interface MemberProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    member: User;
    subscriptions: Subscription[];
    plans: Plan[];
    attendance: Attendance[];
    sales: Sale[];
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
};

const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
    isOpen,
    onClose,
    member,
    subscriptions,
    plans,
    attendance,
    sales
}) => {
    if (!isOpen) return null;

    const memberSubs = subscriptions
        .filter(s => s.memberId === member.id)
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    const memberAttendance = attendance
        .filter(a => a.userId === member.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out] max-h-[90dvh] flex flex-col">
                {/* Header */}
                <div className="bg-slate-900 p-8 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <img
                                src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=3b82f6&color=fff`}
                                alt=""
                                className="w-20 h-20 rounded-3xl object-cover border-4 border-white/10 shadow-xl"
                            />
                            {member.isActive !== false && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 border-4 border-slate-900 rounded-full"></div>
                            )}
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tight">{member.name}</h3>
                            <div className="flex items-center gap-3 mt-1 text-slate-400">
                                <span className="text-xs font-mono tracking-tighter uppercase px-2 py-1 bg-white/10 rounded-md">
                                    {member.memberId}
                                </span>
                                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                    Joined {memberSubs.length > 0 ? new Date(memberSubs[memberSubs.length - 1].startDate).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white/10 p-3 rounded-2xl hover:bg-white/20 transition-colors">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Left Column: Personal Info */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-2">Personal Details</h4>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                                            <i className="fas fa-phone-alt text-xs"></i>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Mobile</p>
                                            <p className="font-bold text-gray-900">{member.phone || member.emergencyContact || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                                            <i className="fas fa-envelope text-xs"></i>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Email</p>
                                            <p className="font-medium text-gray-900 break-all text-sm">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                                            <i className="fas fa-map-marker-alt text-xs"></i>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Address</p>
                                            <p className="font-medium text-gray-600 text-sm leading-relaxed">{member.address || 'No address provided'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-red-50 p-6 rounded-3xl border border-red-100 shadow-sm">
                                <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <i className="fas fa-life-ring"></i> Emergency Info
                                </h4>
                                <p className="text-[10px] font-bold text-red-400 uppercase">Contact Number</p>
                                <p className="font-black text-red-700 text-lg">{member.emergencyContact || 'MISSING'}</p>
                            </div>

                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Attendance Stats</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-2xl text-center">
                                        <p className="text-2xl font-black text-gray-900">{memberAttendance.length}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">Total Visits</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-2xl text-center">
                                        <p className="text-2xl font-black text-gray-900">
                                            {memberAttendance.filter(a => {
                                                const date = new Date(a.date);
                                                const now = new Date();
                                                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                                            }).length}
                                        </p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">This Month</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Plan History */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm min-h-[400px]">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-between">
                                    <span>Plan & Purchase History</span>
                                    <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">{memberSubs.length} Records</span>
                                </h4>

                                {memberSubs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                        <i className="fas fa-receipt text-5xl mb-4 opacity-10"></i>
                                        <p className="font-bold uppercase text-xs tracking-widest">No plans purchased yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {memberSubs.map(sub => {
                                            const plan = plans.find(p => p.id === sub.planId);
                                            const isExpired = sub.status === SubscriptionStatus.EXPIRED;
                                            const isActive = sub.status === SubscriptionStatus.ACTIVE;
                                            const isPaused = sub.status === SubscriptionStatus.PAUSED;

                                            return (
                                                <div
                                                    key={sub.id}
                                                    className={`group p-6 rounded-2xl border transition-all ${isActive ? 'bg-green-50/50 border-green-100' :
                                                        isPaused ? 'bg-slate-50 border-slate-200' :
                                                            'bg-white border-gray-100 grayscale-[0.5] hover:grayscale-0'
                                                        }`}
                                                >
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-green-500 text-white shadow-lg shadow-green-100' :
                                                                isPaused ? 'bg-slate-600 text-white shadow-lg shadow-slate-100' :
                                                                    'bg-gray-100 text-gray-400'
                                                                }`}>
                                                                <i className={`fas ${plan?.type === 'PT' ? 'fa-user-ninja' : 'fa-dumbbell'} text-lg`}></i>
                                                            </div>
                                                            <div>
                                                                <h5 className="font-black text-gray-900 uppercase tracking-tight">{plan?.name || 'Deleted Plan'}</h5>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${isActive ? 'bg-green-100 text-green-700' :
                                                                        isPaused ? 'bg-slate-100 text-slate-700' :
                                                                            'bg-red-50 text-red-500'
                                                                        }`}>
                                                                        {sub.status}
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-400 font-medium">#{sub.id.slice(0, 8)}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col md:items-end">
                                                            <p className="text-xs font-black text-gray-900">
                                                                {new Date(sub.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                <span className="mx-2 text-gray-300">→</span>
                                                                {new Date(sub.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </p>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                                    {(() => {
                                                                        const matchedSale = sales.find(s =>
                                                                            (sub.saleId && s.id === sub.saleId) ||
                                                                            (!sub.saleId &&
                                                                                s.memberId === sub.memberId &&
                                                                                s.planId === sub.planId &&
                                                                                Math.abs(new Date(s.date).getTime() - new Date(sub.startDate).getTime()) <= 172800000 // 48h buffer
                                                                            )
                                                                        );
                                                                        return (
                                                                            <>
                                                                                {formatCurrency(matchedSale?.amount || plan?.price || 0)} Paid
                                                                                <div className="text-[8px] text-gray-300 mt-1">
                                                                                    Debug: {sub.saleId || 'no-link'} | Total Sales: {sales.length}
                                                                                </div>
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </span>
                                                                {sub.pauseAllowanceDays ? (
                                                                    <span className="text-[10px] font-bold text-blue-500 uppercase">
                                                                        {(sub.pauseAllowanceDays || 0) - (sub.pausedDaysUsed || 0)} Pause Days Left
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
        </div>
    );
};

export default MemberProfileModal;
