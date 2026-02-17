import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Branch, Plan, Subscription, Sale, Attendance, Booking, Feedback, UserRole, SubscriptionStatus, Communication, CommType, InventoryItem, BodyMetric, Offer, ClassSession, Expense, ActiveSession } from './types';
import { MOCK_USERS, BRANCHES, MOCK_PLANS, MOCK_SUBSCRIPTIONS, MOCK_OFFERS, MOCK_ATTENDANCE, MOCK_SALES, MOCK_BOOKINGS } from './constants';
import { GoogleGenAI } from "@google/genai";
import { supabase } from './src/lib/supabase';

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
  settlementRate: number;
  setSettlementRate: (rate: number) => void;
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
  addSale: (sale: Sale) => Promise<void>;
  recordAttendance: (att: Attendance) => Promise<void>;
  updateAttendance: (id: string, updates: Partial<Attendance>) => Promise<void>;
  addBooking: (booking: Booking) => Promise<void>;
  addFeedback: (fb: Feedback) => Promise<void>;
  updateFeedbackStatus: (id: string, status: Feedback['status']) => Promise<void>;
  addInventory: (item: InventoryItem) => Promise<void>;
  updateInventory: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  sellInventoryItem: (itemId: string, memberId: string, quantity: number, paymentMethod: 'CASH' | 'POS' | 'CARD' | 'ONLINE', transactionCode?: string, razorpayPaymentId?: string) => Promise<void>;
  addMetric: (metric: BodyMetric) => Promise<void>;
  addOffer: (offer: Offer) => Promise<void>;
  deleteOffer: (id: string) => Promise<void>;
  addClassTemplate: (template: any) => Promise<void>;
  deleteClassTemplate: (id: string) => Promise<void>;
  generateUpcomingClasses: () => Promise<void>;
  addClassSession: (session: ClassSession) => Promise<void>;
  deleteClassSession: (id: string) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  generateTransactionCode: (targetBranchId?: string) => Promise<string>;
  verifyTransactionCode: (code: string) => Promise<boolean>;
  enrollMember: (userData: Partial<User>, planId: string, trainerId?: string, password?: string, discount?: number, paymentMethod?: 'CASH' | 'CARD' | 'ONLINE' | 'POS', startDate?: string) => Promise<void>;
  purchaseSubscription: (userId: string, planId: string, paymentMethod: 'CASH' | 'CARD' | 'ONLINE' | 'POS', trainerId?: string) => Promise<void>;
  sendNotification: (comm: Omit<Communication, 'id' | 'timestamp' | 'status'>) => Promise<void>;
  askGemini: (prompt: string, modelType?: 'flash' | 'pro') => Promise<string>;
  toast: { message: string; type: 'success' | 'error' } | null;
  showToast: (message: string, type?: 'success' | 'error') => void;
  // Session Management
  generateDeviceFingerprint: () => Promise<string>;
  createSession: (userId: string) => Promise<boolean>;
  revokeSession: (userId: string, fingerprint?: string) => Promise<void>;
  getSessions: (userId: string) => Promise<ActiveSession[]>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
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
  const [settlementRate, setSettlementRate] = useState<number>(250);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isGlobalLoading, setGlobalLoading] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchData = async () => {
    setGlobalLoading(true);
    try {
      const { data: bData } = await supabase.from('branches').select('*');
      if (bData && bData.length > 0) setBranches(bData);
      else {
        const { error } = await supabase.from('branches').insert(BRANCHES);
        if (!error) setBranches(BRANCHES);
      }

      const { data: uData } = await supabase.from('users').select('*');
      if (uData && uData.length > 0) setUsers(uData);
      else {
        const { error } = await supabase.from('users').insert(MOCK_USERS);
        if (!error) setUsers(MOCK_USERS);
      }

      const { data: pData } = await supabase.from('plans').select('*');
      if (pData && pData.length > 0) setPlans(pData);
      else {
        const { error } = await supabase.from('plans').insert(MOCK_PLANS);
        if (!error) setPlans(MOCK_PLANS);
      }

      const { data: sData } = await supabase.from('subscriptions').select('*');
      if (sData) setSubscriptions(sData);

      const { data: slData } = await supabase.from('sales').select('*');
      if (slData) setSales(slData);

      const { data: aData } = await supabase.from('attendance').select('*');
      if (aData) setAttendance(aData);

      const { data: bkData } = await supabase.from('bookings').select('*');
      if (bkData) setBookings(bkData);

      const { data: fData } = await supabase.from('feedback').select('*');
      if (fData) setFeedback(fData);

      const { data: cData } = await supabase.from('communications').select('*');
      if (cData) setCommunications(cData);

      const { data: iData } = await supabase.from('inventory').select('*');
      if (iData) setInventory(iData);

      const { data: mData } = await supabase.from('metrics').select('*');
      if (mData) setMetrics(mData);

      const { data: oData } = await supabase.from('offers').select('*');
      if (oData && oData.length > 0) setOffers(oData);
      else {
        const { error } = await supabase.from('offers').insert(MOCK_OFFERS);
        if (!error) setOffers(MOCK_OFFERS);
      }

      const { data: csData } = await supabase.from('class_schedules').select('*');
      if (csData) setClassSchedules(csData);

      const { data: exData } = await supabase.from('expenses').select('*');
      if (exData) setExpenses(exData);

    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Error connecting to database', 'error');
    } finally {
      setGlobalLoading(false);
    }
  };

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        supabase.from('sales').select('*').then(({ data }) => { if (data) setSales(data); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        supabase.from('expenses').select('*').then(({ data }) => { if (data) setExpenses(data); });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); }
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
    const year = new Date().getFullYear();
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
      console.error(error);
      showToast('Failed to add user', 'error');
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const { error } = await supabase.from('users').update(updates).eq('id', id);
    if (!error) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
      if (currentUser?.id === id) setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
      showToast('User updated');
    } else showToast('Failed to update user', 'error');
  };

  const deleteUser = async (id: string) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (!error) {
      setUsers(prev => prev.filter(u => u.id !== id));
      showToast('User deleted');
    } else showToast('Failed to delete user', 'error');
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
    } else showToast('Booking failed', 'error');
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
    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      invoiceNo: generateInvoiceNo(branchId),
      date: new Date().toISOString().split('T')[0],
      amount: saleAmount,
      memberId,
      itemId,
      staffId: currentUser?.id || 'pos',
      branchId,
      paymentMethod,
      transactionCode: (paymentMethod === 'CASH' || paymentMethod === 'POS') ? transactionCode : undefined,
      razorpayPaymentId: (paymentMethod === 'CARD' || paymentMethod === 'ONLINE') ? razorpayPaymentId : undefined
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
    setSales(prev => [...prev, newSale]);
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

  const deleteOffer = async (id: string) => {
    const { error } = await supabase.from('offers').delete().eq('id', id);
    if (!error) setOffers(prev => prev.filter(o => o.id !== id));
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
    const today = new Date();
    const weeksToGenerate = 4;

    // Fetch existing sessions to avoid duplicates (simple check based on date/time/trainer)
    // In a production app, use a more robust upsert logic or ID generation
    const { data: existingSessions } = await supabase.from('class_schedules').select('*').gte('date', today.toISOString().split('T')[0]);
    const existingKeys = new Set(existingSessions?.map(s => `${s.trainerId}-${s.date}-${s.timeSlot}`));

    for (let i = 0; i < weeksToGenerate * 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
      const dateString = date.toISOString().split('T')[0];

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

  const generateTransactionCode = async (targetBranchId?: string): Promise<string> => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const branchToUse = targetBranchId || currentUser?.branchId || branches[0].id;

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

  const sendNotification = async (comm: Omit<Communication, 'id' | 'timestamp' | 'status'>) => {
    const user = users.find(u => u.id === comm.userId);
    const bId = comm.branchId || user?.branchId || branches[0]?.id;

    const newComm: Communication = {
      ...comm,
      id: `comm-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      status: 'DELIVERED',
      branchId: bId
    };

    const { error } = await supabase.from('communications').insert(newComm);
    if (!error) setCommunications(prev => [newComm, ...prev]);
  };

  const enrollMember = async (userData: Partial<User>, planId: string, trainerId?: string, password?: string, discount: number = 0, paymentMethod: 'CASH' | 'CARD' | 'ONLINE' | 'POS' = 'ONLINE', startDate?: string) => {
    setGlobalLoading(true);
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      setGlobalLoading(false);
      return;
    }
    const branchId = userData.branchId || currentUser?.branchId || branches[0].id;
    const newUserId = `u-${Date.now()}`;
    const membershipStartDate = startDate || new Date().toISOString().split('T')[0];
    const newUser: User = {
      id: newUserId,
      name: userData.name || 'New Member',
      email: userData.email || '',
      password: password,
      role: UserRole.MEMBER,
      branchId,
      memberId: `IF-IND-${Math.floor(1000 + Math.random() * 9000)}`,
      avatar: userData.avatar || `https://i.pravatar.cc/150?u=${newUserId}`,
      emergencyContact: userData.emergencyContact,
      address: userData.address,
      phone: userData.phone
    };
    const newSub: Subscription = {
      id: `s-${Date.now()}`,
      memberId: newUserId,
      planId: planId,
      startDate: membershipStartDate,
      endDate: new Date(new Date(membershipStartDate).getTime() + plan.durationDays * 86400000).toISOString().split('T')[0],
      status: SubscriptionStatus.ACTIVE,
      branchId,
      trainerId
    };
    const finalAmount = Math.max(0, plan.price - discount);
    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      invoiceNo: generateInvoiceNo(branchId),
      date: new Date().toISOString().split('T')[0],
      amount: finalAmount,
      discount,
      memberId: newUserId,
      planId: planId,
      staffId: currentUser?.id || 'admin',
      branchId,
      paymentMethod: 'ONLINE',
      trainerId
    };

    try {
      await supabase.from('users').insert(newUser);
      await supabase.from('subscriptions').insert(newSub);
      await supabase.from('sales').insert(newSale);

      setUsers(prev => [...prev, newUser]);
      setSubscriptions(prev => [...prev, newSub]);
      setSales(prev => [...prev, newSale]);

      await sendNotification({
        userId: newUserId,
        type: CommType.SMS,
        recipient: userData.phone || userData.email || 'N/A',
        body: `Welcome to IronFlow! Your athlete ID is ${newUser.memberId}. Login with your chosen token. Valid until ${newSub.endDate}.`,
        category: 'WELCOME',
        branchId: branchId
      });

      showToast(`Member enrolled! Invoice: ${newSale.invoiceNo}`);
    } catch (e) {
      console.error(e);
      showToast('Enrollment failed', 'error');
    } finally {
      setGlobalLoading(false);
    }
  };

  const purchaseSubscription = async (userId: string, planId: string, paymentMethod: 'CASH' | 'CARD' | 'ONLINE', trainerId?: string) => {
    setGlobalLoading(true);
    const plan = plans.find(p => p.id === planId);
    const user = users.find(u => u.id === userId);
    if (!plan || !user) {
      setGlobalLoading(false);
      return;
    }
    const branchId = user.branchId!;
    const newSub: Subscription = {
      id: `s-${Date.now()}`,
      memberId: userId,
      planId: planId,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + plan.durationDays * 86400000).toISOString().split('T')[0],
      status: SubscriptionStatus.ACTIVE,
      branchId,
      trainerId
    };
    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      invoiceNo: generateInvoiceNo(branchId),
      date: new Date().toISOString().split('T')[0],
      amount: plan.price,
      memberId: userId,
      planId: planId,
      staffId: currentUser?.id || 'self',
      branchId,
      paymentMethod,
      trainerId
    };

    try {
      await supabase.from('subscriptions').insert(newSub);
      await supabase.from('sales').insert(newSale);

      setSubscriptions(prev => [...prev, newSub]);
      setSales(prev => [...prev, newSale]);

      await sendNotification({
        userId: userId,
        type: CommType.SMS,
        recipient: user.phone || user.email || 'N/A',
        body: `Payment successful! Your ${plan.name} is active until ${newSub.endDate}. Ref: ${newSale.invoiceNo}`,
        category: 'PAYMENT',
        branchId: branchId
      });

      showToast(`Payment received! Invoice: ${newSale.invoiceNo}`);
    } catch (e) {
      console.error(e);
      showToast('Transaction failed', 'error');
    } finally {
      setGlobalLoading(false);
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

  const createSession = async (userId: string): Promise<boolean> => {
    try {
      const user = users.find(u => u.id === userId);
      // Super Admin and Branch Admin have unlimited devices (or high limit)
      // Check specific user limit or role-based default
      const limit = user?.maxDevices ?? (user?.role === UserRole.MEMBER || user?.role === UserRole.TRAINER ? 1 : 999);

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
        return true;
      }

      // Check limit
      if (currentSessions.length >= limit) {
        return false; // Limit exceeded
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
        return true;
      }

      return true;
    } catch (e) {
      console.error('Session error:', e);
      return false;
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

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser, branches, users, plans, subscriptions, sales,
      attendance, bookings, feedback, communications, inventory, metrics, offers,
      classSchedules, addClassTemplate, deleteClassTemplate, generateUpcomingClasses, addClassSession, deleteClassSession,
      expenses, addExpense, deleteExpense,
      settlementRate, setSettlementRate, isGlobalLoading, setGlobalLoading,
      addBranch, updateBranch, addUser, updateUser, deleteUser, addPlan, updatePlan,
      addSubscription, addSale, recordAttendance, updateAttendance, addBooking, addFeedback, updateFeedbackStatus,
      addInventory, updateInventory, sellInventoryItem, addMetric, addOffer, deleteOffer, enrollMember, purchaseSubscription, generateTransactionCode, verifyTransactionCode, sendNotification, askGemini, toast, showToast,
      generateDeviceFingerprint, createSession, revokeSession, getSessions
    }}>
      {children}
      {toast && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl z-[9999] flex items-center gap-3 animate-[slideLeft_0.3s_ease-out] text-white font-bold ${toast.type === 'error' ? 'bg-red-600' : 'bg-slate-900'}`}>
          <i className={`fas ${toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'} text-xl`}></i>
          {toast.message}
        </div>
      )}
      {isGlobalLoading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[10000] flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 animate-bounce">
            <i className="fas fa-dumbbell text-4xl text-blue-600 animate-spin"></i>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing with IronFlow Cloud...</p>
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
