import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { ActivityLogService } from '../services/activity-log.service.js';

export async function getTaskActivity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { taskId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    // Verify task belongs to user
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId: req.userId }
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const service = new ActivityLogService(prisma);
    const activities = await service.getActivityForTask(taskId, limit);
    res.json(activities);
  } catch (error) {
    console.error('Error fetching task activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
}

export async function getInvoiceActivity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { invoiceId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    // Verify invoice belongs to user
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId: req.userId }
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const service = new ActivityLogService(prisma);
    const activities = await service.getActivityForInvoice(invoiceId, limit);
    res.json(activities);
  } catch (error) {
    console.error('Error fetching invoice activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
}
