
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './src/lib/supabase';
import { UserRole } from './types';
import { AppProvider, useAppContext } from './AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import CheckIn from './pages/CheckIn';
import MemberPortal from './pages/MemberPortal';
import Sales from './pages/Sales';
import Branches from './pages/Branches';
import Campaigns from './pages/Campaigns';
import Staff from './pages/Staff';
import Plans from './pages/Plans';
import Feedback from './pages/Feedback';
import Bookings from './pages/Bookings';
import MembershipStore from './pages/MembershipStore';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Communications from './pages/Communications';
import Inventory from './pages/Inventory';
import TaxCenter from './pages/TaxCenter';
import MyEarnings from './pages/MyEarnings';
import WalkInManagement from './pages/WalkInManagement';
import Debug from './pages/Debug';
import CheckinsLog from './pages/CheckinsLog';

import GateQR from './pages/GateQR';
import Payroll from './pages/Payroll';
import Holidays from './pages/Holidays';
import Coupons from './pages/Coupons';

// -----------------------------------------------------------------------------
// Detect if the page was loaded with Supabase auth tokens.
// IMPORTANT: We read from window.__ironflowInitialUrl which is set by an
// inline script in index.html BEFORE any JS modules run. Supabase's
// createClient() calls history.replaceState() to clean the URL during
// its own initialization, so by the time this function runs, the tokens
// may already be gone from window.location.
// -----------------------------------------------------------------------------
function hasPendingAuthParams(): boolean {
  const initial = (window as any).__ironflowInitialUrl || {
    search: window.location.search,
    hash: window.location.hash,
  };
  return (
    initial.hash.includes('access_token=') ||
    initial.hash.includes('type=recovery') ||
    initial.search.includes('code=') ||
    initial.search.includes('type=recovery')
  );
}

// Module-level capture — evaluated exactly once when this module first loads.
// This is a safety net in case the inline script in index.html didn't run.
const INITIAL_AUTH_PENDING = hasPendingAuthParams();

// -----------------------------------------------------------------------------
// AuthGate — blocks routing until Supabase has processed any pending auth tokens.
// Without this, the router's `*` catch-all fires immediately and redirects to
// /login before the PASSWORD_RECOVERY event can be received.
// -----------------------------------------------------------------------------
const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [gating, setGating] = useState(INITIAL_AUTH_PENDING);

  useEffect(() => {
    if (!gating) return;

    console.log('🔐 AuthGate active — waiting for Supabase auth event...');

    let released = false;
    const release = (goToReset = false) => {
      if (released) return;
      released = true;
      setGating(false);
      if (goToReset) navigate('/reset-password', { replace: true });
    };

    // Listen FIRST (before async check), so we don't miss the event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('🔐 AuthGate auth event:', event);
      if (event === 'PASSWORD_RECOVERY') {
        release(true);
      } else if (['SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED', 'INITIAL_SESSION'].includes(event)) {
        release(false);
      }
    });

    // Also check immediately in case the event fired before our listener registered
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return; // No session yet — wait for the event
      // We have a session. If the original URL had type=recovery, go to reset page.
      const initial = (window as any).__ironflowInitialUrl || {};
      const wasRecovery = (initial.hash || '').includes('type=recovery') ||
        (initial.search || '').includes('type=recovery');
      release(wasRecovery);
    });

    const timer = setTimeout(() => {
      console.warn('🔐 AuthGate: timeout — releasing gate');
      release(false);
    }, 12000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [gating, navigate]);


  if (gating) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#020617',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: 56, height: 56,
          border: '4px solid #1e40af',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ color: '#94a3b8', fontFamily: 'sans-serif', fontSize: 14, margin: 0 }}>
          Verifying reset link...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <>{children}</>;
};

// -----------------------------------------------------------------------------
// ProtectedRoute
// -----------------------------------------------------------------------------
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: UserRole[] }> = ({ children, allowedRoles }) => {
  const { currentUser } = useAppContext();
  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// -----------------------------------------------------------------------------
// AppRoutes
// -----------------------------------------------------------------------------
const AppRoutes: React.FC = () => {
  const { currentUser } = useAppContext();

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/debug" element={<Debug />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={
          currentUser.role === UserRole.KIOSK ? <Navigate to="/gate-qr" replace /> : <Dashboard />
        } />
        <Route path="/walk-ins" element={<WalkInManagement />} />
        <Route path="/members" element={<Members />} />
        <Route path="/branches" element={
          <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]}>
            <Branches />
          </ProtectedRoute>
        } />
        <Route path="/holidays" element={
          <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN, UserRole.MANAGER]}>
            <Holidays />
          </ProtectedRoute>
        } />
        <Route path="/coupons" element={
          <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN, UserRole.MANAGER]}>
            <Coupons />
          </ProtectedRoute>
        } />

        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/staff" element={
          <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]}>
            <Staff />
          </ProtectedRoute>
        } />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/sales" element={
          <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]}>
            <Sales />
          </ProtectedRoute>
        } />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/check-in" element={<CheckIn />} />
        <Route path="/checkins-log" element={<CheckinsLog />} />
        <Route path="/portal" element={<MemberPortal />} />
        <Route path="/store" element={<MembershipStore />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/comms" element={<Communications />} />
        <Route path="/tax" element={<TaxCenter />} />
        <Route path="/my-earnings" element={<MyEarnings />} />
        <Route path="/payroll" element={
          <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]}>
            <Payroll />
          </ProtectedRoute>
        } />
        <Route path="/gate-qr" element={
          <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN, UserRole.KIOSK]}>
            <GateQR />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

// -----------------------------------------------------------------------------
// App
// -----------------------------------------------------------------------------
const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <AuthGate>
          <AppRoutes />
        </AuthGate>
      </Router>
    </AppProvider>
  );
};

export default App;
