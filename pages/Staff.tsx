
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole, User, Attendance, Shift } from '../types';
import { ImageUploadModal } from '../components/ImageUploadModal';
import ActiveSessionsModal from '../components/ActiveSessionsModal';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../src/lib/supabase';

const Staff: React.FC = () => {
  const { users, branches, currentUser, addUser, updateUser, deleteUser, attendance, isRowVisible } = useAppContext();
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isLogsModalOpen, setLogsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.TRAINER,
    branchId: branches[0]?.id || '',
    shifts: [{ start: '09:00', end: '13:00' }] as Shift[],
    weekOffs: [] as string[],
    monthlySalary: 15000,
    commissionPercentage: 10,
    salesCommissionPercentage: 0,
    ptCommissionPercentage: 0,
    groupCommissionPercentage: 0,
    emergencyContact: '',
    phone: '',
    avatar: '',
    maxDevices: 1,
    isActive: true
  });
  const [isImageModalOpen, setImageModalOpen] = useState(false);
  const [isActiveSessionsModalOpen, setActiveSessionsModalOpen] = useState(false);

  const staffMembers = users.filter(u =>
    u.role !== UserRole.MEMBER && isRowVisible(u.branchId)
  );

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      email: '',
      password: '', // Default empty
      role: UserRole.TRAINER,
      branchId: currentUser?.branchId || branches[0]?.id || '',
      shifts: [{ start: '09:00', end: '13:00' }],
      weekOffs: [],
      monthlySalary: 15000,
      commissionPercentage: 10,
      salesCommissionPercentage: 0,
      ptCommissionPercentage: 0,
      groupCommissionPercentage: 0,
      emergencyContact: '',
      phone: '',
      avatar: '',
      maxDevices: 1,
      isActive: true
    });
    setAddModalOpen(true);
  };

  const handleOpenEdit = (staff: User) => {
    setSelectedStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      password: '', // Don't show existing password
      role: staff.role,
      branchId: staff.branchId || branches[0]?.id || '',
      shifts: staff.shifts && staff.shifts.length > 0 ? staff.shifts : [{ start: '09:00', end: '13:00' }],
      weekOffs: staff.weekOffs || [],
      monthlySalary: staff.monthlySalary || 15000,
      commissionPercentage: staff.commissionPercentage || 0,
      salesCommissionPercentage: staff.salesCommissionPercentage ?? staff.commissionPercentage ?? 0,
      ptCommissionPercentage: staff.ptCommissionPercentage ?? 0,
      groupCommissionPercentage: staff.groupCommissionPercentage ?? 0,
      emergencyContact: staff.emergencyContact || '',
      phone: staff.phone || '',
      avatar: staff.avatar || '',
      maxDevices: staff.maxDevices || 1,
      isActive: staff.isActive !== false // defaults to true if undefined
    });
    setEditModalOpen(true);
  };

  const handleImageUpload = (url: string) => {
    setFormData({ ...formData, avatar: url });
  };

  const handleOpenLogs = (staff: User) => {
    setSelectedStaff(staff);
    setLogsModalOpen(true);
  };

  const handleAddStaff = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!formData.branchId) {
      alert("Please select a home branch for this staff member.");
      return;
    }

    try {
      // 1. Create a temporary Supabase client to create the user without logging out the admin
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const tempSupabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false, // Vital! Don't overwrite the admin's session in localStorage
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      // Auto-generate strong password
      const randomSuffix = Math.random().toString(36).slice(-6).toUpperCase();
      const staffPassword = `IronFlow-${randomSuffix}`;

      // 2. Sign up the new user in Supabase Auth
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: formData.email,
        password: staffPassword,
        options: {
          data: {
            name: formData.name,
            role: formData.role,
            branchId: formData.branchId
          }
        }
      });

      let finalAuthData = authData;

      if (authError?.message?.toLowerCase().includes('already registered') || authError?.message?.toLowerCase().includes('already been registered')) {
        console.warn('⚠️ Stale Auth user detected, cleaning up and retrying...');
        const supabaseUrlClean = import.meta.env.VITE_SUPABASE_URL?.trim();

        // Delete stale Auth user via edge function by email
        await fetch(`${supabaseUrlClean}/functions/v1/delete-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ email: formData.email }),
        });

        // Retry signup
        const { data: retryData, error: retryError } = await tempSupabase.auth.signUp({
          email: formData.email,
          password: staffPassword,
          options: {
            data: {
              name: formData.name,
              role: formData.role,
              branchId: formData.branchId
            }
          }
        });

        if (retryError) throw retryError;
        if (!retryData.user) throw new Error('Failed to create staff auth user after cleanup');
        finalAuthData = retryData;
      } else if (authError) {
        throw authError;
      }

      if (finalAuthData.user) {
        console.log('✅ Staff Auth User Created:', finalAuthData.user.id);

        // 3. Create the public user record with the Auth ID
        const newStaff: User = {
          id: finalAuthData.user.id, // Use the Auth UID!
          name: formData.name,
          email: formData.email,
          // password: staffPassword, // ❌ SECURITY: Do NOT store the password!
          role: formData.role,
          branchId: formData.branchId,
          shifts: formData.shifts,
          weekOffs: formData.weekOffs,
          monthlySalary: formData.monthlySalary,
          commissionPercentage: formData.commissionPercentage,
          salesCommissionPercentage: formData.salesCommissionPercentage,
          ptCommissionPercentage: formData.ptCommissionPercentage,
          groupCommissionPercentage: formData.groupCommissionPercentage,
          emergencyContact: formData.emergencyContact,
          phone: formData.phone,
          avatar: formData.avatar || `https://i.pravatar.cc/150?u=${Date.now()}`,
          isActive: formData.isActive
        };

        await addUser(newStaff);
        setAddModalOpen(false);
        alert(`STAFF ACCOUNT CREATED!\n\nEmail: ${formData.email}\nTemporary Password: ${staffPassword}\n\nPlease share this password with the staff member securely.`);
      }

    } catch (error: any) {
      console.error('Error creating staff:', error);
      alert('Failed to create staff account: ' + (error.message || 'Unknown error'));
    }
  };

  const handleUpdateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStaff) {
      // 1. Separate Password from Profile Data
      // Note: We cannot update another user's password via the public table or standard client auth.
      // This would require a backend function. For now, we allow profile updates only.
      const { password, ...profileUpdates } = formData;

      updateUser(selectedStaff.id, profileUpdates);
      setEditModalOpen(false);
      setSelectedStaff(null);

      if (password) {
        alert("Note: Password was not updated. Staff password updates require Admin Console access.");
      }
    }
  };

  const handleDeleteStaff = (id: string) => {
    if (window.confirm('Are you sure you want to remove this staff member?')) {
      deleteUser(id);
    }
  };

  const addShiftInput = () => {
    if (formData.shifts.length < 3) {
      setFormData({ ...formData, shifts: [...formData.shifts, { start: '14:00', end: '18:00' }] });
    }
  };

  const removeShiftInput = (index: number) => {
    if (formData.shifts.length > 1) {
      const newShifts = [...formData.shifts];
      newShifts.splice(index, 1);
      setFormData({ ...formData, shifts: newShifts });
    }
  };

  const handleShiftChange = (index: number, field: keyof Shift, value: string) => {
    const newShifts = [...formData.shifts];
    newShifts[index] = { ...newShifts[index], [field]: value };
    setFormData({ ...formData, shifts: newShifts });
  };

  const calculateHours = (timeIn: string, timeOut?: string, date?: string, staffId?: string) => {
    // 🌟 PAID WEEK OFF LOGIC (9 HOURS CREDIT)
    if (staffId && date && timeIn === 'WEEK_OFF') {
      return '9.0 hrs'; // Automatic credit
    }

    // 🌟 BRANCH HOLIDAY LOGIC (9 HOURS CREDIT)
    if (staffId && date) {
      const staff = users.find(u => u.id === staffId);
      if (staff && staff.branchId) {
        const branch = branches.find(b => b.id === staff.branchId);
        if (branch && branch.holidays && branch.holidays.includes(date) && (!timeOut || timeIn === 'HOLIDAY')) {
          return '9.0 hrs'; // Paid Leave
        }
      }
    }

    if (!timeOut) return 'Active';

    let start = new Date(`2000-01-01 ${timeIn}`);
    const end = new Date(`2000-01-01 ${timeOut}`);

    // SMART ROUNDING LOGIC (Option B) - Multi-Shift Support
    if (staffId && date) {
      const staff = users.find(u => u.id === staffId);
      if (staff && staff.shifts && staff.shifts.length > 0) {

        // Find the shift that this check-in belongs to (closest start time)
        let matchedShift = staff.shifts[0];
        let minDiff = Number.MAX_VALUE;

        staff.shifts.forEach(shift => {
          if (!shift.start) return;
          const shiftStart = new Date(`2000-01-01 ${shift.start}`);
          const diff = Math.abs(start.getTime() - shiftStart.getTime());

          // If check-in is within 2 hours of shift start (before or after), match it
          if (diff < minDiff && diff < (2 * 60 * 60 * 1000)) {
            minDiff = diff;
            matchedShift = shift;
          }
        });

        if (matchedShift && matchedShift.start) {
          const shiftStart = new Date(`2000-01-01 ${matchedShift.start}`);
          // If arrived early (Actual < Schedule), use Schedule
          // Only if checking in within 1 hour before shift (prevents very early mixups)
          if (start < shiftStart && (shiftStart.getTime() - start.getTime() < 60 * 60 * 1000)) {
            start = shiftStart;
          }
        }
      }
    }

    const diff = (end.getTime() - start.getTime()) / 1000 / 60 / 60;
    return `${Math.max(0, diff).toFixed(1)} hrs`;
  };

  const formatTime = (time?: string) => {
    if (!time) return 'N/A';
    try {
      const [hrs, mins] = time.split(':');
      const h = parseInt(hrs);
      const suffix = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 || 12;
      return `${displayH}:${mins} ${suffix}`;
    } catch (e) { return time; }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Staff Directory</h2>
          <p className="text-gray-500 font-medium text-sm">Monitor multiple shifts and team attendance logs</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 md:py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-100"
        >
          <i className="fas fa-user-plus"></i> ADD STAFF
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-gray-50 border-b">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-5 text-center w-20">Photo</th>
                <th className="px-6 py-5 min-w-[180px]">Employee</th>
                <th className="px-6 py-5 min-w-[140px]">Role</th>
                <th className="px-6 py-5">Pay / Comm</th>
                <th className="px-6 py-5">Shift Info</th>
                <th className="px-6 py-5">Emergency</th>
                <th className="px-6 py-5 text-right pr-8">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">No staff found.</td>
                </tr>
              ) : (
                staffMembers.map(staff => {
                  const branch = branches.find(b => b.id === staff.branchId);
                  const today = new Date().toISOString().split('T')[0];
                  const isCheckedIn = attendance.some(a => a.userId === staff.id && a.date === today && !a.timeOut);

                  return (
                    <tr key={staff.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-5">
                        <img src={staff.avatar} className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm mx-auto" alt="" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 block leading-tight uppercase tracking-tight truncate max-w-[150px]">{staff.name}</span>
                          {staff.isActive === false && (
                            <span className="bg-red-100 text-red-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shrink-0">
                              INACTIVE
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold truncate max-w-[150px] block mt-0.5">{staff.email}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest whitespace-nowrap inline-block">
                          {staff.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-emerald-600">₹{staff.monthlySalary || 15000}<span className="text-[8px] opacity-60">/mo</span></span>
                          {staff.role === UserRole.MANAGER && (
                            <div className="flex flex-col mt-0.5">
                              {(staff.salesCommissionPercentage || 0) > 0 && <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{staff.salesCommissionPercentage}% Gym Comm.</span>}
                              {(staff.ptCommissionPercentage || 0) > 0 && <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{staff.ptCommissionPercentage}% PT Comm.</span>}
                              {(staff.groupCommissionPercentage || 0) > 0 && <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{staff.groupCommissionPercentage}% Group Comm.</span>}
                            </div>
                          )}
                          {staff.role === UserRole.TRAINER && (
                            <div className="flex flex-col mt-0.5">
                              {(staff.commissionPercentage || 0) > 0 && <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{staff.commissionPercentage}% Session Comm.</span>}
                              {(staff.salesCommissionPercentage || 0) > 0 && <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{staff.salesCommissionPercentage}% Sales Comm.</span>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          {isCheckedIn ? (
                            <span className="flex items-center gap-1.5 text-green-600 font-black text-[9px] uppercase tracking-widest">
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                              ON DUTY
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">OFFLINE</span>
                          )}
                          <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest opacity-60 truncate max-w-[120px]">{branch?.name || 'Global'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {staff.emergencyContact ? (
                          <div className="flex items-center gap-2 group/sos cursor-help">
                            <div className="bg-red-50 text-red-600 w-8 h-8 rounded-lg flex items-center justify-center transition-all group-hover/sos:bg-red-600 group-hover/sos:text-white shrink-0">
                              <i className="fas fa-truck-medical text-xs"></i>
                            </div>
                            <span className="text-[10px] font-black text-slate-500 whitespace-nowrap">
                              {staff.emergencyContact}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic font-bold">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right pr-8">
                        <div className="flex justify-end gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenLogs(staff)}
                            className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Attendance Logs"
                          >
                            <i className="fas fa-clock-rotate-left"></i>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(staff)}
                            className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Edit Profile"
                          >
                            <i className="fas fa-user-pen"></i>
                          </button>
                          {staff.role !== UserRole.SUPER_ADMIN && (
                            <button
                              onClick={() => handleDeleteStaff(staff.id)}
                              className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete Account"
                            >
                              <i className="fas fa-trash-can"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-gray-100">
          {staffMembers.length === 0 ? (
            <div className="p-12 text-center text-gray-400 italic">No staff found.</div>
          ) : (
            staffMembers.map(staff => {
              const branch = branches.find(b => b.id === staff.branchId);
              const today = new Date().toISOString().split('T')[0];
              const isCheckedIn = attendance.some(a => a.userId === staff.id && a.date === today && !a.timeOut);

              return (
                <div key={staff.id} className="p-6 space-y-4 active:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <img src={staff.avatar} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md" alt="" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-900 uppercase tracking-tight">{staff.name}</h4>
                          {staff.isActive === false && <span className="bg-red-100 text-red-600 text-[8px] font-black px-1 py-0.5 rounded">INACTIVE</span>}
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{staff.role.replace('_', ' ')}</p>
                        <p className="text-[10px] text-blue-500 font-black mt-1 uppercase">{branch?.name?.split(' ')[0] || 'Global'}</p>
                      </div>
                    </div>
                    {isCheckedIn ? (
                      <span className="flex items-center gap-1.5 bg-green-50 text-green-600 px-3 py-1 rounded-full font-black text-[8px] uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        On Duty
                      </span>
                    ) : (
                      <span className="bg-slate-50 text-slate-400 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Offline</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Salary</p>
                      <p className="text-sm font-black text-emerald-600 uppercase">₹{staff.monthlySalary || 15000}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Emergency SOS</p>
                      <p className="text-[10px] font-black text-red-600 uppercase truncate">
                        <i className="fas fa-phone-alt mr-1"></i> {staff.emergencyContact || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenLogs(staff)}
                        className="bg-blue-50 text-blue-600 p-3 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                      >
                        <i className="fas fa-clock-rotate-left"></i> LOGS
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(staff)}
                        className="bg-indigo-50 text-indigo-600 p-3 rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                      >
                        <i className="fas fa-user-pen text-sm"></i> EDIT
                      </button>
                      {staff.role !== UserRole.SUPER_ADMIN && (
                        <button
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="bg-red-50 text-red-600 p-3 rounded-xl hover:bg-red-100 transition-all"
                        >
                          <i className="fas fa-trash-can"></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Logs Modal */}
      {isLogsModalOpen && selectedStaff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out]">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <img src={selectedStaff.avatar} className="w-12 h-12 rounded-2xl border-2 border-white/20 shadow-xl" alt="" />
                <div>
                  <h3 className="font-black text-xl uppercase tracking-tight">{selectedStaff.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Employee Attendance Logs</p>
                </div>
              </div>
              <button onClick={() => setLogsModalOpen(false)} className="bg-white/10 p-2.5 rounded-xl hover:bg-white/20 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4 bg-slate-50/50">
              {attendance.filter(a => a.userId === selectedStaff.id).length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center gap-4">
                  <i className="fas fa-calendar-xmark text-4xl text-slate-200"></i>
                  <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No duty logs recorded yet</p>
                </div>
              ) : (
                [...attendance].filter(a => a.userId === selectedStaff.id).reverse().map(a => (
                  <div key={a.id} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{a.date}</p>
                      <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold mt-2">
                        <span className="flex items-center gap-1.5"><i className="fas fa-sign-in-alt text-emerald-500"></i> {formatTime(a.timeIn)}</span>
                        {a.timeOut && <span className="flex items-center gap-1.5"><i className="fas fa-sign-out-alt text-red-500"></i> {formatTime(a.timeOut)}</span>}
                      </div>
                      {a.notes && a.notes.includes('Penalty') && (
                        <span className="inline-block mt-2 text-[9px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded uppercase tracking-widest">
                          <i className="fas fa-exclamation-circle mr-1"></i> {a.notes}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      {a.timeOut ? (
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest mb-1">COMPLETED</span>
                          <span className="text-[10px] font-black text-slate-900">{calculateHours(a.timeIn, a.timeOut, a.date, selectedStaff.id)}</span>
                        </div>
                      ) : (
                        <span className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">On Shift</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out]">
            <div className={`p-8 text-white flex justify-between items-center ${isEditModalOpen ? 'bg-indigo-600 shadow-indigo-100 shadow-xl' : 'bg-blue-600 shadow-blue-100 shadow-xl'}`}>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight leading-none mb-1">{isEditModalOpen ? 'Update Profile' : 'Staff Onboarding'}</h3>
                <p className="text-[10px] text-white/60 font-black uppercase tracking-widest">Management Credentials</p>
              </div>
              <button onClick={() => { setAddModalOpen(false); setEditModalOpen(false); }} className="bg-white/10 p-2.5 rounded-xl hover:bg-white/20 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={isEditModalOpen ? handleUpdateStaff : handleAddStaff} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <img
                    src={formData.avatar || selectedStaff?.avatar || 'https://i.pravatar.cc/150?u=default'}
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

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <input required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <i className="fas fa-life-ring"></i> Emergency Contact Number
                </label>
                <input required type="tel" className="w-full p-4 bg-red-50 border border-red-100 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-black text-sm text-red-700 placeholder:text-red-200" placeholder="+91 XXXXX XXXXX" value={formData.emergencyContact} onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                  Mobile Number
                </label>
                <input type="tel" className="w-full p-4 bg-blue-50 border border-blue-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-sm text-blue-700 placeholder:text-blue-300" placeholder="+91 XXXXX XXXXX" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                  <input required type="email" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>

              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Primary Role</label>
                <select
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-xs uppercase"
                  value={formData.role}
                  onChange={e => {
                    const newRole = e.target.value as UserRole;
                    setFormData(prev => ({
                      ...prev,
                      role: newRole,
                      ...(newRole === UserRole.KIOSK ? {
                        monthlySalary: 0,
                        commissionPercentage: 0,
                        salesCommissionPercentage: 0,
                        ptCommissionPercentage: 0,
                        groupCommissionPercentage: 0,
                        shifts: [],
                        weekOffs: []
                      } : {})
                    }));
                  }}
                >
                  <option value={UserRole.BRANCH_ADMIN}>Branch Admin</option>
                  <option value={UserRole.MANAGER}>Manager</option>
                  <option value={UserRole.TRAINER}>Trainer</option>
                  <option value={UserRole.RECEPTIONIST}>Receptionist</option>
                  <option value={UserRole.STAFF}>General Staff</option>
                  <option value={UserRole.KIOSK}>Kiosk Display</option>
                </select>
              </div>

              {formData.role !== UserRole.KIOSK && (
                <div className="space-y-1 animate-[fadeIn_0.3s_ease-out]">
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Monthly Salary (₹)</label>
                  <input type="number" className="w-full p-4 bg-emerald-50 border border-emerald-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm" value={formData.monthlySalary} onChange={e => setFormData({ ...formData, monthlySalary: Number(e.target.value) })} />
                </div>
              )}

              {(formData.role === UserRole.TRAINER || formData.role === UserRole.MANAGER) && (
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-[fadeIn_0.3s_ease-out] space-y-4">
                  {formData.role === UserRole.MANAGER && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">
                          Gym Membership Commission (%)
                        </label>
                        <div className="relative">
                          <input type="number" min="0" max="100" className="w-full p-4 bg-white border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-sm" value={formData.salesCommissionPercentage} onChange={e => setFormData({ ...formData, salesCommissionPercentage: Number(e.target.value) })} />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-indigo-300">%</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">
                          Personal Training Commission (%)
                        </label>
                        <div className="relative">
                          <input type="number" min="0" max="100" className="w-full p-4 bg-white border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-sm" value={formData.ptCommissionPercentage} onChange={e => setFormData({ ...formData, ptCommissionPercentage: Number(e.target.value) })} />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-indigo-300">%</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">
                          Group Class Commission (%)
                        </label>
                        <div className="relative">
                          <input type="number" min="0" max="100" className="w-full p-4 bg-white border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-sm" value={formData.groupCommissionPercentage} onChange={e => setFormData({ ...formData, groupCommissionPercentage: Number(e.target.value) })} />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-indigo-300">%</span>
                        </div>
                      </div>
                    </>
                  )}

                  {formData.role === UserRole.TRAINER && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">
                          Session Commission (%)
                        </label>
                        <div className="relative">
                          <input type="number" min="0" max="100" className="w-full p-4 bg-white border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-sm" value={formData.commissionPercentage} onChange={e => setFormData({ ...formData, commissionPercentage: Number(e.target.value) })} />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-indigo-300">%</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">
                          Sales Commission (%)
                        </label>
                        <div className="relative">
                          <input type="number" min="0" max="100" className="w-full p-4 bg-white border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-sm" value={formData.salesCommissionPercentage} onChange={e => setFormData({ ...formData, salesCommissionPercentage: Number(e.target.value) })} />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-indigo-300">%</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Home Branch</label>
                <select
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-xs uppercase"
                  value={formData.branchId}
                  onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                  disabled={currentUser?.role !== UserRole.SUPER_ADMIN}
                >
                  {branches.filter(b => currentUser?.role === UserRole.SUPER_ADMIN || b.id === currentUser?.branchId).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {formData.role !== UserRole.MEMBER && (
                <div className="space-y-1 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-[fadeIn_0.3s_ease-out]">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      Max Login Devices
                    </label>
                    {isEditModalOpen && (
                      <button type="button" onClick={() => setActiveSessionsModalOpen(true)} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest">
                        <i className="fas fa-laptop-medical mr-1"></i> Reset Device Access
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input type="number" min="1" max="10" className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-400 font-black text-sm" value={formData.maxDevices} onChange={e => setFormData({ ...formData, maxDevices: parseInt(e.target.value) || 1 })} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-[10px] uppercase">Devices</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold ml-1 mt-1">Controls simultaneous active sessions for security.</p>
                </div>
              )}

              {isEditModalOpen && (
                <div className="space-y-1 p-4 bg-red-50 rounded-2xl border border-red-100 animate-[fadeIn_0.3s_ease-out]">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-black text-red-600 uppercase tracking-widest ml-1">
                      Account Access
                    </label>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 ${formData.isActive ? 'bg-red-500' : 'bg-red-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <p className="text-xs text-red-700 font-bold">Enable Login Access for Staff</p>
                  </div>
                  <p className="text-[9px] text-red-500 font-medium ml-1 mt-1">
                    Disable this to instantly revoke the staff member's ability to log in.
                  </p>
                </div>
              )}

              {formData.role !== UserRole.KIOSK && (
                <>
                  <div className="space-y-2 p-4 bg-amber-50 rounded-2xl border border-amber-100 animate-[fadeIn_0.3s_ease-out]">
                    <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <i className="fas fa-calendar-xmark"></i> Week Off Days
                    </label>
                    <p className="text-[9px] text-amber-500 font-bold ml-1">Selected days are paid off (9 hrs credit in payroll)</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                        const isSelected = formData.weekOffs.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              const updated = isSelected
                                ? formData.weekOffs.filter(d => d !== day)
                                : [...formData.weekOffs, day];
                              setFormData({ ...formData, weekOffs: updated });
                            }}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isSelected
                              ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                              : 'bg-white text-amber-400 border border-amber-200 hover:bg-amber-100'
                              }`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Work Shifts (1-3 Max)</label>
                      {formData.shifts.length < 3 && (
                        <button type="button" onClick={addShiftInput} className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition-all">
                          <i className="fas fa-plus mr-1"></i> Add Shift
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {formData.shifts.map((shift, index) => (
                        <div key={index} className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100/50 space-y-3 relative group/shift animate-[slideUp_0.2s_ease-out]">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Shift Slot #{index + 1}</span>
                            {formData.shifts.length > 1 && (
                              <button type="button" onClick={() => removeShiftInput(index)} className="text-red-400 hover:text-red-600 transition-colors text-xs">
                                <i className="fas fa-trash-can"></i>
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Starts At</label>
                              <input type="time" className="w-full p-3 bg-white border border-blue-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500" value={shift.start} onChange={e => handleShiftChange(index, 'start', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Ends At</label>
                              <input type="time" className="w-full p-3 bg-white border border-blue-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500" value={shift.end} onChange={e => handleShiftChange(index, 'end', e.target.value)} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="pt-4">
                <button type="submit" className={`w-full py-5 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all active:scale-95 ${isEditModalOpen ? 'bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700' : 'bg-blue-600 shadow-blue-100 hover:bg-blue-700'}`}>
                  {isEditModalOpen ? 'COMMIT UPDATES' : 'DEPLOY STAFF ACCOUNT'}
                </button>
                <button
                  type="button"
                  onClick={() => { setAddModalOpen(false); setEditModalOpen(false); }}
                  className="w-full py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors mt-2"
                >
                  DISCARD CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ImageUploadModal
        isOpen={isImageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onUpload={handleImageUpload}
        title="Update Staff Photo"
      />

      {selectedStaff && isActiveSessionsModalOpen && (
        <ActiveSessionsModal
          user={selectedStaff}
          onClose={() => setActiveSessionsModalOpen(false)}
        />
      )}

      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Staff;
