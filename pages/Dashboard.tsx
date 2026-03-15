import React, { useState, useMemo } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole, PlanType, SubscriptionStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { QuickRenewModal } from '../components/QuickRenewModal';
import { todayDateStr, addDays, currentMonthIdx, currentYear, currentTimeStr, isSubscriptionActive } from '../utils/dates';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const Dashboard: React.FC = () => {
  const { currentUser, subscriptions, plans, sales, users, attendance, metrics, purchaseSubscription, showToast, isRowVisible, bookings } = useAppContext();
  const [isRenewModalOpen, setRenewModalOpen] = useState(false);
  const [renewTarget, setRenewTarget] = useState<{ member: any, currentPlan: any } | null>(null);

  if (!currentUser) return null;

  const isAdmin = [UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN, UserRole.MANAGER].includes(currentUser.role);
  const isTrainer = currentUser.role === UserRole.TRAINER;

  // Role-based filtering for data
  const filteredSubs = subscriptions.filter(s => isRowVisible(s.branchId));
  const filteredSales = sales.filter(s => isRowVisible(s.branchId));

  // RENEWAL LOGIC
  const today = todayDateStr();
  const next7Days = addDays(today, 7);

  const expiringSubs = filteredSubs.filter(s =>
    s.status === SubscriptionStatus.ACTIVE &&
    s.endDate <= next7Days &&
    s.endDate >= today // Inclusive of today
  );

  const expiredSubs = filteredSubs.filter(s =>
    s.status === SubscriptionStatus.EXPIRED ||
    (s.status === SubscriptionStatus.ACTIVE && s.endDate < today) // Strict less than today
  );

  const handleOpenRenew = (sub: any) => {
    const member = sub.member || users.find((u: any) => u.id === sub.memberId);
    const currentPlan = plans.find(p => p.id === sub.planId);
    if (member) {
      // 🛡️ Robustness: Fallback to sub.branchId if member.branchId is missing
      const memberWithBranch = {
        ...member,
        branchId: member.branchId || sub.branchId || currentUser?.branchId
      };
      setRenewTarget({ member: memberWithBranch, currentPlan });
      setRenewModalOpen(true);
    }
  };

  const handleProcessRenew = async (planId: string, amount: number, paymentMethod: any, discount: number, transactionCode?: string, startDate?: string) => {
    if (renewTarget) {
      try {
        await purchaseSubscription(renewTarget.member.id, planId, paymentMethod, undefined, undefined, 0, discount, startDate);
        showToast('Membership Renewed Successfully!', 'success');
      } catch {
        // purchaseSubscription already showed an error toast
      } finally {
        setRenewModalOpen(false);
        setRenewTarget(null);
      }
    }
  };

  // TRAINER DASHBOARD
  if (isTrainer) {
    const todayStr = todayDateStr();
    const currentTime = currentTimeStr();

    // Assigned clients = unique members with active PT subscriptions under this trainer
    const assignedClients = subscriptions.filter(s =>
      s.trainerId === currentUser.id && isSubscriptionActive(s, todayStr)
    ).length;
    // Today's sessions = bookings assigned to this trainer today (any status except CANCELLED)
    const todayBookings = (bookings || []).filter((b: any) =>
      b.trainerId === currentUser.id &&
      b.date === todayStr &&
      b.status !== 'CANCELLED'
    );
    const todaySessionCount = todayBookings.length;

    // Next upcoming session (BOOKED, not yet completed, time in future)
    const now = new Date();
    const upcomingBookings = todayBookings
      .filter((b: any) => b.status === 'BOOKED')
      .sort((a: any, z: any) => {
        const ta = new Date(`${todayStr} ${a.timeSlot}`).getTime();
        const tz = new Date(`${todayStr} ${z.timeSlot}`).getTime();
        return ta - tz;
      });
    const nextBooking = upcomingBookings.find((b: any) => {
      // timeSlot is "HH:MM AM/PM". Convert IST today + slot to comparable timestamp
      const bookingTime = new Date(`${todayStr} ${b.timeSlot}`).getTime();
      const nowIST = new Date(`${todayStr} ${currentTimeStr()}`).getTime();
      return bookingTime > nowIST;
    });
    // NOTE: Native Date used here for transient comparison is generally fine 
    // IF the system clock is set correctly, but todayDateStr is already IST.
    // However, to be 100% safe, we should compare with a forced IST time object.
    // For now, todayRevenue is the priority. 
    
    const nextSessionLabel = nextBooking
      ? `Next: ${nextBooking.timeSlot}`
      : todaySessionCount > 0 ? 'All sessions done today' : 'No sessions today';

    // Total sessions completed by this trainer
    const completedSessions = (bookings || []).filter((b: any) =>
      b.trainerId === currentUser.id && b.status === 'COMPLETED'
    ).length;

    return (
      <div className="space-y-6 md:space-y-8 animate-[fadeIn_0.5s_ease-out]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Coach Dashboard</h2>
            <p className="text-slate-500 font-medium text-sm">Welcome back, {currentUser.name.split(' ')[0]}</p>
          </div>
          <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-2xl border border-indigo-100 flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-widest">On Shift</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Assigned Clients */}
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
            <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600">
              <i className="fas fa-users text-xl"></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Clients</p>
              <p className="text-3xl font-black text-slate-900">{assignedClients}</p>
            </div>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Active personal training</p>
          </div>

          {/* Today's Sessions */}
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
            <div className="bg-emerald-50 w-12 h-12 rounded-2xl flex items-center justify-center text-emerald-600">
              <i className="fas fa-calendar-day text-xl"></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Today's Sessions</p>
              <p className="text-3xl font-black text-slate-900">{todaySessionCount}</p>
            </div>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{nextSessionLabel}</p>
          </div>

          {/* Total Completed Sessions */}
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
            <div className="bg-amber-50 w-12 h-12 rounded-2xl flex items-center justify-center text-amber-600">
              <i className="fas fa-check-circle text-xl"></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sessions Completed</p>
              <p className="text-3xl font-black text-slate-900">{completedSessions}</p>
            </div>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">All time total</p>
          </div>
        </div>
      </div>
    );
  }


  // MEMBER DASHBOARD (No Changes)
  if (!isAdmin) {
    const mySub = subscriptions.find(s => s.memberId === currentUser.id && s.status === SubscriptionStatus.ACTIVE);
    const myPlan = mySub ? plans.find(p => p.id === mySub.planId) : null;
    const myAttendance = attendance.filter(a => a.userId === currentUser.id).sort((a, b) => b.date.localeCompare(a.date));
    const myMetrics = metrics.filter(m => m.memberId === currentUser.id).sort((a, b) => b.date.localeCompare(a.date));
    const latestMetric = myMetrics[0];

    // Calculate Streak and Progress (Memoized)
    const { currentStreak, sessionsThisMonth, progressPercent, monthlyGoal } = useMemo(() => {
      // 1. Calculate Streak
      const uniqueDates = Array.from(new Set(myAttendance.map(a => a.date))).sort().reverse();
      let streak = 0;
      let checkDate = new Date();

      // If today they haven't checked in, start checking from yesterday
      const todayStr = todayDateStr();
      if (!uniqueDates.includes(todayStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      for (let i = 0; i < uniqueDates.length; i++) {
        // format as YYYY-MM-DD manually while keeping IST logic
        const y = checkDate.getFullYear();
        const m = String(checkDate.getMonth() + 1).padStart(2, '0');
        const d = String(checkDate.getDate()).padStart(2, '0');
        const targetStr = `${y}-${m}-${d}`;

        if (uniqueDates.includes(targetStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1); // Go to previous day
        } else {
          break;
        }
      }

      // 2. Monthly Progress
      const curMonth = currentMonthIdx();
      const curYear = currentYear();
      const sessions = myAttendance.filter(a => {
        const [y, m] = a.date.split('-').map(Number);
        return (m - 1) === curMonth && y === curYear;
      }).length;

      const goal = 20; // Default target
      const percent = Math.min(100, Math.round((sessions / goal) * 100));

      return { currentStreak: streak, sessionsThisMonth: sessions, progressPercent: percent, monthlyGoal: goal };
    }, [myAttendance]);

    return (
      <div className="space-y-6 md:space-y-8 animate-[fadeIn_0.5s_ease-out]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Welcome, {currentUser.name.split(' ')[0]}</h2>
            <p className="text-slate-500 font-medium text-sm">Your personal training dashboard</p>
          </div>
          {mySub && (
            <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl border border-emerald-100 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-widest">{myPlan?.name} Active</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
            <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600">
              <i className="fas fa-calendar-check text-xl"></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Check-ins this month</p>
              <p className="text-3xl font-black text-slate-900">{myAttendance.length}</p>
            </div>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Last visit: {myAttendance[0]?.date || 'Never'}</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
            <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600">
              <i className="fas fa-weight-scale text-xl"></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Weight</p>
              <p className="text-3xl font-black text-slate-900">{latestMetric?.weight || '--'} <span className="text-sm">kg</span></p>
            </div>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Updated: {latestMetric?.date || 'N/A'}</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
            <div className="bg-amber-50 w-12 h-12 rounded-2xl flex items-center justify-center text-amber-600">
              <i className="fas fa-clock text-xl"></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan Validity</p>
              <p className="text-lg font-black text-slate-900 truncate">{mySub?.endDate || 'No Active Plan'}</p>
            </div>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{mySub ? 'Renews automatically' : 'Purchase plan to start'}</p>
          </div>
        </div>

        {/* DAILY GOAL STATUS - REAL DATA */}
        <div className="bg-slate-900 p-8 md:p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-xl">
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">Daily Goal Status</h3>

            <p className="text-slate-400 text-sm font-medium mb-8">
              {currentStreak > 1
                ? `You're on a ${currentStreak}-day streak! Consistency is key.`
                : sessionsThisMonth > 0
                  ? "Great start to the month! Keep showing up to build your streak."
                  : "Start your streak today! Your transformation waits."}
            </p>

            <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden mb-4">
              <div
                className="bg-blue-500 h-full rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
              <span>Progress: {sessionsThisMonth}/{monthlyGoal} sessions</span>
              <span>{progressPercent}% Monthly Goal</span>
            </div>
          </div>
          <i className="fas fa-dumbbell absolute -bottom-12 -right-12 text-[200px] text-white/5 rotate-12"></i>
        </div>
      </div>
    );
  }

  const activeCount = filteredSubs.filter(s => isSubscriptionActive(s, today)).length;

  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.amount, 0);
  const todayRevenue = filteredSales
    .filter(s => s.date === today)
    .reduce((acc, s) => acc + s.amount, 0);

  const salesByPlanData = [
    { name: 'Gym', value: filteredSubs.filter(s => plans.find(p => p.id === s.planId)?.type === PlanType.GYM).length || 0 },
    { name: 'PT', value: filteredSubs.filter(s => plans.find(p => p.id === s.planId)?.type === PlanType.PT).length || 0 },
    { name: 'Group', value: filteredSubs.filter(s => plans.find(p => p.id === s.planId)?.type === PlanType.GROUP).length || 0 },
  ].filter(d => d.value > 0);

  if (salesByPlanData.length === 0) salesByPlanData.push({ name: 'No Data', value: 1 });

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthIdxVal = currentMonthIdx();

  const revenueData = months.slice(0, currentMonthIdx() + 1).map((month, idx) => {
    const monthSales = filteredSales
      .filter(s => new Date(s.date).getMonth() === idx)
      .reduce((acc, s) => acc + s.amount, 0);

    return {
      month,
      revenue: monthSales
    };
  });

  const recentTransactions = useMemo(() => {
    return [...filteredSales]
      .sort((a, b) => {
        // Primary: Sort by createdAt (ISO timestamp)
        if (a.createdAt && b.createdAt) {
          return b.createdAt.localeCompare(a.createdAt);
        }
        // Secondary: Sort by date (YYYY-MM-DD)
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        // Tertiary: Fallback to ID
        return b.id.localeCompare(a.id);
      })
      .slice(0, 5);
  }, [filteredSales]);

  return (
    <div className="space-y-6 md:space-y-8 animate-[fadeIn_0.5s_ease-out]">
      {/* Stats Grid - Ultra Responsive */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Members" value={filteredSubs.length} icon="fa-users" color="blue" />
        <StatCard title="Active" value={activeCount} icon="fa-check-circle" color="green" />
        <StatCard title="Total" value={formatCurrency(totalRevenue).replace('₹', '')} icon="fa-indian-rupee-sign" color="amber" />
        <StatCard title="Today" value={formatCurrency(todayRevenue).replace('₹', '')} icon="fa-bolt" color="indigo" />
      </div>

      {/* RENEWAL ALERTS & ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Expiring Soon */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 md:p-8 rounded-[2rem] border border-amber-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-6 relative z-10">
            <h3 className="text-sm md:text-base font-black flex items-center gap-2 uppercase tracking-tight text-amber-900">
              <i className="fas fa-clock text-amber-600"></i> Expiring Soon (Next 7 Days)
            </h3>
            <span className="bg-white/50 px-2 py-1 rounded-lg text-[10px] font-black text-amber-700">{expiringSubs.length}</span>
          </div>
          <div className="space-y-3 relative z-10">
            {expiringSubs.length === 0 ? (
              <p className="text-xs text-amber-700/60 font-medium italic">No memberships expiring this week. Great retention!</p>
            ) : (
              expiringSubs.slice(0, 3).map(sub => {
                const member = sub.member;
                const plan = plans.find(p => p.id === sub.planId);
                return (
                  <div key={sub.id} className="bg-white p-3 rounded-xl flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-3">
                      <img src={member?.avatar || `https://ui-avatars.com/api/?name=${member?.name}`} className="w-8 h-8 rounded-lg bg-gray-100 object-cover" alt="" />
                      <div>
                        <p className="text-xs font-bold text-gray-900">{member?.name || 'Unknown'}</p>
                        <p className="text-[9px] text-gray-400 font-mono">{plan?.name} • Ends {sub.endDate}</p>
                      </div>
                    </div>
                    <button onClick={() => handleOpenRenew(sub)} className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-colors">
                      Renew
                    </button>
                  </div>
                );
              })
            )}
          </div>
          {/* Decor */}
          <i className="fas fa-hourglass-half absolute -bottom-6 -right-6 text-[100px] text-amber-500/10 rotate-12"></i>
        </div>

        {/* Expired Memberships */}
        <div className="bg-gradient-to-br from-red-50 to-rose-50 p-6 md:p-8 rounded-[2rem] border border-red-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-6 relative z-10">
            <h3 className="text-sm md:text-base font-black flex items-center gap-2 uppercase tracking-tight text-red-900">
              <i className="fas fa-exclamation-circle text-red-600"></i> Recently Expired
            </h3>
            <span className="bg-white/50 px-2 py-1 rounded-lg text-[10px] font-black text-red-700">{expiredSubs.length}</span>
          </div>
          <div className="space-y-3 relative z-10">
            {expiredSubs.length === 0 ? (
              <p className="text-xs text-red-700/60 font-medium italic">No expired memberships pending renewal.</p>
            ) : (
              expiredSubs.slice(0, 3).map(sub => {
                const member = sub.member;
                const plan = plans.find(p => p.id === sub.planId);
                return (
                  <div key={sub.id} className="bg-white p-3 rounded-xl flex justify-between items-center shadow-sm border border-red-100 opacity-75 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-500 font-bold text-[10px]">
                        Ex
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{member?.name || 'Unknown'}</p>
                        <p className="text-[9px] text-red-400 font-black uppercase">Expired {sub.endDate}</p>
                      </div>
                    </div>
                    <button onClick={() => handleOpenRenew(sub)} className="bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-colors shadow-lg shadow-red-200">
                      Renew Now
                    </button>
                  </div>
                );
              })
            )}
          </div>
          <i className="fas fa-calendar-times absolute -bottom-6 -right-6 text-[100px] text-red-500/10 rotate-12"></i>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 min-w-0">
          <h3 className="text-sm md:text-base font-black mb-6 flex items-center gap-2 uppercase tracking-tight">
            <i className="fas fa-chart-line text-blue-500"></i> Performance Trends
          </h3>
          <div className="h-64 md:h-80 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(val) => `${val / 1000}k`} stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={4}
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 min-w-0">
          <h3 className="text-sm md:text-base font-black mb-6 flex items-center gap-2 uppercase tracking-tight">
            <i className="fas fa-chart-pie text-indigo-500"></i> Subscription Mix
          </h3>
          <div className="h-64 md:h-80 w-full flex items-center justify-center min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={salesByPlanData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                  {salesByPlanData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Transactions - Robust for all sizes */}
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-base md:text-lg font-black uppercase tracking-tight">Recent Sales</h3>
          <div className="flex bg-green-50 text-green-500 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse">Real-Time</div>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-12 text-center text-gray-400 italic text-sm">No sales yet.</div>
        ) : (
          <div>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-400 uppercase text-[9px] font-black tracking-widest border-b pb-4">
                    <th className="pb-4 px-2">Athlete</th>
                    <th className="pb-4 px-2">Plan Details</th>
                    <th className="pb-4 px-2">Value</th>
                    <th className="pb-4 px-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentTransactions.map((sale) => {
                    const memberName = sale.member?.name || 'Unknown Member';
                    const plan = plans.find(p => p.id === sale.planId);
                    return (
                      <tr key={sale.id} className="text-sm hover:bg-gray-50 transition-colors group">
                        <td className="py-4 px-2">
                          <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{memberName}</div>
                        </td>
                        <td className="py-4 px-2">
                          <span className="text-gray-500 text-xs font-medium">{plan?.name || 'Retail Item'}</span>
                        </td>
                        <td className="py-4 px-2">
                          <span className="font-black text-green-600">{formatCurrency(sale.amount)}</span>
                        </td>
                        <td className="py-4 px-2 text-gray-400 text-xs whitespace-nowrap">{sale.date}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {recentTransactions.map((sale) => {
                const memberName = sale.member?.name || 'Unknown Member';
                const plan = plans.find(p => p.id === sale.planId);
                return (
                  <div key={sale.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group active:scale-[0.98] transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                        <i className="fas fa-receipt text-xs"></i>
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{memberName}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{plan?.name || 'Retail Item'} • {sale.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-600">{formatCurrency(sale.amount)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {renewTarget && (
        <QuickRenewModal
          isOpen={isRenewModalOpen}
          onClose={() => setRenewModalOpen(false)}
          member={renewTarget.member}
          currentPlan={renewTarget.currentPlan}
          plans={plans.filter(p =>
            p.isActive !== false &&
            (
              !p.branchId ||
              p.branchId === renewTarget.member.branchId ||
              p.isMultiBranch
            )
          )}
          onRenew={handleProcessRenew}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: any) => {
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group flex items-start justify-between min-w-0">
      <div className="min-w-0">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 truncate">{title}</p>
        <p className="text-2xl font-black text-gray-900 truncate tracking-tight">{value}</p>
      </div>
      <div className={`${colorMap[color]} w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-sm`}>
        <i className={`fas ${icon} text-sm md:text-lg`}></i>
      </div>
    </div>
  );
};

export default Dashboard;