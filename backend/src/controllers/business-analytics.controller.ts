/**
 * Business Analytics Controller
 * Handles analytics endpoints for business and user-level analytics
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  getEffectivePermissions,
  BusinessPermissions,
} from '../services/business-permissions.service';
import {
  getBusinessAnalytics,
  getBusinessKPIs,
  getExpensesByCategory,
  getIncomesByCategory,
  getExpensesByAttribution,
  getTimeSeries,
  getUserCrossBusinessAnalytics,
  DateRange,
} from '../services/business-analytics.service';
import { getBusinessLedgerSummary } from '../services/business-ledger.service';
import { getAuditLogs, getEntityAuditTrail } from '../services/business-audit.service';

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

/**
 * Parse date range from query params
 */
function parseDateRange(query: any): DateRange {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  const { period, startDate: startStr, endDate: endStr } = query;

  if (startStr && endStr) {
    startDate = new Date(startStr);
    endDate = new Date(endStr);
    endDate.setHours(23, 59, 59, 999);
  } else {
    switch (period) {
      case 'day':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        // Default to current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  return { startDate, endDate };
}

// ========== Business Analytics ==========

/**
 * Get full analytics for a business
 */
export async function getAnalytics(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;
    const { groupBy = 'day' } = req.query;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    if (!mp.permissions.canViewFullAnalytics) {
      return res.status(403).json({ error: 'Permission denied - full analytics not available' });
    }

    const dateRange = parseDateRange(req.query);
    const timeSeriesGroupBy = groupBy as 'day' | 'week' | 'month';

    const analytics = await getBusinessAnalytics(businessId, dateRange, timeSeriesGroupBy);
    res.json(analytics);
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
}

/**
 * Get KPIs only (lighter endpoint)
 */
export async function getKPIs(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    if (!mp.permissions.canViewFullAnalytics) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const dateRange = parseDateRange(req.query);
    const kpis = await getBusinessKPIs(businessId, dateRange);

    res.json({ dateRange, kpis });
  } catch (error) {
    console.error('Error getting KPIs:', error);
    res.status(500).json({ error: 'Failed to get KPIs' });
  }
}

/**
 * Get expense breakdown by category
 */
export async function getExpenseCategoryBreakdown(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    if (!mp.permissions.canViewFullAnalytics) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const dateRange = parseDateRange(req.query);
    const breakdown = await getExpensesByCategory(businessId, dateRange);

    res.json({ dateRange, breakdown });
  } catch (error) {
    console.error('Error getting expense breakdown:', error);
    res.status(500).json({ error: 'Failed to get expense breakdown' });
  }
}

/**
 * Get income breakdown by category
 */
export async function getIncomeCategoryBreakdown(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    if (!mp.permissions.canViewFullAnalytics) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const dateRange = parseDateRange(req.query);
    const breakdown = await getIncomesByCategory(businessId, dateRange);

    res.json({ dateRange, breakdown });
  } catch (error) {
    console.error('Error getting income breakdown:', error);
    res.status(500).json({ error: 'Failed to get income breakdown' });
  }
}

/**
 * Get time series data
 */
export async function getTimeSeriesData(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;
    const { groupBy = 'day' } = req.query;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    if (!mp.permissions.canViewFullAnalytics) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const dateRange = parseDateRange(req.query);
    const timeSeries = await getTimeSeries(
      businessId,
      dateRange,
      groupBy as 'day' | 'week' | 'month'
    );

    res.json({ dateRange, timeSeries });
  } catch (error) {
    console.error('Error getting time series:', error);
    res.status(500).json({ error: 'Failed to get time series' });
  }
}

/**
 * Get balances widget data
 */
export async function getBalancesWidget(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    if (!mp.permissions.canViewSettlements) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const ledger = await getBusinessLedgerSummary(businessId);
    res.json(ledger);
  } catch (error) {
    console.error('Error getting balances:', error);
    res.status(500).json({ error: 'Failed to get balances' });
  }
}

// ========== User-level Analytics ==========

/**
 * Get user's analytics across all businesses
 */
export async function getUserAnalytics(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;

    const dateRange = parseDateRange(req.query);
    const analytics = await getUserCrossBusinessAnalytics(userId, dateRange);

    res.json({ dateRange, ...analytics });
  } catch (error) {
    console.error('Error getting user analytics:', error);
    res.status(500).json({ error: 'Failed to get user analytics' });
  }
}

// ========== Audit Log ==========

/**
 * Get audit log for a business
 */
export async function getBusinessAuditLog(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;
    const {
      action,
      entityType,
      entityId,
      performedById,
      startDate,
      endDate,
      limit = '50',
      offset = '0',
    } = req.query;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    if (!mp.permissions.canViewAuditLog) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const result = await getAuditLogs(businessId, {
      action: action as any,
      entityType: entityType as any,
      entityId: entityId as string,
      performedById: performedById as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json(result);
  } catch (error) {
    console.error('Error getting audit log:', error);
    res.status(500).json({ error: 'Failed to get audit log' });
  }
}

/**
 * Get audit trail for a specific entity
 */
export async function getEntityAuditLog(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId, entityType, entityId } = req.params;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    if (!mp.permissions.canViewAuditLog) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const auditTrail = await getEntityAuditTrail(businessId, entityType as any, entityId);
    res.json(auditTrail);
  } catch (error) {
    console.error('Error getting entity audit trail:', error);
    res.status(500).json({ error: 'Failed to get audit trail' });
  }
}

// ========== Employee-specific Analytics ==========

/**
 * Get own analytics for employees (salary info, own balance)
 */
export async function getOwnAnalytics(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;

    const mp = await getMembershipWithPermissions(userId, businessId);
    if (!mp) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    const { membership } = mp;
    const dateRange = parseDateRange(req.query);

    // Get user info for salary filtering
    const user = await prisma.user.findUnique({
      where: { id: membership.userId },
      select: { name: true },
    });

    // Get own balance
    const { calculateMemberBalance } = await import('../services/business-ledger.service.js');
    const balance = await calculateMemberBalance(businessId, membership.id);

    // Get own expenses (out-of-pocket)
    const ownExpenses = await prisma.businessExpense.aggregate({
      where: {
        businessId,
        paidByMemberId: membership.id,
        isDeleted: false,
        transactionDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      _sum: { amount: true },
      _count: true,
    });

    // Get salary-related info
    const salaryCategory = await prisma.businessCategory.findFirst({
      where: { businessId, isSalary: true },
    });

    let salaryInfo = null;
    if (salaryCategory && user) {
      const salaryExpenses = await prisma.businessExpense.findMany({
        where: {
          businessId,
          categoryId: salaryCategory.id,
          isDeleted: false,
          transactionDate: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
          // Filter to show only this member's salary (if counterparty matches)
          OR: [
            { counterparty: { contains: user.name, mode: 'insensitive' } },
            { description: { contains: user.name, mode: 'insensitive' } },
          ],
        },
        orderBy: { transactionDate: 'desc' },
      });

      salaryInfo = {
        totalSalary: salaryExpenses.reduce((sum, e) => sum.plus(e.amount), new Decimal(0)),
        payments: salaryExpenses,
      };
    }

    res.json({
      dateRange,
      balance,
      ownExpenses: {
        total: ownExpenses._sum.amount,
        count: ownExpenses._count,
      },
      salaryInfo,
    });
  } catch (error) {
    console.error('Error getting own analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
}

// Import Decimal for salary calculation
import { Decimal } from '@prisma/client/runtime/library';
