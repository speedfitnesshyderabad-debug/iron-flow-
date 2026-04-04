import React, { useState, useMemo } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole, User, Attendance, PlanType, SubscriptionStatus, Expense, CommType } from '../types';

const TaxCenter: React.FC = () => {
   const { sales, branches, currentUser, attendance, users, plans, bookings, subscriptions, expenses, addExpense, deleteExpense } = useAppContext();

   const [activeView, setActiveView] = useState<'GST' | 'SETTLEMENT' | 'PAYROLL' | 'COMMISSIONS' | 'EXPENSES' | 'PROFIT_LOSS'>('GST');
   const [selectedBranchId, setSelectedBranchId] = useState<string>(currentUser?.branchId || branches[0]?.id || '');
   const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
   const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

   const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);
   const [expenseForm, setExpenseForm] = useState({
      category: 'RENT',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
   });

   const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

   const currentYear = new Date().getFullYear();
   const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

   const currentBranch = useMemo(() => branches.find(b => b.id === selectedBranchId), [selectedBranchId, branches]);

   const filteredSales = useMemo(() => {
      return sales.filter(s => {
         const saleDate = new Date(s.date);
         return (
            s.branchId === selectedBranchId &&
            saleDate.getMonth() === selectedMonth &&
            saleDate.getFullYear() === selectedYear
         );
      });
   }, [sales, selectedBranchId, selectedMonth, selectedYear]);

   // Only consider non-cash transactions for GST
   const gstApplicableSales = useMemo(() => {
      return filteredSales.filter(s => s.paymentMethod !== 'CASH');
   }, [filteredSales]);

   const filteredExpenses = useMemo(() => {
      return expenses.filter(e => {
         const d = new Date(e.date);
         return (
            e.branchId === selectedBranchId &&
            d.getMonth() === selectedMonth &&
            d.getFullYear() === selectedYear
         );
      });
   }, [expenses, selectedBranchId, selectedMonth, selectedYear]);

   const taxStats = useMemo(() => {
      const gstRate = currentBranch?.gstPercentage || 18;
      return gstApplicableSales.reduce((acc, s) => {
         const total = s.amount;
         const taxableValue = total / (1 + (gstRate / 100));
         return {
            total: acc.total + total,
            taxable: acc.taxable + taxableValue,
            tax: acc.tax + (total - taxableValue),
            count: acc.count + 1
         };
      }, { total: 0, taxable: 0, tax: 0, count: 0 });
   }, [gstApplicableSales, currentBranch]);

   const downloadJSON = () => {
      const data = gstApplicableSales.map(sale => ({
         Invoice: sale.invoiceNo,
         Date: sale.date,
         Amount: sale.amount,
         Taxable: (sale.amount / (1 + ((currentBranch?.gstPercentage || 18) / 100))).toFixed(2),
         Tax: (sale.amount - (sale.amount / (1 + ((currentBranch?.gstPercentage || 18) / 100)))).toFixed(2),
         Payment: sale.paymentMethod
      }));

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `IronFlow_${currentBranch?.name}_${months[selectedMonth]}_${selectedYear}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
   };

   // Per-staff commission calculation using individual rate fields
   const staffCommissions = useMemo(() => {
      const branchStaff = users.filter(u =>
         u.branchId === selectedBranchId &&
         u.role !== UserRole.MEMBER &&
         u.role !== UserRole.SUPER_ADMIN &&
         u.role !== UserRole.KIOSK
      );

      return branchStaff.map(staff => {
         const mySales = sales.filter(s => {
            const d = new Date(s.date);
            return (
               s.staffId === staff.id &&
               d.getMonth() === selectedMonth &&
               d.getFullYear() === selectedYear
            );
         });

         const gymSales = mySales.filter(s => plans.find(p => p.id === s.planId)?.type === PlanType.GYM);
         const ptSales = mySales.filter(s => plans.find(p => p.id === s.planId)?.type === PlanType.PT);
         const groupSales = mySales.filter(s => plans.find(p => p.id === s.planId)?.type === PlanType.GROUP);

         const gymRate = staff.salesCommissionPercentage ?? staff.commissionPercentage ?? 0;
         const ptRate = staff.ptCommissionPercentage ?? staff.salesCommissionPercentage ?? staff.commissionPercentage ?? 0;
         const groupRate = staff.groupCommissionPercentage ?? staff.salesCommissionPercentage ?? staff.commissionPercentage ?? 0;

         const gymComm = gymSales.reduce((acc, s) => acc + s.amount * (gymRate / 100), 0);
         const ptComm = ptSales.reduce((acc, s) => acc + s.amount * (ptRate / 100), 0);
         const groupComm = groupSales.reduce((acc, s) => acc + s.amount * (groupRate / 100), 0);

         // Trainer session commissions (completed bookings this month)
         let sessionComm = 0;
         if (staff.role === UserRole.TRAINER && (staff.commissionPercentage || 0) > 0) {
            const completedBookings = bookings.filter(b => {
               const d = new Date(b.date);
               return b.trainerId === staff.id && b.status === 'COMPLETED' &&
                  d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
            });
            completedBookings.forEach(b => {
               const sub = subscriptions.find(s =>
                  s.memberId === b.memberId && s.trainerId === staff.id && s.status === 'ACTIVE'
               );
               const plan = sub ? plans.find(p => p.id === sub.planId) : null;
               const sessionValue = plan?.price && plan?.maxSessions ? plan.price / plan.maxSessions : 0;
               sessionComm += sessionValue * ((staff.commissionPercentage || 0) / 100);
            });
         }

         const total = gymComm + ptComm + groupComm + sessionComm;

         return {
            staff,
            gymSales: gymSales.length, gymComm, gymRate,
            ptSales: ptSales.length, ptComm, ptRate,
            groupSales: groupSales.length, groupComm, groupRate,
            sessionComm,
            totalSales: mySales.length,
            total: Math.round(total)
         };
      });
   }, [users, sales, plans, bookings, subscriptions, selectedBranchId, selectedMonth, selectedYear]);

   const totalPayouts = useMemo(() => {
      const branchUsers = users.filter(u => u.branchId === selectedBranchId);
      const payroll = branchUsers
         .filter(u => u.role !== UserRole.MEMBER && u.role !== UserRole.SUPER_ADMIN && u.role !== UserRole.KIOSK)
         .reduce((acc, u) => acc + (u.monthlySalary || 0), 0);
      const commissions = staffCommissions.reduce((acc, r) => acc + r.total, 0);
      return { payroll, commissions, grandTotal: payroll + commissions };
   }, [users, staffCommissions, selectedBranchId]);

   const settlementData = useMemo(() => {
      // 1. "MONEY OWED TO ME" (IN-VISITS): Members from OTHER branches training HERE
      const inVisits = attendance.filter(a => {
         const d = new Date(a.date);
         const member = users.find(u => u.id === a.userId);
         return a.branchId === selectedBranchId &&
            a.type === 'MEMBER' &&
            member && member.branchId !== selectedBranchId && // Home branch is elsewhere
            d.getMonth() === selectedMonth &&
            d.getFullYear() === selectedYear;
      });

      // 2. "MONEY I OWE" (OUT-VISITS): MY members training at OTHER branches
      const outVisits = attendance.filter(a => {
         const d = new Date(a.date);
         const member = users.find(u => u.id === a.userId);
         return a.branchId !== selectedBranchId && // Scanned elsewhere
            a.type === 'MEMBER' &&
            member && member.branchId === selectedBranchId && // Home branch is here
            d.getMonth() === selectedMonth &&
            d.getFullYear() === selectedYear;
      });

      const rate = currentBranch?.settlementRate || 100;

      // Logic to calculate audit log and totals
      const processVisits = (visits: Attendance[], type: 'IN' | 'OUT') => {
         const userVisitCounts: Record<string, number> = {};
         return visits
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(scan => {
               const member = users.find(u => u.id === scan.userId)!;
               const homeBranch = branches.find(b => b.id === member.branchId);
               const scanBranch = branches.find(b => b.id === scan.branchId);

               const userId = scan.userId!;
               userVisitCounts[userId] = (userVisitCounts[userId] || 0) + 1;

               const isCapped = userVisitCounts[userId] > 10;
               const value = isCapped ? 0 : rate;

               return {
                  ...scan,
                  memberName: member.name,
                  homeBranchName: homeBranch?.name || 'Unknown',
                  scanBranchName: scanBranch?.name || 'Unknown',
                  value,
                  isCapped,
                  type
               };
            });
      };

      const inLog = processVisits(inVisits, 'IN');
      const outLog = processVisits(outVisits, 'OUT');

      const payableIn = inLog.filter(l => !l.isCapped).length;
      const payableOut = outLog.filter(l => !l.isCapped).length;

      return {
         totalInVisits: inVisits.length,
         totalOutVisits: outVisits.length,
         payableIn,
         payableOut,
         auditLog: [...inLog, ...outLog].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
         rate,
         totalInAmount: payableIn * rate,
         totalOutAmount: payableOut * rate,
         netBalance: (payableIn * rate) - (payableOut * rate)
      };
   }, [attendance, users, branches, selectedBranchId, selectedMonth, selectedYear, currentBranch]);

   const pnlStats = useMemo(() => {
      const totalIncome = filteredSales.reduce((acc, s) => acc + s.amount, 0);
      const operationalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
      const payrollCost = totalPayouts.grandTotal;
      const totalExpenses = operationalExpenses + payrollCost;
      const netProfit = totalIncome - totalExpenses;
      return { totalIncome, operationalExpenses, payrollCost, totalExpenses, netProfit };
   }, [filteredSales, filteredExpenses, totalPayouts]);

   const handleAddExpense = (e: React.FormEvent) => {
      e.preventDefault();
      if (!expenseForm.amount) return;
      const newExpense: Expense = {
         id: `exp-${Date.now()}`,
         branchId: selectedBranchId,
         category: expenseForm.category as any,
         amount: Number(expenseForm.amount),
         date: expenseForm.date,
         description: expenseForm.description,
         recordedBy: currentUser?.id || 'admin'
      };
      addExpense(newExpense);
      setExpenseModalOpen(false);
      setExpenseForm({ category: 'RENT', amount: '', date: new Date().toISOString().split('T')[0], description: '' });
   };

   const formatCurrency = (amt: number) => {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
   };

   return (
      <div className="space-y-6 md:space-y-8 animate-[fadeIn_0.5s_ease-out]">
         <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            <div>
               <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Tax & Financials</h2>
               <p className="text-slate-500 font-medium text-sm">Branch: {currentBranch?.name} • Monthly Report</p>
            </div>

            <div className="flex bg-white p-1 rounded-2xl border shadow-sm w-full xl:w-auto overflow-x-auto scrollbar-hide">
               {['GST', 'SETTLEMENT', 'PAYROLL', 'COMMISSIONS', 'EXPENSES', 'PROFIT_LOSS'].map((v) => (
                  <button
                     key={v}
                     onClick={() => setActiveView(v as any)}
                     className={`flex-1 xl:flex-none px-6 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === v ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                     {v === 'PROFIT_LOSS' ? 'PROFIT & LOSS' : v}
                  </button>
               ))}
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            <div className="lg:col-span-4 xl:col-span-3 space-y-6">
               <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border shadow-sm space-y-6">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Branch</label>
                     <select
                        className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold text-xs"
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        disabled={currentUser?.role !== UserRole.SUPER_ADMIN}
                     >
                        {branches.filter(b => currentUser?.role === UserRole.SUPER_ADMIN || b.id === currentUser?.branchId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                     </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Month</label>
                        <select className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold text-xs" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                           {months.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
                        </select>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Year</label>
                        <select className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold text-xs" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                           {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                     </div>
                  </div>

                  <button
                     onClick={downloadJSON}
                     className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                  >
                     <i className="fas fa-file-export"></i> Export GST Invoices (JSON)
                  </button>

                  <div className="pt-4 border-t space-y-4">
                     <div className="bg-slate-900 p-6 rounded-3xl text-center text-white shadow-xl">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">
                           {activeView === 'GST' ? 'GST Liability' :
                              activeView === 'SETTLEMENT' ? 'Settlement Due' :
                                 activeView === 'EXPENSES' ? 'Total Expenses' :
                                    activeView === 'PROFIT_LOSS' ? 'Net Profit' :
                                       'Total Payout'}
                        </p>
                        <p className={`text-xl md:text-2xl font-black ${activeView === 'PROFIT_LOSS' && pnlStats.netProfit < 0 ? 'text-red-400' : 'text-white'}`}>
                           {activeView === 'GST' ? formatCurrency(taxStats.tax) :
                              activeView === 'SETTLEMENT' ? formatCurrency(settlementData.totalAmount) :
                                 activeView === 'EXPENSES' ? formatCurrency(pnlStats.totalExpenses) :
                                    activeView === 'PROFIT_LOSS' ? formatCurrency(pnlStats.netProfit) :
                                       formatCurrency(totalPayouts.grandTotal)}
                        </p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
               {activeView === 'GST' && (
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 xs:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                        <SummaryCard label="Gross Turnover" value={formatCurrency(taxStats.total)} color="blue" />
                        <SummaryCard label="Taxable Value" value={formatCurrency(taxStats.taxable)} color="indigo" />
                        <SummaryCard label="Total Tax" value={formatCurrency(taxStats.tax)} color="emerald" />
                        <SummaryCard label="Invoices" value={taxStats.count} color="slate" />
                     </div>
                     {/* GST Desktop Table */}
                     <div className="hidden md:block bg-white rounded-[2rem] md:rounded-[2.5rem] border shadow-sm overflow-hidden overflow-x-auto scrollbar-hide">
                        <table className="w-full text-left min-w-[600px]">
                           <thead className="bg-slate-50 border-b">
                              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                 <th className="px-8 py-5">Invoice #</th>
                                 <th className="px-8 py-5">Tax Details</th>
                                 <th className="px-8 py-5 text-right">Taxable</th>
                                 <th className="px-8 py-5 text-right">Total</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {gstApplicableSales.map(sale => {
                                 const gstRate = currentBranch?.gstPercentage || 18;
                                 const taxable = sale.amount / (1 + (gstRate / 100));
                                 return (
                                    <tr key={sale.id} className="hover:bg-slate-50/50">
                                       <td className="px-8 py-5 font-mono text-xs font-bold text-blue-600 uppercase">{sale.invoiceNo}</td>
                                       <td className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">GST @ {gstRate}%</td>
                                       <td className="px-8 py-5 text-right font-bold text-slate-600 text-sm">{formatCurrency(taxable)}</td>
                                       <td className="px-8 py-5 text-right font-black text-slate-900 text-sm">{formatCurrency(sale.amount)}</td>
                                    </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                     </div>

                     {/* GST Mobile Cards */}
                     <div className="md:hidden space-y-4">
                        {gstApplicableSales.map(sale => {
                           const gstRate = currentBranch?.gstPercentage || 18;
                           const taxable = sale.amount / (1 + (gstRate / 100));
                           return (
                              <div key={sale.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 active:bg-slate-50 transition-colors">
                                 <div className="flex justify-between items-center">
                                    <span className="font-mono text-[10px] font-black text-blue-600 uppercase tracking-tighter">{sale.invoiceNo}</span>
                                    <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest">STP Verified</span>
                                 </div>
                                 <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-50">
                                    <div className="space-y-1">
                                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Taxable Value</p>
                                       <p className="text-xs font-bold text-slate-700">{formatCurrency(taxable)}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">GST Rate</p>
                                       <p className="text-xs font-bold text-slate-700">{gstRate}%</p>
                                    </div>
                                 </div>
                                 <div className="flex justify-between items-center bg-blue-50/50 -mx-6 -mb-6 px-6 py-4 rounded-b-3xl mt-2">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Invoice</span>
                                    <span className="text-lg font-black text-slate-900">{formatCurrency(sale.amount)}</span>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>
               )}

               {activeView === 'SETTLEMENT' && (
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 xs:grid-cols-2 xl:grid-cols-4 gap-6">
                        <SummaryCard label="Money Owed to Me (In)" value={formatCurrency(settlementData.totalInAmount)} color="emerald" />
                        <SummaryCard label="Money I Owe (Out)" value={formatCurrency(settlementData.totalOutAmount)} color="red" />
                        <div className={`p-6 rounded-[2rem] border shadow-sm ${settlementData.netBalance >= 0 ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-rose-50 text-rose-600 border-rose-100'} transition-all min-w-0`}>
                           <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1 truncate">Net Settlement Result</p>
                           <p className="text-lg md:text-xl font-black truncate tracking-tight">{formatCurrency(Math.abs(settlementData.netBalance))} {settlementData.netBalance >= 0 ? 'RECEIVABLE' : 'PAYABLE'}</p>
                        </div>
                        <SummaryCard label="Settlement Rate" value={`${formatCurrency(settlementData.rate)} / Session`} color="slate" />
                     </div>
                     {/* Settlement Audit Log - Desktop Table */}
                     <div className="hidden md:block bg-white p-8 rounded-[2rem] border shadow-sm overflow-hidden overflow-x-auto scrollbar-hide">
                        <div className="flex justify-between items-center mb-6">
                           <div>
                              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Cross-Branch Audit Log</h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Global Activity for {currentBranch?.name}</p>
                           </div>
                           <span className="bg-indigo-50 text-indigo-500 font-black text-[9px] px-3 py-1.5 rounded-full uppercase tracking-widest">{months[selectedMonth]} {selectedYear}</span>
                        </div>

                        <table className="w-full text-left min-w-[700px]">
                           <thead className="bg-slate-50 border-b">
                              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                 <th className="px-6 py-4">Status / Type</th>
                                 <th className="px-6 py-4">Athlete Details</th>
                                 <th className="px-6 py-4 text-center">Inter-Branch Route</th>
                                 <th className="px-6 py-4 text-right">Cash Value</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {settlementData.auditLog.length === 0 ? (
                                 <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic text-xs font-bold uppercase tracking-widest">No cross-branch visits recorded for this period.</td>
                                 </tr>
                              ) : (
                                 settlementData.auditLog.map(log => (
                                    <tr key={`${log.id}-${log.type}`} className={`hover:bg-indigo-50/10 transition-colors ${log.isCapped ? 'opacity-40 grayscale' : ''}`}>
                                       <td className="px-6 py-4">
                                          <div className={`w-fit px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase mb-1 ${log.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                             {log.type === 'IN' ? 'Money Owed To Me' : 'Money I Owe'}
                                          </div>
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{log.date} @ {log.timeIn}</p>
                                       </td>
                                       <td className="px-6 py-4">
                                          <p className="text-xs font-black text-indigo-900 uppercase tracking-tight">{log.memberName}</p>
                                          {log.isCapped && (
                                             <span className="text-[7px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded uppercase mt-0.5 inline-block">SESSION CAP EXCEEDED (MAX 10)</span>
                                          )}
                                       </td>
                                       <td className="px-6 py-4 text-center">
                                          <div className="flex items-center justify-center gap-2">
                                             <span className="text-[9px] font-bold text-slate-500 uppercase">{log.homeBranchName}</span>
                                             <i className={`fas fa-arrow-right text-[10px] ${log.type === 'IN' ? 'text-emerald-400' : 'text-red-400'}`}></i>
                                             <span className="text-[9px] font-bold text-slate-900 uppercase">{log.scanBranchName}</span>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4 text-right">
                                          {log.isCapped ? (
                                             <span className="text-xs font-bold text-slate-300">₹0</span>
                                          ) : (
                                             <span className={`text-sm font-black ${log.type === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {log.type === 'IN' ? '+' : '-'}{formatCurrency(log.value)}
                                             </span>
                                          )}
                                       </td>
                                    </tr>
                                 ))
                              )}
                           </tbody>
                        </table>
                     </div>

                     {/* Settlement Audit Log - Mobile Cards */}
                     <div className="md:hidden space-y-4">
                        <div className="flex justify-between items-center mb-2 px-1">
                           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cross-Branch Audit Log</h3>
                           <span className="bg-indigo-50 text-indigo-500 font-black text-[8px] px-2 py-1 rounded-full uppercase tracking-widest">{months[selectedMonth]} {selectedYear}</span>
                        </div>
                        {settlementData.auditLog.length === 0 ? (
                           <div className="bg-white p-10 rounded-3xl border border-slate-100 text-center">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">No cross-branch visits recorded.</p>
                           </div>
                        ) : (
                           settlementData.auditLog.map(log => (
                              <div key={`${log.id}-${log.type}`} className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 ${log.isCapped ? 'opacity-60 grayscale scale-[0.98]' : ''}`}>
                                 <div className="flex justify-between items-start">
                                    <div>
                                       <div className={`w-fit px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase mb-1 ${log.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                          {log.type === 'IN' ? 'Settlement Owed to Me' : 'Owed to Other Branch'}
                                       </div>
                                       <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{log.memberName}</p>
                                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{log.date} @ {log.timeIn}</p>
                                    </div>
                                    <div className="text-right">
                                       {log.isCapped ? (
                                          <span className="text-lg font-black text-slate-300">₹0</span>
                                       ) : (
                                          <span className={`text-lg font-black ${log.type === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                                             {log.type === 'IN' ? '+' : '-'}{formatCurrency(log.value)}
                                          </span>
                                       )}
                                       {log.isCapped && (
                                          <p className="text-[7px] font-black text-rose-500 bg-rose-50 px-1 py-0.5 rounded uppercase mt-1">CAP EXCEEDED</p>
                                       )}
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                                    <div className="flex-1 text-center">
                                       <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Home</p>
                                       <p className="text-[10px] font-black text-slate-900 truncate uppercase">{log.homeBranchName}</p>
                                    </div>
                                    <i className={`fas fa-arrow-right text-[10px] ${log.type === 'IN' ? 'text-emerald-400' : 'text-red-400'}`}></i>
                                    <div className="flex-1 text-center">
                                       <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Visited</p>
                                       <p className="text-[10px] font-black text-slate-900 truncate uppercase">{log.scanBranchName}</p>
                                    </div>
                                 </div>
                              </div>
                           ))
                        )}
                     </div>
                  </div>
               )}

               {activeView === 'PAYROLL' && (
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 xs:grid-cols-2 xl:grid-cols-2 gap-6">
                        <SummaryCard label="Staff Count" value={users.filter(u => u.branchId === selectedBranchId && u.role !== UserRole.MEMBER && u.role !== UserRole.SUPER_ADMIN && u.role !== UserRole.KIOSK).length} color="blue" />
                        <SummaryCard label="Total Monthly Payroll" value={formatCurrency(totalPayouts.payroll)} color="emerald" />
                     </div>

                     {/* Payroll Desktop Table */}
                     <div className="hidden md:block bg-white rounded-[2rem] border shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                           <thead className="bg-slate-50 border-b">
                              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                 <th className="px-8 py-5">Employee</th>
                                 <th className="px-8 py-5">Role</th>
                                 <th className="px-8 py-5 text-right">Base Salary</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {users.filter(u => u.branchId === selectedBranchId && u.role !== UserRole.MEMBER && u.role !== UserRole.SUPER_ADMIN && u.role !== UserRole.KIOSK).map(u => (
                                 <tr key={u.id} className="hover:bg-slate-50/50">
                                    <td className="px-8 py-5">
                                       <div className="flex items-center gap-3">
                                          <img src={u.avatar} className="w-8 h-8 rounded-full border shadow-sm" alt="" />
                                          <p className="text-xs font-bold text-slate-900">{u.name}</p>
                                       </div>
                                    </td>
                                    <td className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">{u.role}</td>
                                    <td className="px-8 py-5 text-right font-black text-slate-900 text-sm">{formatCurrency(u.monthlySalary || 25000)}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>

                     {/* Payroll Mobile Cards */}
                     <div className="md:hidden space-y-4">
                        {users.filter(u => u.branchId === selectedBranchId && u.role !== UserRole.MEMBER && u.role !== UserRole.SUPER_ADMIN && u.role !== UserRole.KIOSK).map(u => (
                           <div key={u.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                 <img src={u.avatar} className="w-12 h-12 rounded-2xl object-cover border border-slate-100 shadow-sm" alt="" />
                                 <div>
                                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{u.name}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{u.role.replace('_', ' ')}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Base</p>
                                 <p className="text-sm font-black text-slate-900">{formatCurrency(u.monthlySalary || 25000)}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {activeView === 'COMMISSIONS' && (
                  <div className="space-y-6">
                     {/* Summary Cards */}
                     <div className="grid grid-cols-1 xs:grid-cols-3 gap-4">
                        <SummaryCard label="Staff with Commission" value={staffCommissions.filter(r => r.total > 0).length + ' / ' + staffCommissions.length} color="indigo" />
                        <SummaryCard label="Total Sales This Month" value={staffCommissions.reduce((a, r) => a + r.totalSales, 0)} color="blue" />
                        <SummaryCard label="Total Commission Payout" value={formatCurrency(totalPayouts.commissions)} color="emerald" />
                     </div>

                     {/* Per-Staff Breakdown Table - Desktop Only (Too complex for simple mobile cards, will require horizontal scroll on desktop area) */}
                     <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden overflow-x-auto scrollbar-hide">
                        <div className="px-8 py-5 border-b bg-slate-50 flex items-center justify-between">
                           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Commission Breakdown</h3>
                           <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">Live</span>
                        </div>
                        <table className="w-full text-left min-w-[800px]">
                           <thead className="bg-slate-50/60 border-b">
                              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                 <th className="px-6 py-4">Staff Member</th>
                                 <th className="px-6 py-4">Role</th>
                                 <th className="px-6 py-4 text-center">Gym Sales</th>
                                 <th className="px-6 py-4 text-center">PT Sales</th>
                                 <th className="px-6 py-4 text-center">Group Sales</th>
                                 <th className="px-6 py-4 text-right">Sessions</th>
                                 <th className="px-6 py-4 text-right">Total Earned</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {staffCommissions.length === 0 ? (
                                 <tr>
                                    <td colSpan={7} className="px-8 py-10 text-center text-slate-400 italic text-xs font-bold uppercase tracking-widest">No staff found for this branch.</td>
                                 </tr>
                              ) : (
                                 staffCommissions.map((row) => (
                                    <tr key={row.staff.id} className={`hover:bg-indigo-50/30 transition-colors ${row.total > 0 ? '' : 'opacity-50'}`}>
                                       <td className="px-6 py-4">
                                          <div className="flex items-center gap-3">
                                             <img src={row.staff.avatar} className="w-9 h-9 rounded-xl object-cover border shadow-sm" alt="" />
                                             <div>
                                                <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{row.staff.name}</p>
                                                <p className="text-[9px] text-slate-400 font-bold truncate max-w-[120px]">{row.staff.email}</p>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4">
                                          <span className="bg-blue-50 text-blue-600 text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest whitespace-nowrap">
                                             {row.staff.role.replace('_', ' ')}
                                          </span>
                                       </td>
                                       <td className="px-6 py-4 text-center">
                                          {row.gymRate > 0 ? (
                                             <div>
                                                <p className="text-xs font-black text-slate-900">{formatCurrency(row.gymComm)}</p>
                                                <p className="text-[9px] text-slate-400 font-bold">@{row.gymRate}%</p>
                                             </div>
                                          ) : (
                                             <span className="text-[9px] text-slate-300 font-bold">—</span>
                                          )}
                                       </td>
                                       <td className="px-6 py-4 text-center">
                                          {row.ptRate > 0 ? (
                                             <div>
                                                <p className="text-xs font-black text-slate-900">{formatCurrency(row.ptComm)}</p>
                                                <p className="text-[9px] text-slate-400 font-bold">@{row.ptRate}%</p>
                                             </div>
                                          ) : (
                                             <span className="text-[9px] text-slate-300 font-bold">—</span>
                                          )}
                                       </td>
                                       <td className="px-6 py-4 text-center">
                                          {row.groupRate > 0 ? (
                                             <div>
                                                <p className="text-xs font-black text-slate-900">{formatCurrency(row.groupComm)}</p>
                                                <p className="text-[9px] text-slate-400 font-bold">@{row.groupRate}%</p>
                                             </div>
                                          ) : (
                                             <span className="text-[9px] text-slate-300 font-bold">—</span>
                                          )}
                                       </td>
                                       <td className="px-6 py-4 text-right">
                                          {row.sessionComm > 0 ? (
                                             <span className="text-xs font-black text-violet-600">{formatCurrency(row.sessionComm)}</span>
                                          ) : (
                                             <span className="text-[9px] text-slate-300 font-bold">—</span>
                                          )}
                                       </td>
                                       <td className="px-6 py-4 text-right">
                                          <span className="text-sm font-black text-emerald-600">{formatCurrency(row.total)}</span>
                                       </td>
                                    </tr>
                                 ))
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               {activeView === 'EXPENSES' && (
                  <div className="space-y-6">
                     <div className="flex justify-between items-center px-1">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Expense Records</h3>
                        <button onClick={() => setExpenseModalOpen(true)} className="bg-red-50 text-red-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-2 active:scale-95 shadow-sm">
                           <i className="fas fa-plus"></i> Add New Record
                        </button>
                     </div>

                     {/* Expenses Desktop Table */}
                     <div className="hidden md:block bg-white rounded-[2rem] border shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                           <thead className="bg-slate-50 border-b">
                              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                 <th className="px-8 py-5">Date</th>
                                 <th className="px-8 py-5">Category</th>
                                 <th className="px-8 py-5">Description</th>
                                 <th className="px-8 py-5 text-right">Amount</th>
                                 <th className="px-8 py-5 text-right">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {filteredExpenses.length === 0 ? (
                                 <tr>
                                    <td colSpan={5} className="px-8 py-10 text-center text-slate-400 italic text-xs font-bold uppercase tracking-widest">No expenses recorded for this period.</td>
                                 </tr>
                              ) : (
                                 filteredExpenses.map(exp => (
                                    <tr key={exp.id} className="hover:bg-slate-50/50">
                                       <td className="px-8 py-5 font-bold text-slate-500 text-xs">{exp.date}</td>
                                       <td className="px-8 py-5">
                                          <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest">{exp.category}</span>
                                       </td>
                                       <td className="px-8 py-5 text-xs font-bold text-slate-700">{exp.description}</td>
                                       <td className="px-8 py-5 text-right font-black text-slate-900 text-sm">{formatCurrency(exp.amount)}</td>
                                       <td className="px-8 py-5 text-right">
                                          <button onClick={() => deleteExpense(exp.id)} className="text-red-400 hover:text-red-600 transition-colors">
                                             <i className="fas fa-trash-can"></i>
                                          </button>
                                       </td>
                                    </tr>
                                 ))
                              )}
                           </tbody>
                        </table>
                     </div>

                     {/* Expenses Mobile Cards */}
                     <div className="md:hidden space-y-4">
                        {filteredExpenses.length === 0 ? (
                           <div className="bg-white p-10 rounded-3xl border border-slate-100 text-center">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">No expenses recorded.</p>
                           </div>
                        ) : (
                           filteredExpenses.map(exp => (
                              <div key={exp.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                 <div className="flex justify-between items-start">
                                    <div>
                                       <span className="bg-slate-100 text-slate-600 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest">{exp.category}</span>
                                       <p className="text-sm font-black text-slate-900 uppercase tracking-tight mt-2">{exp.description}</p>
                                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{exp.date}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-3">
                                       <p className="text-lg font-black text-red-600">{formatCurrency(exp.amount)}</p>
                                       <button onClick={() => deleteExpense(exp.id)} className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center active:bg-red-100 transition-colors">
                                          <i className="fas fa-trash-can text-sm"></i>
                                       </button>
                                    </div>
                                 </div>
                              </div>
                           ))
                        )}
                     </div>
                  </div>
               )}

               {activeView === 'PROFIT_LOSS' && (
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <SummaryCard label="Total Income (Sales)" value={formatCurrency(pnlStats.totalIncome)} color="emerald" />
                        <SummaryCard label="Total Expenses" value={formatCurrency(pnlStats.totalExpenses)} color="slate" />
                        <SummaryCard label="Net Profit / Loss" value={formatCurrency(pnlStats.netProfit)} color={pnlStats.netProfit >= 0 ? "blue" : "red"} />
                     </div>

                     <div className="bg-white p-8 rounded-[2rem] border shadow-sm">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Financial Health Summary</h3>
                        <div className="space-y-4">
                           <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                              <span className="text-xs font-bold text-slate-500 uppercase">Revenue Stream</span>
                              <span className="text-sm font-black text-emerald-600">+{formatCurrency(pnlStats.totalIncome)}</span>
                           </div>
                           <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                              <span className="text-xs font-bold text-slate-500 uppercase">Operational Expenses</span>
                              <span className="text-sm font-black text-slate-700">-{formatCurrency(pnlStats.operationalExpenses)}</span>
                           </div>
                           <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                              <span className="text-xs font-bold text-slate-500 uppercase">Payroll & Commissions</span>
                              <span className="text-sm font-black text-slate-700">-{formatCurrency(pnlStats.payrollCost)}</span>
                           </div>
                           <div className="flex justify-between items-center p-4 bg-red-50 rounded-2xl border border-red-100">
                              <span className="text-xs font-bold text-red-700 uppercase">Total Outflow</span>
                              <span className="text-sm font-black text-red-700">-{formatCurrency(pnlStats.totalExpenses)}</span>
                           </div>
                           <div className={`flex justify-between items-center p-6 rounded-2xl border-2 ${pnlStats.netProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                              <span className={`text-xs font-black uppercase tracking-widest ${pnlStats.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Net Bottom Line</span>
                              <span className={`text-xl font-black ${pnlStats.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(pnlStats.netProfit)}</span>
                           </div>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </div>

         {isExpenseModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
               <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-y-auto shadow-2xl animate-[slideUp_0.3s_ease-out] max-h-[90dvh]">
                  <div className="bg-red-600 p-8 text-white flex justify-between items-center">
                     <div>
                        <h3 className="text-xl font-black uppercase tracking-tight leading-none mb-1">Record Expense</h3>
                        <p className="text-[10px] text-red-200 font-bold uppercase tracking-widest">Financial Outflow</p>
                     </div>
                     <button onClick={() => setExpenseModalOpen(false)} className="bg-white/10 p-2.5 rounded-xl hover:bg-white/20 transition-colors">
                        <i className="fas fa-times"></i>
                     </button>
                  </div>
                  <form onSubmit={handleAddExpense} className="p-8 space-y-6">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                        <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-black text-xs uppercase" value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                           <option value="RENT">Rent / Lease</option>
                           <option value="UTILITIES">Utilities (Electric/Water)</option>
                           <option value="SALARY">Staff Salaries</option>
                           <option value="EQUIPMENT">Equipment Maintenance</option>
                           <option value="MARKETING">Marketing & Ads</option>
                           <option value="OTHER">Other Operational</option>
                        </select>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                           <input type="date" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-black text-xs" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (₹)</label>
                           <input type="number" required min="0" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-black text-sm" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
                        </div>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                        <input type="text" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-bold text-sm" placeholder="e.g. AC Repair" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} />
                     </div>
                     <button type="submit" className="w-full py-5 bg-red-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-red-200 transition-all active:scale-95 hover:bg-red-700">
                        LOG EXPENSE
                     </button>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
};

const SummaryCard = ({ label, value, color }: any) => {
   const colors: any = {
      blue: 'bg-blue-50 text-blue-600 border-blue-100',
      indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      slate: 'bg-slate-50 text-slate-600 border-slate-100',
      red: 'bg-red-50 text-red-600 border-red-100'
   };
   return (
      <div className={`p-6 rounded-[2rem] border shadow-sm ${colors[color]} transition-all min-w-0`}>
         <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1 truncate">{label}</p>
         <p className="text-lg md:text-xl font-black truncate tracking-tight">{value}</p>
      </div>
   );
};

export default TaxCenter;
