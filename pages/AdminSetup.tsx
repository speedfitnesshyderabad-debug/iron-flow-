import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { UserRole } from '../types';
import { useAppContext } from '../AppContext';

const AdminSetup: React.FC = () => {
    const { showToast } = useAppContext();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            showToast("Passwords do not match", "error");
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Create Auth User
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        name: formData.name,
                        role: UserRole.SUPER_ADMIN
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Failed to create auth user');

            // 2. Create Public User Record
            const { error: dbError } = await supabase.from('users').insert({
                id: authData.user.id,
                name: formData.name,
                email: formData.email,
                role: UserRole.SUPER_ADMIN,
                phone: formData.phone,
                avatar: `https://i.pravatar.cc/150?u=${authData.user.id}`
            });

            if (dbError) {
                // If DB record fails, we should ideally clean up auth, but for setup we'll just report it
                throw dbError;
            }

            showToast("Super Admin initialized successfully!", "success");
            navigate('/login');

        } catch (err: any) {
            console.error('Setup error:', err);
            showToast(err.message || "Setup failed", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 rounded-[2rem] border border-white/5 p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="bg-blue-600 p-2 rounded-xl">
                            <i className="fas fa-shield-alt text-white text-xl"></i>
                        </div>
                        <span className="font-black text-xl text-white uppercase tracking-tighter">IronFlow</span>
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase">Initialize Super Admin</h2>
                    <p className="text-slate-400 text-sm mt-2">Set up the primary administrative account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                        <input
                            required
                            className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl outline-none focus:border-blue-500 transition-all"
                            placeholder="System Administrator"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                        <input
                            required
                            type="email"
                            className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl outline-none focus:border-blue-500 transition-all"
                            placeholder="admin@ironflow.in"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                        <input
                            required
                            type="tel"
                            className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl outline-none focus:border-blue-500 transition-all"
                            placeholder="+91 XXXXX XXXXX"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                        <input
                            required
                            type="password"
                            className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl outline-none focus:border-blue-500 transition-all"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirm Password</label>
                        <input
                            required
                            type="password"
                            className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl outline-none focus:border-blue-500 transition-all"
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                        />
                    </div>

                    <button
                        disabled={isSubmitting}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98] mt-4"
                    >
                        {isSubmitting ? <i className="fas fa-spinner fa-spin mr-2"></i> : null}
                        {isSubmitting ? 'INITIALIZING...' : 'CREATE ACCOUNT'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminSetup;
