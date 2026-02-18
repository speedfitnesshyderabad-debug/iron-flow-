
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  BRANCH_ADMIN = 'BRANCH_ADMIN',
  MANAGER = 'MANAGER',
  RECEPTIONIST = 'RECEPTIONIST',
  TRAINER = 'TRAINER',
  STAFF = 'STAFF',
  MEMBER = 'MEMBER'
}

export enum PlanType {
  GYM = 'GYM',
  PT = 'PT',
  GROUP = 'GROUP'
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING'
}

export enum CommType {
  EMAIL = 'EMAIL',
  SMS = 'SMS'
}

export interface Communication {
  id: string;
  userId: string;
  type: CommType;
  recipient: string;
  subject?: string;
  body: string;
  timestamp: string;
  status: 'DELIVERED' | 'FAILED';
  category: 'WELCOME' | 'PAYMENT' | 'REMINDER' | 'ANNOUNCEMENT';
  branchId: string; // Added branchId for tracking
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
  holidays?: string[]; // Array of ISO date strings 'YYYY-MM-DD'
  termsAndConditions?: string;
  isHidden?: boolean;
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
  hourlyRate?: number;
  commissionPercentage?: number; // Base commission (Sessions for Trainers)
  salesCommissionPercentage?: number; // Specific commission for Sales (Gym/General)
  ptCommissionPercentage?: number; // Specific commission for PT Sales
  groupCommissionPercentage?: number; // Specific commission for Group Class Sales
  maxDevices?: number; // For multi-device restriction
}

export interface Plan {
  id: string;
  name: string;
  type: PlanType;
  price: number;
  durationDays: number;
  branchId: string;
  isActive: boolean;
  isMultiBranch?: boolean;
  maxSessions?: number;
  sessionDurationMinutes?: number;
  groupCapacity?: number;
}

export interface Subscription {
  id: string;
  memberId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  branchId: string;
  trainerId?: string;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  date: string;
  amount: number;
  discount?: number; // Added discount field
  memberId: string;
  planId?: string;
  itemId?: string;
  staffId: string;
  branchId: string;
  paymentMethod: 'CASH' | 'CARD' | 'ONLINE' | 'POS';
  trainerId?: string;
  transactionCode?: string; // For Cash/POS payments
  razorpayPaymentId?: string; // For Card/Online payments
}

export interface Attendance {
  id: string;
  userId: string;
  date: string;
  timeIn: string;
  timeOut?: string;
  branchId: string;
  type: 'MEMBER' | 'STAFF';
}

export interface Booking {
  id: string;
  memberId: string;
  trainerId?: string;
  type: PlanType.PT | PlanType.GROUP;
  date: string;
  timeSlot: string;
  branchId: string;
  status: 'BOOKED' | 'CANCELLED' | 'COMPLETED';
}

export interface Feedback {
  id: string;
  memberId: string;
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
  memberId: string;
  date: string;
  weight: number;
  bmi?: number;
}

export interface ClassSession {
  id: string;
  templateId?: string;
  trainerId: string;
  date: string;
  timeSlot: string;
  title: string;
  capacity: number;
  branchId: string;
}

export interface ClassTemplate {
  id: string;
  title: string;
  trainerId: string;
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
  recordedBy: string;
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
  assignedTo?: string;
  followUpDate?: string;
  convertedToMemberId?: string;
  branchId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionCode {
  code: string;
  branchId: string;
  status: 'VALID' | 'USED';
  generatedBy: string;
  createdAt: string;
}

export interface ClassCompletionCode {
  id: string;
  bookingId: string;
  trainerId: string;
  memberId: string;
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
  userId: string;
  deviceFingerprint: string;
  deviceName: string; // e.g., "Chrome on Windows"
  browserInfo: string;
  ipAddress?: string;
  loginTime: string;
  lastActivity: string;
}
