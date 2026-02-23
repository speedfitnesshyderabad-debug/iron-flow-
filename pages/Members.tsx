
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole, SubscriptionStatus, User } from '../types';
import { ImageUploadModal } from '../components/ImageUploadModal';
import { PaymentModal } from '../components/PaymentModal';
import { QuickRenewModal } from '../components/QuickRenewModal';
import ActiveSessionsModal from '../components/ActiveSessionsModal';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

import { useSearchParams } from 'react-router-dom';

const Members: React.FC = () => {
  const { users, subscriptions, plans, currentUser, enrollMember, attendance, updateUser, deleteUser, verifyTransactionCode, showToast, purchaseSubscription, pauseMembership, resumeMembership, branches, importMembers, isRowVisible, selectedBranchId } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [pendingRenewal, setPendingRenewal] = useState<{ planId: string; amount: number; paymentMethod: any; discount: number; memberId: string; } | null>(null);
  const [activeModal, setActiveModal] = useState<'logs' | 'manage' | null>(null);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Form States
  const initialBranchId = currentUser?.branchId || (selectedBranchId !== 'all' ? selectedBranchId : branches[0]?.id) || '';

  // Prioritize branch-specific plans for the initial selection
  const branchSpecificPlans = plans.filter(p => p.branchId === initialBranchId);
  const initialPlanId = (branchSpecificPlans.length > 0 ? branchSpecificPlans[0].id : plans.find(p => p.isMultiBranch)?.id) || '';

  const [enrollData, setEnrollData] = useState({ name: '', email: '', phone: '', password: '', planId: initialPlanId, emergencyContact: '', address: '', avatar: '', startDate: new Date().toISOString().split('T')[0], discount: 0, paymentMethod: 'ONLINE' as 'CASH' | 'CARD' | 'ONLINE' | 'POS', transactionCode: '', branchId: initialBranchId, assignedStaffId: '', referralCode: '', pauseAllowance: 0 });
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'EXPIRING_SOON' | 'PAUSED'>('ALL');

  const handleExport = () => {
    const headers = ['Name', 'Email', 'Phone', 'Address', 'BranchID', 'MemberID', 'Role', 'Status'];
    const rows = filteredMembers.map(m => {
      const memberSubs = subscriptions.filter(s => s.memberId === m.id);
      const activeSub = memberSubs.find(s => s.status === SubscriptionStatus.ACTIVE);
      return [
        m.name,
        m.email,
        m.emergencyContact || '',
        m.address || '',
        m.branchId || '',
        m.memberId || '',
        m.role,
        activeSub ? 'Active' : 'Expired'
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `members_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

      const importedUsers: Partial<User & { password?: string }>[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        // Simple CSV parse (handling quotes roughly)
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        const values = row.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));

        if (values.length < 2) continue; // Basic validation check

        // Map based on headers index
        const userObj: any = {};
        headers.forEach((h, index) => {
          const key = h.toLowerCase().replace(/id/g, 'Id');
          // Map CSV headers to User fields
          if (key === 'phone') userObj.emergencyContact = values[index];
          else if (key === 'branchid') userObj.branchId = values[index];
          else if (key === 'memberid') userObj.memberId = values[index];
          else if (key === 'name') userObj.name = values[index];
          else if (key === 'email') userObj.email = values[index];
          else if (key === 'address') userObj.address = values[index];
          else if (key === 'password') userObj.password = values[index];
        });

        if (userObj.email && userObj.name) {
          importedUsers.push(userObj);
        }
      }

      if (importedUsers.length > 0) {
        if (window.confirm(`Ready to import/update ${importedUsers.length} members?`)) {
          await importMembers(importedUsers);
        }
      } else {
        showToast('No valid data found in CSV', 'error');
      }

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // Handle URL Params for Walk-In Conversion
  React.useEffect(() => {
    if (searchParams.get('action') === 'enroll') {
      const name = searchParams.get('name') || '';
      const phone = searchParams.get('phone') || ''; // Mapping phone to emergencyContact temporarily as phone field is not in enrollData top level yet
      const assignedTo = searchParams.get('assignedTo') || '';

      setEnrollData(prev => ({
        ...prev,
        name,
        emergencyContact: phone, // Pre-fill phone
        assignedStaffId: assignedTo
      }));
      setAddModalOpen(true);
      // Clean up params
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const [manageData, setManageData] = useState({ name: '', email: '', emergencyContact: '', address: '', avatar: '', maxDevices: 1 });
  const [isImageModalOpen, setImageModalOpen] = useState(false);
  const [isEnrollImageModalOpen, setEnrollImageModalOpen] = useState(false);
  const [isActiveSessionsModalOpen, setActiveSessionsModalOpen] = useState(false);
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pendingEnrollment, setPendingEnrollment] = useState<any>(null);
  const [isRenewModalOpen, setRenewModalOpen] = useState(false);
  const [renewTarget, setRenewTarget] = useState<{ member: any, currentPlan: any } | null>(null);

  const members = users.filter(u => u.role === UserRole.MEMBER && isRowVisible(u.branchId));

  const filteredMembers = members.filter(m => {
    // 1. Search Filter
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.memberId?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Status Filter
    const memberSubs = subscriptions.filter(s => s.memberId === m.id);
    const activeSub = memberSubs.find(s => s.status === SubscriptionStatus.ACTIVE);

    // Check Expiring Soon (Active + Ends in <= 7 days)
    const isExpiringSoon = (() => {
      if (!activeSub) return false;
      const today = new Date();
      const end = new Date(activeSub.endDate);
      const diffTime = end.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    })();

    switch (filter) {
      case 'ACTIVE': return !!activeSub;
      case 'EXPIRED': return !activeSub && !memberSubs.some(s => s.status === SubscriptionStatus.PAUSED);
      case 'EXPIRING_SOON': return isExpiringSoon;
      case 'PAUSED': return memberSubs.some(s => s.status === SubscriptionStatus.PAUSED);
      default: return true;
    }
  });

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    const plan = plans.find(p => p.id === enrollData.planId);
    if (!plan) {
      showToast('Please select a valid plan', 'error');
      return;
    }

    // For ONLINE payments, show Razorpay modal first
    if (enrollData.paymentMethod === 'ONLINE') {
      const finalAmount = Math.max(0, plan.price - Number(enrollData.discount));
      setPendingEnrollment({
        userData: {
          name: enrollData.name,
          email: enrollData.email,
          emergencyContact: enrollData.emergencyContact,
          address: enrollData.address,
          phone: enrollData.phone,
          avatar: enrollData.avatar,
          branchId: enrollData.branchId
        },
        planId: enrollData.planId,
        discount: Number(enrollData.discount),
        amount: finalAmount,
        planName: plan.name,
        branchId: enrollData.branchId || currentUser?.branchId, // Pass the current branch for payment config
        staffId: enrollData.assignedStaffId, // Pass staffId for sale attribution
        referralCode: enrollData.referralCode,
        pauseAllowance: enrollData.pauseAllowance
      });
      setPaymentModalOpen(true);
      setAddModalOpen(false); // Close enrollment form to prevent multiple windows
      return;
    }

    // For CASH/CARD payments, verify transaction code
    if (enrollData.paymentMethod === 'CASH' || enrollData.paymentMethod === 'CARD') {
      if (!enrollData.transactionCode) {
        showToast('PIN Verification Required for Cash/Card', 'error');
        return;
      }
      setIsVerifying(true);
      const isValid = await verifyTransactionCode(enrollData.transactionCode);
      setIsVerifying(false);

      if (!isValid) {
        showToast('Invalid or Expired Transaction PIN', 'error');
        return;
      }
    }

    // Process enrollment for non-online payments
    completeEnrollment();
  };

  const completeEnrollment = (paymentId?: string) => {
    enrollMember({
      name: enrollData.name,
      email: enrollData.email,
      emergencyContact: enrollData.emergencyContact,
      phone: enrollData.phone,
      address: enrollData.address,
      avatar: enrollData.avatar,
      branchId: enrollData.branchId
    }, enrollData.planId, undefined, enrollData.password, Number(enrollData.discount), enrollData.paymentMethod, enrollData.startDate, enrollData.assignedStaffId, enrollData.referralCode, enrollData.pauseAllowance);

    if (paymentId) {
      showToast(`Payment successful! ID: ${paymentId}`, 'success');
    }

    setAddModalOpen(false);
    setPaymentModalOpen(false);
    setPendingEnrollment(null);
    setEnrollData({ name: '', email: '', phone: '', password: '', planId: initialPlanId, emergencyContact: '', address: '', avatar: '', startDate: new Date().toISOString().split('T')[0], discount: 0, paymentMethod: 'ONLINE', transactionCode: '', branchId: initialBranchId, assignedStaffId: '', referralCode: '', pauseAllowance: 0 });
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    // Handle Enrollment Payment
    if (pendingEnrollment) {
      completeEnrollment(paymentId);
      return;
    }

    // Handle Renewal Payment
    if (pendingRenewal) {
      await purchaseSubscription(pendingRenewal.memberId, pendingRenewal.planId, pendingRenewal.paymentMethod);
      showToast('Membership Renewed Successfully!', 'success');
      setPaymentModalOpen(false);
      setPendingRenewal(null);
      setRenewTarget(null);
    }
  };

  const handleUpdateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMember) {
      updateUser(selectedMember.id, manageData);
      setActiveModal(null);
      setSelectedMember(null);
    }
  };

  const openLogs = (member: User) => {
    setSelectedMember(member);
    setActiveModal('logs');
  };

  const openManage = (member: User) => {
    setSelectedMember(member);
    setManageData({
      name: member.name,
      email: member.email,
      emergencyContact: member.emergencyContact || '',
      address: member.address || '',
      avatar: member.avatar || '',
      maxDevices: member.maxDevices || 1
    });
    setActiveModal('manage');
  };

  const handleImageUpload = (url: string) => {
    setManageData({ ...manageData, avatar: url });
    showToast('Profile picture updated', 'success');
  };

  const handleEnrollImageUpload = (url: string) => {
    setEnrollData({ ...enrollData, avatar: url });
    setImageModalOpen(false);
    showToast('Profile picture added', 'success');
  };

  const handleOpenRenew = (member: User) => {
    const sub = subscriptions.find(s => s.memberId === member.id && (s.status === SubscriptionStatus.ACTIVE || s.status === SubscriptionStatus.EXPIRED));
    const currentPlan = sub ? plans.find(p => p.id === sub.planId) : plans[0]; // Default to first plan if none

    setRenewTarget({ member, currentPlan });
    setRenewModalOpen(true);
  };

  const handleProcessRenew = async (planId: string, amount: number, paymentMethod: any, discount: number, transactionCode?: string) => {
    if (!renewTarget) return;

    // 1. ONLINE PAYMENT -> Open Payment Modal
    if (paymentMethod === 'ONLINE' || paymentMethod === 'CARD') { // Treating CARD as ONLINE for gateway simulation as per user request
      setPendingRenewal({
        planId,
        amount,
        paymentMethod,
        discount,
        memberId: renewTarget.member.id
      });
      setRenewModalOpen(false);
      setPaymentModalOpen(true);
      return;
    }

    // 2. CASH / POS -> Verify PIN
    if (paymentMethod === 'CASH' || paymentMethod === 'POS') {
      if (!transactionCode) {
        showToast('Staff PIN is required for this transaction', 'error');
        return;
      }

      setIsVerifying(true);
      // In a real app, we might want a specific permission check or a different PIN type
      // For now, reusing the transaction code logic
      const isValid = await verifyTransactionCode(transactionCode);
      setIsVerifying(false);

      if (!isValid) {
        showToast('Invalid or Expired PIN', 'error');
        return;
      }
    }

    // 3. Process Immediate Renewal (Cash/POS verified)
    await purchaseSubscription(renewTarget.member.id, planId, paymentMethod);
    showToast('Membership Renewed Successfully!', 'success');
    setRenewModalOpen(false);
    setRenewTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Member Directory</h2>
          <p className="text-gray-500">Manage athletes from across India</p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-200"
        >
          <i className="fas fa-plus"></i> ADD NEW MEMBER
        </button>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={handleExport}
          className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold text-xs hover:bg-green-200 transition-colors flex items-center gap-2"
        >
          <i className="fas fa-file-csv"></i> EXPORT CSV
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors flex items-center gap-2"
        >
          <i className="fas fa-file-upload"></i> IMPORT CSV
        </button>
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          className="hidden"
          onChange={handleImport}
        />
      </div>

      <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full">
          <div className="flex-1 relative w-full">
            <input
              type="text"
              placeholder="Search by name or ID..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { id: 'ALL', label: 'All Members', icon: 'fa-users' },
            { id: 'ACTIVE', label: 'Active', icon: 'fa-check-circle', color: 'text-green-600 bg-green-50 border-green-100 ring-2 ring-green-100' },
            { id: 'EXPIRING_SOON', label: 'Expiring Soon (7 Days)', icon: 'fa-clock', color: 'text-amber-600 bg-amber-50 border-amber-100 ring-2 ring-amber-100' },
            { id: 'EXPIRED', label: 'Expired', icon: 'fa-times-circle', color: 'text-red-600 bg-red-50 border-red-100 ring-2 ring-red-100' },
            { id: 'PAUSED', label: 'Paused', icon: 'fa-pause-circle', color: 'text-slate-600 bg-slate-50 border-slate-100 ring-2 ring-slate-100' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border ${filter === f.id
                ? (f.color || 'bg-slate-800 text-white border-slate-800 shadow-lg scale-105')
                : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                }`}
            >
              <i className={`fas ${f.icon} mr-2`}></i>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map(member => {
          const memberSubs = subscriptions.filter(s => s.memberId === member.id);
          const activeSub = memberSubs.find(s => s.status === SubscriptionStatus.ACTIVE);
          const latestSub = memberSubs.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];

          const sub = activeSub || latestSub;
          const plan = plans.find(p => p.id === sub?.planId);
          const isActive = !!activeSub;

          return (
            <div key={member.id} className="bg-white rounded-2xl border p-6 hover:shadow-xl transition-all group relative overflow-hidden">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img src={member.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md" />
                    {isActive && <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>}
                    {latestSub?.status === SubscriptionStatus.PAUSED && <div className="absolute -top-1 -right-1 w-4 h-4 bg-slate-500 border-2 border-white rounded-full"></div>}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{member.name}</h3>
                    <p className="text-xs font-mono text-gray-400 tracking-tighter uppercase">{member.memberId}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isActive ? 'bg-green-100 text-green-700' :
                  latestSub?.status === SubscriptionStatus.PAUSED ? 'bg-slate-100 text-slate-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                  {isActive ? 'Active' : latestSub?.status === SubscriptionStatus.PAUSED ? 'Paused' : 'Expired'}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-50">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 uppercase font-bold">Subscription</span>
                  <span className="font-bold text-gray-700">{plan?.name || 'No Plan'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-red-500 uppercase font-black text-[9px] tracking-widest">Emergency</span>
                  <span className="font-black text-slate-700">{member.emergencyContact || 'MISSING'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 uppercase font-bold">Address</span>
                  <span className="font-medium text-gray-700 truncate max-w-[150px]" title={member.address}>{member.address || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 uppercase font-bold">Valid Until</span>
                  <span className="font-medium text-gray-700">{sub?.endDate || 'N/A'}</span>
                </div>
                {sub?.pauseAllowanceDays !== undefined && (
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-blue-400 uppercase font-bold text-[9px]">Pause Allowance</span>
                    <span className="font-black text-blue-700">{(sub.pauseAllowanceDays || 0) - (sub.pausedDaysUsed || 0)} Days left</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => openLogs(member)}
                  className="py-2 bg-gray-50 text-gray-500 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors"
                >
                  VIEW LOGS
                </button>
                {(currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.BRANCH_ADMIN) && (
                  <button
                    onClick={() => openManage(member)}
                    className="py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                  >
                    MANAGE
                  </button>
                )}
                {currentUser?.role === UserRole.SUPER_ADMIN && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete ${member.name}? This action cannot be undone.`)) {
                        deleteUser(member.id);
                      }
                    }}
                    className="py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                  >
                    DELETE
                  </button>
                )}
                <button
                  onClick={() => handleOpenRenew(member)}
                  className="py-2 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors uppercase tracking-wider"
                >
                  CHANGE / RENEW PLAN
                </button>
                {activeSub && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to pause ${member.name}'s membership? They will not be able to check in until resumed.`)) {
                        pauseMembership(activeSub.id);
                      }
                    }}
                    className="col-span-2 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors uppercase tracking-wider"
                  >
                    PAUSE MEMBERSHIP
                  </button>
                )}
                {latestSub?.status === SubscriptionStatus.PAUSED && (
                  <button
                    onClick={() => resumeMembership(latestSub.id)}
                    className="col-span-2 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-colors uppercase tracking-wider"
                  >
                    RESUME MEMBERSHIP
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Member Modal */}
      {
        isAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out] max-h-[90vh] overflow-y-auto scrollbar-hide">
              <div className="bg-blue-600 p-6 text-white flex justify-between items-center sticky top-0 z-10">
                <h3 className="text-xl font-bold uppercase tracking-tight leading-none">Athlete Enrollment</h3>
                <button onClick={() => setAddModalOpen(false)}><i className="fas fa-times"></i></button>
              </div>
              <form onSubmit={handleAddMember} className="p-8 space-y-6">

                {currentUser?.role === UserRole.SUPER_ADMIN && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Assign Branch</label>
                    <select
                      className="w-full p-4 bg-gray-50 border rounded-xl font-bold uppercase text-xs"
                      value={enrollData.branchId}
                      onChange={e => {
                        const newBranchId = e.target.value;
                        const branchPlans = plans.filter(p => p.branchId === newBranchId);
                        setEnrollData({ ...enrollData, branchId: newBranchId, planId: branchPlans[0]?.id || '' });
                      }}
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Profile Picture Upload */}
                <div className="flex flex-col items-center space-y-3">
                  <div
                    onClick={() => setEnrollImageModalOpen(true)}
                    className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-all overflow-hidden"
                  >
                    {enrollData.avatar ? (
                      <img src={enrollData.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <i className="fas fa-camera text-2xl text-gray-400"></i>
                        <p className="text-[10px] text-gray-400 mt-1">Add Photo</p>
                      </div>
                    )}
                  </div>
                  {enrollData.avatar && (
                    <button
                      type="button"
                      onClick={() => setEnrollData({ ...enrollData, avatar: '' })}
                      className="text-xs text-red-500 font-bold hover:text-red-700"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                  <input required type="text" className="w-full p-4 bg-gray-50 border rounded-xl font-bold" placeholder="Arjun Reddy" value={enrollData.name} onChange={e => setEnrollData({ ...enrollData, name: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Address</label>
                  <textarea className="w-full p-4 bg-gray-50 border rounded-xl font-bold text-sm" placeholder="Street, City, State, PIN" value={enrollData.address} onChange={e => setEnrollData({ ...enrollData, address: e.target.value })} rows={2}></textarea>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mobile Number</label>
                  <input required type="tel" className="w-full p-4 bg-gray-50 border rounded-xl font-bold" placeholder="+91 XXXXX XXXXX" value={enrollData.phone} onChange={e => setEnrollData({ ...enrollData, phone: e.target.value })} />
                </div>

                <div className="space-y-2 p-4 bg-red-50 rounded-2xl border border-red-100">
                  <label className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2 mb-1">
                    <i className="fas fa-truck-medical"></i> Emergency Contact Number
                  </label>
                  <input required type="tel" className="w-full p-3 bg-white border border-red-100 rounded-xl font-black text-red-700" placeholder="+91 XXXXX XXXXX" value={enrollData.emergencyContact} onChange={e => setEnrollData({ ...enrollData, emergencyContact: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                  <input required type="email" className="w-full p-4 bg-gray-50 border rounded-xl font-bold" placeholder="athlete@ironflow.in" value={enrollData.email} onChange={e => setEnrollData({ ...enrollData, email: e.target.value })} />
                </div>

                <div className="space-y-2 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-1">
                    <i className="fas fa-gift"></i> Referral Code (Optional)
                  </label>
                  <input type="text" className="w-full p-3 bg-white border border-indigo-100 rounded-xl font-black text-indigo-700 uppercase tracking-wider placeholder:text-indigo-200" placeholder="IF-REF-CODE" value={enrollData.referralCode} onChange={e => setEnrollData({ ...enrollData, referralCode: e.target.value.toUpperCase() })} />
                </div>

                {(currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.BRANCH_ADMIN) && (
                  <div className="space-y-2 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 mb-1">
                      <i className="fas fa-pause-circle"></i> Pause Allowance (Days)
                    </label>
                    <input type="number" min="0" max="365" className="w-full p-3 bg-white border border-blue-100 rounded-xl font-black text-blue-700" placeholder="0" value={enrollData.pauseAllowance} onChange={e => setEnrollData({ ...enrollData, pauseAllowance: parseInt(e.target.value) || 0 })} />
                  </div>
                )}

                <p className="text-[10px] text-gray-400 font-medium">Auto-generated password will be sent via SMS/Email.</p>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Initial Plan</label>
                  <select className="w-full p-4 bg-gray-50 border rounded-xl font-bold uppercase text-xs" value={enrollData.planId} onChange={e => setEnrollData({ ...enrollData, planId: e.target.value })}>
                    {plans.filter(p => p.branchId === enrollData.branchId).map(p => <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-calendar-alt"></i> Membership Start Date
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full p-4 bg-indigo-50 border border-indigo-100 rounded-xl font-bold"
                    value={enrollData.startDate}
                    onChange={e => setEnrollData({ ...enrollData, startDate: e.target.value })}
                  />
                  <p className="text-[10px] text-slate-400 font-medium">Plan will start from this date</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Payment Method</label>
                  <select className="w-full p-4 bg-gray-50 border rounded-xl font-bold uppercase text-xs" value={enrollData.paymentMethod} onChange={e => setEnrollData({ ...enrollData, paymentMethod: e.target.value as any })}>
                    <option value="ONLINE">Online (UPI / Gateway)</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Credit / Debit Card</option>
                  </select>
                </div>

                {(enrollData.paymentMethod === 'CASH' || enrollData.paymentMethod === 'CARD') && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                      <i className="fas fa-lock"></i> Transaction Authorization Code
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isVerifying}
                      className="w-full p-4 bg-indigo-50 border border-indigo-100 rounded-xl font-mono text-center text-lg tracking-[0.3em] font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="XXXXXX"
                      value={enrollData.transactionCode}
                      onChange={e => setEnrollData({ ...enrollData, transactionCode: e.target.value })}
                    />
                    <p className="text-[10px] text-slate-400 font-medium">Ask Branch Admin to generate a one-time code.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Discount Amount (₹)</label>
                  <input type="number" min="0" className="w-full p-4 bg-gray-50 border rounded-xl font-bold" placeholder="0" value={enrollData.discount} onChange={e => setEnrollData({ ...enrollData, discount: Number(e.target.value) })} />
                </div>
                <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-2xl shadow-blue-100 active:scale-95 transition-all">ACTIVATE MEMBERSHIP</button>
              </form>
            </div>
          </div>
        )
      }

      {/* Logs Modal */}
      {
        activeModal === 'logs' && selectedMember && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out]">
              <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <img src={selectedMember.avatar} className="w-10 h-10 rounded-full border border-slate-700" alt="" />
                  <div>
                    <h3 className="font-bold">{selectedMember.name}</h3>
                    <p className="text-[10px] uppercase text-slate-400">Attendance History</p>
                  </div>
                </div>
                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white"><i className="fas fa-times"></i></button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto">
                {attendance.filter(a => a.userId === selectedMember.id).length === 0 ? (
                  <div className="text-center py-10 text-gray-400 italic">No attendance records found for this member.</div>
                ) : (
                  <div className="space-y-4">
                    {attendance.filter(a => a.userId === selectedMember.id).reverse().map(a => (
                      <div key={a.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center">
                            <i className="fas fa-check text-xs"></i>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{a.date}</p>
                            <p className="text-[10px] text-gray-500 uppercase">Checked In at {a.timeIn}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold bg-white px-2 py-1 rounded border text-gray-400">LOGGED</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Manage Modal */}
      {
        activeModal === 'manage' && selectedMember && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out] max-h-[90vh] overflow-y-auto scrollbar-hide">
              <div className="bg-indigo-600 p-6 text-white flex justify-between items-center sticky top-0 z-10">
                <h3 className="text-xl font-bold uppercase tracking-tight leading-none">Manage Profile</h3>
                <button onClick={() => setActiveModal(null)}><i className="fas fa-times"></i></button>
              </div>
              <form onSubmit={handleUpdateMember} className="p-8 space-y-6">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <img
                      src={manageData.avatar || 'https://i.pravatar.cc/150?u=default'}
                      alt="Profile"
                      className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setImageModalOpen(true)}
                      className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
                    >
                      <i className="fas fa-camera text-xs"></i>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 font-medium">Click camera to change photo</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Athlete Name</label>
                  <input required type="text" className="w-full p-4 bg-gray-50 border rounded-xl font-bold" value={manageData.name} onChange={e => setManageData({ ...manageData, name: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Address</label>
                  <textarea className="w-full p-4 bg-gray-50 border rounded-xl font-bold text-sm" value={manageData.address} onChange={e => setManageData({ ...manageData, address: e.target.value })} rows={2}></textarea>
                </div>

                <div className="space-y-2 p-4 bg-red-50 rounded-2xl border border-red-100">
                  <label className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2 mb-1">
                    <i className="fas fa-truck-medical"></i> Emergency Contact Number
                  </label>
                  <input required type="tel" className="w-full p-3 bg-white border border-red-100 rounded-xl font-black text-red-700" value={manageData.emergencyContact} onChange={e => setManageData({ ...manageData, emergencyContact: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contact Email</label>
                  <input required type="email" className="w-full p-4 bg-gray-50 border rounded-xl font-bold" value={manageData.email} onChange={e => setManageData({ ...manageData, email: e.target.value })} />
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-[10px] font-black uppercase text-blue-600 tracking-widest leading-relaxed">
                  <i className="fas fa-info-circle mr-2"></i>
                  Safety contact information is visible to receptionist and managers in case of emergency.
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Max Devices</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="w-full p-4 bg-gray-50 border rounded-xl font-bold"
                      value={manageData.maxDevices}
                      onChange={e => setManageData({ ...manageData, maxDevices: parseInt(e.target.value) || 1 })}
                    />
                    <button
                      type="button"
                      onClick={() => setActiveSessionsModalOpen(true)}
                      className="px-4 bg-slate-800 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-700 whitespace-nowrap shadow-lg"
                    >
                      <i className="fas fa-laptop-medical mr-2"></i>
                      Reset Device Access
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium">Restricts simultaneous logins. Default is 1.</p>
                </div>
                <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 active:scale-95 transition-all">COMMIT CHANGES</button>
              </form>
            </div>
          </div>
        )
      }

      <ImageUploadModal
        isOpen={isImageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onUpload={handleImageUpload}
        title="Update Member Photo"
      />

      <ImageUploadModal
        isOpen={isEnrollImageModalOpen}
        onClose={() => setEnrollImageModalOpen(false)}
        onUpload={handleEnrollImageUpload}
        title="Add Athlete Photo"
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setPendingEnrollment(null);
          setPendingRenewal(null); // Clear renewal state too
          if (renewTarget) {
            setRenewTarget(null); // Close renew flow if cancelled
          }
        }}
        amount={pendingEnrollment ? pendingEnrollment.amount : (pendingRenewal?.amount || 0)}
        description={pendingEnrollment
          ? `${pendingEnrollment.planName} - ${enrollData.name}`
          : `Renewal: ${plans.find(p => p.id === pendingRenewal?.planId)?.name} - ${renewTarget?.member.name}`
        }
        customerName={pendingEnrollment ? enrollData.name : (renewTarget?.member.name || '')}
        customerEmail={pendingEnrollment ? enrollData.email : (renewTarget?.member.email || '')}
        customerPhone={pendingEnrollment ? enrollData.emergencyContact : (renewTarget?.member.emergencyContact || '')}
        branchId={pendingEnrollment?.branchId || currentUser?.branchId}
        onSuccess={handlePaymentSuccess}
        onError={(error) => {
          console.error('Payment error:', error);
          showToast('Payment failed. Please try again.', 'error');
        }}
      />

      {
        renewTarget && (
          <QuickRenewModal
            isOpen={isRenewModalOpen}
            onClose={() => setRenewModalOpen(false)}
            member={renewTarget.member}
            currentPlan={renewTarget.currentPlan}
            plans={plans}
            onRenew={handleProcessRenew}
            requirePin={true} // Admin facing, so require PIN for cash/pos
          />
        )
      }

      {
        selectedMember && isActiveSessionsModalOpen && (
          <ActiveSessionsModal
            user={selectedMember}
            onClose={() => setActiveSessionsModalOpen(false)}
          />
        )
      }

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div >
  );
};

export default Members;
