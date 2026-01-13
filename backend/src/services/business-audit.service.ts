/**
 * Business Audit Log Service
 * Handles immutable audit trail for all business actions
 */

import { PrismaClient, BusinessAuditAction, BusinessEntityType, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuditLogEntry {
  businessId: string;
  action: BusinessAuditAction;
  entityType: BusinessEntityType;
  entityId?: string;
  changes?: Record<string, { oldValue: any; newValue: any }>;
  metadata?: Record<string, any>;
  performedById: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry) {
  return prisma.businessAuditLog.create({
    data: {
      businessId: entry.businessId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      changes: entry.changes as Prisma.InputJsonValue,
      metadata: entry.metadata as Prisma.InputJsonValue,
      performedById: entry.performedById,
    },
  });
}

/**
 * Get audit logs for a business with filtering and pagination
 */
export async function getAuditLogs(
  businessId: string,
  options: {
    action?: BusinessAuditAction;
    entityType?: BusinessEntityType;
    entityId?: string;
    performedById?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}
) {
  const {
    action,
    entityType,
    entityId,
    performedById,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = options;

  const where: Prisma.BusinessAuditLogWhereInput = {
    businessId,
    ...(action && { action }),
    ...(entityType && { entityType }),
    ...(entityId && { entityId }),
    ...(performedById && { performedById }),
    ...((startDate || endDate) && {
      createdAt: {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      },
    }),
  };

  const [logs, total] = await Promise.all([
    prisma.businessAuditLog.findMany({
      where,
      include: {
        performedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.businessAuditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    limit,
    offset,
    hasMore: offset + logs.length < total,
  };
}

/**
 * Get audit trail for a specific entity
 */
export async function getEntityAuditTrail(
  businessId: string,
  entityType: BusinessEntityType,
  entityId: string
) {
  return prisma.businessAuditLog.findMany({
    where: {
      businessId,
      entityType,
      entityId,
    },
    include: {
      performedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// Audit helper functions for common operations

export const auditBusinessCreated = (businessId: string, performedById: string, metadata?: Record<string, any>) =>
  createAuditLog({
    businessId,
    action: BusinessAuditAction.BUSINESS_CREATED,
    entityType: BusinessEntityType.BUSINESS,
    entityId: businessId,
    performedById,
    metadata,
  });

export const auditBusinessUpdated = (
  businessId: string,
  performedById: string,
  changes: Record<string, { oldValue: any; newValue: any }>
) =>
  createAuditLog({
    businessId,
    action: BusinessAuditAction.BUSINESS_UPDATED,
    entityType: BusinessEntityType.BUSINESS,
    entityId: businessId,
    changes,
    performedById,
  });

export const auditBusinessArchived = (businessId: string, performedById: string) =>
  createAuditLog({
    businessId,
    action: BusinessAuditAction.BUSINESS_ARCHIVED,
    entityType: BusinessEntityType.BUSINESS,
    entityId: businessId,
    performedById,
  });

export const auditMemberInvited = (
  businessId: string,
  inviteId: string,
  performedById: string,
  metadata: { email?: string; role: string }
) =>
  createAuditLog({
    businessId,
    action: BusinessAuditAction.MEMBER_INVITED,
    entityType: BusinessEntityType.INVITE,
    entityId: inviteId,
    performedById,
    metadata,
  });

export const auditMemberAccepted = (
  businessId: string,
  membershipId: string,
  performedById: string,
  metadata: { inviteId: string; role: string }
) =>
  createAuditLog({
    businessId,
    action: BusinessAuditAction.MEMBER_ACCEPTED,
    entityType: BusinessEntityType.MEMBERSHIP,
    entityId: membershipId,
    performedById,
    metadata,
  });

export const auditMemberRoleChanged = (
  businessId: string,
  membershipId: string,
  performedById: string,
  changes: { oldValue: string; newValue: string }
) =>
  createAuditLog({
    businessId,
    action: BusinessAuditAction.MEMBER_ROLE_CHANGED,
    entityType: BusinessEntityType.MEMBERSHIP,
    entityId: membershipId,
    changes: { role: changes },
    performedById,
  });

export const auditMemberRemoved = (
  businessId: string,
  membershipId: string,
  performedById: string,
  metadata: { userId: string; userName: string }
) =>
  createAuditLog({
    businessId,
    action: BusinessAuditAction.MEMBER_REMOVED,
    entityType: BusinessEntityType.MEMBERSHIP,
    entityId: membershipId,
    performedById,
    metadata,
  });

export const auditCategoryCreated = (
  businessId: string,
  categoryId: string,
  performedById: string,
  metadata: { name: string; type: string }
) =>
  createAuditLog({
    businessId,
    action: BusinessAuditAction.CATEGORY_CREATED,
    entityType: BusinessEntityType.CATEGORY,
    entityId: categoryId,
    performedById,
    metadata,
  });

export const auditCategoryUpdated = (
  businessId: string,
  categoryId: string,
  performedById: string,
  changes: Record<string, { oldValue: any; newValue: any }>
) =>
  createAuditLog({
    businessId,
    action: BusinessAuditAction.CATEGORY_UPDATED,
    entityType: BusinessEntityType.CATEGORY,
    entityId: categoryId,
    changes,
    performedById,
  });

export const auditExpenseCreated = (
  businessId: string,
  expenseId: string,
  performedById: string,
  metadata: { amount: string; category: string; paidBy?: string }
) =>
  createAuditLog({
    businessId,
    action: BusinessAuditAction.EXPENSE_CREATED,
    entityType: BusinessEntityType.EXPENSE,
    entityId: expenseId,
    performedById,
    metadata,
  });

export const auditExpenseUpdated = (
  businessId: string,
  expenseId: string,
  performedById: string,
  changes: Record<string, { oldValue: any; newValue: any }>
) =>
  createAuditLog({
    businessId,
    action: BusinessAuditAction.EXPENSE_UPDATED,
    entityType: BusinessEntityType.EXPENSE,
    entityId: expenseId,
    changes,
    performedById,
  });

export const auditExpenseDeleted = (
  businessId: string,
  expenseId: string,
  performedById: string,
  metadata: { amount: string; category: string }
) =>
  createAuditLog({
    businessId,
    action: BusinessAuditAction.EXPENSE_DELETED,
    entityType: BusinessEntityType.EXPENSE,
    entityId: expenseId,
    performedById,
    metadata,
  });

export const auditIncomeCreated = (
  businessId: string,
  incomeId: string,
  performedById: string,
  metadata: { amount: string; category: string; receivedBy?: string }
) =>
  createAuditLog({
    businessId,
    action: BusinessAuditAction.INCOME_CREATED,
    entityType: BusinessEntityType.INCOME,
    entityId: incomeId,
    performedById,
    metadata,
  });

export const auditIncomeUpdated = (
  businessId: string,
  incomeId: string,
  performedById: string,
  changes: Record<string, { oldValue: any; newValue: any }>
) =>
  createAuditLog({
    businessId,
    action: BusinessAuditAction.INCOME_UPDATED,
    entityType: BusinessEntityType.INCOME,
    entityId: incomeId,
    changes,
    performedById,
  });

export const auditIncomeDeleted = (
  businessId: string,
  incomeId: string,
  performedById: string,
  metadata: { amount: string; category: string }
) =>
  createAuditLog({
    businessId,
    action: BusinessAuditAction.INCOME_DELETED,
    entityType: BusinessEntityType.INCOME,
    entityId: incomeId,
    performedById,
    metadata,
  });

export const auditSettlementCreated = (
  businessId: string,
  settlementId: string,
  performedById: string,
  metadata: { amount: string; type: string; memberId: string }
) =>
  createAuditLog({
    businessId,
    action: BusinessAuditAction.SETTLEMENT_CREATED,
    entityType: BusinessEntityType.SETTLEMENT,
    entityId: settlementId,
    performedById,
    metadata,
  });

export const auditAttachmentAdded = (
  businessId: string,
  attachmentId: string,
  performedById: string,
  metadata: { filename: string; entityType: string; entityId: string }
) =>
  createAuditLog({
    businessId,
    action: BusinessAuditAction.ATTACHMENT_ADDED,
    entityType: BusinessEntityType.ATTACHMENT,
    entityId: attachmentId,
    performedById,
    metadata,
  });

export const auditAttachmentRemoved = (
  businessId: string,
  attachmentId: string,
  performedById: string,
  metadata: { filename: string; entityType: string; entityId: string }
) =>
  createAuditLog({
    businessId,
    action: BusinessAuditAction.ATTACHMENT_REMOVED,
    entityType: BusinessEntityType.ATTACHMENT,
    entityId: attachmentId,
    performedById,
    metadata,
  });

export const auditInviteRevoked = (
  businessId: string,
  inviteId: string,
  performedById: string,
  metadata: { email?: string }
) =>
  createAuditLog({
    businessId,
    action: BusinessAuditAction.INVITE_REVOKED,
    entityType: BusinessEntityType.INVITE,
    entityId: inviteId,
    performedById,
    metadata,
  });
