/**
 * Business Ledger Service
 * Handles balance calculations and debt tracking
 */

import { PrismaClient, BusinessExpense, BusinessIncome, BusinessSettlement, SettlementType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export interface MemberBalance {
  memberId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;

  // Positive = business owes member (member paid out-of-pocket)
  // Negative = member owes business (member received income personally)
  balance: Decimal;

  // Breakdown
  totalPaidOutOfPocket: Decimal;      // Expenses paid by member
  totalReceivedPersonally: Decimal;   // Income received by member
  totalSettlementsReceived: Decimal;  // Business -> Member settlements
  totalSettlementsPaid: Decimal;      // Member -> Business settlements
}

export interface LedgerSummary {
  businessId: string;
  memberBalances: MemberBalance[];
  totalOwedToMembers: Decimal;        // Sum of positive balances
  totalOwedByMembers: Decimal;        // Sum of negative balances (as absolute)
  netBalance: Decimal;                // Total owed to members - total owed by members
}

/**
 * Calculate balance for a single member
 * Balance = (expenses paid out-of-pocket) - (income received personally) + (settlements from business) - (settlements to business)
 */
export async function calculateMemberBalance(
  businessId: string,
  membershipId: string
): Promise<MemberBalance | null> {
  // Get membership with user info
  const membership = await prisma.businessMembership.findUnique({
    where: { id: membershipId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  if (!membership || membership.businessId !== businessId) {
    return null;
  }

  // Get expenses paid by this member (out-of-pocket)
  const expenses = await prisma.businessExpense.aggregate({
    where: {
      businessId,
      paidByMemberId: membershipId,
      isDeleted: false,
    },
    _sum: { amount: true },
  });

  // Get incomes received by this member (personally)
  const incomes = await prisma.businessIncome.aggregate({
    where: {
      businessId,
      receivedByMemberId: membershipId,
      isDeleted: false,
    },
    _sum: { amount: true },
  });

  // Get settlements: business -> member (reimbursements)
  const reimbursements = await prisma.businessSettlement.aggregate({
    where: {
      businessId,
      memberId: membershipId,
      settlementType: SettlementType.BUSINESS_TO_MEMBER,
    },
    _sum: { amount: true },
  });

  // Get settlements: member -> business (repayments)
  const repayments = await prisma.businessSettlement.aggregate({
    where: {
      businessId,
      memberId: membershipId,
      settlementType: SettlementType.MEMBER_TO_BUSINESS,
    },
    _sum: { amount: true },
  });

  const totalPaidOutOfPocket = expenses._sum.amount ?? new Decimal(0);
  const totalReceivedPersonally = incomes._sum.amount ?? new Decimal(0);
  const totalSettlementsReceived = reimbursements._sum.amount ?? new Decimal(0);
  const totalSettlementsPaid = repayments._sum.amount ?? new Decimal(0);

  // Balance = out-of-pocket - received personally - reimbursements + repayments
  // Positive balance = business owes member (member paid more than received back)
  // Negative balance = member owes business (member received more than paid back)
  //
  // When business reimburses member, debt DECREASES (hence minus)
  // When member repays business, debt INCREASES (becomes less negative, hence plus)
  const balance = totalPaidOutOfPocket
    .minus(totalReceivedPersonally)
    .minus(totalSettlementsReceived)
    .plus(totalSettlementsPaid);

  return {
    memberId: membershipId,
    userId: membership.user.id,
    userName: membership.user.name,
    userEmail: membership.user.email,
    role: membership.role,
    balance,
    totalPaidOutOfPocket,
    totalReceivedPersonally,
    totalSettlementsReceived,
    totalSettlementsPaid,
  };
}

/**
 * Get all member balances for a business
 */
export async function getBusinessLedgerSummary(businessId: string): Promise<LedgerSummary> {
  // Get all active memberships
  const memberships = await prisma.businessMembership.findMany({
    where: {
      businessId,
      isActive: true,
    },
    select: { id: true },
  });

  const memberBalances: MemberBalance[] = [];
  let totalOwedToMembers = new Decimal(0);
  let totalOwedByMembers = new Decimal(0);

  for (const membership of memberships) {
    const balance = await calculateMemberBalance(businessId, membership.id);
    if (balance) {
      memberBalances.push(balance);

      if (balance.balance.greaterThan(0)) {
        totalOwedToMembers = totalOwedToMembers.plus(balance.balance);
      } else if (balance.balance.lessThan(0)) {
        totalOwedByMembers = totalOwedByMembers.plus(balance.balance.abs());
      }
    }
  }

  return {
    businessId,
    memberBalances,
    totalOwedToMembers,
    totalOwedByMembers,
    netBalance: totalOwedToMembers.minus(totalOwedByMembers),
  };
}

/**
 * Get balance history for a member (all transactions affecting their balance)
 */
export async function getMemberBalanceHistory(
  businessId: string,
  membershipId: string,
  options: { startDate?: Date; endDate?: Date; limit?: number } = {}
): Promise<{
  expenses: BusinessExpense[];
  incomes: BusinessIncome[];
  settlements: BusinessSettlement[];
}> {
  const { startDate, endDate, limit = 100 } = options;

  const dateFilter: any = {};
  if (startDate || endDate) {
    dateFilter.transactionDate = {};
    if (startDate) dateFilter.transactionDate.gte = startDate;
    if (endDate) dateFilter.transactionDate.lte = endDate;
  }

  const settlementDateFilter: any = {};
  if (startDate || endDate) {
    settlementDateFilter.settlementDate = {};
    if (startDate) settlementDateFilter.settlementDate.gte = startDate;
    if (endDate) settlementDateFilter.settlementDate.lte = endDate;
  }

  const [expenses, incomes, settlements] = await Promise.all([
    prisma.businessExpense.findMany({
      where: {
        businessId,
        paidByMemberId: membershipId,
        isDeleted: false,
        ...dateFilter,
      },
      orderBy: { transactionDate: 'desc' },
      take: limit,
      include: { category: true, attachments: true },
    }),
    prisma.businessIncome.findMany({
      where: {
        businessId,
        receivedByMemberId: membershipId,
        isDeleted: false,
        ...dateFilter,
      },
      orderBy: { transactionDate: 'desc' },
      take: limit,
      include: { category: true, attachments: true },
    }),
    prisma.businessSettlement.findMany({
      where: {
        businessId,
        memberId: membershipId,
        ...settlementDateFilter,
      },
      orderBy: { settlementDate: 'desc' },
      take: limit,
      include: { attachments: true },
    }),
  ]);

  return { expenses, incomes, settlements };
}

/**
 * Create a settlement and return updated balance
 */
export async function createSettlement(
  businessId: string,
  memberId: string,
  settlementType: SettlementType,
  amount: Decimal,
  note: string | null,
  settlementDate: Date,
  createdById: string
): Promise<{ settlement: BusinessSettlement; newBalance: MemberBalance }> {
  // Validate positive amount
  if (amount.lessThanOrEqualTo(0)) {
    throw new Error('Settlement amount must be positive');
  }

  // Verify membership exists
  const membership = await prisma.businessMembership.findFirst({
    where: { id: memberId, businessId },
  });

  if (!membership) {
    throw new Error('Member not found in this business');
  }

  const settlement = await prisma.businessSettlement.create({
    data: {
      businessId,
      memberId,
      settlementType,
      amount,
      note,
      settlementDate,
      createdById,
    },
  });

  const newBalance = await calculateMemberBalance(businessId, memberId);
  if (!newBalance) {
    throw new Error('Failed to calculate new balance');
  }

  return { settlement, newBalance };
}

/**
 * Calculate suggested settlement amount to zero out a member's balance
 */
export function getSuggestedSettlement(balance: MemberBalance): {
  settlementType: SettlementType;
  amount: Decimal;
} | null {
  if (balance.balance.equals(0)) {
    return null;
  }

  if (balance.balance.greaterThan(0)) {
    // Business owes member - need reimbursement
    return {
      settlementType: SettlementType.BUSINESS_TO_MEMBER,
      amount: balance.balance,
    };
  } else {
    // Member owes business - need repayment
    return {
      settlementType: SettlementType.MEMBER_TO_BUSINESS,
      amount: balance.balance.abs(),
    };
  }
}
