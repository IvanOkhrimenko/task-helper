import { PrismaClient, EntityType, ActionType, ActivityLog } from '@prisma/client';

export interface ActivityLogData {
  entityType: EntityType;
  entityId: string;
  action: ActionType;
  userId: string;
  changes?: Record<string, { oldValue: any; newValue: any }>;
  metadata?: Record<string, any>;
  clientId?: string;
  taskId?: string;
  invoiceId?: string;
}

export class ActivityLogService {
  constructor(private prisma: PrismaClient) {}

  async log(data: ActivityLogData): Promise<ActivityLog> {
    try {
      return await this.prisma.activityLog.create({
        data: {
          entityType: data.entityType,
          entityId: data.entityId,
          action: data.action,
          userId: data.userId,
          changes: data.changes ?? undefined,
          metadata: data.metadata ?? undefined,
          clientId: data.clientId ?? undefined,
          taskId: data.taskId ?? undefined,
          invoiceId: data.invoiceId ?? undefined,
        },
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
      throw error;
    }
  }

  /**
   * Helper method for logging client-related activities
   */
  async logClientActivity(
    clientId: string,
    action: ActionType,
    userId: string,
    changes?: Record<string, { oldValue: any; newValue: any }>,
    metadata?: Record<string, any>
  ): Promise<ActivityLog> {
    return this.log({
      entityType: 'CLIENT',
      entityId: clientId,
      action,
      userId,
      changes,
      metadata,
      clientId,
    });
  }

  /**
   * Utility to detect changes between old and new object
   * @returns null if no changes detected, otherwise returns the changes object
   */
  static detectChanges(
    oldObj: Record<string, any>,
    newObj: Record<string, any>,
    fieldsToTrack: string[]
  ): Record<string, { oldValue: any; newValue: any }> | null {
    const changes: Record<string, { oldValue: any; newValue: any }> = {};

    for (const field of fieldsToTrack) {
      const oldVal = oldObj[field];
      const newVal = newObj[field];

      // Handle Decimal type from Prisma
      const oldValStr = oldVal?.toString?.() ?? oldVal;
      const newValStr = newVal?.toString?.() ?? newVal;

      if (JSON.stringify(oldValStr) !== JSON.stringify(newValStr)) {
        changes[field] = { oldValue: oldVal, newValue: newVal };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  /**
   * Get activity log for a task including all its related invoices
   */
  async getActivityForTask(taskId: string, limit = 50): Promise<ActivityLog[]> {
    return this.prisma.activityLog.findMany({
      where: {
        OR: [
          { taskId },
          { entityType: 'INVOICE', invoice: { taskId } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });
  }

  /**
   * Get activity log for a specific invoice
   */
  async getActivityForInvoice(invoiceId: string, limit = 50): Promise<ActivityLog[]> {
    return this.prisma.activityLog.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });
  }

  /**
   * Helper method for logging task-related activities
   */
  async logTaskActivity(
    taskId: string,
    action: ActionType,
    userId: string,
    changes?: Record<string, { oldValue: any; newValue: any }>,
    metadata?: Record<string, any>
  ): Promise<ActivityLog> {
    return this.log({
      entityType: 'TASK',
      entityId: taskId,
      action,
      userId,
      changes,
      metadata,
      taskId,
    });
  }

  /**
   * Helper method for logging invoice-related activities
   */
  async logInvoiceActivity(
    invoiceId: string,
    taskId: string,
    action: ActionType,
    userId: string,
    changes?: Record<string, { oldValue: any; newValue: any }>,
    metadata?: Record<string, any>
  ): Promise<ActivityLog> {
    return this.log({
      entityType: 'INVOICE',
      entityId: invoiceId,
      action,
      userId,
      changes,
      metadata,
      taskId,
      invoiceId,
    });
  }
}
