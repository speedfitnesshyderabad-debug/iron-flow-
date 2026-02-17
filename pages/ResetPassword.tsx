import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';

const ResetPassword: React.FC = () => {
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Check if we have a valid session (user clicked the reset link)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setError('Invalid or expired reset link. Please request a new one.');
            }
        });
    }, []);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) throw error;

            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err: any) {
            console.error('Password update error:', err);
            setError(err.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-slate-900 p-8 rounded-2xl max-w-md w-full border border-slate-700">
                <h1 className="text-2xl font-black text-white mb-6 uppercase text-center">Reset Password</h1>

                {success ? (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <i className="fas fa-check text-2xl text-green-500"></i>
                        </div>
                        <p className="text-green-400 font-medium mb-4">Password updated successfully!</p>
                        <p className="text-slate-400 text-sm">Redirecting to login...</p>
                    </div>
                ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white mt-1"
                                placeholder="Min 6 characters"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white mt-1"
                                placeholder="Re-enter password"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                                <p className="text-red-400 text-sm font-medium">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
