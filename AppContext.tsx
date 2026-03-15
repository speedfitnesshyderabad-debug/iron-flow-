import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Branch, Plan, Subscription, Sale, Attendance, Booking, Feedback, UserRole, SubscriptionStatus, Communication, CommType, InventoryItem, BodyMetric, Offer, ClassSession, Expense, ActiveSession, Payroll, Referral, Holiday, Coupon, WalkIn } from './types';
import { MOCK_USERS, BRANCHES, MOCK_PLANS, MOCK_SUBSCRIPTIONS, MOCK_OFFERS, MOCK_ATTENDANCE, MOCK_SALES, MOCK_BOOKINGS } from './constants';
import { GoogleGenAI } from "@google/genai";
import { supabase } from './src/lib/supabase';
import { todayDateStr, addDays, daysBetween, clamp, currentYear, currentTimeStr, isSubscriptionActive } from './utils/dates';
import { createClient } from '@supabase/supabase-js';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  branches: Branch[];
  users: User[];
  plans: Plan[];
  subscriptions: Subscription[];
  sales: Sale[];
  attendance: Attendance[];
  bookings: Booking[];
  feedback: Feedback[];
  communications: Communication[];
  inventory: InventoryItem[];
  metrics: BodyMetric[];
  offers: Offer[];
  classSchedules: ClassSession[];
  expenses: Expense[];
  payroll: Payroll[];
  holidays: Holiday[];
  coupons: Coupon[];
  walkIns: WalkIn[];

  isGlobalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
  addBranch: (branch: Branch) => Promise<void>;
  updateBranch: (id: string, updates: Partial<Branch>) => Promise<void>;
  addUser: (user: User) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addPlan: (plan: Plan) => Promise<void>;
  updatePlan: (id: string, updates: Partial<Plan>) => Promise<void>;
  addSubscription: (sub: Subscription) => Promise<void>;
  updateSubscription: (id: string, updates: Partial<Subscription>) => Promise<void>;
  addSale: (sale: Sale) => Promise<void>;
  recordAttendance: (att: Attendance) => Promise<void>;
  updateAttendance: (id: string, updates: Partial<Attendance>) => Promise<void>;
  addBooking: (booking: Booking) => Promise<void>;
  updateBooking: (id: string, updates: Partial<Booking>) => Promise<void>;
  addFeedback: (fb: Feedback) => Promise<void>;
  updateFeedbackStatus: (id: string, status: Feedback['status']) => Promise<void>;
  addInventory: (item: InventoryItem) => Promise<void>;
  updateInventory: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  deleteInventory: (id: string) => Promise<void>;
  sellInventoryItem: (itemId: string, memberId: string, quantity: number, paymentMethod: 'CASH' | 'POS' | 'CARD' | 'ONLINE', transactionCode?: string, razorpayPaymentId?: string) => Promise<void>;
  addMetric: (metric: BodyMetric) => Promise<void>;
  addOffer: (offer: Offer) => Promise<void>;
  updateOffer: (id: string, updates: Partial<Offer>) => Promise<void>;
  deleteOffer: (id: string) => Promise<void>;
  addClassTemplate: (template: any) => Promise<void>;
  deleteClassTemplate: (id: string) => Promise<void>;
  addHoliday: (holiday: Omit<Holiday, 'id' | 'createdAt'>, notify?: boolean) => Promise<void>;
  updateHoliday: (id: string, updates: Partial<Holiday>) => Promise<void>;
  deleteHoliday: (id: string) => Promise<void>;
  addCoupon: (coupon: Omit<Coupon, 'id' | 'createdAt' | 'timesUsed'>) => Promise<void>;
  updateCoupon: (id: string, updates: Partial<Coupon>) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
  validateCoupon: (code: string, planId: string) => Promise<{ valid: boolean; discount: number; message: string }>;

  generateUpcomingClasses: () => Promise<void>;
  addClassSession: (session: ClassSession) => Promise<void>;
  deleteClassSession: (id: string) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addPayroll: (record: Payroll) => Promise<void>;
  updatePayroll: (id: string, updates: Partial<Payroll>) => Promise<void>;
  deletePayroll: (id: string) => Promise<void>;
  generateTransactionCode: (targetBranchId?: string) => Promise<string>;
  verifyTransactionCode: (code: string) => Promise<boolean>;
  enrollMember: (userData: Partial<User>, planId?: string, trainerId?: string, password?: string, discount?: number, paymentMethod?: 'CASH' | 'CARD' | 'ONLINE' | 'POS', startDate?: string, staffId?: string, referralCode?: string, pauseAllowance?: number) => Promise<void>;
  purchaseSubscription: (userId: string, planId: string, paymentMethod: 'CASH' | 'CARD' | 'ONLINE' | 'POS', trainerId?: string, referralCode?: string, pauseAllowance?: number, discount?: number, customStartDate?: string) => Promise<void>;
  pauseMembership: (subscriptionId: string) => Promise<void>;
  resumeMembership: (subscriptionId: string) => Promise<void>;
  sendNotification: (comm: Omit<Communication, 'id' | 'timestamp' | 'status'>) => Promise<void>;
  askGemini: (prompt: string, modelType?: 'flash' | 'pro') => Promise<string>;
  toast: { message: string; type: 'success' | 'error' } | null;
  showToast: (message: string, type?: 'success' | 'error') => void;
  // Session Management
  generateDeviceFingerprint: () => Promise<string>;
  createSession: (userId: string) => Promise<{ success: boolean; message?: string }>;
  revokeSession: (userId: string, fingerprint?: string) => Promise<void>;
  getSessions: (userId: string) => Promise<ActiveSession[]>;
  importMembers: (importedUsers: Partial<User>[]) => Promise<void>;
  addWalkIn: (walkIn: WalkIn) => Promise<void>;
  updateWalkIn: (id: string, updates: Partial<WalkIn>) => Promise<void>;
  selectedBranchId: string | 'all';
  setSelectedBranchId: (id: string | 'all') => void;
  isRowVisible: (rowBranchId: string | null | undefined) => boolean;
  fetchData: () => Promise<void>;
  fetchPaginatedMembers: (config: {
    page: number;
    pageSize: number;
    searchTerm?: string;
    branchId?: string | 'all';
    statusFilter?: string;
  }) => Promise<{ members: User[]; totalCount: number }>;
  isFetchingMembers: boolean;
  fetchPaginatedSales: (config: {
    page: number;
    pageSize: number;
    searchTerm?: string;
    branchId?: string | 'all';
  }) => Promise<{ sales: Sale[]; totalCount: number; periodRevenue: number }>;
  isFetchingSales: boolean;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, _setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const currentUserRef = React.useRef<User | null>(currentUser);

  const setCurrentUser = useCallback((user: User | null) => {
    _setCurrentUser(user);
    currentUserRef.current = user;
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      // Request browser push notification permission on login
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        const bName = currentUser.branchId ? branches.find(b => b.id === currentUser.branchId)?.name || 'IronFlow' : 'IronFlow';
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(`🔔 ${bName} Notifications Enabled`, {
              body: `Hi ${currentUser.name}! You'll now receive real-time alerts for payments, announcements and more.`,
              icon: '/favicon.ico',
            });
          }
        });
      }
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [classSchedules, setClassSchedules] = useState<ClassSession[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [walkIns, setWalkIns] = useState<WalkIn[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | 'all'>(() => {
    return localStorage.getItem('selectedBranchId') || 'all';
  });

  const isRowVisible = useCallback((rowBranchId: string | null | undefined) => {
    if (!currentUser) return false;
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return selectedBranchId === 'all' || rowBranchId === selectedBranchId;
    }
    // Members with no branchId assigned should see all rows (trainers, classes, etc.)
    if (currentUser.role === UserRole.MEMBER && !currentUser.branchId) return true;
    return rowBranchId === currentUser.branchId;
  }, [currentUser, selectedBranchId]);

  useEffect(() => {
    localStorage.setItem('selectedBranchId', selectedBranchId);
  }, [selectedBranchId]);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isGlobalLoading, setGlobalLoading] = useState(false);
  const [isFetchingMembers, setIsFetchingMembers] = useState(false);
  const [isFetchingSales, setIsFetchingSales] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    setGlobalLoading(true);
    try {
      // 1. Sync User Profile EARLY (Required for RLS to allow further fetching/seeding)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        // 🔍 Smart Identity Sync: Check by BOTH ID and Email
        const { data: existingProfile } = await supabase
          .from('users')
          .select('*')
          .or(`id.eq.${authUser.id},email.eq.${authUser.email}`)
          .maybeSingle();

        if (existingProfile) {
          // 🔄 Handle UID Shift (e.g. Google Login -> Email/Password Login with same email)
          if (existingProfile.id !== authUser.id) {
            console.log('🔄 Identity mismatch detected, migrating profile ID to new Auth UID...');
            const { data: updatedProfile, error: updateError } = await supabase
              .from('users')
              .update({ id: authUser.id })
              .eq('id', existingProfile.id)
              .select()
              .single();

            if (!updateError && updatedProfile) {
              console.log('✅ Identity migrated successfully');
              setCurrentUser(updatedProfile);
            } else {
              console.error('❌ Identity migration failed:', updateError);
              setCurrentUser(existingProfile);
            }
          } else {
            // Already in sync
            setCurrentUser(existingProfile);
          }
        } else {
          // 🛡️ Secure Profile Reconstruction (If DB record is entirely missing)
          const isGoogle = authUser.app_metadata?.provider === 'google' || authUser.app_metadata?.providers?.includes('google');

          if (isGoogle && !authUser.user_metadata?.role) {
            console.warn('Blocked unauthorized Google login for new user:', authUser.email);
            const supabaseUrlClean = import.meta.env.VITE_SUPABASE_URL?.trim();
            fetch(`${supabaseUrlClean}/functions/v1/delete-user`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
              body: JSON.stringify({ email: authUser.email }),
            }).catch(console.error);

            await supabase.auth.signOut();
            showToast("Account not found! Please click 'Join Now' to register and select your branch first.", "error");
            setGlobalLoading(false);
            return;
          }

          const metadata = authUser.user_metadata;
          const reconstructedRole = metadata?.role || UserRole.MEMBER;
          const reconstructedBranchId = metadata?.branchId || null;

          const { data: profile } = await supabase.from('users').upsert({
            id: authUser.id,
            name: metadata?.name || authUser.email?.split('@')[0] || 'Gym Member',
            email: authUser.email,
            role: reconstructedRole,
            branchId: reconstructedBranchId,
            phone: metadata?.phone || '',
            emergencyContact: metadata?.emergencyContact || '',
            address: metadata?.address || '',
            memberId: metadata?.memberId || `IF-RECON-${Math.floor(1000 + Math.random() * 9000)}`,
            avatar: metadata?.avatar || `https://ui-avatars.cc/api/?name=${encodeURIComponent(metadata?.name || 'User')}&background=3b82f6&color=fff`
          }).select().single();

          if (profile) {
            setUsers(prev => [...prev, profile]);
            setCurrentUser(profile);
          }
        }
      }

      // 2. Fetch/Seed Branches
      const { data: bData } = await supabase.from('branches').select('*');
      const finalBranches = bData || [];
      const missingBranches = BRANCHES.filter(mb => !finalBranches.find(b => b.id === mb.id));
      if (missingBranches.length > 0) {
        const { data: inserted } = await supabase.from('branches').upsert(missingBranches).select();
        if (inserted) finalBranches.push(...inserted);
      }
      setBranches(finalBranches);

      // 3. Fetch/Seed Users (Excluding Members to keep global state light)
      // Members are handled via fetchPaginatedMembers to support 10,000+ records.
      const { data: uData } = await supabase
        .from('users')
        .select('*')
        .neq('role', UserRole.MEMBER);

      if (uData) setUsers(uData);

      // 4. Fetch/Seed Plans (Ensuring plans exist for all branches)
      const { data: pData } = await supabase.from('plans').select('*');
      let finalPlans = pData || [];

      if (finalPlans.length === 0) {
        // Expand MOCK_PLANS to all branches if table is empty
        const seededPlans: Plan[] = [];
        finalBranches.forEach(branch => {
          MOCK_PLANS.forEach(mockP => {
            // Add branch-specific plans and global multi-branch plans
            if (!mockP.isMultiBranch) {
              seededPlans.push({ ...mockP, id: `${mockP.id}-${branch.id}`, branchId: branch.id });
            } else if (branch.id === 'b1') {
              // Only seed one instance of multi-branch plan (usually at HQ)
              seededPlans.push(mockP);
            }
          });
        });
        const { data: insertedPlans } = await supabase.from('plans').insert(seededPlans).select();
        if (insertedPlans) finalPlans = insertedPlans;
      }
      setPlans(finalPlans);

      // 5. Fetch/Seed Subscriptions (With Member Join for dashboard alerts)
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*, member:users!memberId(name, avatar, phone, memberId, branchId)');

      if (subError) console.warn('⚠️ Subscription join failed:', subError);
      if (subData) setSubscriptions(subData as any);
    } catch (error) {
      console.error('Core sync error:', error);
    }

    try {
      // 6. Fetch Logs with Member/User Joins (To display names without loading 10,000 members)
      const { data: sData } = await supabase.from('sales').select('*, member:users!memberId(name, memberId)');
      if (sData) setSales(sData);

      const { data: aData } = await supabase.from('attendance').select('*, user:users!userId(name, memberId, role)');
      if (aData) setAttendance(aData);

      const { data: bkData } = await supabase.from('bookings').select('*, member:users!memberId(name, memberId)');
      if (bkData) setBookings(bkData);

      const { data: fbData } = await supabase.from('feedback').select('*');
      if (fbData) setFeedback(fbData);

      const { data: cData } = await supabase.from('communications').select('*, user:users!userId(name, memberId, role)');
      if (cData) {
        // Map is_read from DB to isRead in UI
        const mapped = cData.map((c: any) => ({ ...c, isRead: !!c.is_read }));
        setCommunications(mapped as any);
      }
      const { data: holidaysData } = await supabase.from('holidays').select('*');
      setHolidays(holidaysData || []);

      const { data: iData } = await supabase.from('inventory').select('*');
      if (iData) setInventory(iData);

      const { data: mData } = await supabase.from('metrics').select('*');
      if (mData) setMetrics(mData);

      const { data: oData } = await supabase.from('offers').select('*');
      setOffers(oData || []);

      const { data: csData } = await supabase.from('class_schedules').select('*');
      if (csData) setClassSchedules(csData);

      const { data: exData } = await supabase.from('expenses').select('*');
      if (exData) setExpenses(exData);

      const { data: pyData } = await supabase.from('payroll').select('*');
      if (pyData) setPayroll(pyData);

      const { data: coData } = await supabase.from('coupons').select('*');
      if (coData) setCoupons(coData);

      const { data: wiData } = await supabase.from('walk_ins').select('*');
      if (wiData) setWalkIns(wiData);

    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Error connecting to database', 'error');
    } finally {
      setGlobalLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Real-time Subscriptions
    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        supabase.from('bookings').select('*').then(({ data }) => { if (data) setBookings(data); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_schedules' }, () => {
        supabase.from('class_schedules').select('*').then(({ data }) => { if (data) setClassSchedules(data); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newSale = payload.new as Sale;
          // Fetch member name for the new sale
          supabase
            .from('users')
            .select('name, memberId')
            .eq('id', newSale.memberId)
            .single()
            .then(({ data: memberData }) => {
              const saleWithMember = {
                ...newSale,
                member: memberData ? { name: memberData.name, memberId: memberData.memberId } : undefined
              };
              setSales(prev => {
                // Prevent duplicates if local action already added it
                if (prev.some(s => s.id === saleWithMember.id)) return prev;
                return [saleWithMember, ...prev];
              });
            });
        } else {
          // For UPDATE/DELETE, a full refresh is safer for now
          supabase.from('sales').select('*, member:users!memberId(name, memberId)').then(({ data }) => {
            if (data) setSales(data);
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        supabase.from('expenses').select('*').then(({ data }) => { if (data) setExpenses(data); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payroll' }, () => {
        supabase.from('payroll').select('*').then(({ data }) => { if (data) setPayroll(data); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'holidays' }, () => {
        supabase.from('holidays').select('*').then(({ data }) => { if (data) setHolidays(data); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, () => {
        supabase.from('coupons').select('*').then(({ data }) => { if (data) setCoupons(data); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'walk_ins' }, () => {
        supabase.from('walk_ins').select('*').then(({ data }) => { if (data) setWalkIns(data); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'communications' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newComm = payload.new as any;
          // Check if this is for the current user
          if (currentUserRef.current?.id === newComm.user_id) {
            showToast(`New ${newComm.category} notification: ${newComm.body.substring(0, 50)}...`);

            // Browser push notification
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification(`🔔 New Notification`, {
                body: newComm.body,
                icon: '/favicon.ico'
              });
            }
          }
        }

        // Refresh communications list to pick up joined data and status
        supabase.from('communications').select('*, user:users!userId(name, memberId, role)').then(({ data }) => {
          if (data) {
            const mapped = data.map((c: any) => ({ ...c, isRead: !!c.is_read }));
            setCommunications(mapped as any);
          }
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); }
  }, [fetchData]);

  // Sync data when user logs in
  useEffect(() => {
    if (currentUser?.id) {
      console.log('🔄 User logged in/changed, syncing data...');
      fetchData();
    }
  }, [currentUser?.id, fetchData]);

  const fetchPaginatedMembers = useCallback(async (config: {
    page: number;
    pageSize: number;
    searchTerm?: string;
    branchId?: string | 'all';
    statusFilter?: string;
  }) => {
    setIsFetchingMembers(true);
    // Artificial delay to ensure user sees the loading state (confirming it's not all pre-loaded)
    await new Promise(r => setTimeout(r, 400));
    try {
      const { page, pageSize, searchTerm, branchId, statusFilter } = config;
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('role', UserRole.MEMBER);

      // Branch filter
      if (branchId && branchId !== 'all') {
        query = query.eq('branchId', branchId);
      } else if (currentUser?.role !== UserRole.SUPER_ADMIN && currentUser?.branchId) {
        query = query.eq('branchId', currentUser.branchId);
      }

      // Search term
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,memberId.ilike.%${searchTerm}%`);
      }

      // --- Advanced Status Filtering ---
      if (statusFilter && statusFilter !== 'ALL') {
        // We need subqueries/intermediate mapping for complex subscription states
        // because a user can have multiple subscriptions
        let subQuery = supabase
          .from('subscriptions')
          .select('memberId, status, endDate, plans!inner(type)');

        // Optimization: Apply branch filter to subquery if present
        if (branchId && branchId !== 'all') {
          subQuery = subQuery.eq('branchId', branchId);
        } else if (currentUser?.role !== UserRole.SUPER_ADMIN && currentUser?.branchId) {
          subQuery = subQuery.eq('branchId', currentUser.branchId);
        }

        const { data: allSubs } = await subQuery;

        if (allSubs) {
          let validMemberIds = new Set<string>();

          // Group subscriptions by member
          const subsByMember = allSubs.reduce((acc, sub) => {
            if (sub.memberId) {
              if (!acc[sub.memberId]) acc[sub.memberId] = [];
              acc[sub.memberId].push(sub);
            }
            return acc;
          }, {} as Record<string, typeof allSubs>);

          if (statusFilter === 'NO_PLAN') {
            // Find ALL members in the current view first, then exclude those who have ANY plan
            const membersWithPlans = Object.keys(subsByMember);
            if (membersWithPlans.length > 0) {
              query = query.not('id', 'in', `(${membersWithPlans.map(id => `"${id}"`).join(',')})`);
            }
          } else {
            const nowStr = todayDateStr();
            if (statusFilter === 'ACTIVE') {
              Object.entries(subsByMember).forEach(([memberId, subs]) => {
                if (subs.some(s => isSubscriptionActive(s, nowStr))) {
                  validMemberIds.add(memberId);
                }
              });
            } else if (statusFilter === 'PAUSED') {
              Object.entries(subsByMember).forEach(([memberId, subs]) => {
                if (subs.some(s => s.status === SubscriptionStatus.PAUSED)) {
                  validMemberIds.add(memberId);
                }
              });
            } else if (statusFilter === 'EXPIRED') {
              Object.entries(subsByMember).forEach(([memberId, subs]) => {
                const hasActiveOrPaused = subs.some(s => isSubscriptionActive(s, nowStr) || s.status === SubscriptionStatus.PAUSED);
                const hasExpired = subs.some(s => s.status === SubscriptionStatus.EXPIRED || (s.status === SubscriptionStatus.ACTIVE && s.endDate < nowStr));
                if (hasExpired && !hasActiveOrPaused) {
                  validMemberIds.add(memberId);
                }
              });
            } else if (statusFilter === 'EXPIRING_SOON') {
            const sevenDaysFromNow = addDays(nowStr, 7);

            Object.entries(subsByMember).forEach(([memberId, subs]) => {
              const isExpiringSoon = subs.some(s => {
                if (s.status !== SubscriptionStatus.ACTIVE) return false;
                // Strict YYYY-MM-DD string comparisons
                return s.endDate > nowStr && s.endDate <= sevenDaysFromNow;
              });
                if (isExpiringSoon) {
                  validMemberIds.add(memberId);
                }
              });
            }

            // Apply filter payload for non-NO_PLAN statuses
            if (validMemberIds.size > 0) {
              query = query.in('id', Array.from(validMemberIds));
            } else {
              // Guarantee 0 results if filter matched nobody
              query = query.in('id', ['__no_match__']);
            }
          }
        }
      }

      const { data, count, error } = await query
        .order('createdAt', { ascending: false })
        .range(start, end);

      if (error) throw error;

      return {
        members: data || [],
        totalCount: count || 0
      };
    } catch (error) {
      console.error('Error fetching paginated members:', error);
      return { members: [], totalCount: 0 };
    } finally {
      setIsFetchingMembers(false);
    }
  }, [currentUser]);

  const fetchPaginatedSales = useCallback(async (config: {
    page: number;
    pageSize: number;
    searchTerm?: string;
    branchId?: string | 'all';
  }) => {
    setIsFetchingSales(true);
    // Artificial delay to ensure user sees the loading state
    await new Promise(r => setTimeout(r, 400));
    try {
      const { page, pageSize, searchTerm, branchId } = config;
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      // 1. Get total revenue for the current filter (ignoring range)
      let totalQuery = supabase
        .from('sales')
        .select('amount');

      if (branchId && branchId !== 'all') {
        totalQuery = totalQuery.eq('branchId', branchId);
      } else if (currentUser?.role !== UserRole.SUPER_ADMIN && currentUser?.branchId) {
        totalQuery = totalQuery.eq('branchId', currentUser.branchId);
      }

      if (searchTerm) {
        // For revenue calculation, we still need to filter by search if possible
        // but it's complex with joins. For now, let's at least filter by InvoiceNo.
        totalQuery = totalQuery.ilike('invoiceNo', `%${searchTerm}%`);
      }

      const { data: revData } = await totalQuery;
      const periodRevenue = revData?.reduce((acc, s) => acc + s.amount, 0) || 0;

      // 2. Get paginated sales with joins
      let query = supabase
        .from('sales')
        .select('*, member:users!memberId(name, memberId)', { count: 'exact' });

      // Branch filter
      if (branchId && branchId !== 'all') {
        query = query.eq('branchId', branchId);
      } else if (currentUser?.role !== UserRole.SUPER_ADMIN && currentUser?.branchId) {
        query = query.eq('branchId', currentUser.branchId);
      }

      // Search term (Invoice No OR Member Name)
      if (searchTerm) {
        // We use a join-aware filter if possible, or filter by invoiceNo primarily
        query = query.or(`invoiceNo.ilike.%${searchTerm}%,memberId.in.(select id from users where name.ilike.%${searchTerm}%)`);
      }

      const { data, count, error } = await query
        .order('createdAt', { ascending: false })
        .range(start, end);

      if (error) throw error;

      return {
        sales: (data || []) as Sale[],
        totalCount: count || 0,
        periodRevenue
      };
    } catch (error) {
      console.error('Error fetching paginated sales:', error);
      return { sales: [], totalCount: 0, periodRevenue: 0 };
    } finally {
      setIsFetchingSales(false);
    }
  }, [currentUser]);

  // Supabase Auth State Listener - Handle recovery sessions and auth state changes
  useEffect(() => {
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
        // Handle password recovery flow - don't interfere with recovery sessions
        if (event === 'PASSWORD_RECOVERY') {
          console.log('Password recovery session detected');
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch (err) {
      console.error('Auth listener error:', err);
    }
  }, []);

  const askGemini = async (prompt: string, modelType: 'flash' | 'pro' = 'flash') => {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
      if (!apiKey) return 'API Key not configured.';

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: modelType === 'pro' ? 'gemini-1.5-pro' : 'gemini-1.5-flash',
        contents: prompt,
      });
      return response.text || 'Unable to generate response.';
    } catch (e) {
      console.error(e);
      return 'AI services offline.';
    }
  };

  const generateInvoiceNo = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    const prefix = branch?.name.slice(0, 3).toUpperCase() || 'IF';
    const year = currentYear();
    const count = sales.filter(s => s.branchId === branchId).length + 1001;
    return `INV/${prefix}/${year}/${count}`;
  };

  const addBranch = async (b: Branch) => {
    const { error } = await supabase.from('branches').insert(b);
    if (error) {
      console.error('Add branch error:', error);
      showToast('Failed to add branch: ' + error.message, 'error');
      throw error;
    } else {
      setBranches(prev => [...prev, b]);
      showToast('Branch added successfully', 'success');
    }
  };

  const updateBranch = async (id: string, updates: Partial<Branch>) => {
    const { error } = await supabase.from('branches').update(updates).eq('id', id);
    if (error) {
      console.error('Update branch error:', error);
      showToast('Failed to update branch: ' + error.message, 'error');
      throw error;
    } else {
      setBranches(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
      showToast('Branch updated successfully', 'success');
    }
  };

  const addUser = async (u: User) => {
    const { error } = await supabase.from('users').insert(u);
    if (!error) {
      setUsers(prev => [...prev, u]);
      showToast('User added successfully');
    } else {
      console.error('❌ addUser error:', error);
      showToast(`Failed to add user: ${error.message}`, 'error');
      throw error; // Throw so that callers like Staff.tsx can handle it
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const { error } = await supabase.from('users').update(updates).eq('id', id);
    if (!error) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
      if (currentUser?.id === id) setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
      showToast('User updated');
    } else showToast(`Failed to update user: ${error.message}`, 'error');
  };

  const deleteUser = async (id: string) => {
    setGlobalLoading(true);
    try {
      showToast('Processing complete data purge...');

      // 1. Delete all related data first
      const cleanupTables = [
        'class_completion_codes',
        'bookings',
        'attendance',
        'metrics',
        'feedback',
        'communications',
        'sales',
        'subscriptions',
        'active_sessions',
        'referrals'
      ];

      for (const table of cleanupTables) {
        let column = 'userId';
        if (['class_completion_codes', 'bookings', 'metrics', 'feedback', 'referrals', 'subscriptions', 'sales'].includes(table)) {
          column = 'memberId';
        }

        const { error } = await supabase.from(table).delete().eq(column, id);
        if (error) {
          console.warn(`⚠️ Cleanup failed for table ${table}:`, error.message);
        }

        // Also cleanup roles where user might be trainer or staff
        if (['bookings', 'subscriptions', 'sales', 'class_templates', 'class_schedules'].includes(table)) {
          const staffCol = table === 'bookings' || table === 'subscriptions' || table === 'sales' || table === 'class_templates' || table === 'class_schedules' ? 'trainerId' : 'staffId';
          await supabase.from(table).delete().eq(staffCol, id);
        }
      }

      // Special cases for staff/receptionist
      await supabase.from('payroll').delete().eq('staffId', id);
      await supabase.from('walk_ins').delete().eq('assignedTo', id);
      await supabase.from('expenses').delete().eq('recordedBy', id);
      await supabase.from('transaction_codes').delete().eq('generatedBy', id);

      // 2. Delete the user profile from DB
      const { error: dbError } = await supabase.from('users').delete().eq('id', id);
      if (dbError) throw dbError;

      // 3. Delete from Supabase Auth via Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
      const deleteResp = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ userId: id }),
      });

      if (!deleteResp.ok) {
        const errData = await deleteResp.json().catch(() => ({}));
        console.warn('⚠️ Auth deletion failed (non-critical):', errData);
      }

      // 4. Update local state
      setUsers(prev => prev.filter(u => u.id !== id));
      setSales(prev => prev.filter(s => s.memberId !== id && s.staffId !== id && s.trainerId !== id));
      setSubscriptions(prev => prev.filter(s => s.memberId !== id && s.trainerId !== id));
      setBookings(prev => prev.filter(b => b.memberId !== id && b.trainerId !== id));
      setAttendance(prev => prev.filter(a => a.userId !== id));
      setFeedback(prev => prev.filter(f => f.memberId !== id));
      setCommunications(prev => prev.filter(c => c.userId !== id));
      setMetrics(prev => prev.filter(m => m.memberId !== id));
      setPayroll(prev => prev.filter(p => p.staffId !== id));

      showToast('Member and all associated data deleted successfully');
    } catch (e: any) {
      console.error('❌ Deletion failed:', e);
      showToast('Failed to delete member: ' + (e.message || 'Unknown error'), 'error');
    } finally {
      setGlobalLoading(false);
    }
  };

  const addPlan = async (p: Plan) => {
    const { error } = await supabase.from('plans').insert(p);
    if (!error) {
      setPlans(prev => [...prev, p]);
      showToast('Plan created');
    } else showToast('Failed to create plan', 'error');
  };

  const updatePlan = async (id: string, updates: Partial<Plan>) => {
    const { error } = await supabase.from('plans').update(updates).eq('id', id);
    if (!error) {
      setPlans(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      showToast('Plan updated');
    } else showToast('Failed to update plan', 'error');
  };

  const addSubscription = async (s: Subscription) => {
    const { error } = await supabase.from('subscriptions').insert(s);
    if (!error) setSubscriptions(prev => [...prev, s]);
    else showToast('Failed to add subscription', 'error');
  };

  const updateSubscription = async (id: string, updates: Partial<Subscription>) => {
    const { error } = await supabase.from('subscriptions').update(updates).eq('id', id);
    if (!error) {
      setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    } else {
      console.error('Update subscription error:', error);
      showToast('Failed to update subscription');
    }
  };

  const addSale = async (s: Sale) => {
    const { error } = await supabase.from('sales').insert(s);
    if (!error) setSales(prev => [...prev, s]);
    else showToast('Failed to record sale', 'error');
  };

  const recordAttendance = async (a: Attendance) => {
    const { error } = await supabase.from('attendance').insert(a);
    if (!error) {
      setAttendance(prev => [...prev, a]);
      showToast('Attendance recorded');
    } else showToast('Failed to record attendance', 'error');
  };

  const updateAttendance = async (id: string, updates: Partial<Attendance>) => {
    const { error } = await supabase.from('attendance').update(updates).eq('id', id);
    if (!error) setAttendance(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    else showToast('Failed to update attendance', 'error');
  };

  const addBooking = async (b: Booking) => {
    const { error } = await supabase.from('bookings').insert(b);
    if (!error) {
      setBookings(prev => [...prev, b]);
      showToast('Booking confirmed');
    } else {
      console.error('Booking insert error:', error);
      showToast(`Booking failed: ${error.message}`, 'error');
    }
  };

  const updateBooking = async (id: string, updates: Partial<Booking>) => {
    const { error } = await supabase.from('bookings').update(updates).eq('id', id);
    if (!error) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    } else {
      console.error('Update booking error:', error);
      showToast('Failed to update booking: ' + error.message, 'error');
      throw error;
    }
  };

  const addFeedback = async (f: Feedback) => {
    const { error } = await supabase.from('feedback').insert(f);
    if (!error) {
      setFeedback(prev => [...prev, f]);
      showToast('Feedback submitted');
    } else showToast('Failed to submit feedback', 'error');
  };

  const updateFeedbackStatus = async (id: string, status: Feedback['status']) => {
    const { error } = await supabase.from('feedback').update({ status }).eq('id', id);
    if (!error) setFeedback(prev => prev.map(f => f.id === id ? { ...f, status } : f));
  };

  const addInventory = async (item: InventoryItem) => {
    const { error } = await supabase.from('inventory').insert(item);
    if (!error) {
      setInventory(prev => [...prev, item]);
      showToast('Item added to inventory');
    } else showToast('Failed to add item', 'error');
  };

  const updateInventory = async (id: string, updates: Partial<InventoryItem>) => {
    const { error } = await supabase.from('inventory').update(updates).eq('id', id);
    if (!error) setInventory(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    else showToast('Failed to update inventory', 'error');
  };

  const deleteInventory = async (id: string) => {
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (!error) {
      setInventory(prev => prev.filter(i => i.id !== id));
      showToast('Item deleted from inventory');
    } else showToast('Failed to delete item', 'error');
  };

  const sellInventoryItem = async (itemId: string, memberId: string, quantity: number, paymentMethod: 'CASH' | 'POS' | 'CARD' | 'ONLINE', transactionCode?: string, razorpayPaymentId?: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item || item.stock < quantity) {
      showToast('Insufficient stock!', 'error');
      return;
    }

    // Validate payment details based on method
    if (paymentMethod === 'CASH' || paymentMethod === 'POS') {
      if (!transactionCode) {
        showToast('Transaction code is required for Cash/POS payments', 'error');
        return;
      }
      // Verify transaction code
      const isValid = await verifyTransactionCode(transactionCode);
      if (!isValid) {
        showToast('Invalid or already used transaction code', 'error');
        return;
      }
    } else if (paymentMethod === 'CARD' || paymentMethod === 'ONLINE') {
      if (!razorpayPaymentId) {
        showToast('Razorpay Payment ID is required for Card/Online payments', 'error');
        return;
      }
    }

    const branchId = item.branchId;
    const saleAmount = item.price * quantity;
    const saleId = crypto.randomUUID();

    // 🕵️ Fetch member name for UI join if not in global state
    let memberData = users.find(u => u.id === memberId);
    if (!memberData) {
      const { data: mData } = await supabase.from('users').select('name, memberId').eq('id', memberId).single();
      if (mData) memberData = mData as any;
    }

    const newSale: Sale = {
      id: saleId,
      invoiceNo: generateInvoiceNo(branchId),
      date: todayDateStr(),
      amount: saleAmount,
      memberId,
      itemId,
      staffId: currentUser?.id || null, // ❌ Fix FK violation: No 'pos' placeholder
      branchId,
      paymentMethod,
      transactionCode: (paymentMethod === 'CASH' || paymentMethod === 'POS') ? transactionCode : undefined,
      razorpayPaymentId: (paymentMethod === 'CARD' || paymentMethod === 'ONLINE') ? razorpayPaymentId : undefined,
      member: memberData ? { name: memberData.name, memberId: memberData.memberId } : undefined,
      createdAt: new Date().toISOString()
    };

    const { error: stockError } = await supabase.from('inventory').update({ stock: item.stock - quantity }).eq('id', itemId);
    if (stockError) {
      showToast('Failed to update stock', 'error');
      return;
    }

    const { error: saleError } = await supabase.from('sales').insert(newSale);
    if (saleError) {
      await supabase.from('inventory').update({ stock: item.stock }).eq('id', itemId);
      showToast('Failed to record sale', 'error');
      return;
    }

    setInventory(prev => prev.map(i => i.id === itemId ? { ...i, stock: i.stock - quantity } : i));
    setSales(prev => [newSale, ...prev]); // Add to top for Real-time Recent Sales
    showToast(`Sold ${item.name} x ${quantity}!`);
  };

  const addMetric = async (m: BodyMetric) => {
    const { error } = await supabase.from('metrics').insert(m);
    if (!error) {
      setMetrics(prev => [...prev, m]);
      showToast('Metrics recorded');
    } else showToast('Failed to record metrics', 'error');
  };

  const addOffer = async (o: Offer) => {
    const { error } = await supabase.from('offers').insert(o);
    if (!error) {
      setOffers(prev => [...prev, o]);
      showToast('Offer created');
    } else showToast('Failed to create offer', 'error');
  };

  const updateOffer = async (id: string, updates: Partial<Offer>) => {
    const { error } = await supabase.from('offers').update(updates).eq('id', id);
    if (!error) {
      setOffers(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
      showToast('Campaign updated');
    } else {
      console.error('Update offer error:', error);
      showToast('Failed to update campaign', 'error');
    }
  };

  const deleteOffer = async (id: string) => {
    const { data, error } = await supabase.from('offers').delete().eq('id', id).select();
    if (error) {
      console.error('Delete offer error:', error);
      showToast('Failed to end campaign: ' + error.message, 'error');
    } else if (!data || data.length === 0) {
      console.warn('Delete offer blocked by RLS for offer id:', id);
      showToast('Permission denied: unable to end this campaign', 'error');
    } else {
      setOffers(prev => prev.filter(o => o.id !== id));
      showToast('Campaign ended successfully');
    }
  };

  const addClassTemplate = async (template: any) => {
    const { error } = await supabase.from('class_templates').insert(template);
    if (!error) {
      showToast('Weekly schedule updated');
      generateUpcomingClasses(); // Regenerate based on new template
    } else showToast('Failed to update schedule', 'error');
  };

  const deleteClassTemplate = async (id: string) => {
    const { error } = await supabase.from('class_templates').delete().eq('id', id);
    if (!error) {
      showToast('Schedule removed');
      // In a real app, you might want to also delete future unbooked sessions linked to this template
      generateUpcomingClasses();
    } else showToast('Failed to remove schedule', 'error');
  };

  const generateUpcomingClasses = async () => {
    // Fetch templates
    const { data: templates } = await supabase.from('class_templates').select('*');
    if (!templates) return;

    const newSessions: ClassSession[] = [];
    const today = todayDateStr();
    const weeksToGenerate = 4;

    // Fetch existing sessions to avoid duplicates (simple check based on date/time/trainer)
    // In a production app, use a more robust upsert logic or ID generation
    const { data: existingSessions } = await supabase.from('class_schedules').select('*').gte('date', today);
    const existingKeys = new Set(existingSessions?.map(s => `${s.trainerId}-${s.date}-${s.timeSlot}`));

    for (let i = 0; i < weeksToGenerate * 7; i++) {
      const dateString = addDays(today, i);
      const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' }).format(new Date(dateString + 'T00:00:00')).toUpperCase();

      const matchingTemplates = templates.filter(t => t.dayOfWeek === dayName);

      matchingTemplates.forEach(t => {
        const key = `${t.trainerId}-${dateString}-${t.timeSlot}`;
        if (!existingKeys.has(key)) {
          newSessions.push({
            id: `sess-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            templateId: t.id,
            trainerId: t.trainerId,
            date: dateString,
            timeSlot: t.timeSlot,
            title: t.title,
            capacity: t.capacity,
            branchId: t.branchId
          });
          existingKeys.add(key); // Prevent duplicates within same loop
        }
      });
    }

    if (newSessions.length > 0) {
      const { error } = await supabase.from('class_schedules').insert(newSessions);
      if (!error) {
        setClassSchedules(prev => [...prev, ...newSessions]);
        // console.log(`Generated ${newSessions.length} new class sessions.`);
      }
    }
  };

  const addClassSession = async (session: ClassSession) => {
    const { error } = await supabase.from('class_schedules').insert(session);
    if (!error) {
      setClassSchedules(prev => [...prev, session]);
      showToast('Class scheduled successfully');
    } else showToast('Failed to schedule class', 'error');
  };

  const deleteClassSession = async (id: string) => {
    const { error } = await supabase.from('class_schedules').delete().eq('id', id);
    if (!error) setClassSchedules(prev => prev.filter(s => s.id !== id));
    else showToast('Failed to cancel class', 'error');
  };

  const addExpense = async (expense: Expense) => {
    const { error } = await supabase.from('expenses').insert(expense);
    if (!error) {
      setExpenses(prev => [...prev, expense]);
      showToast('Expense recorded');
    } else showToast('Failed to record expense', 'error');
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) setExpenses(prev => prev.filter(e => e.id !== id));
    else showToast('Failed to delete expense', 'error');
  };

  const addPayroll = async (record: Payroll) => {
    // Remove ID if present (let DB generate)
    const { id, ...insertData } = record as any;

    const { data, error } = await supabase.from('payroll').insert(insertData).select().single();
    if (!error && data) {
      setPayroll(prev => [...prev, data as Payroll]); // Use returned data with ID
      showToast('Payroll generated');
    } else showToast(`Failed to generate payroll: ${error?.message}`, 'error');
  };

  const updatePayroll = async (id: string, updates: Partial<Payroll>) => {
    const { error } = await supabase.from('payroll').update(updates).eq('id', id);
    if (!error) {
      setPayroll(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      showToast('Payroll updated');
    } else showToast(`Failed to update payroll: ${error?.message}`, 'error');
  };

  const generateTransactionCode = async (targetBranchId?: string): Promise<string> => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const branchToUse = targetBranchId || currentUser?.branchId || branches[0]?.id || '';

    const { error } = await supabase.from('transaction_codes').insert({
      code,
      branchId: branchToUse,
      status: 'VALID',
      generatedBy: currentUser?.id
    });

    if (error) {
      console.error('Error generating PIN:', error);
      showToast('Failed to generate PIN', 'error');
      return '';
    }
    return code;
  };

  const verifyTransactionCode = async (code: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('transaction_codes')
      .select('*')
      .eq('code', code)
      .eq('status', 'VALID')
      .single();

    if (error || !data) {
      return false;
    }

    // Mark as used
    await supabase
      .from('transaction_codes')
      .update({ status: 'USED' })
      .eq('code', code);

    return true;
  };

  const sendNotification = async (comm: Omit<Communication, 'id' | 'timestamp' | 'status'>, emailOverride?: string) => {
    const user = users.find(u => u.id === comm.userId);
    const bId = comm.branchId || user?.branchId || branches[0]?.id;
    const branch = branches.find(b => b.id === bId);

    const newComm: Communication = {
      ...comm,
      id: `comm-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: `${todayDateStr()} ${currentTimeStr()}`,
      status: 'DELIVERED',
      branchId: bId
    };

    const { error } = await supabase.from('communications').insert(newComm);
    if (!error) {
      // Add joined user object for immediate UI update in Comm Hub
      const commWithUser = {
        ...newComm,
        user: user ? { name: user.name, memberId: user.memberId, role: user.role } : undefined
      };
      setCommunications(prev => [commWithUser, ...prev]);

      // 📧 Real Email Delivery via SendGrid (Supabase Edge Function)
      // emailOverride is used when the user was just created and isn't yet in the users state array
      const emailTo = emailOverride || user?.email;
      if (emailTo && emailTo.includes('@')) {
        const bName = branch?.name || 'IronFlow';
        const categorySubjects: Record<string, string> = {
          WELCOME: `👋 Welcome to ${bName}!`,
          PAYMENT: `💳 Payment Confirmation – ${bName}`,
          REMINDER: `⏰ Reminder from ${bName}`,
          ANNOUNCEMENT: `📢 Announcement from ${bName}`,
        };
        const emailSubject = newComm.subject || categorySubjects[newComm.category] || `🔔 ${bName} Notification`;
        const emailFrom = branch?.emailFromAddress || 'admin@speedfitness.org';
        const emailFromName = branch?.name || 'IronFlow Gym';

        // ✅ Supabase Edge Function — no Vercel needed
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
        const emailEndpoint = `${supabaseUrl}/functions/v1/send-email`;

        fetch(emailEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            to: emailTo,
            subject: emailSubject,
            body: newComm.body,
            category: newComm.category,
            fromEmail: emailFrom,
            fromName: emailFromName,
            branchName: bName,
            apiKey: branch?.emailApiKey, // From Branch Settings → Email Infrastructure
          }),
        }).catch(e => console.warn('📧 Email send failed (non-critical):', e));
      }

      // 📱 Real SMS Delivery via Twilio (Supabase Edge Function)
      const smsTo = user?.phone || comm.recipient;
      const hasTwilioKey = !!branch?.smsApiKey;
      const isPhoneNumber = smsTo && !smsTo.includes('@') && smsTo.replace(/\D/g, '').length >= 7;

      if (isPhoneNumber && hasTwilioKey) {
        // smsApiKey is stored as "ACCOUNT_SID:AUTH_TOKEN"
        const [twilioSid, twilioToken] = (branch!.smsApiKey as string).split(':');
        const supabaseUrlSms = import.meta.env.VITE_SUPABASE_URL?.trim();
        const smsEndpoint = `${supabaseUrlSms}/functions/v1/send-sms`;

        fetch(smsEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            to: smsTo,
            body: newComm.body,
            accountSid: twilioSid,
            authToken: twilioToken,
            fromNumber: branch?.smsSenderId,
          }),
        })
          .then(async r => {
            const resp = await r.json().catch(() => ({}));
            if (!r.ok) console.warn('📱 SMS send failed:', resp);
            else console.log('📱 SMS sent:', resp.messageSid);
          })
          .catch(e => console.warn('📱 SMS send failed (non-critical):', e));
      } else if (isPhoneNumber && !hasTwilioKey) {
        console.warn('📱 SMS skipped: No Twilio API key in Branch Settings → SMS Gateway.');
      }

      // 🔔 Browser Push Notification
      // Only fire if this notification is for the currently logged-in user
      if (
        newComm.userId === currentUser?.id &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        const bName = branch?.name || 'IronFlow';
        const categoryTitles: Record<string, string> = {
          WELCOME: `👋 Welcome to ${bName}!`,
          PAYMENT: '💳 Payment Confirmed',
          REMINDER: '⏰ Reminder',
          ANNOUNCEMENT: '📢 New Announcement',
        };
        const title = categoryTitles[newComm.category] || `🔔 ${bName} Notification`;
        try {
          new Notification(title, {
            body: newComm.body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: newComm.id,
          });
        } catch (e) {
          console.warn('Push notification failed:', e);
        }
      }
    }
  };

  const processReferralReward = async (refereeId: string, planId: string, providedCode?: string) => {
    try {
      // 1. Find the referrer
      let referrer: User | undefined;

      if (providedCode) {
        referrer = users.find(u => u.referralCode === providedCode);
      }

      if (!referrer) return;

      // Check if referrer has an active membership
      const referrerActiveSubs = subscriptions.filter(s => s.memberId === referrer!.id && s.status === SubscriptionStatus.ACTIVE);
      if (referrerActiveSubs.length === 0) {
        console.log(`Referral rejected: Referrer ${referrer.name} does not have an active membership.`);
        showToast('Referral code belongs to an inactive member', 'error');
        return;
      }

      // Same Branch Constraint
      const referee = users.find(u => u.id === refereeId);
      if (referrer.branchId !== referee?.branchId) {
        console.log('Referral rejected: Referrer and Referee belong to different branches.');
        return;
      }

      const plan = plans.find(p => p.id === planId);
      if (!plan) return;

      // 2. Determine reward days
      let rewardDays = 0;
      if (plan.durationDays === 180) rewardDays = 15;
      else if (plan.durationDays === 365) rewardDays = 30;

      if (rewardDays === 0) return;

      // 3. Find referrer's active gym subscription to extend
      // Sort to get the one ending furthest in the future
      const targetSub = referrerActiveSubs.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];

      if (targetSub) {
        const currentEndDate = new Date(targetSub.endDate);
        const newEndDate = new Date(currentEndDate.getTime() + rewardDays * 86400000).toISOString().split('T')[0];

        const { error: subError } = await supabase.from('subscriptions').update({ endDate: newEndDate }).eq('id', targetSub.id);
        if (!subError) {
          setSubscriptions(prev => prev.map(s => s.id === targetSub.id ? { ...s, endDate: newEndDate } : s));
          showToast(`Referral Reward! Added ${rewardDays} days to ${referrer!.name}'s membership.`);
        }
      }

      // 4. Record the referral
      const newReferral: Referral = {
        id: `ref-${Date.now()}`,
        referrerId: referrer.id,
        refereeId: refereeId,
        planBoughtId: planId,
        rewardDaysApplied: rewardDays,
        status: 'COMPLETED',
        createdAt: new Date().toISOString()
      };

      await supabase.from('referrals').insert(newReferral);
      // Note: If you want to track referrals in local state, add a state variable.

      // 5. Notify the referrer
      const bName = referrer.branchId ? branches.find(b => b.id === referrer.branchId)?.name || 'IronFlow' : 'IronFlow';
      await sendNotification({
        userId: referrer.id,
        type: CommType.SMS,
        recipient: referrer.phone || referrer.email || 'N/A',
        body: `Congratulations! You earned ${rewardDays} free days because your friend joined ${bName}. Your membership has been extended to ${targetSub ? (new Date(new Date(targetSub.endDate).getTime() + rewardDays * 86400000).toISOString().split('T')[0]) : 'N/A'}.`,
        category: 'ANNOUNCEMENT',
        branchId: referrer.branchId || branches[0]?.id || ''
      });

    } catch (err) {
      console.error('Referral processing failed:', err);
    }
  };

  const enrollMember = async (userData: Partial<User>, planId?: string, trainerId?: string, password?: string, discount: number = 0, paymentMethod: 'CASH' | 'CARD' | 'ONLINE' | 'POS' = 'ONLINE', startDate?: string, staffId?: string, referralCode?: string, pauseAllowance: number = 0) => {
    setGlobalLoading(true);

    // 0. Early check: Prevent enrollment if user already exists in our database
    if (userData.email) {
      const existingUser = users.find(u => u.email === userData.email);
      if (existingUser) {
        setGlobalLoading(false);
        showToast('A member with this email already exists.', 'error');
        return;
      }
    }

    const plan = planId ? plans.find(p => p.id === planId) : undefined;
    if (planId && !plan) {
      setGlobalLoading(false);
      showToast('Selected plan not found', 'error');
      return;
    }

    try {
      // 1. Create a temporary Supabase client to create the user without logging out the admin
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const tempSupabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      // Auto-generate secure password for Member
      const randomSuffix = Math.random().toString(36).slice(-6).toUpperCase();
      const memberPassword = password || `IronFlow-${randomSuffix}`;

      // 2. Sign up the new user in Supabase Auth
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: userData.email!,
        password: memberPassword,
        options: {
          data: {
            name: userData.name,
            role: UserRole.MEMBER,
            branchId: userData.branchId,
            phone: userData.phone,
            emergencyContact: userData.emergencyContact,
            address: userData.address,
            avatar: userData.avatar
          }
        }
      });

      // ♻️ Handle "User already registered" — stale Auth user from a previous deletion
      // Auto-clean the stale Auth record and retry signup
      let finalAuthData = authData;
      if (authError?.message?.toLowerCase().includes('already registered') || authError?.message?.toLowerCase().includes('already been registered')) {
        console.warn('⚠️ Stale Auth user detected, cleaning up and retrying...');
        const supabaseUrlClean = import.meta.env.VITE_SUPABASE_URL?.trim();

        // Delete stale Auth user via edge function by email
        await fetch(`${supabaseUrlClean}/functions/v1/delete-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ email: userData.email! }),
        });

        // Retry signup after cleanup
        const { data: retryData, error: retryError } = await tempSupabase.auth.signUp({
          email: userData.email!,
          password: memberPassword,
          options: {
            data: {
              name: userData.name,
              role: UserRole.MEMBER,
              branchId: userData.branchId,
              phone: userData.phone,
              emergencyContact: userData.emergencyContact,
              address: userData.address,
              avatar: userData.avatar
            }
          }
        });
        if (retryError) throw retryError;
        if (!retryData.user) throw new Error('Failed to create auth user after cleanup');
        finalAuthData = retryData;
      } else if (authError) {
        throw authError;
      }

      if (!finalAuthData.user) throw new Error('Failed to create auth user');

      const branchId = userData.branchId || currentUser?.branchId || branches[0]?.id || null;
      const newUserId = finalAuthData.user!.id; // Use Auth UUID (from original or retry signup)
      const membershipStartDate = startDate || todayDateStr();

      const newUser: User = {
        id: newUserId,
        name: userData.name || 'New Member',
        email: userData.email || '',
        // password: password, // ❌ SECURITY: Do NOT store the password!
        role: UserRole.MEMBER,
        branchId,
        memberId: `IF-IND-${Math.floor(1000 + Math.random() * 9000)}`,
        avatar: userData.avatar || `https://i.pravatar.cc/150?u=${newUserId}`,
        emergencyContact: userData.emergencyContact,
        address: userData.address,
        phone: userData.phone
      };

      const { error: dbError } = await supabase.from('users').insert(newUser);
      if (dbError) {
        console.error('❌ Database Profile Creation Failed:', dbError);
        // Clean up Auth user if DB profile fails (optional, but safer to error out)
        throw new Error(`Profile creation failed: ${dbError.message}`);
      }

      setUsers(prev => [...prev, newUser]);

      let subEndDate = '';

      if (plan) {
        const saleId = crypto.randomUUID();
        const newSub: Subscription = {
          id: crypto.randomUUID(),
          memberId: newUserId,
          planId: plan.id,
          startDate: membershipStartDate,
          endDate: addDays(membershipStartDate, plan.durationDays - 1),
          status: SubscriptionStatus.ACTIVE,
          branchId,
          trainerId,
          pauseAllowanceDays: pauseAllowance,
          // Keep for local state only — not in DB schema
          saleId: saleId,
          member: { name: newUser.name, avatar: newUser.avatar, phone: newUser.phone, memberId: newUser.memberId }
        };
        subEndDate = newSub.endDate;

        const finalAmount = Math.max(0, plan.price - discount);
        const newSale: Sale = {
          id: saleId,
          invoiceNo: generateInvoiceNo(branchId),
          date: todayDateStr(),
          amount: finalAmount,
          discount,
          memberId: newUserId,
          planId: plan.id,
          staffId: staffId || currentUser?.id || null,
          branchId,
          paymentMethod: paymentMethod,
          trainerId,
          createdAt: new Date().toISOString(),
          // Keep for local state only — not in DB schema
          member: { name: newUser.name, memberId: newUser.memberId }
        };

        // Strip virtual fields (member, saleId) before DB insert — they don't exist in the schema
        const { member: _subMember, saleId: _saleId, ...subForDB } = newSub as any;
        const { member: _saleMember, ...saleForDB } = newSale as any;

        const { error: subError } = await supabase.from('subscriptions').insert(subForDB);
        if (subError) {
          console.error('❌ Subscription Creation Failed:', subError);
          throw new Error(`Subscription creation failed: ${subError.message}`);
        }

        const { error: saleError } = await supabase.from('sales').insert(saleForDB);
        if (saleError) {
          console.error('❌ Sale Creation Failed:', saleError);
          showToast(`Member enrolled, but sale record failed: ${saleError.message}`, 'error');
        }

        setSubscriptions(prev => [...prev, newSub]);
        setSales(prev => [newSale, ...prev]); // Add to top for Real-time Recent Sales

        // Trigger referral reward
        if (referralCode) {
          await processReferralReward(newUserId, plan.id, referralCode);
        }

        showToast(`Member enrolled! Invoice: ${newSale.invoiceNo}`);
      } else {
        showToast('Member registered successfully!');
      }

      const bName = branchId ? branches.find(b => b.id === branchId)?.name || 'IronFlow' : 'IronFlow';
      const welcomeBody = plan
        ? `Welcome to ${bName}! Your login:\nID: ${userData.email}\nPass: ${memberPassword}\nValid until ${subEndDate}.`
        : `Welcome to ${bName}! Your login:\nID: ${userData.email}\nPass: ${memberPassword}\nPlease purchase a plan from your dashboard.`;

      await sendNotification({
        userId: newUserId,
        type: userData.email ? CommType.EMAIL : CommType.SMS,
        recipient: userData.email || userData.phone || 'N/A',
        body: welcomeBody,
        category: 'WELCOME',
        branchId: branchId
      }, userData.email); // ✅ emailOverride bypasses stale users state

    } catch (e: any) {
      console.error(e);
      showToast('Enrollment failed: ' + e.message, 'error');
    } finally {
      setGlobalLoading(false);
    }
  };

  const importMembers = async (importedUsers: Partial<User>[]) => {
    setGlobalLoading(true);
    let successCount = 0;
    let failCount = 0;

    // Create a temporary client for auth operations
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const tempSupabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });

    for (const data of importedUsers) {
      if (!data.email || !data.name) {
        failCount++;
        continue;
      }

      try {
        // 1. Check if user exists (by Email)
        const existingData = users.find(u => u.email === data.email);

        if (existingData) {
          // Update existing
          await updateUser(existingData.id, {
            name: data.name,
            phone: data.phone || existingData.phone,
            emergencyContact: data.emergencyContact || existingData.emergencyContact,
            address: data.address || existingData.address,
            branchId: data.branchId || existingData.branchId,
            memberId: data.memberId || existingData.memberId
          });
          successCount++;
        } else {
          // Create New
          const bName = data.branchId ? branches.find(b => b.id === data.branchId)?.name || 'IronFlow' : 'IronFlow';
          const password = data.password || `${bName.replace(/\s+/g, '')}@2026`; // Default password using branch name

          // A. Create Auth User
          const { data: authData, error: authError } = await tempSupabase.auth.signUp({
            email: data.email,
            password: password,
            options: {
              data: {
                name: data.name,
                role: UserRole.MEMBER,
                branchId: data.branchId || currentUser?.branchId
              }
            }
          });

          let finalAuthData = authData;
          if (authError?.message?.toLowerCase().includes('already registered') || authError?.message?.toLowerCase().includes('already been registered')) {
            const supabaseUrlClean = import.meta.env.VITE_SUPABASE_URL?.trim();
            await fetch(`${supabaseUrlClean}/functions/v1/delete-user`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
              body: JSON.stringify({ email: data.email }),
            });
            const { data: retryData, error: retryError } = await tempSupabase.auth.signUp({
              email: data.email,
              password: password,
              options: { data: { name: data.name, role: UserRole.MEMBER, branchId: data.branchId || currentUser?.branchId } }
            });
            if (retryError) throw retryError;
            if (!retryData.user) throw new Error('No user returned from auth retry');
            finalAuthData = retryData;
          } else if (authError) {
            throw authError;
          }

          if (!finalAuthData.user) throw new Error('No user returned from auth');

          // B. Create DB User
          const newUserId = finalAuthData.user.id;
          const newUser: User = {
            id: newUserId,
            name: data.name,
            email: data.email,
            role: UserRole.MEMBER,
            branchId: data.branchId || currentUser?.branchId,
            memberId: data.memberId || `IF-IMP-${Math.floor(1000 + Math.random() * 9000)}`,
            avatar: `https://i.pravatar.cc/150?u=${newUserId}`,
            phone: data.phone,
            emergencyContact: data.emergencyContact,
            address: data.address
          };

          const { error: dbError } = await supabase.from('users').insert(newUser);
          if (dbError) throw dbError;

          setUsers(prev => [...prev, newUser]);
          successCount++;
        }
      } catch (err) {
        console.error('Import failed for:', data.email, err);
        failCount++;
      }
    }

    setGlobalLoading(false);
    showToast(`Import Complete: ${successCount} processed, ${failCount} failed.`);
  };

  const purchaseSubscription = async (userId: string, planId: string, paymentMethod: 'CASH' | 'CARD' | 'ONLINE' | 'POS', trainerId?: string, referralCode?: string, pauseAllowance: number = 0, discount: number = 0, customStartDate?: string) => {
    setGlobalLoading(true);
    const plan = plans.find(p => p.id === planId);
    let user = users.find(u => u.id === userId);

    // 🕵️ Member Retrieval: Members are excluded from global state. 
    // Fetch directly from DB if not found locally.
    if (!user) {
      console.log('🔄 Member not in local state, fetching from DB...');
      const { data: fetchedUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !fetchedUser) {
        console.error('❌ Member lookup failed:', userError);
        setGlobalLoading(false);
        showToast('Member profile not found.', 'error');
        return;
      }
      user = fetchedUser as User;
    }

    if (!plan) {
      setGlobalLoading(false);
      showToast('Selected plan not found.', 'error');
      return;
    }

    const effectiveStartDate = customStartDate || todayDateStr();
    // 🛡️ Robustness: Fallback to current staff's branch if member has none assigned yet
    const branchId = user.branchId || currentUser?.branchId || branches[0]?.id || null;

    const saleId = crypto.randomUUID();

    // Build DB-safe objects — strip virtual join fields not in schema
    const newSub: Subscription = {
      id: crypto.randomUUID(),
      memberId: userId,
      planId: planId,
      startDate: effectiveStartDate,
      endDate: addDays(effectiveStartDate, plan.durationDays - 1),
      status: SubscriptionStatus.ACTIVE,
      branchId,
      trainerId,
      pauseAllowanceDays: pauseAllowance,
      // Keep member + saleId for local state only (not in DB schema)
      saleId: saleId,
      member: { name: user.name, avatar: user.avatar, phone: user.phone, memberId: user.memberId }
    };
    const newSale: Sale = {
      id: saleId,
      invoiceNo: generateInvoiceNo(branchId),
      date: todayDateStr(),
      amount: plan.price - discount,
      discount: discount,
      memberId: userId,
      planId: planId,
      staffId: currentUser?.id || null,
      branchId,
      paymentMethod,
      trainerId,
      // Keep member for local state only (not in DB schema)
      member: { name: user.name, memberId: user.memberId },
      createdAt: new Date().toISOString()
    };

    // Strip virtual fields before DB insert
    const { member: _subMember, saleId: _saleId, ...subForDB } = newSub as any;
    const { member: _saleMember, ...saleForDB } = newSale as any;

    try {
      const { error: subError } = await supabase.from('subscriptions').insert(subForDB);
      if (subError) {
        console.error('❌ Subscription Creation Failed:', subError);
        throw new Error(`Subscription creation failed: ${subError.message}`);
      }

      const { error: saleError } = await supabase.from('sales').insert(saleForDB);
      if (saleError) {
        console.error('❌ Sale Creation Failed:', saleError);
        showToast(`Subscription created, but sale record failed: ${saleError.message}`, 'error');
      }

      // Update local state with full objects (including virtual fields for UI)
      setSubscriptions(prev => [...prev, newSub]);
      setSales(prev => [newSale, ...prev]); // Add to top for Real-time Recent Sales

      // Trigger referral reward
      if (referralCode) {
        await processReferralReward(userId, planId, referralCode);
      }

      await sendNotification({
        userId: userId,
        type: CommType.SMS,
        recipient: user.phone || user.email || 'N/A',
        body: `Payment successful! Your ${plan.name} is active until ${newSub.endDate}. Ref: ${newSale.invoiceNo}`,
        category: 'PAYMENT',
        branchId: branchId
      });

      showToast(`Payment received! Invoice: ${newSale.invoiceNo}`);
    } catch (e: any) {
      console.error('❌ Transaction failed:', e);
      showToast('Transaction failed: ' + (e.message || 'Unknown error'), 'error');
      throw e; // Re-throw so callers don't show a false success toast
    } finally {
      setGlobalLoading(false);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    const { error } = await supabase.from('communications').update({ is_read: true }).eq('id', id);
    if (!error) {
      setCommunications(prev => prev.map(c => c.id === id ? { ...c, isRead: true } : c));
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!currentUser) return;
    const unreadIds = communications.filter(c => c.userId === currentUser.id && !c.isRead).map(c => c.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase.from('communications').update({ is_read: true }).in('id', unreadIds);
    if (!error) {
      setCommunications(prev => prev.map(c => unreadIds.includes(c.id) ? { ...c, isRead: true } : c));
    }
  };

  const addWalkIn = async (walkIn: WalkIn) => {
    try {
      const { error } = await supabase.from('walk_ins').insert(walkIn);
      if (!error) {
        setWalkIns(prev => [...prev, walkIn]);
        showToast('Walk-in registered successfully');
      } else {
        console.error('Add walk-in error:', error);
        showToast('Failed to register walk-in: ' + error.message, 'error');
      }
    } catch (err: any) {
      console.error('Network or logic error during walk-in registration:', err);
      showToast('Error: ' + (err.message || 'Check your internet connection'), 'error');
    }
  };

  const updateWalkIn = async (id: string, updates: Partial<WalkIn>) => {
    try {
      const { error } = await supabase.from('walk_ins').update(updates).eq('id', id);
      if (!error) {
        setWalkIns(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
        showToast('Walk-in updated successfully');
      } else {
        console.error('Update walk-in error:', error);
        showToast('Failed to update walk-in: ' + error.message, 'error');
      }
    } catch (err: any) {
      console.error('Network or logic error during walk-in update:', err);
      showToast('Error: ' + (err.message || 'Check your internet connection'), 'error');
    }
  };

  // --- Session Management ---

  const generateDeviceFingerprint = async (): Promise<string> => {
    // Simple browser-based fingerprint
    const fingerprint = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    // Create a hash of the fingerprint data
    const str = JSON.stringify(fingerprint);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  };

  const getSessions = async (userId: string): Promise<ActiveSession[]> => {
    const { data, error } = await supabase
      .from('active_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_activity', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }

    // Map DB columns to frontend interface
    return data.map((s: any) => ({
      id: s.id,
      userId: s.user_id,
      deviceFingerprint: s.device_fingerprint,
      deviceName: s.device_name || 'Unknown Device',
      browserInfo: s.browser_info || 'Unknown Browser',
      ipAddress: s.ip_address,
      loginTime: s.login_time,
      lastActivity: s.last_activity
    }));
  };

  const createSession = async (userId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const user = users.find(u => u.id === userId);

      // FALLBACK: Use Auth metadata if public profile is missing
      const userRole = user?.role || authUser?.user_metadata?.role;

      // STRICT: Default to 1 device for Staff/Members
      // Exception: Super Admin & Branch Admin have UNLIMITED devices (999) by default
      const defaultLimit = (userRole === UserRole.SUPER_ADMIN || userRole === UserRole.BRANCH_ADMIN) ? 999 : 1;
      const limit = user?.maxDevices ?? defaultLimit;

      const fingerprint = await generateDeviceFingerprint();

      // Check existing sessions
      const currentSessions = await getSessions(userId);

      // Check if this device is already logged in (re-login)
      const existingSession = currentSessions.find(s => s.deviceFingerprint === fingerprint);
      if (existingSession) {
        // Update last activity
        await supabase
          .from('active_sessions')
          .update({ last_activity: new Date().toISOString() })
          .eq('id', existingSession.id);
        return { success: true };
      }

      // Check limit
      if (currentSessions.length >= limit) {
        const activeDevice = currentSessions[0]; // Get the first active device info
        return {
          success: false,
          message: `Active on ${activeDevice.deviceName} (${activeDevice.browserInfo}). Limit: ${limit}.`
        };
      }

      // Create new session
      const browserName = (() => {
        const agent = navigator.userAgent;
        if (agent.includes("Chrome")) return "Chrome";
        if (agent.includes("Firefox")) return "Firefox";
        if (agent.includes("Safari")) return "Safari";
        if (agent.includes("Edge")) return "Edge";
        return "Unknown Browser";
      })();

      const osName = (() => {
        const platform = navigator.platform;
        if (platform.includes("Win")) return "Windows";
        if (platform.includes("Mac")) return "MacOS";
        if (platform.includes("Linux")) return "Linux";
        if (platform.includes("iPhone") || platform.includes("iPad")) return "iOS";
        if (platform.includes("Android")) return "Android";
        return "Unknown OS";
      })();

      const newSession = {
        id: `sess-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        user_id: userId,
        device_fingerprint: fingerprint,
        device_name: `${osName} Device`,
        browser_info: browserName,
        login_time: new Date().toISOString(),
        last_activity: new Date().toISOString()
      };

      const { error } = await supabase.from('active_sessions').insert(newSession);

      if (error) {
        console.error('Session creation failed:', error);
        // If DB insert fails (e.g. valid session but DB error), we currently allow login for resilience
        // But if it's a constraint error, we might want to block. 
        // For now, let's assume if it fails, we shouldn't block user unless it's a logic limit.
        return { success: true };
      }

      return { success: true };
    } catch (e) {
      console.error('Session error:', e);
      return { success: false, message: 'Session validation failed' };
    }
  };

  const revokeSession = async (userId: string, fingerprint?: string) => {
    let query = supabase.from('active_sessions').delete().eq('user_id', userId);

    if (fingerprint) {
      query = query.eq('device_fingerprint', fingerprint);
    } else {
      const currentFingerprint = await generateDeviceFingerprint();
      query = query.eq('device_fingerprint', currentFingerprint);
    }

    await query;
  };

  const pauseMembership = async (subscriptionId: string) => {
    const sub = subscriptions.find(s => s.id === subscriptionId);
    if (!sub) return;

    if (sub.status !== SubscriptionStatus.ACTIVE) {
      showToast('Only active memberships can be paused', 'error');
      return;
    }

    const remainingAllowance = (sub.pauseAllowanceDays || 0) - (sub.pausedDaysUsed || 0);
    if (remainingAllowance <= 0) {
      showToast('No pause allowance remaining!', 'error');
      return;
    }

    const pauseDate = todayDateStr();
    const { error } = await supabase.from('subscriptions').update({
      status: SubscriptionStatus.PAUSED,
      pauseStartDate: pauseDate
    }).eq('id', subscriptionId);

    if (!error) {
      setSubscriptions(prev => prev.map(s => s.id === subscriptionId ? {
        ...s,
        status: SubscriptionStatus.PAUSED,
        pauseStartDate: pauseDate
      } : s));
      showToast('Membership paused');
    } else showToast('Failed to pause membership', 'error');
  };

  const resumeMembership = async (subscriptionId: string) => {
    const sub = subscriptions.find(s => s.id === subscriptionId);
    if (!sub || !sub.pauseStartDate) return;

    if (sub.status !== SubscriptionStatus.PAUSED) {
      showToast('Membership is not paused', 'error');
      return;
    }

    // Calculate pause duration using timezone-safe utilities
    const rawPauseDuration = Math.max(0, daysBetween(sub.pauseStartDate, todayDateStr()));

    // Cap pause duration to remaining allowance so it never goes negative
    const remainingAllowance = Math.max(0, (sub.pauseAllowanceDays || 0) - (sub.pausedDaysUsed || 0));
    const pauseDuration = clamp(rawPauseDuration, 0, remainingAllowance);

    const newEndDate = addDays(sub.endDate, pauseDuration);
    const newUsedDays = (sub.pausedDaysUsed || 0) + pauseDuration;

    const { error } = await supabase.from('subscriptions').update({
      status: SubscriptionStatus.ACTIVE,
      endDate: newEndDate,
      pausedDaysUsed: newUsedDays,
      pauseStartDate: null
    }).eq('id', subscriptionId);

    if (!error) {
      setSubscriptions(prev => prev.map(s => s.id === subscriptionId ? {
        ...s,
        status: SubscriptionStatus.ACTIVE,
        endDate: newEndDate,
        pausedDaysUsed: newUsedDays,
        pauseStartDate: undefined
      } : s));
      showToast('Membership resumed and extended');
    } else showToast('Failed to resume membership', 'error');
  };

  const addHoliday = async (holiday: Omit<Holiday, 'id' | 'createdAt'>, notify: boolean = false) => {
    try {
      const { data, error } = await supabase.from('holidays').insert([holiday]).select();
      if (error) throw error;
      if (data && data[0]) {
        setHolidays(prev => [...prev, data[0] as Holiday]);
      }

      if (notify) {
        const { data: branchMembers } = await supabase
          .from('users')
          .select('id, phone, name')
          .eq('branchId', holiday.branchId);

        if (branchMembers && branchMembers.length > 0) {
          const notificationBody = holiday.message || `Holiday Announcement: ${holiday.name} on ${holiday.date}`;

          await Promise.all(branchMembers.map(member =>
            sendNotification({
              userId: member.id,
              type: CommType.SMS,
              recipient: member.phone || '',
              subject: 'Holiday Announcement',
              body: `Hello ${member.name}, ${notificationBody}`,
              category: 'ANNOUNCEMENT',
              branchId: holiday.branchId
            })
          ));
        }
      }

      showToast('Holiday added successfully', 'success');
    } catch (err: any) {
      console.error('Add holiday error:', err);
      showToast('Failed to add holiday: ' + err.message, 'error');
    }
  };

  const updateHoliday = async (id: string, updates: Partial<Holiday>) => {
    try {
      const { data, error } = await supabase.from('holidays').update(updates).eq('id', id).select();
      if (error) throw error;
      if (data && data[0]) {
        setHolidays(prev => prev.map(h => h.id === id ? (data[0] as Holiday) : h));
      }
      showToast('Holiday updated successfully', 'success');
    } catch (err: any) {
      console.error('Update holiday error:', err);
      showToast('Failed to update holiday: ' + err.message, 'error');
    }
  };

  const deleteHoliday = async (id: string) => {
    try {
      const { error } = await supabase.from('holidays').delete().eq('id', id);
      if (error) throw error;
      setHolidays(prev => prev.filter(h => h.id !== id));
      showToast('Holiday deleted successfully', 'success');
    } catch (err: any) {
      console.error('Delete holiday error:', err);
      showToast('Failed to delete holiday: ' + err.message, 'error');
    }
  };

  const addCoupon = async (coupon: Omit<Coupon, 'id' | 'createdAt' | 'timesUsed'>) => {
    try {
      const { data, error } = await supabase.from('coupons').insert({ ...coupon, timesUsed: 0 }).select().single();
      if (error) throw error;
      if (data) setCoupons(prev => [...prev, data]);
      showToast('Coupon created successfully', 'success');
    } catch (err: any) {
      console.error('Add coupon error:', err);
      showToast('Failed to add coupon: ' + err.message, 'error');
    }
  };

  const updateCoupon = async (id: string, updates: Partial<Coupon>) => {
    try {
      const { error } = await supabase.from('coupons').update(updates).eq('id', id);
      if (error) throw error;
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      showToast('Coupon updated successfully', 'success');
    } catch (err: any) {
      console.error('Update coupon error:', err);
      showToast('Failed to update coupon: ' + err.message, 'error');
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
      setCoupons(prev => prev.filter(c => c.id !== id));
      showToast('Coupon deleted successfully', 'success');
    } catch (err: any) {
      console.error('Delete coupon error:', err);
      showToast('Failed to delete coupon: ' + err.message, 'error');
    }
  };

  const validateCoupon = async (code: string, planId: string) => {
    const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase() && c.isActive);
    const plan = plans.find(p => p.id === planId);

    if (!coupon) return { valid: false, discount: 0, message: 'Invalid or inactive coupon code' };
    if (!plan) return { valid: false, discount: 0, message: 'Invalid plan' };

    // Check expiry
    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date(new Date().setHours(0, 0, 0, 0))) {
      return { valid: false, discount: 0, message: 'Coupon has expired' };
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.timesUsed >= coupon.usageLimit) {
      return { valid: false, discount: 0, message: 'Coupon usage limit reached' };
    }

    // Check branch
    if (coupon.branchId && coupon.branchId !== currentUser?.branchId) {
      return { valid: false, discount: 0, message: 'Coupon not valid for this branch' };
    }

    // Check min purchase
    if (coupon.minPurchase && plan.price < coupon.minPurchase) {
      return { valid: false, discount: 0, message: `Minimum purchase of ₹${coupon.minPurchase} required` };
    }

    let discount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discount = (plan.price * coupon.value) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.value;
    }

    return { valid: true, discount, message: 'Coupon applied successfully!' };
  };

  const deletePayroll = async (id: string) => {
    try {
      const { error } = await supabase.from('payroll').delete().eq('id', id);
      if (!error) {
        setPayroll(prev => prev.filter(p => p.id !== id));
        showToast('Payroll record discarded. It will now recalculate based on live data.');
      } else {
        console.error('Delete payroll error:', error);
        showToast('Failed to discard payroll record: ' + error.message, 'error');
      }
    } catch (err: any) {
      console.error('Network or logic error during payroll deletion:', err);
      showToast('Error: ' + (err.message || 'Check your internet connection'), 'error');
    }
  };

  const value: AppContextType = {
    currentUser,
    setCurrentUser,
    branches,
    users,
    plans,
    subscriptions,
    sales,
    attendance,
    bookings,
    feedback,
    communications,
    inventory,
    metrics,
    offers,
    classSchedules,
    expenses,
    payroll,
    holidays,
    coupons,
    walkIns,
    isGlobalLoading,
    setGlobalLoading,
    addBranch,
    updateBranch,
    addUser,
    updateUser,
    deleteUser,
    addPlan,
    updatePlan,
    addSubscription,
    updateSubscription,
    addSale,
    recordAttendance,
    updateAttendance,
    addBooking,
    updateBooking,
    addFeedback,
    updateFeedbackStatus,
    addInventory,
    updateInventory,
    deleteInventory,
    sellInventoryItem,
    addMetric,
    addOffer,
    updateOffer,
    deleteOffer,
    addClassTemplate,
    deleteClassTemplate,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
    generateUpcomingClasses,
    addClassSession,
    deleteClassSession,
    addExpense,
    deleteExpense,
    addPayroll,
    updatePayroll,
    generateTransactionCode,
    verifyTransactionCode,
    deletePayroll,
    enrollMember,
    purchaseSubscription,
    pauseMembership,
    resumeMembership,
    sendNotification,
    askGemini,
    toast,
    showToast,
    generateDeviceFingerprint,
    createSession,
    revokeSession,
    getSessions,
    importMembers,
    addWalkIn,
    updateWalkIn,
    selectedBranchId,
    setSelectedBranchId,
    isRowVisible,
    fetchData,
    fetchPaginatedMembers,
    isFetchingMembers,
    fetchPaginatedSales,
    isFetchingSales,
    markNotificationAsRead,
    markAllNotificationsAsRead
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-xl text-white font-bold shadow-2xl z-[9999] animate-[slideIn_0.3s_ease-out] ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          <div className="flex items-center gap-2">
            <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
            {toast.message}
          </div>
        </div>
      )}
      {isGlobalLoading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[10000] flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 animate-bounce">
            <i className="fas fa-dumbbell text-4xl text-blue-600 animate-spin"></i>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Cloud Data...</p>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
