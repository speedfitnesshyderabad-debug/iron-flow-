import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole, WalkIn } from '../types';
import { useNavigate } from 'react-router-dom';

const WalkInManagement: React.FC = () => {
  const { users, currentUser, walkIns, addWalkIn, updateWalkIn, showToast, branches, isRowVisible } = useAppContext();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWalkIn, setSelectedWalkIn] = useState<WalkIn | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'NEW' | 'FOLLOW_UP' | 'CONVERTED' | 'NOT_INTERESTED'>('ALL');
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    purpose: 'MEMBERSHIP_INQUIRY' as WalkIn['purpose'],
    source: 'WALK_IN' as WalkIn['source'],
    notes: '',
    assignedTo: '',
    followUpDate: '',
    status: 'NEW' as WalkIn['status'],
    branchId: currentUser?.branchId || branches[0]?.id || ''
  });

  const staffMembers = users.filter(u =>
    u.role !== UserRole.MEMBER &&
    (currentUser?.role === UserRole.SUPER_ADMIN ? u.branchId === formData.branchId : u.branchId === currentUser?.branchId)
  );

  const filteredWalkIns = walkIns.filter(w =>
    isRowVisible(w.branchId) &&
    (filterStatus === 'ALL' ? w.status !== 'CONVERTED' && w.status !== 'NOT_INTERESTED' : w.status === filterStatus)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Clean up empty strings for database compatibility (Foreign Keys and Date types)
    const cleanedData = {
      ...formData,
      email: formData.email.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      assignedTo: formData.assignedTo || undefined,
      followUpDate: formData.followUpDate || undefined,
      branchId: formData.branchId || currentUser?.branchId || branches[0]?.id
    };

    if (!cleanedData.branchId) {
      showToast('Branch assignment is required', 'error');
      setIsSaving(false);
      return;
    }

    try {
      if (selectedWalkIn) {
        await updateWalkIn(selectedWalkIn.id, {
          ...cleanedData,
          updatedAt: new Date().toISOString()
        } as Partial<WalkIn>);
      } else {
        const newWalkIn: WalkIn = {
          id: `walkin-${Date.now()}`,
          ...cleanedData,
          status: formData.status || 'NEW',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as WalkIn;
        await addWalkIn(newWalkIn);
      }
      resetForm();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Walk-in error:', err);
      showToast('Error: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      purpose: 'MEMBERSHIP_INQUIRY',
      source: 'WALK_IN',
      notes: '',
      assignedTo: '',
      followUpDate: '',
      status: 'NEW',
      branchId: currentUser?.branchId || branches[0]?.id || ''
    });
    setSelectedWalkIn(null);
  };

  const handleEdit = (walkIn: WalkIn) => {
    setSelectedWalkIn(walkIn);
    setFormData({
      name: walkIn.name,
      phone: walkIn.phone,
      email: walkIn.email || '',
      purpose: walkIn.purpose,
      source: walkIn.source,
      notes: walkIn.notes || '',
      assignedTo: walkIn.assignedTo || '',
      followUpDate: walkIn.followUpDate || '',
      status: walkIn.status,
      branchId: walkIn.branchId
    });
    setIsModalOpen(true);
  };

  const handleStatusChange = async (id: string, newStatus: WalkIn['status']) => {
    await updateWalkIn(id, { status: newStatus, updatedAt: new Date().toISOString() });
  };

  const handleConvertToMember = async (walkIn: WalkIn) => {
    await updateWalkIn(walkIn.id, { status: 'CONVERTED', updatedAt: new Date().toISOString() });
    showToast(`${walkIn.name} marked as converted`, 'success');
    navigate(`/members?action=enroll&name=${encodeURIComponent(walkIn.name)}&phone=${encodeURIComponent(walkIn.phone)}&assignedTo=${walkIn.assignedTo || ''}`);
  };

  const getStatusColor = (status: WalkIn['status']) => {
    switch (status) {
      case 'NEW': return 'bg-blue-100 text-blue-700';
      case 'FOLLOW_UP': return 'bg-amber-100 text-amber-700';
      case 'CONVERTED': return 'bg-green-100 text-green-700';
      case 'NOT_INTERESTED': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPurposeLabel = (purpose: WalkIn['purpose']) => {
    const labels: Record<string, string> = {
      MEMBERSHIP_INQUIRY: 'Membership Inquiry',
      TOUR: 'Gym Tour',
      DAY_PASS: 'Day Pass',
      PT_CONSULTATION: 'PT Consultation',
      CLASS_INQUIRY: 'Class Inquiry',
      OTHER: 'Other'
    };
    return labels[purpose] || purpose;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Walk-In Management</h2>
          <p className="text-slate-500 font-medium text-sm">Track visitors and convert leads to members</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="w-full md:w-auto bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 active:scale-95"
        >
          <i className="fas fa-plus"></i> REGISTER WALK-IN
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'New Leads', count: walkIns.filter(w => w.status === 'NEW').length, color: 'blue', icon: 'fa-star' },
          { label: 'Follow-ups', count: walkIns.filter(w => w.status === 'FOLLOW_UP').length, color: 'indigo', icon: 'fa-phone' },
          { label: 'Converted', count: walkIns.filter(w => w.status === 'CONVERTED').length, color: 'emerald', icon: 'fa-check-circle' },
          { label: 'Total Base', count: walkIns.length, color: 'slate', icon: 'fa-users' }
        ].map((stat, idx) => {
          const colors: any = {
            blue: 'bg-blue-50 text-blue-600 border-blue-100',
            indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
            emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            slate: 'bg-slate-50 text-slate-600 border-slate-100'
          };
          return (
            <div key={idx} className={`p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border shadow-sm ${colors[stat.color]} transition-all`}>
              <div className="flex justify-between items-center mb-1">
                <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-60 truncate">{stat.label}</p>
                <i className={`fas ${stat.icon} text-[10px] opacity-40`}></i>
              </div>
              <p className="text-xl md:text-2xl font-black truncate tracking-tight">{stat.count}</p>
            </div>
          );
        })}
      </div>

      <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm overflow-x-auto scrollbar-hide">
        {(['ALL', 'NEW', 'FOLLOW_UP', 'CONVERTED', 'NOT_INTERESTED'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterStatus === status
              ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {filteredWalkIns.map(walkIn => (
          <div key={walkIn.id} className="bg-white rounded-[2rem] border shadow-sm p-6 md:p-8 hover:shadow-xl transition-all relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-[0.03] transition-transform group-hover:scale-110 ${getStatusColor(walkIn.status).split(' ')[0]}`}></div>

            <div className="flex justify-between items-start mb-6">
              <div className="min-w-0">
                <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight truncate">{walkIn.name}</h3>
                <div className="flex flex-col gap-1 mt-2">
                  <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                    <i className="fas fa-phone text-[10px] text-blue-500"></i> {walkIn.phone}
                  </p>
                  {walkIn.email && (
                    <p className="text-xs font-bold text-slate-500 truncate flex items-center gap-2">
                      <i className="fas fa-envelope text-[10px] text-blue-500"></i> {walkIn.email}
                    </p>
                  )}
                </div>
              </div>
              <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm ${getStatusColor(walkIn.status)}`}>
                {walkIn.status.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
              <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest">
                <span className="text-slate-400">Purpose</span>
                <span className="text-slate-900">{getPurposeLabel(walkIn.purpose)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest">
                <span className="text-slate-400">Channel</span>
                <span className="text-slate-900">{walkIn.source.replace('_', ' ')}</span>
              </div>
              {walkIn.assignedTo && (
                <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest">
                  <span className="text-slate-400">Assigned To</span>
                  <span className="text-blue-600">{staffMembers.find(s => s.id === walkIn.assignedTo)?.name || 'Unknown'}</span>
                </div>
              )}
              {walkIn.followUpDate && (
                <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest pt-2 border-t border-slate-200/50 mt-1">
                  <span className="text-slate-400">Follow-up</span>
                  <span className={`font-black ${new Date(walkIn.followUpDate) < new Date() ? 'text-red-600' : 'text-slate-900'}`}>
                    <i className="far fa-calendar-alt mr-1"></i> {walkIn.followUpDate}
                  </span>
                </div>
              )}
            </div>

            {walkIn.notes && (
              <div className="mb-6 relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-full"></div>
                <p className="text-xs font-medium text-slate-600 pl-4 italic leading-relaxed line-clamp-2">"{walkIn.notes}"</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleEdit(walkIn)}
                className="py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
              >
                EDIT PROFILE
              </button>
              {walkIn.status !== 'CONVERTED' && (
                <button
                  onClick={() => handleConvertToMember(walkIn)}
                  className="py-3 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <i className="fas fa-user-plus"></i> CONVERT
                </button>
              )}
            </div>

            {(walkIn.status === 'NEW' || walkIn.status === 'FOLLOW_UP') && (
              <div className="mt-3 pt-3 flex gap-2 border-t border-dashed border-slate-200">
                {walkIn.status === 'NEW' && (
                  <button
                    onClick={() => handleStatusChange(walkIn.id, 'FOLLOW_UP')}
                    className="flex-1 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[8px] uppercase tracking-widest hover:bg-indigo-100 transition-all"
                  >
                    MOVE TO FOLLOW-UP
                  </button>
                )}
                <button
                  onClick={() => handleStatusChange(walkIn.id, 'NOT_INTERESTED')}
                  className="flex-1 py-3 bg-red-50 text-red-500 rounded-xl font-black text-[8px] uppercase tracking-widest hover:bg-red-100 transition-all"
                >
                  NOT INTERESTED
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredWalkIns.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border">
          <i className="fas fa-walking text-4xl text-gray-300 mb-4"></i>
          <p className="text-gray-500">No walk-ins found</p>
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="mt-4 text-blue-600 font-bold text-sm hover:underline"
          >
            Register your first walk-in
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-[slideUp_0.3s_ease-out] max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 tracking-tight uppercase">
              {selectedWalkIn ? 'Update Walk-In' : 'Register Walk-In'}
            </h3>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {currentUser?.role === UserRole.SUPER_ADMIN && (
                <div className="space-y-2">
                  <label htmlFor="walkin-branch" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Assign Branch</label>
                  <select
                    id="walkin-branch" name="branchId"
                    className="w-full p-4 bg-gray-50 border rounded-xl font-bold uppercase text-xs"
                    value={formData.branchId}
                    onChange={e => {
                      setFormData({ ...formData, branchId: e.target.value, assignedTo: '' });
                    }}
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedWalkIn && (
                <div className="space-y-1">
                  <label htmlFor="walkin-status" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Status</label>
                  <select
                    id="walkin-status" name="status"
                    className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold text-xs uppercase"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as WalkIn['status'] })}
                  >
                    <option value="NEW">New Lead</option>
                    <option value="FOLLOW_UP">Follow-up Required</option>
                    <option value="CONVERTED">Converted to Member</option>
                    <option value="NOT_INTERESTED">Not Interested</option>
                  </select>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="walkin-name" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Name</label>
                  <input
                    id="walkin-name" name="name"
                    required
                    type="text"
                    className="w-full p-3 bg-gray-50 border rounded-xl outline-none mt-1 font-bold"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="walkin-phone" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Phone</label>
                  <input
                    id="walkin-phone" name="phone"
                    required
                    type="tel"
                    className="w-full p-3 bg-gray-50 border rounded-xl outline-none mt-1 font-bold"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="walkin-email" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email (Optional)</label>
                  <input
                    id="walkin-email" name="email"
                    type="email"
                    className="w-full p-3 bg-gray-50 border rounded-xl outline-none mt-1 font-bold"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="walkin-purpose" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Purpose</label>
                  <select
                    id="walkin-purpose" name="purpose"
                    className="w-full p-3 bg-gray-50 border rounded-xl outline-none mt-1 font-bold uppercase text-xs"
                    value={formData.purpose}
                    onChange={e => setFormData({ ...formData, purpose: e.target.value as WalkIn['purpose'] })}
                  >
                    <option value="MEMBERSHIP_INQUIRY">Membership Inquiry</option>
                    <option value="TOUR">Gym Tour</option>
                    <option value="DAY_PASS">Day Pass</option>
                    <option value="PT_CONSULTATION">PT Consultation</option>
                    <option value="CLASS_INQUIRY">Class Inquiry</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="walkin-source" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Source</label>
                  <select
                    id="walkin-source" name="source"
                    className="w-full p-3 bg-gray-50 border rounded-xl outline-none mt-1 font-bold uppercase text-xs"
                    value={formData.source}
                    onChange={e => setFormData({ ...formData, source: e.target.value as WalkIn['source'] })}
                  >
                    <option value="WALK_IN">Walk-In</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="SOCIAL_MEDIA">Social Media</option>
                    <option value="GOOGLE">Google</option>
                    <option value="JUSTDIAL">JustDial</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="walkin-assignee" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Assign To</label>
                  <select
                    id="walkin-assignee" name="assignedTo"
                    className="w-full p-3 bg-gray-50 border rounded-xl outline-none mt-1 font-bold uppercase text-xs"
                    value={formData.assignedTo}
                    onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                  >
                    <option value="">-- Select Staff --</option>
                    {staffMembers.map(staff => (
                      <option key={staff.id} value={staff.id}>{staff.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="walkin-followup" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Follow-up Date</label>
                  <input
                    id="walkin-followup" name="followUpDate"
                    type="date"
                    className="w-full p-3 bg-gray-50 border rounded-xl outline-none mt-1 font-bold"
                    value={formData.followUpDate}
                    onChange={e => setFormData({ ...formData, followUpDate: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="walkin-notes" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Notes</label>
                  <textarea
                    id="walkin-notes" name="notes"
                    rows={3}
                    className="w-full p-3 bg-gray-50 border rounded-xl outline-none mt-1 resize-none font-medium text-sm"
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div className="pt-4 space-y-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : selectedWalkIn ? 'Update' : 'Register'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { resetForm(); setIsModalOpen(false); }}
                    className="w-full py-3 text-gray-500 font-bold hover:text-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default WalkInManagement;
