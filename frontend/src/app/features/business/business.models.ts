/**
 * Business Finance Module - TypeScript Models
 */

// ========== Enums ==========

export enum BusinessRole {
  OWNER = 'OWNER',
  CO_OWNER = 'CO_OWNER',
  ADMIN = 'ADMIN',
  ACCOUNTANT = 'ACCOUNTANT',
  EMPLOYEE = 'EMPLOYEE',
}

export enum CategoryType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
}

export enum SettlementType {
  BUSINESS_TO_MEMBER = 'BUSINESS_TO_MEMBER',
  MEMBER_TO_BUSINESS = 'MEMBER_TO_BUSINESS',
}

export enum InviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

// ========== Interfaces ==========

export interface Business {
  id: string;
  name: string;
  description?: string;
  currency: string;
  timezone: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;

  // From membership context
  role?: BusinessRole;
  membershipId?: string;
  permissions?: BusinessPermissions;

  // Counts
  _count?: {
    memberships: number;
    expenses: number;
    incomes: number;
  };
}

export interface BusinessPermissions {
  canUpdateBusiness: boolean;
  canArchiveBusiness: boolean;
  canDeleteBusiness: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canChangeRoles: boolean;
  canChangePermissions: boolean;
  canManageCategories: boolean;
  canCreateExpense: boolean;
  canViewAllExpenses: boolean;
  canViewOwnExpenses: boolean;
  canEditAnyExpense: boolean;
  canDeleteExpense: boolean;
  canCreateIncome: boolean;
  canViewAllIncomes: boolean;
  canViewOwnIncomes: boolean;
  canEditAnyIncome: boolean;
  canDeleteIncome: boolean;
  canCreateSettlement: boolean;
  canViewSettlements: boolean;
  canViewFullAnalytics: boolean;
  canViewOwnAnalytics: boolean;
  canExportData: boolean;
  canViewAuditLog: boolean;
  canViewSalaryInfo: boolean;
}

export interface BusinessMembership {
  id: string;
  businessId: string;
  userId: string;
  role: BusinessRole;
  permissions?: Partial<BusinessPermissions>;
  isActive: boolean;
  invitedById?: string;
  createdAt: string;
  updatedAt: string;

  user: {
    id: string;
    name: string;
    email: string;
  };
  invitedBy?: {
    id: string;
    name: string;
  };
}

export interface BusinessCategory {
  id: string;
  businessId: string;
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
  isSalary: boolean;
  isDefault: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessExpense {
  id: string;
  businessId: string;
  categoryId: string;
  amount: string; // Decimal as string
  description?: string;
  note?: string;
  transactionDate: string;
  paidByMemberId?: string;
  counterparty?: string;
  tags: string[];
  isDeleted: boolean;
  createdById: string;
  updatedById?: string;
  createdAt: string;
  updatedAt: string;

  category: BusinessCategory;
  paidByMember?: BusinessMembership & {
    user: { id: string; name: string };
  };
  attachments: BusinessAttachment[];
  createdBy: { id: string; name: string };
  updatedBy?: { id: string; name: string };
}

export interface BusinessIncome {
  id: string;
  businessId: string;
  categoryId: string;
  amount: string;
  description?: string;
  note?: string;
  transactionDate: string;
  receivedByMemberId?: string;
  counterparty?: string;
  tags: string[];
  isDeleted: boolean;
  createdById: string;
  updatedById?: string;
  createdAt: string;
  updatedAt: string;

  category: BusinessCategory;
  receivedByMember?: BusinessMembership & {
    user: { id: string; name: string };
  };
  attachments: BusinessAttachment[];
  createdBy: { id: string; name: string };
  updatedBy?: { id: string; name: string };
}

export interface BusinessAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  createdAt: string;
}

export interface BusinessSettlement {
  id: string;
  businessId: string;
  memberId: string;
  amount: string;
  settlementType: SettlementType;
  note?: string;
  settlementDate: string;
  createdById: string;
  createdAt: string;

  member: BusinessMembership & {
    user: { id: string; name: string };
  };
  createdBy: { id: string; name: string };
  attachments: BusinessAttachment[];
}

export interface BusinessInvite {
  id: string;
  businessId: string;
  email?: string;
  token: string;
  assignedRole: BusinessRole;
  expiresAt: string;
  isRevoked: boolean;
  isSingleUse: boolean;
  usedCount: number;
  status: InviteStatus;
  acceptedAt?: string;
  acceptedByUserId?: string;
  createdById: string;
  createdAt: string;

  business: { id: string; name: string };
  createdBy: { name: string; email: string };
  inviteLink?: string;
}

export interface MemberBalance {
  memberId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  balance: string;
  totalPaidOutOfPocket: string;
  totalReceivedPersonally: string;
  totalSettlementsReceived: string;
  totalSettlementsPaid: string;
}

export interface LedgerSummary {
  businessId: string;
  memberBalances: MemberBalance[];
  totalOwedToMembers: string;
  totalOwedByMembers: string;
  netBalance: string;
}

// ========== Analytics ==========

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface BusinessKPIs {
  totalRevenue: string;
  totalExpenses: string;
  netProfit: string;
  transactionCount: number;
  expenseCount: number;
  incomeCount: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  categoryColor?: string;
  total: string;
  count: number;
  percentage: number;
}

export interface AttributionBreakdown {
  type: 'business' | 'member';
  memberId?: string;
  memberName?: string;
  total: string;
  count: number;
  percentage: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  revenue: string;
  expenses: string;
  netProfit: string;
}

export interface BusinessAnalytics {
  businessId: string;
  dateRange: DateRange;
  kpis: BusinessKPIs;
  expensesByCategory: CategoryBreakdown[];
  incomesByCategory: CategoryBreakdown[];
  expensesByAttribution: AttributionBreakdown[];
  incomesByAttribution: AttributionBreakdown[];
  timeSeries: TimeSeriesDataPoint[];
  memberBalances: MemberBalance[];
}

// ========== Audit Log ==========

export interface BusinessAuditLog {
  id: string;
  businessId: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, { oldValue: any; newValue: any }>;
  metadata?: Record<string, any>;
  performedById: string;
  createdAt: string;

  performedBy: {
    id: string;
    name: string;
    email: string;
  };
}

// ========== Request/Response Types ==========

export interface CreateBusinessRequest {
  name: string;
  description?: string;
  currency?: string;
  timezone?: string;
}

export interface CreateExpenseRequest {
  categoryId: string;
  amount: number | string;
  description?: string;
  note?: string;
  transactionDate: string;
  paidByMemberId?: string | null;
  counterparty?: string;
  tags?: string[];
}

export interface CreateIncomeRequest {
  categoryId: string;
  amount: number | string;
  description?: string;
  note?: string;
  transactionDate: string;
  receivedByMemberId?: string | null;
  counterparty?: string;
  tags?: string[];
}

export interface CreateSettlementRequest {
  memberId: string;
  settlementType: SettlementType;
  amount: number | string;
  note?: string;
  settlementDate: string;
}

export interface CreateInviteRequest {
  email?: string;
  role?: BusinessRole;
  expiresInDays?: number;
  isSingleUse?: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
  isSalary?: boolean;
  isDefault?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ExpensesResponse {
  expenses: BusinessExpense[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface IncomesResponse {
  incomes: BusinessIncome[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface SettlementsResponse {
  settlements: BusinessSettlement[];
  total: number;
  limit: number;
  offset: number;
}

// ========== Helper Functions ==========

export function getRoleDisplayName(role: BusinessRole): string {
  const names: Record<BusinessRole, string> = {
    [BusinessRole.OWNER]: 'Owner',
    [BusinessRole.CO_OWNER]: 'Co-Owner',
    [BusinessRole.ADMIN]: 'Admin',
    [BusinessRole.ACCOUNTANT]: 'Accountant',
    [BusinessRole.EMPLOYEE]: 'Employee',
  };
  return names[role] || role;
}

export function getSettlementTypeDisplayName(type: SettlementType): string {
  return type === SettlementType.BUSINESS_TO_MEMBER
    ? 'Business → Member (Reimbursement)'
    : 'Member → Business (Repayment)';
}

export function parseDecimal(value: string | number): number {
  return typeof value === 'string' ? parseFloat(value) : value;
}

export function formatCurrency(amount: string | number, currency: string = 'USD'): string {
  const num = parseDecimal(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(num);
}
