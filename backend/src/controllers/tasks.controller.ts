import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { ActivityLogService } from '../services/activity-log.service.js';

// Fields to track for changes in task updates
const TASK_TRACKED_FIELDS = [
  'name', 'warningDate', 'deadlineDate', 'clientId', 'isActive',
  'currency', 'defaultLanguage', 'invoiceTemplate', 'hourlyRate', 'hoursWorked',
  'fixedMonthlyAmount', 'bankAccountId', 'googleAccountId', 'useCustomEmailTemplate'
];

export async function getTasks(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { includeArchived } = req.query;

  try {
    const where: any = {
      userId: req.userId,
      type: 'INVOICE'  // Only return INVOICE tasks, not REMINDERs
    };

    // By default, exclude archived tasks unless explicitly requested
    if (includeArchived !== 'true') {
      where.isArchived = false;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            billingEmail: true,
            nip: true,
            streetAddress: true,
            postcode: true,
            city: true,
            country: true,
            crmClientId: true,
            crmIntegration: {
              select: { id: true, name: true, isActive: true }
            }
          }
        },
        bankAccount: {
          select: { id: true, name: true, currency: true, bankName: true, iban: true }
        },
        googleAccount: {
          select: { id: true, email: true }
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tasks);
  } catch (error) {
    console.error('GetTasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
}

export async function getTask(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const task = await prisma.task.findFirst({
      where: {
        id,
        userId: req.userId,
        type: 'INVOICE'  // Only return INVOICE tasks
      },
      include: {
        client: true,
        bankAccount: {
          select: { id: true, name: true, currency: true, bankName: true, iban: true, swift: true, crmRequisitesId: true }
        },
        googleAccount: {
          select: { id: true, email: true }
        },
        invoices: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json(task);
  } catch (error) {
    console.error('GetTask error:', error);
    res.status(500).json({ error: 'Failed to get task' });
  }
}

export async function createTask(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const {
    name,
    type,
    warningDate,
    deadlineDate,
    clientId,
    // Invoice defaults
    currency,
    defaultLanguage,
    invoiceTemplate,
    hourlyRate,
    hoursWorked,
    fixedMonthlyAmount,
    bankAccountId,
    googleAccountId,
    useCustomEmailTemplate,
    emailSubjectTemplate,
    emailBodyTemplate
  } = req.body;

  if (!name || !warningDate || !deadlineDate) {
    res.status(400).json({ error: 'Name, warningDate and deadlineDate are required' });
    return;
  }

  if (!clientId) {
    res.status(400).json({ error: 'Client is required' });
    return;
  }

  try {
    // Verify client exists and belongs to user
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: req.userId }
    });

    if (!client) {
      res.status(400).json({ error: 'Client not found' });
      return;
    }

    // Verify bank account if provided
    if (bankAccountId) {
      const bankAccount = await prisma.bankAccount.findFirst({
        where: { id: bankAccountId, userId: req.userId }
      });
      if (!bankAccount) {
        res.status(400).json({ error: 'Bank account not found' });
        return;
      }
    }

    // Verify google account if provided
    if (googleAccountId) {
      const googleAccount = await prisma.googleAccount.findFirst({
        where: { id: googleAccountId, userId: req.userId }
      });
      if (!googleAccount) {
        res.status(400).json({ error: 'Google account not found' });
        return;
      }
    }

    const task = await prisma.task.create({
      data: {
        name,
        type: type || 'INVOICE',
        warningDate: parseInt(warningDate),
        deadlineDate: parseInt(deadlineDate),
        clientId,
        userId: req.userId!,
        // Invoice defaults
        currency: currency || 'USD',
        defaultLanguage: defaultLanguage || 'PL',
        invoiceTemplate: invoiceTemplate || 'STANDARD',
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        hoursWorked: hoursWorked ? parseFloat(hoursWorked) : undefined,
        fixedMonthlyAmount: fixedMonthlyAmount ? parseFloat(fixedMonthlyAmount) : undefined,
        bankAccountId: bankAccountId || undefined,
        googleAccountId: googleAccountId || undefined,
        useCustomEmailTemplate: useCustomEmailTemplate || false,
        emailSubjectTemplate: emailSubjectTemplate || undefined,
        emailBodyTemplate: emailBodyTemplate || undefined
      },
      include: {
        client: true,
        bankAccount: { select: { id: true, name: true, currency: true } },
        googleAccount: { select: { id: true, email: true } }
      }
    });

    // Log activity
    const activityService = new ActivityLogService(prisma);
    await activityService.logTaskActivity(task.id, 'CREATED', req.userId!, undefined, { clientName: client.name });

    res.status(201).json(task);
  } catch (error) {
    console.error('CreateTask error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
}

export async function updateTask(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;
  const {
    name,
    warningDate,
    deadlineDate,
    clientId,
    // Invoice defaults
    currency,
    defaultLanguage,
    invoiceTemplate,
    hourlyRate,
    hoursWorked,
    fixedMonthlyAmount,
    bankAccountId,
    googleAccountId,
    useCustomEmailTemplate,
    emailSubjectTemplate,
    emailBodyTemplate
  } = req.body;

  try {
    const existing = await prisma.task.findFirst({
      where: { id, userId: req.userId },
      include: { client: true, bankAccount: true, googleAccount: true }
    });

    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // If clientId is being changed, verify new client exists
    if (clientId && clientId !== existing.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, userId: req.userId }
      });
      if (!client) {
        res.status(400).json({ error: 'Client not found' });
        return;
      }
    }

    // Verify bank account if provided
    if (bankAccountId && bankAccountId !== existing.bankAccountId) {
      const bankAccount = await prisma.bankAccount.findFirst({
        where: { id: bankAccountId, userId: req.userId }
      });
      if (!bankAccount) {
        res.status(400).json({ error: 'Bank account not found' });
        return;
      }
    }

    // Verify google account if provided
    if (googleAccountId && googleAccountId !== existing.googleAccountId) {
      const googleAccount = await prisma.googleAccount.findFirst({
        where: { id: googleAccountId, userId: req.userId }
      });
      if (!googleAccount) {
        res.status(400).json({ error: 'Google account not found' });
        return;
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        name,
        warningDate: warningDate !== undefined ? parseInt(warningDate) : undefined,
        deadlineDate: deadlineDate !== undefined ? parseInt(deadlineDate) : undefined,
        clientId: clientId || undefined,
        // Invoice defaults - allow explicit null to clear
        currency: currency !== undefined ? currency : undefined,
        defaultLanguage: defaultLanguage !== undefined ? defaultLanguage : undefined,
        invoiceTemplate: invoiceTemplate !== undefined ? invoiceTemplate : undefined,
        hourlyRate: hourlyRate !== undefined ? (hourlyRate ? parseFloat(hourlyRate) : null) : undefined,
        hoursWorked: hoursWorked !== undefined ? (hoursWorked ? parseFloat(hoursWorked) : null) : undefined,
        fixedMonthlyAmount: fixedMonthlyAmount !== undefined ? (fixedMonthlyAmount ? parseFloat(fixedMonthlyAmount) : null) : undefined,
        bankAccountId: bankAccountId !== undefined ? (bankAccountId || null) : undefined,
        googleAccountId: googleAccountId !== undefined ? (googleAccountId || null) : undefined,
        useCustomEmailTemplate: useCustomEmailTemplate !== undefined ? useCustomEmailTemplate : undefined,
        emailSubjectTemplate: emailSubjectTemplate !== undefined ? (emailSubjectTemplate || null) : undefined,
        emailBodyTemplate: emailBodyTemplate !== undefined ? (emailBodyTemplate || null) : undefined
      },
      include: {
        client: true,
        bankAccount: { select: { id: true, name: true, currency: true } },
        googleAccount: { select: { id: true, email: true } }
      }
    });

    // Log activity with changes
    const activityService = new ActivityLogService(prisma);
    const changes = ActivityLogService.detectChanges(existing, task, TASK_TRACKED_FIELDS);
    if (changes) {
      await activityService.logTaskActivity(task.id, 'UPDATED', req.userId!, changes);
    }

    res.json(task);
  } catch (error) {
    console.error('UpdateTask error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
}

export async function deleteTask(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const existing = await prisma.task.findFirst({
      where: { id, userId: req.userId },
      include: { client: true }
    });

    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Log activity before deletion
    const activityService = new ActivityLogService(prisma);
    await activityService.logTaskActivity(id, 'DELETED', req.userId!, undefined, {
      clientName: existing.client?.name
    });

    await prisma.task.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('DeleteTask error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
}

export async function toggleTask(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const existing = await prisma.task.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const task = await prisma.task.update({
      where: { id },
      data: { isActive: !existing.isActive },
      include: { client: true }
    });

    // Log activity
    const activityService = new ActivityLogService(prisma);
    const action = task.isActive ? 'ACTIVATED' : 'DEACTIVATED';
    await activityService.logTaskActivity(task.id, action, req.userId!, {
      isActive: { oldValue: existing.isActive, newValue: task.isActive }
    });

    res.json(task);
  } catch (error) {
    console.error('ToggleTask error:', error);
    res.status(500).json({ error: 'Failed to toggle task' });
  }
}

export async function archiveTask(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const existing = await prisma.task.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const task = await prisma.task.update({
      where: { id },
      data: { isArchived: true },
      include: { client: true }
    });

    // Log activity
    const activityService = new ActivityLogService(prisma);
    await activityService.logTaskActivity(task.id, 'ARCHIVED', req.userId!, {
      isArchived: { oldValue: false, newValue: true }
    });

    res.json(task);
  } catch (error) {
    console.error('ArchiveTask error:', error);
    res.status(500).json({ error: 'Failed to archive task' });
  }
}

export async function unarchiveTask(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const existing = await prisma.task.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const task = await prisma.task.update({
      where: { id },
      data: { isArchived: false },
      include: { client: true }
    });

    // Log activity
    const activityService = new ActivityLogService(prisma);
    await activityService.logTaskActivity(task.id, 'UNARCHIVED', req.userId!, {
      isArchived: { oldValue: true, newValue: false }
    });

    res.json(task);
  } catch (error) {
    console.error('UnarchiveTask error:', error);
    res.status(500).json({ error: 'Failed to unarchive task' });
  }
}
