
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../AppContext';
import { UserRole } from '../types';
import { supabase } from '../src/lib/supabase';

const Login: React.FC = () => {
  const { users, setCurrentUser, createSession } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // View states: 'login' | 'forgot' | 'success'
  const [view, setView] = useState<'login' | 'forgot' | 'success'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError('');

    try {
      // 1. Authenticate with Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        // 2. Find the Public User Record
        // Prioritize matching by Auth UID (for new staff), fallback to email (for legacy/demo users)
        const user = users.find(u => u.id === data.user.id) ||
          users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (user) {
          console.log('✅ User found:', user.name);

          // 3. Create Session (Strict Device Check)
          const sessionResult = await createSession(user.id);

          if (sessionResult.success) {
            setCurrentUser(user);
            // Redirect happens automatically
          } else {
            console.warn('Session Blocked:', sessionResult.message);
            setError(sessionResult.message || 'Maximum devices reached. Contact Admin to switch permission.');
            await supabase.auth.signOut(); // Cleanup auth session if app session fails
          }
        } else {
          setError('Login successful, but user profile not found. Please contact support.');
          await supabase.auth.signOut();
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message === 'Invalid login credentials'
        ? 'Invalid email or password.'
        : err.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingReset(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: 'https://speedfitness.org/#/reset-password',
      });

      if (error) throw error;

      setView('success');
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send reset email');
    } finally {
      setIsSendingReset(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-white/5 relative z-10">

        {/* Branding Side (Hidden on Mobile) */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl">
                <i className="fas fa-dumbbell text-2xl"></i>
              </div>
              <span className="font-black text-2xl tracking-tighter uppercase">IronFlow</span>
            </div>
            <h1 className="text-5xl font-black leading-tight mb-6 uppercase">Master Your Fitness Empire.</h1>
            <p className="text-blue-100 font-medium leading-relaxed">Enterprise-grade multi-branch infrastructure for the future of physical wellness.</p>
          </div>

          <div className="relative z-10 flex items-center gap-4 pt-12 border-t border-white/10">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <img key={i} className="w-8 h-8 rounded-full border-2 border-blue-600" src={`https://i.pravatar.cc/100?u=${i}`} alt="" />
              ))}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Deployed in 50+ Cities</p>
          </div>

          <div className="absolute bottom-0 right-0 opacity-10 scale-150 rotate-12">
            <i className="fas fa-bolt text-[300px]"></i>
          </div>
        </div>

        {/* Form Side */}
        <div className="p-8 md:p-12 flex flex-col justify-center min-h-[500px]">
          {view === 'login' && (
            <div className="animate-[fadeIn_0.3s_ease-out]">
              <div className="mb-10 text-center lg:text-left">
                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Sign In</h2>
                <p className="text-slate-400 font-medium">Welcome back to IronFlow</p>
              </div>

              <form onSubmit={handleManualLogin} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      className="w-full bg-slate-800 border border-slate-700 text-white p-4 rounded-2xl outline-none focus:border-blue-500 transition-all pl-12"
                      placeholder="name@example.com"
                      value={email}
                      disabled={isAuthenticating}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      required
                    />
                    <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Password</label>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      className="w-full bg-slate-800 border border-slate-700 text-white p-4 rounded-2xl outline-none focus:border-blue-500 transition-all pl-12"
                      placeholder="Enter your password"
                      value={password}
                      disabled={isAuthenticating}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      required
                    />
                    <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <Link
                      to="/register"
                      className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors"
                    >
                      New Athlete? Join Now
                    </Link>
                    <button
                      type="button"
                      onClick={() => setView('forgot')}
                      className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-blue-400 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-3 animate-shake">
                    <i className="fas fa-exclamation-circle text-red-500"></i>
                    <p className="text-red-400 text-[11px] font-bold uppercase tracking-widest">{error}</p>
                  </div>
                )}

                <button
                  disabled={isAuthenticating}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {isAuthenticating ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-sign-in-alt"></i>}
                  {isAuthenticating ? 'SIGNING IN...' : 'SIGN IN'}
                </button>
              </form>

              {/* Production Setup Link */}
              <div className="mt-8 text-center">
                <Link to="/admin-setup" className="text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-blue-500 transition-colors">
                  Setup Super Admin
                </Link>
              </div>
            </div>
          )}

          {view === 'forgot' && (
            <div className="animate-[fadeIn_0.3s_ease-out]">
              <div className="mb-10 text-center lg:text-left">
                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Recovery</h2>
                <p className="text-slate-400 font-medium">Account restoration protocol initiated</p>
              </div>

              <form onSubmit={handleForgotSubmit} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Verified Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      className="w-full bg-slate-800 border border-slate-700 text-white p-4 rounded-2xl outline-none focus:border-blue-500 transition-all pl-12"
                      placeholder="account@ironflow.in"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                    <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <button
                    type="submit"
                    disabled={isSendingReset}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    {isSendingReset ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        DISPATCHING...
                      </>
                    ) : (
                      'Request Recovery Link'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('login')}
                    className="w-full py-3 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Return to Login
                  </button>
                </div>
              </form>
            </div>
          )}

          {view === 'success' && (
            <div className="animate-[fadeIn_0.4s_ease-out] text-center">
              <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-green-500/10">
                <i className="fas fa-paper-plane text-3xl text-green-500"></i>
              </div>
              <h2 className="text-3xl font-black text-white mb-3 uppercase tracking-tight">Email Sent</h2>
              <p className="text-slate-400 font-medium mb-10 leading-relaxed px-6">
                Recovery instructions dispatched to <span className="text-blue-400 font-black">{forgotEmail}</span>. Please check your inbox and spam.
              </p>
              <button
                onClick={() => setView('login')}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-xl active:scale-[0.98]"
              >
                Back to Authentication
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Login;
