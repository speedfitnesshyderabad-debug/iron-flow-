
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, Outlet } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
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
import ReloadPrompt from './components/ReloadPrompt';


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
  const isPending = 
    initial.hash.includes('access_token=') ||
    initial.hash.includes('type=recovery') ||
    initial.hash.includes('code=') ||
    initial.search.includes('code=') ||
    initial.search.includes('type=recovery');

  if (isPending) {
    console.log('🔐 AuthGate: pending auth params detected:', initial);
  }
  return isPending;
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
  const { currentUser, setIsRecoveryFlow } = useAppContext();
  const [gating, setGating] = useState(INITIAL_AUTH_PENDING);
  const [wasRecovery, setWasRecovery] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);

  useEffect(() => {
    if (!gating) return;

    console.log('🔐 AuthGate active — waiting for Supabase auth event...');

    let released = false;
    const release = (goToReset = false) => {
      if (released) return;
      
      // If we are performing an exchange, we wait for currentUser to be set 
      // in AppContext before we finally release the gate.
      if (goToReset && !currentUser) {
        console.log('🔐 AuthGate: waiting for currentUser profile sync...');
        return; 
      }

      released = true;
      const reallyGoToReset = goToReset || (window as any).__ironflowInitialUrl?.search?.includes('code=');
      console.log('🔐 AuthGate: releasing. goToReset requested:', goToReset, 'final:', reallyGoToReset);
      
      if (reallyGoToReset) {
        // Direct hash assignment is sometimes more reliable during initial app boot
        window.location.hash = '#/reset-password';
      }
      setGating(false);
    };

    const initialUrl = (window as any).__ironflowInitialUrl || {};
    const fullSource = (initialUrl.hash || '') + (initialUrl.search || '');
    const isRecovery = fullSource.includes('type=recovery') || fullSource.includes('code=') || wasRecovery;
    
    if (isRecovery && !wasRecovery) {
      setWasRecovery(true);
      setIsRecoveryFlow(true);
    }

    // Listen FIRST (before async check), so we don't miss the event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 AuthGate auth event:', event, 'isRecovery:', isRecovery);
      
      if (event === 'PASSWORD_RECOVERY') {
        release(true);
      } else if (['SIGNED_IN', 'TOKEN_REFRESHED'].includes(event) && session) {
        release(isRecovery || hasPendingAuthParams());
      } else if (event === 'INITIAL_SESSION') {
        if (!hasPendingAuthParams()) {
          release(false);
        }
      } else if (event === 'SIGNED_OUT') {
        release(false);
      }
    });

    // Handle explicit exchange if code is in URL
    const searchParams = new URLSearchParams(initialUrl.search);
    const hashParams = new URLSearchParams(initialUrl.hash.split('?')[1] || initialUrl.hash.replace('#', ''));
    const code = searchParams.get('code') || hashParams.get('code');

    if (code && !released && !isExchanging) {
      setIsExchanging(true);
      console.log('🔐 AuthGate: explicitly exchanging code on initial load. Code:', code.substring(0, 8) + '...');
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          console.error('❌ AuthGate: code exchange failed:', error);
          release(false);
        } else {
          console.log('🔐 AuthGate: Code exchange successful for user:', data.user?.email);
          // Context will pick up SIGNED_IN and call fetchData. 
          // We'll wait for that currentUser to appear in next effect run.
        }
      });
    }

    if (!isRecovery && !released && !code) {
      release(false);
    }

    const processDeepLink = async (url: string) => {
      console.log('🔗 Processing Deep Link:', url);
      let fragment = '';
      if (url.includes('#')) {
        fragment = '#' + url.split('#')[1];
      } else if (url.includes('?')) {
        fragment = '?' + url.split('?')[1];
      }
      if (!fragment) {
        // Fallback for full URLs without explicit # or ? (e.g. some deep link formats)
        if (url.includes('code=') || url.includes('access_token=')) {
          fragment = url.includes('?') ? '?' + url.split('?')[1] : (url.includes('#') ? '#' + url.split('#')[1] : '');
        }
      }
      if (!fragment) return;

      (window as any).__ironflowInitialUrl = {
        search: fragment.startsWith('?') ? fragment : '',
        hash: fragment.startsWith('#') ? fragment : '',
      };

      if (fragment.includes('type=recovery') || fragment.includes('code=')) {
        setWasRecovery(true);
      }

      if (fragment.startsWith('#')) {
        window.location.hash = fragment;
      } else if (fragment.startsWith('?')) {
        window.location.hash = `#/reset-password${fragment}`;
      }

      const params = new URLSearchParams(fragment.replace('#', '?'));
      const code = params.get('code');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        release(isRecovery || true);
      } else if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        release(isRecovery || true);
      }
    };

    const timer = setTimeout(() => {
      console.warn('🔐 AuthGate: timeout — releasing gate');
      release(false);
    }, 12000);

    // Capacitor Deep Link Listener (Warm Start)
    const appUrlListener = CapApp.addListener('appUrlOpen', async (data) => {
      console.log('🔗 Deep link received (Warm Start):', data.url);
      if (data.url.includes('type=recovery') || data.url.includes('access_token=') || data.url.includes('code=')) {
        setGating(true);
        processDeepLink(data.url);
      }
    });

    // Capacitor Cold Start Check
    CapApp.getLaunchUrl().then((data) => {
      if (data?.url) {
        console.log('🔗 Deep link received (Cold Start):', data.url);
        if (data.url.includes('type=recovery') || data.url.includes('access_token=') || data.url.includes('code=')) {
          setGating(true);
          processDeepLink(data.url);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
      appUrlListener.then(l => l.remove());
    };
  }, [gating, navigate, currentUser]);


  if (gating) {
    console.log(`🔐 AuthGate: rendering gate (wasRecovery: ${wasRecovery})`);
    return (
      <div style={{
        minHeight: '100vh',
        background: '#020617',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          width: 64, height: 64,
          border: '3px solid rgba(59, 130, 246, 0.1)',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite'
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h1 style={{ 
            color: 'white', 
            fontFamily: 'sans-serif', 
            fontSize: '1.25rem', 
            fontWeight: 800, 
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {wasRecovery ? 'Verifying Reset Link' : 'Authenticating'}
          </h1>
          <p style={{ 
            color: '#64748b', 
            fontFamily: 'sans-serif', 
            fontSize: '0.875rem', 
            margin: 0 
          }}>
            {wasRecovery ? 'Please wait while we secure your account...' : 'Connecting to your IronFlow session...'}
          </p>
        </div>
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
    <Routes>
      {/* Standalone Route (Even when logged in) */}
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Routes within App Layout */}
      <Route element={<Layout><Outlet /></Layout>}>
        <Route path="/" element={
          useAppContext().isRecoveryFlow ? <Navigate to="/reset-password" replace /> : (
            currentUser.role === UserRole.KIOSK ? <Navigate to="/gate-qr" replace /> : <Dashboard />
          )
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
      </Route>
    </Routes>
  );
};

// -----------------------------------------------------------------------------
// App
// -----------------------------------------------------------------------------
const App: React.FC = () => {
  useEffect(() => {
    const backButtonListener = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        // Show a confirmation dialog (using your UI framework or browser confirm)
        const confirmed = window.confirm("Are you sure you want to exit?");
        if (confirmed) {
          CapApp.exitApp();
        }
      } else {
        window.history.back();
      }
    });

    return () => {
      backButtonListener.then(l => l.remove());
    };
  }, []);

  return (
    <AppProvider>
      <Router>
        <AuthGate>
          <AppRoutes />
        </AuthGate>
        <ReloadPrompt />
      </Router>
    </AppProvider>

  );
};

export default App;
