/**
 * Business Analytics Service
 * Provides aggregated analytics for business finance tracking
 */

import { PrismaClient, BusinessRole } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { getBusinessLedgerSummary, MemberBalance } from './business-ledger.service.js';

const prisma = new PrismaClient();

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface KPIs {
  totalRevenue: Decimal;
  totalExpenses: Decimal;
  netProfit: Decimal;
  transactionCount: number;
  expenseCount: number;
  incomeCount: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  total: Decimal;
  count: number;
  percentage: number;
}

export interface AttributionBreakdown {
  type: 'business' | 'member';
  memberId?: string;
  memberName?: string;
  total: Decimal;
  count: number;
  percentage: number;
}

export interface TimeSeriesDataPoint {
  date: string; // ISO date string (YYYY-MM-DD)
  revenue: Decimal;
  expenses: Decimal;
  netProfit: Decimal;
}

export interface BusinessAnalytics {
  businessId: string;
  dateRange: DateRange;
  kpis: KPIs;
  expensesByCategory: CategoryBreakdown[];
  incomesByCategory: CategoryBreakdown[];
  expensesByAttribution: AttributionBreakdown[];
  incomesByAttribution: AttributionBreakdown[];
  timeSeries: TimeSeriesDataPoint[];
  memberBalances: MemberBalance[];
}

/**
 * Get KPIs for a business in a date range
 */
export async function getBusinessKPIs(
  businessId: string,
  dateRange: DateRange
): Promise<KPIs> {
  const [expenseResult, incomeResult, expenseCount, incomeCount] = await Promise.all([
    prisma.businessExpense.aggregate({
      where: {
        businessId,
        isDeleted: false,
        transactionDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      _sum: { amount: true },
    }),
    prisma.businessIncome.aggregate({
      where: {
        businessId,
        isDeleted: false,
        transactionDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      _sum: { amount: true },
    }),
    prisma.businessExpense.count({
      where: {
        businessId,
        isDeleted: false,
        transactionDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
    }),
    prisma.businessIncome.count({
      where: {
        businessId,
        isDeleted: false,
        transactionDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
    }),
  ]);

  const totalExpenses = expenseResult._sum.amount ?? new Decimal(0);
  const totalRevenue = incomeResult._sum.amount ?? new Decimal(0);
  const netProfit = totalRevenue.minus(totalExpenses);

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    transactionCount: expenseCount + incomeCount,
    expenseCount,
    incomeCount,
  };
}

/**
 * Get expense breakdown by category
 */
export async function getExpensesByCategory(
  businessId: string,
  dateRange: DateRange
): Promise<CategoryBreakdown[]> {
  const expenses = await prisma.businessExpense.groupBy({
    by: ['categoryId'],
    where: {
      businessId,
      isDeleted: false,
      transactionDate: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
    },
    _sum: { amount: true },
    _count: true,
  });

  // Get category details
  const categoryIds = expenses.map(e => e.categoryId);
  const categories = await prisma.businessCategory.findMany({
    where: { id: { in: categoryIds } },
  });
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  // Calculate total for percentages
  const total = expenses.reduce(
    (sum, e) => sum.plus(e._sum.amount ?? new Decimal(0)),
    new Decimal(0)
  );

  return expenses.map(e => {
    const category = categoryMap.get(e.categoryId);
    const amount = e._sum.amount ?? new Decimal(0);
    return {
      categoryId: e.categoryId,
      categoryName: category?.name ?? 'Unknown',
      categoryColor: category?.color ?? null,
      total: amount,
      count: e._count,
      percentage: total.isZero() ? 0 : amount.div(total).mul(100).toNumber(),
    };
  }).sort((a, b) => b.total.minus(a.total).toNumber());
}

/**
 * Get income breakdown by category
 */
export async function getIncomesByCategory(
  businessId: string,
  dateRange: DateRange
): Promise<CategoryBreakdown[]> {
  const incomes = await prisma.businessIncome.groupBy({
    by: ['categoryId'],
    where: {
      businessId,
      isDeleted: false,
      transactionDate: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
    },
    _sum: { amount: true },
    _count: true,
  });

  // Get category details
  const categoryIds = incomes.map(e => e.categoryId);
  const categories = await prisma.businessCategory.findMany({
    where: { id: { in: categoryIds } },
  });
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  // Calculate total for percentages
  const total = incomes.reduce(
    (sum, e) => sum.plus(e._sum.amount ?? new Decimal(0)),
    new Decimal(0)
  );

  return incomes.map(e => {
    const category = categoryMap.get(e.categoryId);
    const amount = e._sum.amount ?? new Decimal(0);
    return {
      categoryId: e.categoryId,
      categoryName: category?.name ?? 'Unknown',
      categoryColor: category?.color ?? null,
      total: amount,
      count: e._count,
      percentage: total.isZero() ? 0 : amount.div(total).mul(100).toNumber(),
    };
  }).sort((a, b) => b.total.minus(a.total).toNumber());
}

/**
 * Get expense breakdown by attribution (business vs members)
 */
export async function getExpensesByAttribution(
  businessId: string,
  dateRange: DateRange
): Promise<AttributionBreakdown[]> {
  const [businessPaid, memberPaid] = await Promise.all([
    // Business budget
    prisma.businessExpense.aggregate({
      where: {
        businessId,
        isDeleted: false,
        paidByMemberId: null,
        transactionDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      _sum: { amount: true },
      _count: true,
    }),
    // Member out-of-pocket - grouped by member
    prisma.businessExpense.groupBy({
      by: ['paidByMemberId'],
      where: {
        businessId,
        isDeleted: false,
        paidByMemberId: { not: null },
        transactionDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  // Get member details
  const memberIds = memberPaid.map(m => m.paidByMemberId!);
  const memberships = await prisma.businessMembership.findMany({
    where: { id: { in: memberIds } },
    include: { user: { select: { name: true } } },
  });
  const memberMap = new Map(memberships.map(m => [m.id, m]));

  const results: AttributionBreakdown[] = [];
  let total = (businessPaid._sum.amount ?? new Decimal(0));

  // Add business attribution
  results.push({
    type: 'business',
    total: businessPaid._sum.amount ?? new Decimal(0),
    count: businessPaid._count,
    percentage: 0, // Will calculate after total
  });

  // Add member attributions
  for (const m of memberPaid) {
    const member = memberMap.get(m.paidByMemberId!);
    const amount = m._sum.amount ?? new Decimal(0);
    total = total.plus(amount);
    results.push({
      type: 'member',
      memberId: m.paidByMemberId!,
      memberName: member?.user.name ?? 'Unknown',
      total: amount,
      count: m._count,
      percentage: 0,
    });
  }

  // Calculate percentages
  for (const r of results) {
    r.percentage = total.isZero() ? 0 : r.total.div(total).mul(100).toNumber();
  }

  return results.sort((a, b) => b.total.minus(a.total).toNumber());
}

/**
 * Get time series data for revenue, expenses, and profit
 */
export async function getTimeSeries(
  businessId: string,
  dateRange: DateRange,
  groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<TimeSeriesDataPoint[]> {
  // Get all transactions in date range
  const [expenses, incomes] = await Promise.all([
    prisma.businessExpense.findMany({
      where: {
        businessId,
        isDeleted: false,
        transactionDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      select: { transactionDate: true, amount: true },
    }),
    prisma.businessIncome.findMany({
      where: {
        businessId,
        isDeleted: false,
        transactionDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      select: { transactionDate: true, amount: true },
    }),
  ]);

  // Group by date
  const dataByDate = new Map<string, { revenue: Decimal; expenses: Decimal }>();

  // Helper to get group key based on groupBy
  const getGroupKey = (date: Date): string => {
    switch (groupBy) {
      case 'day':
        return date.toISOString().split('T')[0];
      case 'week': {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
        return d.toISOString().split('T')[0];
      }
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      default:
        return date.toISOString().split('T')[0];
    }
  };

  // Process expenses
  for (const expense of expenses) {
    const key = getGroupKey(expense.transactionDate);
    const existing = dataByDate.get(key) ?? { revenue: new Decimal(0), expenses: new Decimal(0) };
    existing.expenses = existing.expenses.plus(expense.amount);
    dataByDate.set(key, existing);
  }

  // Process incomes
  for (const income of incomes) {
    const key = getGroupKey(income.transactionDate);
    const existing = dataByDate.get(key) ?? { revenue: new Decimal(0), expenses: new Decimal(0) };
    existing.revenue = existing.revenue.plus(income.amount);
    dataByDate.set(key, existing);
  }

  // Convert to sorted array
  const result: TimeSeriesDataPoint[] = [];
  const sortedKeys = Array.from(dataByDate.keys()).sort();

  for (const key of sortedKeys) {
    const data = dataByDate.get(key)!;
    result.push({
      date: key,
      revenue: data.revenue,
      expenses: data.expenses,
      netProfit: data.revenue.minus(data.expenses),
    });
  }

  return result;
}

/**
 * Get complete analytics for a business
 */
export async function getBusinessAnalytics(
  businessId: string,
  dateRange: DateRange,
  timeSeriesGroupBy: 'day' | 'week' | 'month' = 'day'
): Promise<BusinessAnalytics> {
  const [
    kpis,
    expensesByCategory,
    incomesByCategory,
    expensesByAttribution,
    timeSeries,
    ledgerSummary,
  ] = await Promise.all([
    getBusinessKPIs(businessId, dateRange),
    getExpensesByCategory(businessId, dateRange),
    getIncomesByCategory(businessId, dateRange),
    getExpensesByAttribution(businessId, dateRange),
    getTimeSeries(businessId, dateRange, timeSeriesGroupBy),
    getBusinessLedgerSummary(businessId),
  ]);

  // Income by attribution
  const incomesByAttribution = await getIncomesByAttribution(businessId, dateRange);

  return {
    businessId,
    dateRange,
    kpis,
    expensesByCategory,
    incomesByCategory,
    expensesByAttribution,
    incomesByAttribution,
    timeSeries,
    memberBalances: ledgerSummary.memberBalances,
  };
}

/**
 * Get income breakdown by attribution
 */
async function getIncomesByAttribution(
  businessId: string,
  dateRange: DateRange
): Promise<AttributionBreakdown[]> {
  const [businessReceived, memberReceived] = await Promise.all([
    // Business direct
    prisma.businessIncome.aggregate({
      where: {
        businessId,
        isDeleted: false,
        receivedByMemberId: null,
        transactionDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      _sum: { amount: true },
      _count: true,
    }),
    // Member received - grouped by member
    prisma.businessIncome.groupBy({
      by: ['receivedByMemberId'],
      where: {
        businessId,
        isDeleted: false,
        receivedByMemberId: { not: null },
        transactionDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  // Get member details
  const memberIds = memberReceived.map(m => m.receivedByMemberId!);
  const memberships = await prisma.businessMembership.findMany({
    where: { id: { in: memberIds } },
    include: { user: { select: { name: true } } },
  });
  const memberMap = new Map(memberships.map(m => [m.id, m]));

  const results: AttributionBreakdown[] = [];
  let total = (businessReceived._sum.amount ?? new Decimal(0));

  // Add business attribution
  results.push({
    type: 'business',
    total: businessReceived._sum.amount ?? new Decimal(0),
    count: businessReceived._count,
    percentage: 0,
  });

  // Add member attributions
  for (const m of memberReceived) {
    const member = memberMap.get(m.receivedByMemberId!);
    const amount = m._sum.amount ?? new Decimal(0);
    total = total.plus(amount);
    results.push({
      type: 'member',
      memberId: m.receivedByMemberId!,
      memberName: member?.user.name ?? 'Unknown',
      total: amount,
      count: m._count,
      percentage: 0,
    });
  }

  // Calculate percentages
  for (const r of results) {
    r.percentage = total.isZero() ? 0 : r.total.div(total).mul(100).toNumber();
  }

  return results.sort((a, b) => b.total.minus(a.total).toNumber());
}

/**
 * Get user-level analytics across all businesses they belong to
 */
export async function getUserCrossBusinessAnalytics(
  userId: string,
  dateRange: DateRange
): Promise<{
  businesses: Array<{
    businessId: string;
    businessName: string;
    role: BusinessRole;
    canViewFullAnalytics: boolean;
    kpis?: KPIs;
  }>;
  userContributions: {
    totalPaidOutOfPocket: Decimal;
    totalReceivedPersonally: Decimal;
    totalOwedByBusinesses: Decimal;
    totalOwedToBusinesses: Decimal;
  };
}> {
  // Get all memberships for user
  const memberships = await prisma.businessMembership.findMany({
    where: { userId, isActive: true },
    include: {
      business: { select: { id: true, name: true, isArchived: true } },
    },
  });

  const businesses: Array<{
    businessId: string;
    businessName: string;
    role: BusinessRole;
    canViewFullAnalytics: boolean;
    kpis?: KPIs;
  }> = [];

  let totalPaidOutOfPocket = new Decimal(0);
  let totalReceivedPersonally = new Decimal(0);
  let totalOwedByBusinesses = new Decimal(0);
  let totalOwedToBusinesses = new Decimal(0);

  for (const membership of memberships) {
    if (membership.business.isArchived) continue;

    // Check if user can view full analytics
    const fullAnalyticsRoles: BusinessRole[] = [
      BusinessRole.OWNER,
      BusinessRole.CO_OWNER,
      BusinessRole.ADMIN,
      BusinessRole.ACCOUNTANT,
    ];
    const canViewFullAnalytics = fullAnalyticsRoles.includes(membership.role);

    let kpis: KPIs | undefined;
    if (canViewFullAnalytics) {
      kpis = await getBusinessKPIs(membership.businessId, dateRange);
    }

    businesses.push({
      businessId: membership.businessId,
      businessName: membership.business.name,
      role: membership.role,
      canViewFullAnalytics,
      kpis,
    });

    // Get user's personal contributions in this business
    const [expenses, incomes, balance] = await Promise.all([
      prisma.businessExpense.aggregate({
        where: {
          businessId: membership.businessId,
          paidByMemberId: membership.id,
          isDeleted: false,
          transactionDate: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
        },
        _sum: { amount: true },
      }),
      prisma.businessIncome.aggregate({
        where: {
          businessId: membership.businessId,
          receivedByMemberId: membership.id,
          isDeleted: false,
          transactionDate: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
        },
        _sum: { amount: true },
      }),
      // Import from ledger service
      (async () => {
        const { calculateMemberBalance } = await import('./business-ledger.service.js');
        return calculateMemberBalance(membership.businessId, membership.id);
      })(),
    ]);

    totalPaidOutOfPocket = totalPaidOutOfPocket.plus(expenses._sum.amount ?? new Decimal(0));
    totalReceivedPersonally = totalReceivedPersonally.plus(incomes._sum.amount ?? new Decimal(0));

    if (balance) {
      if (balance.balance.greaterThan(0)) {
        totalOwedByBusinesses = totalOwedByBusinesses.plus(balance.balance);
      } else if (balance.balance.lessThan(0)) {
        totalOwedToBusinesses = totalOwedToBusinesses.plus(balance.balance.abs());
      }
    }
  }

  return {
    businesses,
    userContributions: {
      totalPaidOutOfPocket,
      totalReceivedPersonally,
      totalOwedByBusinesses,
      totalOwedToBusinesses,
    },
  };
}
