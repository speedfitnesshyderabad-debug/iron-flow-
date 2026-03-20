
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole, PlanType, SubscriptionStatus } from '../types';
import PayslipModal from '../components/PayslipModal';
import { calculateMonthlySalary } from '../src/utils/payrollUtils';

const MyEarnings: React.FC = () => {
  const { currentUser, attendance, sales, bookings, plans, subscriptions, branches, payroll, holidays } = useAppContext();

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Dynamic years: 2 years back to 2 years forward from current year
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const currentBranch = useMemo(() =>
    branches.find(b => b.id === currentUser?.branchId) || branches[0] || ({} as any),
    [currentUser, branches]);

  // Personal Calculations
  const stats = useMemo(() => {
    if (!currentUser) return null;

    // 1. Check for Finalized Payroll Record
    const finalizedRecord = payroll.find(p =>
      p.staffId === currentUser.id &&
      p.month === months[selectedMonth] &&
      p.year === selectedYear
    );

    let salaryStats;

    if (finalizedRecord) {
      // Use Finalized Data
      salaryStats = {
        baseSalary: finalizedRecord.baseSalary,
        // finalBaseSalary = base after deductions (commissions are shown separately)
        finalBaseSalary: finalizedRecord.baseSalary - finalizedRecord.deductions,
        deductions: finalizedRecord.deductions,
        payableDays: finalizedRecord.payableDays,
        presentDays: finalizedRecord.details?.presentDays || 0,
        totalDays: finalizedRecord.details?.totalDays || 30,
        weekOffs: finalizedRecord.details?.weekOffs || 0,
        holidays: finalizedRecord.details?.holidays || 0,
        lateDays: finalizedRecord.details?.lateDays || 0,
        halfDays: finalizedRecord.details?.halfDays || 0,
        absentDays: finalizedRecord.details?.absentDays || 0,
        penaltyDays: finalizedRecord.details?.penaltyDays || 0,
        forgotCheckoutAmount: finalizedRecord.details?.forgotCheckoutAmount || 0,
        dailyRate: finalizedRecord.details?.dailyRate || 0,
        breakdown: finalizedRecord.details?.breakdown || (finalizedRecord.status === 'PAID' ? 'PAID' : 'GENERATED'),
        isFinalized: true
      };
    } else {
      // Use Live Calculation
      salaryStats = calculateMonthlySalary(currentUser, attendance, selectedMonth, selectedYear, branches, holidays);
    }


    // 2. Commissions (Only calc if NOT finalized or if we want to show breakdown)
    // If finalized, we use record.commissionAmount.
    // But we might still want to show the breakdown of *how* it was reached if possible? 
    // Or just trust the record? 
    // Let's trust the record if finalized.

    let commissions = 0;
    let incentiveParts: string[] = [];

    if (finalizedRecord) {
      commissions = finalizedRecord.commissionAmount || 0;
      incentiveParts.push(finalizedRecord.status === 'PAID' ? 'Paid with Salary' : 'Included in Payroll');
    } else {
      // ... Live Calc Logic ...
      // A. Session Commissions (Trainers Only)
      if (currentUser.role === UserRole.TRAINER) {
        const completedBookings = bookings.filter(b => {
          const d = new Date(b.date);
          return (
            b.trainerId === currentUser.id &&
            b.status === 'COMPLETED' &&
            d.getMonth() === selectedMonth &&
            d.getFullYear() === selectedYear
          );
        });

        const sessionRate = currentUser.commissionPercentage || 0;
        const sessionEarnings = completedBookings.map(booking => {
          const sub = subscriptions.find(s =>
            s.memberId === booking.memberId &&
            s.status === SubscriptionStatus.ACTIVE &&
            plans.find(p => p.id === s.planId)?.type === booking.type
          );
          const plan = plans.find(p => p.id === (sub?.planId || ''));
          if (!plan) return 0;
          const maxSessions = plan.maxSessions || 1;
          const unitPrice = plan.price / maxSessions;
          return unitPrice * (sessionRate / 100);
        });

        const totalSessionComm = sessionEarnings.reduce((acc, e) => acc + e, 0);
        if (totalSessionComm > 0) {
          commissions += totalSessionComm;
          incentiveParts.push(`${completedBookings.length} Sessions (${sessionRate}%)`);
        }
      }
    }

    // B. Sales Commissions (Managers AND Trainers)
    if (!finalizedRecord && (currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.TRAINER)) {
      const mySales = sales.filter(s => {
        const d = new Date(s.date);
        return (
          s.staffId === currentUser.id &&
          d.getMonth() === selectedMonth &&
          d.getFullYear() === selectedYear
        );
      });

      // Group sales by Plan Type
      const gymSales = mySales.filter(s => plans.find(p => p.id === s.planId)?.type === PlanType.GYM);
      const ptSales = mySales.filter(s => plans.find(p => p.id === s.planId)?.type === PlanType.PT);
      const groupSales = mySales.filter(s => plans.find(p => p.id === s.planId)?.type === PlanType.GROUP);

      // 1. Gym Sales
      if (gymSales.length > 0) {
        const rate = currentUser.salesCommissionPercentage ?? currentUser.commissionPercentage ?? 0;
        const earnings = gymSales.reduce((acc, s) => acc + (s.amount * (rate / 100)), 0);

        if (earnings > 0) {
          commissions += earnings;
          incentiveParts.push(`${gymSales.length} Gym Sales (${rate}%)`);
        }
      }

      // 2. PT Sales
      if (ptSales.length > 0) {
        let rate = 0;
        if (currentUser.role === UserRole.MANAGER) {
          rate = currentUser.ptCommissionPercentage ?? 0;
        } else {
          rate = currentUser.salesCommissionPercentage ?? currentUser.commissionPercentage ?? 0;
        }

        const earnings = ptSales.reduce((acc, s) => acc + (s.amount * (rate / 100)), 0);
        if (earnings > 0) {
          commissions += earnings;
          incentiveParts.push(`${ptSales.length} PT Sales (${rate}%)`);
        }
      }

      // 3. Group Sales
      if (groupSales.length > 0) {
        let rate = 0;
        if (currentUser.role === UserRole.MANAGER) {
          rate = currentUser.groupCommissionPercentage ?? 0;
        } else {
          rate = currentUser.salesCommissionPercentage ?? currentUser.commissionPercentage ?? 0;
        }

        const earnings = groupSales.reduce((acc, s) => acc + (s.amount * (rate / 100)), 0);
        if (earnings > 0) {
          commissions += earnings;
          incentiveParts.push(`${groupSales.length} Group Sales (${rate}%)`);
        }
      }
    }

    const incentiveType = incentiveParts.length > 0
      ? incentiveParts.join(' + ')
      : "No incentives found";

    return {
      ...salaryStats,
      commissions,
      incentiveType,
      total: finalizedRecord ? finalizedRecord.netSalary : (salaryStats.finalBaseSalary + commissions)
    };
  }, [currentUser, attendance, bookings, sales, plans, subscriptions, selectedMonth, selectedYear, payroll]);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
  };

  // Day-by-day attendance for the calendar
  const calendarDays = useMemo(() => {
    if (!currentUser) return [];
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const today = new Date();
    const lastDay = new Date(selectedYear, selectedMonth, daysInMonth) > today
      ? today.getDate() : daysInMonth;
    const branchHolidays = holidays
      .filter(h => h.branchId === currentUser.branchId)
      .map(h => h.date);
    const userWeekOffs = currentUser.weekOffs || [];

    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const currentDate = new Date(selectedYear, selectedMonth, d);
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      const isFuture = d > lastDay;
      const isWO = userWeekOffs.includes(dayName);
      const isHol = branchHolidays.includes(dateStr);
      const dayLogs = attendance.filter(a => a.userId === currentUser.id && a.date === dateStr);
      const isPresent = dayLogs.length > 0;

      let status: 'present' | 'late' | 'halfday' | 'absent' | 'weekend' | 'holiday' | 'future' = 'future';
      if (isFuture) {
        status = 'future';
      } else if (isPresent) {
        // Determine late / halfday
        const hasOpenSession = dayLogs.some(l => !l.timeOut);
        let totalMinutes = 0;
        dayLogs.forEach(l => {
          if (l.timeOut) {
            totalMinutes += (new Date(`2000-01-01 ${l.timeOut}`).getTime() - new Date(`2000-01-01 ${l.timeIn}`).getTime()) / 60000;
          }
        });
        const firstLog = dayLogs.reduce((a, b) => a.timeIn < b.timeIn ? a : b);
        const punchIn = new Date(`2000-01-01 ${firstLog.timeIn}`);
        let isLate = false;
        if (currentUser.shifts && currentUser.shifts.length > 0) {
          let matchedShift: {start: string; end: string} | null = null;
          let minDiff = Number.MAX_VALUE;
          currentUser.shifts.forEach(s => {
            const diff = Math.abs(punchIn.getTime() - new Date(`2000-01-01 ${s.start}`).getTime());
            if (diff < minDiff && diff < 2 * 60 * 60 * 1000) { minDiff = diff; matchedShift = s; }
          });
          if (matchedShift) {
            const shiftStartMs = new Date(`2000-01-01 ${(matchedShift as any).start}`).getTime();
            const diffMins = (punchIn.getTime() - shiftStartMs) / 60000;
            isLate = diffMins > 15;
          }
        }
        if (!hasOpenSession && totalMinutes < (currentUser.halfDayHours ?? 4) * 60) status = 'halfday';
        else if (!hasOpenSession && totalMinutes < (currentUser.fullDayHours ?? 8) * 60) status = 'halfday';
        else if (isLate) status = 'late';
        else status = 'present';
      } else if (isWO) {
        status = 'weekend';
      } else if (isHol) {
        status = 'holiday';
      } else {
        status = 'absent';
      }
      days.push({ day: d, dateStr, status, dayName: dayName.slice(0, 3) });
    }
    return days;
  }, [currentUser, attendance, selectedMonth, selectedYear, holidays]);

  const dayStatusConfig = {
    present:  { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '✓' },
    late:     { bg: 'bg-amber-100',   text: 'text-amber-700',   label: '⏰' },
    halfday:  { bg: 'bg-orange-100',  text: 'text-orange-700',  label: '½' },
    absent:   { bg: 'bg-red-100',     text: 'text-red-600',     label: '✕' },
    weekend:  { bg: 'bg-slate-100',   text: 'text-slate-400',   label: '☽' },
    holiday:  { bg: 'bg-blue-100',    text: 'text-blue-600',    label: '★' },
    future:   { bg: 'bg-gray-50',     text: 'text-gray-300',    label: '·' },
  };

  const isFutureMonth = new Date(selectedYear, selectedMonth, 1) > new Date();

  if (!currentUser) return null;

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">My Earnings Hub</h2>
          <p className="text-slate-500 font-medium">Personal income breakdown & official payslips</p>
        </div>

        <div className="flex bg-white p-2 rounded-2xl border shadow-sm items-center gap-4">
          <div className="flex items-center gap-2">
            <select className="p-2.5 bg-slate-50 border rounded-xl outline-none font-bold text-xs uppercase" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
              {months.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
            </select>
            <select className="p-2.5 bg-slate-50 border rounded-xl outline-none font-bold text-xs" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button
            onClick={() => {
              setIsPayslipOpen(true);
            }}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <i className="fas fa-file-invoice-dollar"></i> GENERATE PAYSLIP
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Net Income</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(stats?.total || 0)}</h3>
            <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between text-left">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Payable Days</p>
                <p className="font-bold text-sm text-slate-700">{stats?.payableDays} / {stats?.totalDays}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase">Deductions</p>
                <p className="font-bold text-sm text-red-500">-{formatCurrency(stats?.deductions || 0)}</p>
              </div>
            </div>
          </div>

          <div className="bg-emerald-950 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Commission Earned</p>
              <h3 className="text-3xl font-black">{formatCurrency(stats?.commissions || 0)}</h3>
              <p className="text-xs text-emerald-300 font-medium mt-4 leading-relaxed opacity-80">{stats?.incentiveType}</p>
            </div>
            <i className="fas fa-coins absolute -bottom-10 -right-10 text-[150px] text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-1000"></i>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <div className="bg-white rounded-[3rem] border shadow-sm overflow-hidden">
            <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Earnings Breakdown</h3>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period: {months[selectedMonth]} {selectedYear}</span>
                {stats?.isFinalized && <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-100 px-2 py-0.5 rounded-full mt-1">FINALIZED</span>}
              </div>
            </div>
            <div className="p-8">
              {isFutureMonth && (
                <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <i className="fas fa-clock text-amber-500 text-lg"></i>
                  <div>
                    <p className="text-sm font-black text-amber-700 uppercase">Future Month Selected</p>
                    <p className="text-xs text-amber-600 font-medium mt-0.5">{months[selectedMonth]} {selectedYear} hasn't started yet. No earnings data available.</p>
                  </div>
                </div>
              )}
              <div className="space-y-6">
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center">
                      <i className="fas fa-clock"></i>
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 uppercase">Monthly Earnings</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                        Base: {formatCurrency(stats?.baseSalary || 0)}
                        {stats?.deductions > 0 && <span className="text-red-500 block">Deductions: -{formatCurrency(stats?.deductions)} ({stats?.breakdown})</span>}
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-black text-slate-900">{formatCurrency(stats?.finalBaseSalary || 0)}</p>
                </div>

                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="bg-emerald-50 text-emerald-600 w-12 h-12 rounded-2xl flex items-center justify-center">
                      <i className="fas fa-chart-line"></i>
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 uppercase">Commissions / Incentives</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currentUser.role === UserRole.TRAINER ? 'Per Session' : 'Per Gym Enrollment'}</p>
                    </div>
                  </div>
                  <p className="text-lg font-black text-emerald-600">+{formatCurrency(stats?.commissions || 0)}</p>
                </div>

                <div className="pt-8 mt-8 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-xl font-black text-slate-900 uppercase">Total Professional Income</p>
                  <p className="text-3xl font-black text-slate-900">{formatCurrency(stats?.total || 0)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] relative overflow-hidden">
              <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-6">Security & Transparency</h4>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <i className="fas fa-shield-check text-blue-500 mt-1"></i>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">All punch-in logs are geo-verified and finalized at the end of each shift.</p>
                </div>
                <div className="flex gap-4">
                  <i className="fas fa-file-contract text-blue-500 mt-1"></i>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">Commissions are auto-attributed based on member enrollment staff signatures.</p>
                </div>
              </div>
              <i className="fas fa-fingerprint absolute -bottom-10 -right-10 text-[150px] text-white/5"></i>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-8 rounded-[2.5rem] flex flex-col justify-center items-center text-center gap-4">
              <div className="bg-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-blue-600">
                <i className="fas fa-download text-xl"></i>
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase">Need a PDF?</h4>
                <p className="text-xs text-slate-500 font-medium mt-1">Generate your official tax-compliant payslip for this month.</p>
              </div>
              <button
                onClick={() => {
                  setIsPayslipOpen(true);
                }}
                className="mt-2 text-blue-600 font-black text-[10px] uppercase tracking-widest bg-white px-6 py-2.5 rounded-xl border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              >
                Open Payslip Generator
              </button>
            </div>
          </div>

          {/* Day-by-Day Attendance Calendar */}
          <div className="bg-white rounded-[3rem] border shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Attendance Calendar</h3>
              <div className="flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-slate-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 inline-block"></span>Present</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 inline-block"></span>Late</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 inline-block"></span>Half Day</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block"></span>Absent</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 inline-block"></span>Holiday</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100 inline-block"></span>Week Off</span>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-7 gap-1.5">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                  <div key={d} className="text-center text-[8px] font-black text-slate-400 uppercase tracking-widest pb-2">{d}</div>
                ))}
                {/* Offset start to match correct weekday */}
                {Array.from({ length: new Date(selectedYear, selectedMonth, 1).getDay() }).map((_, i) => (
                  <div key={`offset-${i}`} />
                ))}
                {calendarDays.map(({ day, status }) => {
                  const cfg = dayStatusConfig[status];
                  return (
                    <div
                      key={day}
                      title={status.charAt(0).toUpperCase() + status.slice(1)}
                      className={`${cfg.bg} ${cfg.text} rounded-xl flex flex-col items-center justify-center aspect-square text-[10px] font-black transition-transform hover:scale-105 cursor-default`}
                    >
                      <span className="text-[8px] opacity-50 leading-none">{day}</span>
                      <span className="leading-tight">{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>

      {isPayslipOpen && stats && (
        <PayslipModal
          user={currentUser}
          branch={currentBranch}
          month={months[selectedMonth]}
          year={selectedYear}
          earnings={stats}
          onClose={() => setIsPayslipOpen(false)}
        />
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default MyEarnings;
