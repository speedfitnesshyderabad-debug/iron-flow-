import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole, Holiday } from '../types';

const Holidays: React.FC = () => {
    const { holidays, branches, currentUser, addHoliday, deleteHoliday, updateHoliday } = useAppContext();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newHoliday, setNewHoliday] = useState<Omit<Holiday, 'id' | 'createdAt'>>({
        name: '',
        date: new Date().toISOString().split('T')[0],
        message: '',
        branchId: currentUser?.branchId || branches[0]?.id || ''
    });
    const [notifyMembers, setNotifyMembers] = useState(true);

    const filteredHolidays = holidays.filter(h =>
        currentUser?.role === UserRole.SUPER_ADMIN || h.branchId === currentUser?.branchId
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const handleAddHoliday = async () => {
        if (!newHoliday.name || !newHoliday.date) return;
        await addHoliday(newHoliday, notifyMembers);
        setIsAddModalOpen(false);
        setNewHoliday({
            name: '',
            date: new Date().toISOString().split('T')[0],
            message: '',
            branchId: currentUser?.branchId || branches[0]?.id || ''
        });
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to remove this holiday?')) {
            await deleteHoliday(id);
        }
    };

    const getBranchName = (id: string) => branches.find(b => b.id === id)?.name || 'Unknown Branch';

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Holiday Calendar</h2>
                    <p className="text-slate-500 font-medium">Manage branch-wise holidays and notify members.</p>
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                >
                    <i className="fas fa-calendar-plus text-lg"></i> Announce Holiday
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHolidays.map(holiday => (
                    <div key={holiday.id} className="bg-white p-6 rounded-[2rem] border shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-slate-50 px-4 py-2 rounded-xl text-center min-w-[60px]">
                                <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
                                    {new Date(holiday.date).toLocaleDateString('en-US', { month: 'short' })}
                                </p>
                                <p className="text-xl font-black text-slate-900 leading-none">
                                    {new Date(holiday.date).getDate()}
                                </p>
                            </div>

                            <button
                                onClick={() => handleDelete(holiday.id)}
                                className="text-slate-300 hover:text-red-500 transition-colors p-2"
                            >
                                <i className="fas fa-trash-alt"></i>
                            </button>
                        </div>

                        <h3 className="text-lg font-black text-slate-900 leading-tight mb-2 uppercase">{holiday.name}</h3>

                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {getBranchName(holiday.branchId)}
                            </span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {new Date(holiday.date).getFullYear()}
                            </span>
                        </div>

                        {holiday.message && (
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-xs text-slate-600 italic leading-relaxed font-medium">
                                    "{holiday.message}"
                                </p>
                            </div>
                        )}

                        <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                            <i className="fas fa-calendar-check text-[100px] text-slate-900"></i>
                        </div>
                    </div>
                ))}

                {filteredHolidays.length === 0 && (
                    <div className="col-span-full py-20 bg-slate-50 border-2 border-dashed rounded-[3rem] flex flex-col items-center justify-center text-center">
                        <div className="bg-white w-20 h-20 rounded-3xl shadow-xl flex items-center justify-center text-slate-200 text-3xl mb-6">
                            <i className="fas fa-calendar-day"></i>
                        </div>
                        <h4 className="text-lg font-black text-slate-900 uppercase">No upcoming holidays</h4>
                        <p className="text-slate-400 font-medium max-w-xs mt-2">Add a new holiday to notify members and update payroll calculations.</p>
                    </div>
                )}
            </div>

            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[1000] flex items-center justify-center p-6 animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
                        <div className="p-10">
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">New Announcement</h3>
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="bg-slate-50 w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Holiday Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Diwali Celebration"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 transition-all font-bold text-slate-700"
                                        value={newHoliday.name}
                                        onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Date</label>
                                        <input
                                            type="date"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 transition-all font-bold text-slate-700"
                                            value={newHoliday.date}
                                            onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Branch</label>
                                        <select
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 transition-all font-bold text-slate-700 uppercase"
                                            value={newHoliday.branchId}
                                            onChange={e => setNewHoliday({ ...newHoliday, branchId: e.target.value })}
                                            disabled={currentUser?.role !== UserRole.SUPER_ADMIN}
                                        >
                                            {branches.filter(b => currentUser?.role === UserRole.SUPER_ADMIN || b.id === currentUser?.branchId).map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Annoucement Message</label>
                                    <textarea
                                        placeholder="e.g. On account of Diwali, the gym will remain closed. Happy Diwali!"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-6 py-4 outline-none focus:border-blue-500 transition-all font-bold text-slate-700 min-h-[120px] resize-none"
                                        value={newHoliday.message}
                                        onChange={e => setNewHoliday({ ...newHoliday, message: e.target.value })}
                                    ></textarea>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                    <input
                                        type="checkbox"
                                        id="notify"
                                        checked={notifyMembers}
                                        onChange={e => setNotifyMembers(e.target.checked)}
                                        className="w-5 h-5 accent-blue-600"
                                    />
                                    <label htmlFor="notify" className="text-[10px] font-black text-blue-900 uppercase tracking-widest cursor-pointer">
                                        Notify all members via SMS/Internal
                                    </label>
                                </div>

                                <button
                                    onClick={handleAddHoliday}
                                    className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4"
                                >
                                    Confirm Announcement
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Holidays;
