
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import BranchQR from './pages/BranchQR';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: UserRole[] }> = ({ children, allowedRoles }) => {
  const { currentUser } = useAppContext();

  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

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
        <Route path="/" element={<Dashboard />} />
        <Route path="/walk-ins" element={<WalkInManagement />} />
        <Route path="/members" element={<Members />} />
        <Route path="/branches" element={<Branches />} />
        <Route path="/branch-qr" element={<BranchQR />} />
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
        <Route path="/portal" element={<MemberPortal />} />
        <Route path="/store" element={<MembershipStore />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/comms" element={<Communications />} />
        <Route path="/tax" element={<TaxCenter />} />
        <Route path="/my-earnings" element={<MyEarnings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppProvider>
  );
};

export default App;
