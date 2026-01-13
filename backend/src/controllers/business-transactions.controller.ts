/**
 * Business Transactions Controller
 * Handles expenses, income, settlements, and attachments
 */

import { Request, Response } from 'express';
import { PrismaClient, SettlementType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  getEffectivePermissions,
  BusinessPermissions,
} from '../services/business-permissions.service';
import {
  calculateMemberBalance,
  getBusinessLedgerSummary,
  getMemberBalanceHistory,
  createSettlement,
} from '../services/business-ledger.service';
import {
  auditExpenseCreated,
  auditExpenseUpdated,
  auditExpenseDeleted,
  auditIncomeCreated,
  auditIncomeUpdated,
  auditIncomeDeleted,
  auditSettlementCreated,
  auditAttachmentAdded,
  auditAttachmentRemoved,
} from '../services/business-audit.service';

const prisma = new PrismaClient();

/**
 * Get user's membership and permissions
 */
async function getMembershipWithPermissions(userId: string, businessId: string) {
  const membership = await prisma.businessMembership.findUnique({
    where: { businessId_userId: { businessId, userId } },
    include: { business: true },
  });

  if (!membership || !membership.isActive) return null;

  const permissions = getEffectivePermissions(
    membership.role,
    membership.permissions as Partial<BusinessPermissions> | null
  );

  return { membership, permissions };
}

// ========== Expenses ==========

/**
 * Get expenses for a business
 */
export async function getExpenses(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;
    const {
      categoryId,
      paidByMemberId,
      startDate,
      endDate,
      search,
      limit = '50',
      offset = '0',
      sortBy = 'transactionDate',
      sortOrder = 'desc',
    } = req.query;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    const { membership, permissions } = mp;

    // Build query based on permissions
    let where: Prisma.BusinessExpenseWhereInput = {
      businessId,
      isDeleted: false,
    };

    // Employees can only see their own expenses and salary-related
    if (!permissions.canViewAllExpenses) {
      where = {
        ...where,
        OR: [
          { paidByMemberId: membership.id },
          { category: { isSalary: true } },
        ],
      };
    }

    // Apply filters
    if (categoryId) where.categoryId = categoryId as string;
    if (paidByMemberId) where.paidByMemberId = paidByMemberId as string;
    if (startDate || endDate) {
      where.transactionDate = {
        ...(startDate && { gte: new Date(startDate as string) }),
        ...(endDate && { lte: new Date(endDate as string) }),
      };
    }
    if (search) {
      where.OR = [
        { description: { contains: search as string, mode: 'insensitive' } },
        { note: { contains: search as string, mode: 'insensitive' } },
        { counterparty: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [expenses, total] = await Promise.all([
      prisma.businessExpense.findMany({
        where,
        include: {
          category: true,
          paidByMember: {
            include: { user: { select: { id: true, name: true } } },
          },
          attachments: true,
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.businessExpense.count({ where }),
    ]);

    res.json({
      expenses,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      hasMore: parseInt(offset as string) + expenses.length < total,
    });
  } catch (error) {
    console.error('Error getting expenses:', error);
    res.status(500).json({ error: 'Failed to get expenses' });
  }
}

/**
 * Get a single expense
 */
export async function getExpense(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId, expenseId } = req.params;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    const expense = await prisma.businessExpense.findUnique({
      where: { id: expenseId },
      include: {
        category: true,
        paidByMember: {
          include: { user: { select: { id: true, name: true } } },
        },
        attachments: true,
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    });

    if (!expense || expense.businessId !== businessId) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Check view permission
    const { membership, permissions } = mp;
    if (!permissions.canViewAllExpenses) {
      const isSalary = expense.category.isSalary;
      const isOwnExpense = expense.paidByMemberId === membership.id;
      if (!isSalary && !isOwnExpense) {
        return res.status(403).json({ error: 'Permission denied' });
      }
    }

    res.json(expense);
  } catch (error) {
    console.error('Error getting expense:', error);
    res.status(500).json({ error: 'Failed to get expense' });
  }
}

/**
 * Create an expense
 */
export async function createExpense(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;
    const {
      categoryId,
      amount,
      description,
      note,
      transactionDate,
      paidByMemberId,
      counterparty,
      tags,
    } = req.body;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    if (!mp.permissions.canCreateExpense) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    if (!categoryId || !amount || !transactionDate) {
      return res.status(400).json({ error: 'Category, amount, and date are required' });
    }

    // Verify category belongs to business and is expense type
    const category = await prisma.businessCategory.findFirst({
      where: { id: categoryId, businessId, type: 'EXPENSE' },
    });

    if (!category) {
      return res.status(400).json({ error: 'Invalid expense category' });
    }

    // Verify member if specified
    if (paidByMemberId) {
      const member = await prisma.businessMembership.findFirst({
        where: { id: paidByMemberId, businessId },
      });
      if (!member) {
        return res.status(400).json({ error: 'Invalid member' });
      }
    }

    const expense = await prisma.businessExpense.create({
      data: {
        businessId,
        categoryId,
        amount: new Decimal(amount),
        description,
        note,
        transactionDate: new Date(transactionDate),
        paidByMemberId,
        counterparty,
        tags: tags || [],
        createdById: userId,
      },
      include: {
        category: true,
        paidByMember: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    await auditExpenseCreated(businessId, expense.id, userId, {
      amount: amount.toString(),
      category: category.name,
      paidBy: expense.paidByMember?.user.name,
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
}

/**
 * Update an expense
 */
export async function updateExpense(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId, expenseId } = req.params;
    const updateData = req.body;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    if (!mp.permissions.canEditAnyExpense) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const current = await prisma.businessExpense.findUnique({
      where: { id: expenseId },
      include: { category: true },
    });

    if (!current || current.businessId !== businessId || current.isDeleted) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Build changes for audit
    const changes: Record<string, { oldValue: any; newValue: any }> = {};
    const fieldsToTrack = ['amount', 'description', 'transactionDate', 'categoryId', 'paidByMemberId'];
    for (const field of fieldsToTrack) {
      if (updateData[field] !== undefined && updateData[field] !== (current as any)[field]) {
        changes[field] = {
          oldValue: (current as any)[field],
          newValue: updateData[field],
        };
      }
    }

    const expense = await prisma.businessExpense.update({
      where: { id: expenseId },
      data: {
        ...(updateData.categoryId && { categoryId: updateData.categoryId }),
        ...(updateData.amount && { amount: new Decimal(updateData.amount) }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.note !== undefined && { note: updateData.note }),
        ...(updateData.transactionDate && { transactionDate: new Date(updateData.transactionDate) }),
        ...(updateData.paidByMemberId !== undefined && { paidByMemberId: updateData.paidByMemberId }),
        ...(updateData.counterparty !== undefined && { counterparty: updateData.counterparty }),
        ...(updateData.tags && { tags: updateData.tags }),
        updatedById: userId,
      },
      include: {
        category: true,
        paidByMember: {
          include: { user: { select: { name: true } } },
        },
        attachments: true,
      },
    });

    if (Object.keys(changes).length > 0) {
      await auditExpenseUpdated(businessId, expenseId, userId, changes);
    }

    res.json(expense);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
}

/**
 * Delete an expense (soft delete)
 */
export async function deleteExpense(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId, expenseId } = req.params;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    if (!mp.permissions.canDeleteExpense) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const expense = await prisma.businessExpense.findUnique({
      where: { id: expenseId },
      include: { category: true },
    });

    if (!expense || expense.businessId !== businessId) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    await prisma.businessExpense.update({
      where: { id: expenseId },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await auditExpenseDeleted(businessId, expenseId, userId, {
      amount: expense.amount.toString(),
      category: expense.category.name,
    });

    res.json({ message: 'Expense deleted' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
}

// ========== Income ==========

/**
 * Get incomes for a business
 */
export async function getIncomes(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;
    const {
      categoryId,
      receivedByMemberId,
      startDate,
      endDate,
      search,
      limit = '50',
      offset = '0',
      sortBy = 'transactionDate',
      sortOrder = 'desc',
    } = req.query;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    const { membership, permissions } = mp;

    let where: Prisma.BusinessIncomeWhereInput = {
      businessId,
      isDeleted: false,
    };

    // Employees can only see their own received incomes
    if (!permissions.canViewAllIncomes) {
      where.receivedByMemberId = membership.id;
    }

    // Apply filters
    if (categoryId) where.categoryId = categoryId as string;
    if (receivedByMemberId) where.receivedByMemberId = receivedByMemberId as string;
    if (startDate || endDate) {
      where.transactionDate = {
        ...(startDate && { gte: new Date(startDate as string) }),
        ...(endDate && { lte: new Date(endDate as string) }),
      };
    }
    if (search) {
      where.OR = [
        { description: { contains: search as string, mode: 'insensitive' } },
        { note: { contains: search as string, mode: 'insensitive' } },
        { counterparty: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [incomes, total] = await Promise.all([
      prisma.businessIncome.findMany({
        where,
        include: {
          category: true,
          receivedByMember: {
            include: { user: { select: { id: true, name: true } } },
          },
          attachments: true,
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.businessIncome.count({ where }),
    ]);

    res.json({
      incomes,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      hasMore: parseInt(offset as string) + incomes.length < total,
    });
  } catch (error) {
    console.error('Error getting incomes:', error);
    res.status(500).json({ error: 'Failed to get incomes' });
  }
}

/**
 * Create an income
 */
export async function createIncome(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;
    const {
      categoryId,
      amount,
      description,
      note,
      transactionDate,
      receivedByMemberId,
      counterparty,
      tags,
    } = req.body;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    if (!mp.permissions.canCreateIncome) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    if (!categoryId || !amount || !transactionDate) {
      return res.status(400).json({ error: 'Category, amount, and date are required' });
    }

    // Verify category
    const category = await prisma.businessCategory.findFirst({
      where: { id: categoryId, businessId, type: 'INCOME' },
    });

    if (!category) {
      return res.status(400).json({ error: 'Invalid income category' });
    }

    // Verify member if specified
    if (receivedByMemberId) {
      const member = await prisma.businessMembership.findFirst({
        where: { id: receivedByMemberId, businessId },
      });
      if (!member) {
        return res.status(400).json({ error: 'Invalid member' });
      }
    }

    const income = await prisma.businessIncome.create({
      data: {
        businessId,
        categoryId,
        amount: new Decimal(amount),
        description,
        note,
        transactionDate: new Date(transactionDate),
        receivedByMemberId,
        counterparty,
        tags: tags || [],
        createdById: userId,
      },
      include: {
        category: true,
        receivedByMember: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    await auditIncomeCreated(businessId, income.id, userId, {
      amount: amount.toString(),
      category: category.name,
      receivedBy: income.receivedByMember?.user.name,
    });

    res.status(201).json(income);
  } catch (error) {
    console.error('Error creating income:', error);
    res.status(500).json({ error: 'Failed to create income' });
  }
}

/**
 * Update an income
 */
export async function updateIncome(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId, incomeId } = req.params;
    const updateData = req.body;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    if (!mp.permissions.canEditAnyIncome) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const current = await prisma.businessIncome.findUnique({
      where: { id: incomeId },
      include: { category: true },
    });

    if (!current || current.businessId !== businessId || current.isDeleted) {
      return res.status(404).json({ error: 'Income not found' });
    }

    // Build changes for audit
    const changes: Record<string, { oldValue: any; newValue: any }> = {};
    const fieldsToTrack = ['amount', 'description', 'transactionDate', 'categoryId', 'receivedByMemberId'];
    for (const field of fieldsToTrack) {
      if (updateData[field] !== undefined && updateData[field] !== (current as any)[field]) {
        changes[field] = {
          oldValue: (current as any)[field],
          newValue: updateData[field],
        };
      }
    }

    const income = await prisma.businessIncome.update({
      where: { id: incomeId },
      data: {
        ...(updateData.categoryId && { categoryId: updateData.categoryId }),
        ...(updateData.amount && { amount: new Decimal(updateData.amount) }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.note !== undefined && { note: updateData.note }),
        ...(updateData.transactionDate && { transactionDate: new Date(updateData.transactionDate) }),
        ...(updateData.receivedByMemberId !== undefined && { receivedByMemberId: updateData.receivedByMemberId }),
        ...(updateData.counterparty !== undefined && { counterparty: updateData.counterparty }),
        ...(updateData.tags && { tags: updateData.tags }),
        updatedById: userId,
      },
      include: {
        category: true,
        receivedByMember: {
          include: { user: { select: { name: true } } },
        },
        attachments: true,
      },
    });

    if (Object.keys(changes).length > 0) {
      await auditIncomeUpdated(businessId, incomeId, userId, changes);
    }

    res.json(income);
  } catch (error) {
    console.error('Error updating income:', error);
    res.status(500).json({ error: 'Failed to update income' });
  }
}

/**
 * Delete an income (soft delete)
 */
export async function deleteIncome(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId, incomeId } = req.params;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    if (!mp.permissions.canDeleteIncome) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const income = await prisma.businessIncome.findUnique({
      where: { id: incomeId },
      include: { category: true },
    });

    if (!income || income.businessId !== businessId) {
      return res.status(404).json({ error: 'Income not found' });
    }

    await prisma.businessIncome.update({
      where: { id: incomeId },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await auditIncomeDeleted(businessId, incomeId, userId, {
      amount: income.amount.toString(),
      category: income.category.name,
    });

    res.json({ message: 'Income deleted' });
  } catch (error) {
    console.error('Error deleting income:', error);
    res.status(500).json({ error: 'Failed to delete income' });
  }
}

// ========== Ledger/Settlements ==========

/**
 * Get ledger summary (all member balances)
 */
export async function getLedger(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    // Employees can only see their own balance
    if (!mp.permissions.canViewSettlements) {
      const balance = await calculateMemberBalance(businessId, mp.membership.id);
      return res.json({
        businessId,
        memberBalances: balance ? [balance] : [],
        totalOwedToMembers: balance?.balance.greaterThan(0) ? balance.balance : new Decimal(0),
        totalOwedByMembers: balance?.balance.lessThan(0) ? balance.balance.abs() : new Decimal(0),
        netBalance: balance?.balance ?? new Decimal(0),
      });
    }

    const ledger = await getBusinessLedgerSummary(businessId);
    res.json(ledger);
  } catch (error) {
    console.error('Error getting ledger:', error);
    res.status(500).json({ error: 'Failed to get ledger' });
  }
}

/**
 * Get member balance history
 */
export async function getMemberLedger(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId, membershipId } = req.params;
    const { startDate, endDate, limit } = req.query;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    // Employees can only see their own balance
    if (!mp.permissions.canViewSettlements && mp.membership.id !== membershipId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const [balance, history] = await Promise.all([
      calculateMemberBalance(businessId, membershipId),
      getMemberBalanceHistory(businessId, membershipId, {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : 100,
      }),
    ]);

    res.json({ balance, history });
  } catch (error) {
    console.error('Error getting member ledger:', error);
    res.status(500).json({ error: 'Failed to get member ledger' });
  }
}

/**
 * Get settlements
 */
export async function getSettlements(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;
    const { memberId, startDate, endDate, limit = '50', offset = '0' } = req.query;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    if (!mp.permissions.canViewSettlements) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const where: Prisma.BusinessSettlementWhereInput = {
      businessId,
      ...(memberId && { memberId: memberId as string }),
      ...((startDate || endDate) && {
        settlementDate: {
          ...(startDate && { gte: new Date(startDate as string) }),
          ...(endDate && { lte: new Date(endDate as string) }),
        },
      }),
    };

    const [settlements, total] = await Promise.all([
      prisma.businessSettlement.findMany({
        where,
        include: {
          member: {
            include: { user: { select: { id: true, name: true } } },
          },
          createdBy: { select: { id: true, name: true } },
          attachments: true,
        },
        orderBy: { settlementDate: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.businessSettlement.count({ where }),
    ]);

    res.json({
      settlements,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('Error getting settlements:', error);
    res.status(500).json({ error: 'Failed to get settlements' });
  }
}

/**
 * Create a settlement
 */
export async function createSettlementEndpoint(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;
    const { memberId, settlementType, amount, note, settlementDate } = req.body;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    if (!mp.permissions.canCreateSettlement) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    if (!memberId || !settlementType || !amount || !settlementDate) {
      return res.status(400).json({ error: 'Member, type, amount, and date are required' });
    }

    if (!Object.values(SettlementType).includes(settlementType)) {
      return res.status(400).json({ error: 'Invalid settlement type' });
    }

    const result = await createSettlement(
      businessId,
      memberId,
      settlementType,
      new Decimal(amount),
      note,
      new Date(settlementDate),
      userId
    );

    await auditSettlementCreated(businessId, result.settlement.id, userId, {
      amount: amount.toString(),
      type: settlementType,
      memberId,
    });

    // Return full settlement with member info
    const settlement = await prisma.businessSettlement.findUnique({
      where: { id: result.settlement.id },
      include: {
        member: {
          include: { user: { select: { id: true, name: true } } },
        },
        createdBy: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ settlement, newBalance: result.newBalance });
  } catch (error) {
    console.error('Error creating settlement:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to create settlement' });
  }
}
