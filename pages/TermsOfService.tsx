
import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService: React.FC = () => {
  return (
    <div className="h-screen overflow-y-auto bg-[#020617] text-[#e2e8f0] font-sans selection:bg-blue-500/30">
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
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2 uppercase">Terms of Service</h1>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Last updated: March 20, 2025</p>
          </header>

          <div className="prose prose-invert max-w-none prose-slate text-slate-400">
            <p className="text-lg text-slate-400 leading-relaxed mb-8">
              By using IronFlow Gym Manager ("the app", "the service"), you agree to be bound by these Terms of Service. Please read them carefully before using the platform.
            </p>

            <section className="mt-12">
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs">01</span>
                Acceptance of Terms
              </h2>
              <p>By accessing or using IronFlow Gym Manager, you confirm that you are at least 18 years old and agree to these Terms. If you are using the app on behalf of a gym or organization, you confirm you have authority to bind that organization.</p>
            </section>

            <section className="mt-12">
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs">02</span>
                Use of the Service
              </h2>
              <p className="mb-4">IronFlow Gym Manager is a gym management platform. You agree to:</p>
              <ul className="space-y-3 list-none p-0">
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> Use the platform only for lawful gym management purposes</li>
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> Provide accurate and complete information when registering</li>
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> Keep your account credentials secure and confidential</li>
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> Not share your account with unauthorized parties</li>
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> Not attempt to reverse-engineer, hack, or disrupt the service</li>
              </ul>
            </section>

            <section className="mt-12">
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs">03</span>
                User Accounts
              </h2>
              <p>You are responsible for all activity under your account. Notify us immediately at <a href="mailto:support@speedfitness.org" className="text-blue-500 font-bold hover:underline">support@speedfitness.org</a> if you suspect unauthorized use of your account.</p>
            </section>

            <section className="mt-12">
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs">04</span>
                Payments and Subscriptions
              </h2>
              <p>Gym membership fees and subscription payments are processed securely via Razorpay. All payments are subject to the terms of the specific membership plan. Refunds are handled at the discretion of your gym branch administrator.</p>
            </section>

            <section className="mt-12">
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs">05</span>
                Data and Privacy
              </h2>
              <p>Your use of the service is also governed by our <Link to="/privacy-policy" className="text-blue-500 font-bold hover:underline">Privacy Policy</Link>. By using the app, you consent to the collection and use of information as described therein.</p>
            </section>

            <section className="mt-12">
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs">06</span>
                Prohibited Activities
              </h2>
              <ul className="space-y-3 list-none p-0">
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> Using the service for fraudulent or illegal purposes</li>
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> Impersonating another user or administrator</li>
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> Uploading malicious content or attempting to compromise security</li>
                <li className="flex gap-3"><span className="text-blue-500 font-black">/</span> Scraping or collecting data from the platform without permission</li>
              </ul>
            </section>

            <section className="mt-12">
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs">07</span>
                Termination
              </h2>
              <p>We reserve the right to suspend or terminate your account if you violate these Terms. You may also delete your account at any time by contacting your gym administrator or emailing us.</p>
            </section>

            <section className="mt-12">
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs">08</span>
                Limitation of Liability
              </h2>
              <p>IronFlow Gym Manager is provided "as is". We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
            </section>

            <section className="mt-12">
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs">09</span>
                Changes to Terms
              </h2>
              <p>We may update these Terms periodically. Continued use of the service after changes constitutes acceptance of the updated Terms.</p>
            </section>

            <section className="mt-12">
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs">10</span>
                Contact
              </h2>
              <p>For questions about these Terms, contact us at: <a href="mailto:support@speedfitness.org" className="text-blue-500 font-bold hover:underline">support@speedfitness.org</a></p>
            </section>
          </div>

          <footer className="pt-16 border-t border-slate-800/50 mt-16 text-center">
            <p className="text-xs text-slate-600 font-bold uppercase tracking-[0.2em] mb-4">
              © 2025 IronFlow Gym Manager. All rights reserved.
            </p>
            <div className="flex justify-center gap-6">
              <Link to="/privacy-policy" className="text-[10px] font-black uppercase text-blue-500/60 hover:text-blue-500 transition-colors tracking-widest">Privacy Policy</Link>
              <Link to="/login" className="text-[10px] font-black uppercase text-slate-600 hover:text-white transition-colors tracking-widest">Back to Login</Link>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
