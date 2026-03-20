
import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#020617] text-[#e2e8f0] font-sans selection:bg-blue-500/30">
      <div className="max-w-[760px] mx-auto px-6 py-16 md:py-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <Link to="/login" className="group flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <img src="/logo.png" alt="IronFlow" className="w-6 h-6 object-contain" />
            </div>
            <span className="text-lg font-black tracking-tighter text-white uppercase italic">IronFlow</span>
          </Link>
        </div>

        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <header>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2 uppercase">Privacy Policy</h1>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Last updated: March 20, 2025</p>
          </header>

          <div className="prose prose-invert max-w-none prose-slate">
            <p className="text-lg text-slate-400 leading-relaxed">
              IronFlow Gym Manager ("we", "our", or "the app") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our gym management platform.
            </p>

            <section className="mt-12">
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs">01</span>
                Information We Collect
              </h2>
              <ul className="space-y-3 text-slate-400 list-none p-0">
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> <strong>Account Information:</strong> Name, email address, phone number, and profile photo when you register or sign in.</li>
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> <strong>Google Account Data:</strong> If you sign in using Google, we receive your name, email, and profile picture from Google.</li>
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> <strong>Gym Data:</strong> Membership details, subscription plans, attendance records, and payment history.</li>
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> <strong>Usage Data:</strong> App activity, session logs, and device information for performance improvements.</li>
              </ul>
            </section>

            <section className="mt-12">
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs">02</span>
                How We Use Your Information
              </h2>
              <ul className="space-y-3 text-slate-400 list-none p-0">
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> To manage your gym membership and profile</li>
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> To process payments and subscriptions</li>
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> To send important notifications about your membership</li>
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> To provide customer support</li>
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> To improve app performance and features</li>
              </ul>
            </section>

            <section className="mt-12">
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs">03</span>
                Data Sharing
              </h2>
              <p className="text-slate-400">We do not sell, trade, or rent your personal information to third parties. Your data may be shared with:</p>
              <ul className="mt-4 space-y-3 text-slate-400 list-none p-0">
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> <strong>Supabase:</strong> Our secure database and authentication provider</li>
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> <strong>Razorpay:</strong> Our payment processing partner</li>
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> Law enforcement if required by law</li>
              </ul>
            </section>

            <section className="mt-12">
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs">04</span>
                Google Sign-In
              </h2>
              <p className="text-slate-400">
                When you use "Sign in with Google", we only request access to your basic profile information (name, email, and profile picture). We do not access your Gmail, Google Drive, or any other Google services.
              </p>
            </section>

            <section className="mt-12">
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs">05</span>
                Data Security
              </h2>
              <p className="text-slate-400">
                We use industry-standard encryption and security measures to protect your data. All data is stored securely via Supabase with row-level security policies.
              </p>
            </section>

            <section className="mt-12">
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs">06</span>
                Your Rights
              </h2>
              <ul className="space-y-3 text-slate-400 list-none p-0">
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> Request access to your personal data</li>
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> Request deletion of your account and data</li>
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> Update or correct your information at any time</li>
              </ul>
            </section>

            <section className="mt-12">
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs">07</span>
                Contact Us
              </h2>
              <p className="text-slate-400">
                For any privacy-related questions, contact us at: <a href="mailto:support@speedfitness.org" className="text-blue-500 font-bold hover:underline">support@speedfitness.org</a>
              </p>
            </section>
          </div>

          <footer className="pt-16 border-t border-slate-800/50 mt-16 text-center">
            <p className="text-xs text-slate-600 font-bold uppercase tracking-[0.2em] mb-4">
              © 2025 IronFlow Gym Manager. All rights reserved.
            </p>
            <div className="flex justify-center gap-6">
              <Link to="/terms-of-service" className="text-[10px] font-black uppercase text-blue-500/60 hover:text-blue-500 transition-colors tracking-widest">Terms of Service</Link>
              <Link to="/login" className="text-[10px] font-black uppercase text-slate-600 hover:text-white transition-colors tracking-widest">Back to Login</Link>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
