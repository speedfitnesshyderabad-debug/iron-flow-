import React, { useState, useEffect } from 'react';
import { User, Plan, Branch } from '../types';

interface QuickRenewModalProps {
    isOpen: boolean;
    onClose: () => void;
    member: User;
    currentPlan?: Plan;
    plans: Plan[];
    onRenew: (planId: string, amount: number, paymentMethod: 'CASH' | 'CARD' | 'ONLINE' | 'POS', discount: number) => void;
}

export const QuickRenewModal: React.FC<QuickRenewModalProps> = ({
    isOpen,
    onClose,
    member,
    currentPlan,
    plans,
    onRenew
}) => {
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'ONLINE' | 'POS'>('CASH');
    const [discount, setDiscount] = useState(0);

    useEffect(() => {
        if (isOpen && currentPlan) {
            setSelectedPlanId(currentPlan.id);
        } else if (isOpen && plans.length > 0) {
            setSelectedPlanId(plans[0].id);
        }
    }, [isOpen, currentPlan, plans]);

    if (!isOpen) return null;

    const selectedPlan = plans.find(p => p.id === selectedPlanId);
    const finalAmount = selectedPlan ? Math.max(0, selectedPlan.price - discount) : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedPlan) {
            onRenew(selectedPlan.id, finalAmount, paymentMethod, discount);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-[scaleIn_0.3s_ease-out] relative overflow-hidden">
                {/* Decoration */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <i className="fas fa-bolt text-amber-500"></i> Quick Renew
                        </h2>
                        <p className="text-slate-500 text-sm font-medium">Renew membership for {member.name.split(' ')[0]}</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-all">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Member Info Card */}
                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-xl border border-slate-100">
                            {member.avatar ? (
                                <img src={member.avatar} alt={member.name} className="w-full h-full rounded-xl object-cover" />
                            ) : (
                                <span className="text-slate-300 font-black">{member.name[0]}</span>
                            )}
                        </div>
                        <div>
                            <p className="font-bold text-slate-900">{member.name}</p>
                            <p className="text-xs text-slate-400 font-medium">Previous: {currentPlan?.name || 'No Plan'}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Plan Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Select Renewal Plan</label>
                            <select
                                value={selectedPlanId}
                                onChange={(e) => setSelectedPlanId(e.target.value)}
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            >
                                {plans.map(plan => (
                                    <option key={plan.id} value={plan.id}>
                                        {plan.name} - ₹{plan.price} ({plan.durationDays} Days)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Discount & Amount */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Discount (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={discount}
                                    onChange={(e) => setDiscount(Number(e.target.value))}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div className="bg-blue-50 p-4 rounded-2xl flex flex-col justify-center items-end border border-blue-100">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Total to Pay</span>
                                <span className="text-2xl font-black text-blue-600">₹{finalAmount}</span>
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Payment Method</label>
                            <div className="grid grid-cols-4 gap-2">
                                {(['CASH', 'ONLINE', 'CARD', 'POS'] as const).map(method => (
                                    <button
                                        key={method}
                                        type="button"
                                        onClick={() => setPaymentMethod(method)}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentMethod === method
                                                ? 'bg-slate-900 text-white shadow-lg shadow-slate-200 scale-105'
                                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:scale-105'
                                            }`}
                                    >
                                        {method}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-lg hover:shadow-xl hover:shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-tight"
                    >
                        Process Renewal
                    </button>
                </form>
            </div>
        </div>
    );
};
