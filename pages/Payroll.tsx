import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { calculateMonthlySalary, SalaryBreakdown } from '../src/utils/payrollUtils';
import { UserRole, Payroll as PayrollType, User } from '../types';
import PayslipModal from '../components/PayslipModal';

const Payroll: React.FC = () => {
    const { users, attendance, payroll, branches, addPayroll, updatePayroll, deletePayroll, currentUser, holidays, selectedBranchId: globalBranchId, bookings, subscriptions, plans, sales } = useAppContext();

    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
        if (currentUser?.role === UserRole.SUPER_ADMIN) {
            return globalBranchId === 'all' ? 'ALL' : globalBranchId;
        }
        return currentUser?.branchId || branches[0]?.id || '';
    });

    // Sync with global branch selection
    useEffect(() => {
        if (currentUser?.role === UserRole.SUPER_ADMIN) {
            setSelectedBranchId(globalBranchId === 'all' ? 'ALL' : globalBranchId);
        }
    }, [globalBranchId, currentUser?.role]);

    const [isPayslipOpen, setIsPayslipOpen] = useState(false);
    const [selectedPayslipData, setSelectedPayslipData] = useState<any>(null); // To pass to modal
    const [processingId, setProcessingId] = useState<string | null>(null);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    // Filter Staff by Branch
    const branchStaff = useMemo(() => {
        return users.filter(u =>
            u.role !== UserRole.MEMBER &&
            u.role !== UserRole.SUPER_ADMIN && // Usually Super Admin pays themselves differently? Or include? Let's exclude for now or include if they belong to branch.
            (selectedBranchId === 'ALL' || u.branchId === selectedBranchId)
        );
    }, [users, selectedBranchId]);

    // Calculate real commission earned — trainer session commissions + sales commissions
    const calculateCommission = (staffId: string, month: number, year: number) => {
        const staff = users.find(u => u.id === staffId);
        if (!staff) return 0;

        let totalCommission = 0;

        // A. Trainer Session Commissions (only for trainers with completed bookings)
        if (staff.role === UserRole.TRAINER) {
            const commissionRate = (staff.commissionPercentage || 0) / 100;
            if (commissionRate > 0) {
                const completedBookings = bookings.filter(b => {
                    if (b.trainerId !== staffId) return false;
                    if (b.status !== 'COMPLETED') return false;
                    const d = new Date(b.date);
                    return d.getMonth() === month && d.getFullYear() === year;
                });
                completedBookings.forEach(b => {
                    const sub = subscriptions.find(s =>
                        s.memberId === b.memberId &&
                        s.trainerId === staffId &&
                        s.status === 'ACTIVE'
                    );
                    const plan = sub ? plans.find(p => p.id === sub.planId) : null;
                    const sessionValue = plan?.price && plan?.maxSessions
                        ? plan.price / plan.maxSessions : 0;
                    totalCommission += sessionValue * commissionRate;
                });
            }
        }

        // B. Sales Commissions (Managers & Trainers via staffId on sales)
        const mySales = sales.filter(s => {
            const d = new Date(s.date);
            return s.staffId === staffId && d.getMonth() === month && d.getFullYear() === year;
        });
        mySales.forEach(sale => {
            const plan = plans.find(p => p.id === sale.planId);
            if (!plan) return;
            let rate = 0;
            if (plan.type === 'GYM') rate = staff.salesCommissionPercentage ?? staff.commissionPercentage ?? 0;
            else if (plan.type === 'PT') rate = staff.ptCommissionPercentage ?? staff.salesCommissionPercentage ?? 0;
            else if (plan.type === 'GROUP') rate = staff.groupCommissionPercentage ?? staff.salesCommissionPercentage ?? 0;
            totalCommission += sale.amount * (rate / 100);
        });

        return Math.round(totalCommission);
    };

    // Combine Live Data with Saved Payroll Records
    const payrollData = useMemo(() => {
        return branchStaff.map(staff => {
            // Check if a record exists
            const existingRecord = payroll.find(p =>
                p.staffId === staff.id &&
                p.month === months[selectedMonth] &&
                p.year === selectedYear
            );

            if (existingRecord) {
                return {
                    user: staff,
                    status: existingRecord.status,
                    record: existingRecord,
                    isLive: false,
                    data: {
                        baseSalary: existingRecord.baseSalary,
                        deductions: existingRecord.deductions,
                        // finalBaseSalary = base pay after deductions (before commissions)
                        finalBaseSalary: existingRecord.baseSalary - existingRecord.deductions,
                        netSalary: existingRecord.netSalary,
                        commission: existingRecord.commissionAmount,
                        payableDays: existingRecord.payableDays
                    }
                };
            }

            // Calculate Live
            const stats = calculateMonthlySalary(staff, attendance, selectedMonth, selectedYear, branches, holidays);
            const commission = calculateCommission(staff.id, selectedMonth, selectedYear);

            return {
                user: staff,
                status: 'ESTIMATED',
                record: null,
                isLive: true,
                stats: stats, // Full details for generation
                data: {
                    baseSalary: stats.baseSalary,
                    deductions: stats.deductions,
                    finalBaseSalary: stats.finalBaseSalary,
                    netSalary: stats.finalBaseSalary + commission,
                    commission: commission,
                    payableDays: stats.payableDays
                }
            };
        });
    }, [branchStaff, payroll, selectedMonth, selectedYear, attendance, branches, bookings, subscriptions, plans]);

    const handleGenerate = async (item: any) => {
        if (processingId) return;
        setProcessingId(item.user.id);

        try {
            const { stats } = item;
            // Define Record
            const newRecord: PayrollType = {
                // id will be auto-gen by DB or we let Supabase handle it if we omit? 
                // Our interface says 'id' is string. Supabase usually auto-gens. 
                // But our `addPayroll` might need it? 
                // Let's check `types.ts`. It says `id: string`. 
                // Usually we omit ID for insert. 
                // Let's assume we need to cast or omit.
                // Wait, `addPayroll` takes `Payroll`. 
                // I'll assume we can pass a partial or let utility handle it. 
                // But `addPayroll` in `AppContext` uses `insert(record)`.
                // Let's generate a UUID or let PG do it. 
                // To be safe, I'll not pass ID and let supabase do it, but TS might complain.
                // I'll type cast.

                staffId: item.user.id,
                branchId: item.user.branchId,
                month: months[selectedMonth],
                year: selectedYear,
                baseSalary: stats.baseSalary,
                payableDays: stats.payableDays,
                deductions: stats.deductions,
                commissionAmount: calculateCommission(item.user.id, selectedMonth, selectedYear),
                netSalary: stats.finalBaseSalary + calculateCommission(item.user.id, selectedMonth, selectedYear),
                status: 'GENERATED',
                generatedAt: new Date().toISOString(),
                details: {
                    totalDays: stats.totalDays,
                    presentDays: stats.presentDays,
                    weekOffs: stats.weekOffs,
                    holidays: stats.holidays,
                    lateDays: stats.lateDays,
                    halfDays: stats.halfDays,
                    absentDays: stats.absentDays,
                    penaltyDays: stats.penaltyDays,
                    forgotCheckoutPenalties: stats.forgotCheckoutPenalties,
                    forgotCheckoutAmount: stats.forgotCheckoutAmount,
                    dailyRate: stats.dailyRate
                }
            } as any; // Type cast to avoid ID issue if optional

            await addPayroll(newRecord);
        } catch (e) {
            console.error(e);
        } finally {
            setProcessingId(null);
        }
    };

    const handleMarkPaid = async (record: PayrollType) => {
        if (processingId) return;
        setProcessingId(record.id);
        try {
            await updatePayroll(record.id, {
                status: 'PAID',
                paidAt: new Date().toISOString()
            });
        } catch (e) { console.error(e); }
        finally { setProcessingId(null); }
    };

    const handleDeletePayroll = async (record: PayrollType) => {
        if (processingId) return;
        if (!window.confirm("Are you sure you want to discard this generated payslip and recalculate based on their live base salary?")) return;

        setProcessingId(record.id);
        try {
            await deletePayroll(record.id);
        } catch (e) { console.error(e); }
        finally { setProcessingId(null); }
    };

    const handleViewPayslip = (item: any) => {
        // Construct data for Modal
        const combinedData = {
            baseSalary: item.data.baseSalary,
            deductions: item.data.deductions,
            finalBaseSalary: item.data.finalBaseSalary,
            commissions: item.data.commission,
            total: item.data.netSalary,
            incentiveType: item.data.commission > 0 ? 'Commission' : 'None',
            payableDays: item.data.payableDays,
            totalDays: item.isLive ? item.stats.totalDays : item.record?.details?.totalDays || 30,
            breakdown: item.isLive ? item.stats.breakdown : 'Finalized Record'
        };

        setSelectedPayslipData({
            user: item.user,
            branch: branches.find(b => b.id === item.user.branchId) || branches[0] || ({} as any),
            month: months[selectedMonth],
            year: selectedYear,
            earnings: combinedData
        });
        setIsPayslipOpen(true);
    };

    const formatCurrency = (amt: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
    };

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Payroll Manager</h2>
                    <p className="text-slate-500 font-medium">Generate, review, and disburse staff salaries.</p>
                </div>

                <div className="flex flex-wrap bg-white p-2 rounded-2xl border shadow-sm items-center gap-4">
                    <select className="p-2.5 bg-slate-50 border rounded-xl outline-none font-bold text-xs uppercase" value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}>
                        {currentUser?.role === UserRole.SUPER_ADMIN && <option value="ALL">All Branches</option>}
                        {branches.map(b => (
                            (currentUser?.role === UserRole.SUPER_ADMIN || b.id === currentUser?.branchId) &&
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                    <div className="w-px h-6 bg-slate-200"></div>
                    <select className="p-2.5 bg-slate-50 border rounded-xl outline-none font-bold text-xs uppercase" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                        {months.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
                    </select>
                    <select className="p-2.5 bg-slate-50 border rounded-xl outline-none font-bold text-xs" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead className="bg-slate-50 border-b">
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-5">Employee</th>
                                <th className="px-6 py-5">Role</th>
                                <th className="px-6 py-5 text-right">Base Pay</th>
                                <th className="px-6 py-5 text-center">Days Payable</th>
                                <th className="px-6 py-5 text-right">Deductions</th>
                                <th className="px-6 py-5 text-right">Net Salary</th>
                                <th className="px-6 py-5 text-center">Status</th>
                                <th className="px-6 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payrollData.length === 0 ? (
                                <tr><td colSpan={8} className="p-12 text-center text-slate-400 font-bold italic">No staff found for this criteria.</td></tr>
                            ) : (
                                payrollData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <img src={item.user.avatar} className="w-10 h-10 rounded-xl object-cover" alt="" />
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm uppercase">{item.user.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">{item.user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">
                                                {item.user.role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right font-bold text-slate-600">
                                            {formatCurrency(item.data.baseSalary)}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="font-black text-slate-900">{item.data.payableDays}</span>
                                            <span className="text-[10px] text-slate-400"> / {item.isLive ? item.stats.totalDays : item.record?.details?.totalDays || 30}d</span>
                                        </td>
                                        <td className="px-6 py-5 text-right font-bold text-red-500">
                                            {item.data.deductions > 0 ? `-${formatCurrency(item.data.deductions)}` : '-'}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <span className="text-lg font-black text-emerald-600">{formatCurrency(item.data.netSalary)}</span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            {item.status === 'PAID' && (
                                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                    <i className="fas fa-check-circle"></i> PAID
                                                </span>
                                            )}
                                            {item.status === 'GENERATED' && (
                                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                    <i className="fas fa-file-invoice"></i> PENDING
                                                </span>
                                            )}
                                            {item.status === 'ESTIMATED' && (
                                                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                    <i className="fas fa-calculator"></i> LIVE EST.
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                {item.status === 'ESTIMATED' && (
                                                    <button
                                                        onClick={() => handleGenerate(item)}
                                                        disabled={!!processingId}
                                                        className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                                    >
                                                        GENERATE
                                                    </button>
                                                )}
                                                {item.status === 'GENERATED' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleMarkPaid(item.record)}
                                                            disabled={!!processingId}
                                                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                                        >
                                                            PAY
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePayroll(item.record)}
                                                            disabled={!!processingId}
                                                            title="Recalculate Payroll based on current Staff Settings"
                                                            className="bg-amber-100 text-amber-700 px-3 py-2 rounded-xl text-[10px] font-black hover:bg-amber-200 transition-all disabled:opacity-50"
                                                        >
                                                            <i className="fas fa-sync-alt"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleViewPayslip(item)}
                                                            className="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-[10px] font-black hover:bg-slate-50 transition-all"
                                                        >
                                                            <i className="fas fa-eye"></i>
                                                        </button>
                                                    </>
                                                )}
                                                {item.status === 'PAID' && (
                                                    <button
                                                        onClick={() => handleViewPayslip(item)}
                                                        className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
                                                    >
                                                        <i className="fas fa-file-contract mr-2"></i> SLIP
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isPayslipOpen && selectedPayslipData && (
                <PayslipModal
                    user={selectedPayslipData.user}
                    branch={selectedPayslipData.branch}
                    month={selectedPayslipData.month}
                    year={selectedPayslipData.year}
                    earnings={selectedPayslipData.earnings}
                    onClose={() => setIsPayslipOpen(false)}
                />
            )}
        </div>
    );
};

export default Payroll;
