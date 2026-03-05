import React, { useState, useMemo } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole } from '../types';

const CheckinsLog: React.FC = () => {
    const { attendance, users, branches, currentUser, isRowVisible, selectedBranchId } = useAppContext();
    const todayStr = new Date().toISOString().split('T')[0];

    // Filter controls
    const [dateFilter, setDateFilter] = useState(todayStr);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'ALL' | 'MEMBER' | 'STAFF'>('ALL');

    const handleFormatTime = (time24: string) => {
        if (!time24) return '--';
        try {
            // Assume time is in "HH:MM:SS" or "HH:MM" format
            let [hours, minutes] = time24.split(':');
            let h = parseInt(hours, 10);
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12;
            h = h ? h : 12; // 0 should be 12
            return `${h}:${minutes} ${ampm}`;
        } catch (e) {
            return time24;
        }
    };

    const filteredAttendance = useMemo(() => {
        let result = attendance.filter(a => {
            // Check date filter
            if (dateFilter && a.date !== dateFilter) return false;

            // Check active branch (Show data ONLY related to the currently selected branch)
            if (!isRowVisible(a.branchId)) return false;

            // Check role filter
            if (roleFilter !== 'ALL' && a.type !== roleFilter) return false;

            return true;
        });

        // Apply text search on user name
        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(a => {
                const user = users.find(u => u.id === a.userId);
                return user?.name.toLowerCase().includes(lowerQuery) || user?.email.toLowerCase().includes(lowerQuery);
            });
        }

        // Sort by timeIn descending
        return result.sort((a, b) => b.timeIn.localeCompare(a.timeIn));
    }, [attendance, dateFilter, searchQuery, roleFilter, isRowVisible, selectedBranchId, currentUser, users]);

    // Compute stats
    const totalMembers = filteredAttendance.filter(a => a.type === 'MEMBER').length;
    const totalStaff = filteredAttendance.filter(a => a.type === 'STAFF').length;

    return (
        <div className="p-6 md:p-8 animate-[fadeIn_0.5s_ease-out] max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter shrink-0 mb-2">Check-ins Log</h1>
                    <p className="text-slate-500 font-medium">View daily attendance and gate accesses</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2rem] shadow-lg border-2 border-slate-100 flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
                        <i className="fas fa-list-ol text-2xl text-blue-600"></i>
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Entries</p>
                        <p className="text-3xl font-black text-slate-900">{filteredAttendance.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-lg border-2 border-slate-100 flex items-center gap-6">
                    <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center shrink-0">
                        <i className="fas fa-users text-2xl text-green-600"></i>
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Members Today</p>
                        <p className="text-3xl font-black text-slate-900">{totalMembers}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-lg border-2 border-slate-100 flex items-center gap-6">
                    <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                        <i className="fas fa-user-tie text-2xl text-amber-600"></i>
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Staff Today</p>
                        <p className="text-3xl font-black text-slate-900">{totalStaff}</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-4 border-slate-50 flex flex-col xl:flex-row gap-4">
                <div className="flex-1 relative">
                    <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 pl-14 pr-6 py-4 rounded-2xl font-medium border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none text-slate-700"
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 xl:w-auto">
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="bg-slate-50 px-6 py-4 rounded-2xl font-bold text-slate-700 border-2 border-slate-100 focus:border-blue-500 outline-none w-full sm:w-auto"
                    />

                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as 'ALL' | 'MEMBER' | 'STAFF')}
                        className="bg-slate-50 px-6 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest border-2 border-slate-100 focus:border-blue-500 outline-none w-full sm:w-auto min-w-[140px]"
                    >
                        <option value="ALL">All Types</option>
                        <option value="MEMBER">Members Only</option>
                        <option value="STAFF">Staff Only</option>
                    </select>
                </div>
            </div>

            {/* Log Display */}
            <div className="bg-white rounded-3xl md:rounded-[2.5rem] shadow-xl overflow-hidden border-4 border-slate-50">
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="p-6 font-black text-xs uppercase tracking-widest text-slate-500">User Details</th>
                                <th className="p-6 font-black text-xs uppercase tracking-widest text-slate-500">Date</th>
                                <th className="p-6 font-black text-xs uppercase tracking-widest text-slate-500">Time In</th>
                                <th className="p-6 font-black text-xs uppercase tracking-widest text-slate-500">Time Out</th>
                                <th className="p-6 font-black text-xs uppercase tracking-widest text-slate-500">Branch</th>
                                <th className="p-6 font-black text-xs uppercase tracking-widest text-slate-500">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-slate-50 text-slate-700">
                            {filteredAttendance.length > 0 ? (
                                filteredAttendance.map(record => {
                                    const user = users.find(u => u.id === record.userId);
                                    const branch = branches.find(b => b.id === record.branchId);
                                    const isStaff = record.type === 'STAFF';

                                    return (
                                        <tr key={record.id} className="hover:bg-blue-50/50 transition-colors group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-full flex justify-center items-center shrink-0 font-bold text-xl text-white ${isStaff ? 'bg-amber-500' : 'bg-blue-500'} shadow-md`}>
                                                        {user?.avatar ? (
                                                            <img src={user.avatar} className="w-full h-full rounded-full object-cover" alt="avatar" />
                                                        ) : (
                                                            user?.name.charAt(0) || '?'
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{user?.name || 'Unknown User'}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full ${isStaff ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {record.type}
                                                            </span>
                                                            {user?.phone && <span className="text-xs text-slate-400">{user.phone}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className="font-bold text-slate-700">{record.date}</span>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2">
                                                    <i className="fas fa-sign-in-alt text-green-500"></i>
                                                    <span className="font-bold text-slate-900">{handleFormatTime(record.timeIn)}</span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                {record.timeOut ? (
                                                    <div className="flex items-center gap-2">
                                                        <i className="fas fa-sign-out-alt text-red-500"></i>
                                                        <span className="font-bold text-slate-900">{handleFormatTime(record.timeOut)}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-sm font-medium">--</span>
                                                )}
                                            </td>
                                            <td className="p-6 font-medium text-slate-500">
                                                {branch?.name || record.branchId}
                                            </td>
                                            <td className="p-6">
                                                {record.timeOut ? (
                                                    <span className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider">Completed</span>
                                                ) : (
                                                    <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-bold uppercase tracking-wider animate-pulse">Present</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <i className="fas fa-clipboard-list text-5xl text-slate-200 mb-4"></i>
                                            <p className="font-bold text-lg text-slate-400 uppercase tracking-widest">No Records Found</p>
                                            <p className="text-sm mt-2 text-slate-400">Try adjusting your filters or date selection.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile & Tablet Cards View */}
                <div className="block lg:hidden flex flex-col p-4 gap-4 bg-slate-50/50">
                    {filteredAttendance.length > 0 ? (
                        filteredAttendance.map(record => {
                            const user = users.find(u => u.id === record.userId);
                            const branch = branches.find(b => b.id === record.branchId);
                            const isStaff = record.type === 'STAFF';

                            return (
                                <div key={record.id} className="bg-white rounded-2xl p-4 shadow-sm border-2 border-slate-100 flex flex-col gap-4 relative overflow-hidden">
                                    {/* Left decorative bar */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isStaff ? 'bg-amber-400' : 'bg-blue-400'}`}></div>

                                    {/* Header: User & Status */}
                                    <div className="flex justify-between items-start gap-2 pl-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex justify-center items-center shrink-0 font-bold text-sm text-white ${isStaff ? 'bg-amber-500' : 'bg-blue-500'} shadow-md`}>
                                                {user?.avatar ? (
                                                    <img src={user.avatar} className="w-full h-full rounded-full object-cover" alt="avatar" />
                                                ) : (
                                                    user?.name.charAt(0) || '?'
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 leading-tight line-clamp-1">{user?.name || 'Unknown User'}</p>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <span className={`text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-md ${isStaff ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {record.type}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-bold">{record.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex flex-col items-end gap-1">
                                            {record.timeOut ? (
                                                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold uppercase tracking-wider">Completed</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-[9px] font-bold uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Present
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Times */}
                                    <div className="grid grid-cols-2 gap-3 pl-2 mt-1">
                                        <div className="bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Time In</p>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                                    <i className="fas fa-sign-in-alt text-green-600 text-[10px]"></i>
                                                </div>
                                                <span className="font-black text-slate-800 text-sm">{handleFormatTime(record.timeIn)}</span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Time Out</p>
                                            {record.timeOut ? (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                                        <i className="fas fa-sign-out-alt text-red-600 text-[10px]"></i>
                                                    </div>
                                                    <span className="font-black text-slate-800 text-sm">{handleFormatTime(record.timeOut)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-sm font-bold flex items-center h-5">--</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Branch info */}
                                    <div className="pl-2 flex items-center gap-2 mt-1">
                                        <i className="fas fa-map-marker-alt text-slate-400 text-[10px]"></i>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{branch?.name || record.branchId}</p>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center bg-white rounded-2xl border-2 border-slate-100">
                            <i className="fas fa-clipboard-list text-4xl text-slate-200 mb-3"></i>
                            <p className="font-bold text-sm text-slate-400 uppercase tracking-widest">No Records Found</p>
                            <p className="text-xs mt-2 text-slate-400">Try adjusting your filters.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CheckinsLog;
