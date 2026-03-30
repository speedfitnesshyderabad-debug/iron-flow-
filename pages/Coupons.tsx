
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole, Coupon } from '../types';

const Coupons: React.FC = () => {
    const { coupons, addCoupon, updateCoupon, deleteCoupon, branches, currentUser, showToast } = useAppContext();
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

    const [formData, setFormData] = useState({
        code: '',
        type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
        value: 0,
        minPurchase: 0,
        maxDiscount: 0,
        expiryDate: '',
        usageLimit: 0,
        branchId: currentUser?.role === UserRole.SUPER_ADMIN ? '' : currentUser?.branchId || '',
        isActive: true
    });

    const handleOpenAdd = () => {
        setSelectedCoupon(null);
        setFormData({
            code: '',
            type: 'PERCENTAGE',
            value: 0,
            minPurchase: 0,
            maxDiscount: 0,
            expiryDate: '',
            usageLimit: 0,
            branchId: currentUser?.role === UserRole.SUPER_ADMIN ? '' : currentUser?.branchId || '',
            isActive: true
        });
        setModalOpen(true);
    };

    const handleOpenEdit = (coupon: Coupon) => {
        setSelectedCoupon(coupon);
        setFormData({
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            minPurchase: coupon.minPurchase || 0,
            maxDiscount: coupon.maxDiscount || 0,
            expiryDate: coupon.expiryDate || '',
            usageLimit: coupon.usageLimit || 0,
            branchId: coupon.branchId || '',
            isActive: coupon.isActive
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code || formData.value <= 0) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            const couponData = {
                ...formData,
                code: formData.code.toUpperCase(),
                branchId: formData.branchId === '' ? null : formData.branchId,
                minPurchase: formData.minPurchase || 0,
                maxDiscount: formData.maxDiscount || null,
                expiryDate: formData.expiryDate || null,
                usageLimit: formData.usageLimit || null
            };

            if (selectedCoupon) {
                await updateCoupon(selectedCoupon.id, couponData);
            } else {
                await addCoupon(couponData);
            }
            setModalOpen(false);
        } catch (err) {
            console.error('Submit error:', err);
        }
    };

    const filteredCoupons = currentUser?.role === UserRole.SUPER_ADMIN
        ? coupons
        : coupons.filter(c => !c.branchId || c.branchId === currentUser?.branchId);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Discount Coupons</h2>
                    <p className="text-slate-500 font-medium text-sm">Manage promotional codes and campaign discounts</p>
                </div>
                <button
                    onClick={handleOpenAdd}
                    className="w-full md:w-auto bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 active:scale-95"
                >
                    <i className="fas fa-plus"></i> NEW COUPON
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCoupons.map(coupon => (
                    <div key={coupon.id} className="bg-white rounded-3xl border shadow-sm p-6 hover:shadow-md transition-all relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 ${coupon.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>

                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl">
                                {coupon.type === 'PERCENTAGE' ? '%' : '₹'}
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={`text-[10px] font-black px-2 py-1 rounded mb-1 uppercase ${coupon.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    {coupon.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase">
                                    {coupon.branchId ? branches.find(b => b.id === coupon.branchId)?.name : 'GLOBAL'}
                                </span>
                            </div>
                        </div>

                        <h3 className="text-2xl font-black text-gray-900 tracking-tighter mb-1 select-all">{coupon.code}</h3>
                        <p className="text-sm font-bold text-blue-600 mb-4">
                            {coupon.type === 'PERCENTAGE' ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`}
                        </p>

                        <div className="space-y-2 border-t pt-4 border-gray-50 mb-6">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400 font-medium italic">Min Purchase</span>
                                <span className="text-gray-900 font-bold">₹{coupon.minPurchase || 0}</span>
                            </div>
                            {coupon.expiryDate && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400 font-medium italic">Expires</span>
                                    <span className="text-gray-900 font-bold">{coupon.expiryDate}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400 font-medium italic">Usage</span>
                                <span className="text-gray-900 font-bold">{coupon.timesUsed} / {coupon.usageLimit || '∞'}</span>
                            </div>
                        </div>

                        <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                            <button
                                onClick={() => handleOpenEdit(coupon)}
                                className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-[10px] hover:bg-slate-100 transition-colors uppercase tracking-widest"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => { if (confirm('Delete this coupon?')) deleteCoupon(coupon.id); }}
                                className="flex-1 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-[10px] hover:bg-red-100 transition-colors uppercase tracking-widest"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-[slideUp_0.3s_ease-out] overflow-y-auto max-h-[90dvh]">
                        <h3 className="text-2xl font-bold mb-6 tracking-tight uppercase">
                            {selectedCoupon ? 'Update Coupon' : 'Create New Coupon'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Coupon Code</label>
                                    <input
                                        required
                                        placeholder="WINTER2025"
                                        className="w-full p-4 bg-gray-50 border rounded-2xl outline-none font-black text-lg uppercase tracking-widest"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Discount Type</label>
                                        <select
                                            className="w-full p-4 bg-gray-50 border rounded-2xl outline-none font-bold text-xs"
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                        >
                                            <option value="PERCENTAGE">Percentage (%)</option>
                                            <option value="FIXED">Fixed Amount (₹)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Discount Value</label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full p-4 bg-gray-50 border rounded-2xl outline-none font-bold text-xs"
                                            value={formData.value}
                                            onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Min Purchase (₹)</label>
                                        <input
                                            type="number"
                                            className="w-full p-4 bg-gray-50 border rounded-2xl outline-none font-bold text-xs"
                                            value={formData.minPurchase}
                                            onChange={e => setFormData({ ...formData, minPurchase: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Max Discount (₹)</label>
                                        <input
                                            type="number"
                                            placeholder="Optional"
                                            className="w-full p-4 bg-gray-50 border rounded-2xl outline-none font-bold text-xs"
                                            value={formData.maxDiscount}
                                            onChange={e => setFormData({ ...formData, maxDiscount: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiry Date</label>
                                        <input
                                            type="date"
                                            className="w-full p-4 bg-gray-50 border rounded-2xl outline-none font-bold text-xs"
                                            value={formData.expiryDate}
                                            onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usage Limit</label>
                                        <input
                                            type="number"
                                            placeholder="∞"
                                            className="w-full p-4 bg-gray-50 border rounded-2xl outline-none font-bold text-xs"
                                            value={formData.usageLimit}
                                            onChange={e => setFormData({ ...formData, usageLimit: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                {currentUser?.role === UserRole.SUPER_ADMIN && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch Restriction</label>
                                        <select
                                            className="w-full p-4 bg-gray-50 border rounded-2xl outline-none font-bold text-xs"
                                            value={formData.branchId}
                                            onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                                        >
                                            <option value="">ALL BRANCHES (GLOBAL)</option>
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={formData.isActive}
                                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <label htmlFor="isActive" className="text-xs font-black text-slate-600 uppercase tracking-wider select-none cursor-pointer">
                                        Enable Coupon Immediatey
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 flex flex-col gap-2">
                                <button
                                    type="submit"
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-all uppercase tracking-tighter shadow-xl shadow-slate-200"
                                >
                                    {selectedCoupon ? 'Update Campaign' : 'Launch Campaign'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors uppercase text-[10px] tracking-[0.2em]"
                                >
                                    CANCEL
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
        </div>
    );
};

export default Coupons;
