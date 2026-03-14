
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  BRANCH_ADMIN = 'BRANCH_ADMIN',
  MANAGER = 'MANAGER',
  RECEPTIONIST = 'RECEPTIONIST',
  TRAINER = 'TRAINER',
  STAFF = 'STAFF',
  MEMBER = 'MEMBER',
  KIOSK = 'KIOSK'
}

export enum PlanType {
  GYM = 'GYM',
  PT = 'PT',
  GROUP = 'GROUP'
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
  PAUSED = 'PAUSED'
}

export enum CommType {
  EMAIL = 'EMAIL',
  SMS = 'SMS'
}

export interface Communication {
  id: string;
  userId: string | null;
  type: CommType;
  recipient: string;
  subject?: string;
  body: string;
  timestamp: string;
  status: 'DELIVERED' | 'FAILED';
  category: 'WELCOME' | 'PAYMENT' | 'REMINDER' | 'ANNOUNCEMENT';
  branchId: string; // Added branchId for tracking
  user?: { name: string; memberId?: string; role: string }; // Joined from users table
  isRead?: boolean;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  expiryDate: string;
  branchId: string | 'GLOBAL';
  isActive: boolean;
  ctaText?: string;
  couponCode?: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  message?: string;
  branchId: string;
  createdAt?: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  expiryDate?: string;
  usageLimit?: number;
  timesUsed: number;
  branchId: string | null; // null for GLOBAL
  isActive: boolean;
  createdAt?: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin?: string;
  gstPercentage?: number;
  gateWebhookUrl?: string;
  paymentProvider?: 'RAZORPAY' | 'STRIPE' | 'PAYTM';
  paymentApiKey?: string;
  paymentMerchantId?: string;
  emailProvider?: 'SENDGRID' | 'MAILGUN' | 'SMTP';
  emailApiKey?: string;
  emailFromAddress?: string;
  smsProvider?: 'TWILIO' | 'MSG91' | 'GUPSHUP';
  smsApiKey?: string;
  smsSenderId?: string;
  equipment?: string;
  latitude?: number;
  longitude?: number;
  geofenceRadius?: number;
  holidays?: string[]; // Array of ISO date strings 'YYYY-MM-DD' (Deprecated: use dedicated Holiday table)
  termsAndConditions?: string;
  isHidden?: boolean;
  settlementRate?: number; // Rate owed per cross-branch visit (₹ per session)
}

export interface Shift {
  start: string;
  end: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Individual authentication token
  role: UserRole;
  branchId: string | null;
  avatar?: string;
  memberId?: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
  hasAcceptedTerms?: boolean;
  shifts?: Shift[];
  weekOffs?: string[]; // Array of days e.g. ['Sunday']
  monthlySalary?: number;
  commissionPercentage?: number; // Base commission (Sessions for Trainers)
  salesCommissionPercentage?: number; // Specific commission for Sales (Gym/General)
  ptCommissionPercentage?: number; // Specific commission for PT Sales
  groupCommissionPercentage?: number; // Specific commission for Group Class Sales
  maxDevices?: number; // For multi-device restriction
  referralCode?: string;
  isActive?: boolean;
}

export interface Plan {
  id: string;
  name: string;
  type: PlanType;
  price: number;
  durationDays: number;
  branchId: string;
  isActive: boolean;
  isHidden?: boolean;
  isMultiBranch?: boolean;
  maxSessions?: number;
  sessionDurationMinutes?: number;
  groupCapacity?: number;
}

export interface Subscription {
  id: string;
  memberId: string | null;
  planId: string;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  branchId: string;
  trainerId?: string | null;
  pauseStartDate?: string;
  pauseAllowanceDays?: number;
  pausedDaysUsed?: number;
  member?: { name: string; avatar?: string; phone?: string; memberId?: string }; // Joined for dashboard
  saleId?: string;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  date: string;
  amount: number;
  discount?: number; // Added discount field
  memberId: string | null;
  planId?: string;
  itemId?: string;
  staffId: string | null;
  branchId: string;
  paymentMethod: 'CASH' | 'CARD' | 'ONLINE' | 'POS';
  trainerId?: string | null;
  transactionCode?: string; // For Cash/POS payments
  razorpayPaymentId?: string; // For Card/Online payments
  member?: { name: string; memberId?: string }; // Joined for logs
  createdAt?: string;
}

export interface Referral {
  id: string;
  referrerId: string | null;
  refereeId: string | null;
  planBoughtId: string;
  rewardDaysApplied: number;
  status: 'COMPLETED' | 'PENDING';
  createdAt: string;
}

export interface Attendance {
  id: string;
  userId: string | null;
  date: string;
  timeIn: string;
  timeOut?: string;
  branchId: string;
  type: 'MEMBER' | 'STAFF';
  notes?: string; // Added for manual overrides/remarks
  user?: { name: string; memberId?: string; role: string }; // Joined for logs
}

export interface Booking {
  id: string;
  memberId: string | null;
  trainerId?: string | null;
  type: PlanType.PT | PlanType.GROUP;
  date: string;
  timeSlot: string;
  branchId: string;
  status: 'BOOKED' | 'CANCELLED' | 'COMPLETED';
  member?: { name: string; memberId?: string }; // Joined for logs
}

export interface Feedback {
  id: string;
  memberId: string | null;
  branchId: string;
  type: 'SUGGESTION' | 'COMPLAINT';
  content: string;
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
  date: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'SUPPLEMENT' | 'GEAR' | 'BEVERAGE' | 'OTHER';
  price: number;
  stock: number;
  branchId: string;
}

export interface BodyMetric {
  id: string;
  memberId: string | null;
  date: string;
  weight: number;
  bmi?: number;
}

export interface ClassSession {
  id: string;
  templateId?: string;
  trainerId: string | null;
  date: string;
  timeSlot: string;
  title: string;
  capacity: number;
  branchId: string;
}

export interface ClassTemplate {
  id: string;
  title: string;
  trainerId: string | null;
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  timeSlot: string;
  capacity: number;
  branchId: string;
}

export interface Expense {
  id: string;
  branchId: string;
  category: 'RENT' | 'UTILITIES' | 'SALARY' | 'EQUIPMENT' | 'MARKETING' | 'OTHER';
  amount: number;
  date: string;
  description: string;
  recordedBy: string | null;
}

export interface WalkIn {
  id: string;
  name: string;
  phone: string;
  email?: string;
  purpose: 'MEMBERSHIP_INQUIRY' | 'TOUR' | 'DAY_PASS' | 'PT_CONSULTATION' | 'CLASS_INQUIRY' | 'OTHER';
  source: 'WALK_IN' | 'REFERRAL' | 'SOCIAL_MEDIA' | 'GOOGLE' | 'JUSTDIAL' | 'OTHER';
  status: 'NEW' | 'FOLLOW_UP' | 'CONVERTED' | 'NOT_INTERESTED';
  notes?: string;
  assignedTo?: string | null;
  followUpDate?: string;
  convertedToMemberId?: string | null;
  branchId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionCode {
  code: string;
  branchId: string;
  status: 'VALID' | 'USED';
  generatedBy: string | null;
  createdAt: string;
}

export interface ClassCompletionCode {
  id: string;
  bookingId: string;
  trainerId: string | null;
  memberId: string | null;
  code: string;
  status: 'VALID' | 'USED' | 'EXPIRED';
  classDate: string;
  classType: 'PT' | 'GROUP';
  branchId: string;
  createdAt: string;
  usedAt?: string;
}

export interface ActiveSession {
  id: string;
  userId: string | null;
  deviceFingerprint: string;
  deviceName: string; // e.g., "Chrome on Windows"
  browserInfo: string;
  ipAddress?: string;
  loginTime: string;
  lastActivity: string;
}

export interface Payroll {
  id: string;
  staffId: string | null;
  branchId: string;
  month: string;
  year: number;
  baseSalary: number;
  payableDays: number;
  deductions: number;
  commissionAmount: number;
  netSalary: number;
  status: 'GENERATED' | 'PAID';
  generatedAt: string;
  paidAt?: string;
  details?: {
    totalDays: number;
    presentDays: number;
    weekOffs: number;
    holidays: number;
    lateDays: number;
    halfDays: number;
    absentDays: number;
    penaltyDays: number;
    dailyRate: number;
  };
}
