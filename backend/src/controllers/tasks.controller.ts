import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware.js';

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
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        bankAccount: true,
        crmIntegration: {
          select: { id: true, name: true, isActive: true }
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
        invoices: { orderBy: { createdAt: 'desc' } },
        bankAccount: true,
        crmIntegration: {
          select: { id: true, name: true, isActive: true }
        }
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
    // Client info
    clientName,
    clientNip,
    clientStreetAddress,
    clientPostcode,
    clientCity,
    clientCountry,
    clientAddress,  // deprecated
    clientEmail,
    clientBankAccount,
    // CRM integration
    crmClientId,
    crmIntegrationId,
    // Invoice defaults
    hourlyRate,
    hoursWorked,
    description,
    defaultServiceName,
    currency,
    defaultLanguage,
    invoiceTemplate,
    googleAccountId,
    bankAccountId,
    emailSubjectTemplate,
    emailBodyTemplate,
    useCustomEmailTemplate
  } = req.body;

  if (!name || !warningDate || !deadlineDate) {
    res.status(400).json({ error: 'Name, warningDate and deadlineDate are required' });
    return;
  }

  try {
    const task = await prisma.task.create({
      data: {
        name,
        type: type || 'INVOICE',
        warningDate: parseInt(warningDate),
        deadlineDate: parseInt(deadlineDate),
        // Client info
        clientName,
        clientNip,
        clientStreetAddress,
        clientPostcode,
        clientCity,
        clientCountry,
        clientAddress,  // deprecated
        clientEmail,
        clientBankAccount,
        // CRM integration
        crmClientId,
        crmIntegrationId: crmIntegrationId || null,
        // Invoice defaults
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        hoursWorked: hoursWorked ? parseFloat(hoursWorked) : null,
        description,
        defaultServiceName,
        currency: currency || 'USD',
        defaultLanguage: defaultLanguage || 'PL',
        invoiceTemplate: invoiceTemplate || 'STANDARD',
        googleAccountId: googleAccountId || null,
        bankAccountId: bankAccountId || null,
        emailSubjectTemplate: emailSubjectTemplate || null,
        emailBodyTemplate: emailBodyTemplate || null,
        useCustomEmailTemplate: useCustomEmailTemplate || false,
        userId: req.userId!
      },
      include: { bankAccount: true }
    });

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
    // Client info
    clientName,
    clientNip,
    clientStreetAddress,
    clientPostcode,
    clientCity,
    clientCountry,
    clientAddress,  // deprecated
    clientEmail,
    clientBankAccount,
    // CRM integration
    crmClientId,
    crmIntegrationId,
    // Invoice defaults
    hourlyRate,
    hoursWorked,
    description,
    defaultServiceName,
    currency,
    defaultLanguage,
    invoiceTemplate,
    googleAccountId,
    bankAccountId,
    emailSubjectTemplate,
    emailBodyTemplate,
    useCustomEmailTemplate
  } = req.body;

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
      data: {
        name,
        warningDate: warningDate !== undefined ? parseInt(warningDate) : undefined,
        deadlineDate: deadlineDate !== undefined ? parseInt(deadlineDate) : undefined,
        // Client info
        clientName,
        clientNip,
        clientStreetAddress,
        clientPostcode,
        clientCity,
        clientCountry,
        clientAddress,  // deprecated
        clientEmail,
        clientBankAccount,
        // CRM integration
        crmClientId,
        crmIntegrationId: crmIntegrationId !== undefined ? (crmIntegrationId || null) : undefined,
        // Invoice defaults
        hourlyRate: hourlyRate !== undefined ? parseFloat(hourlyRate) : undefined,
        hoursWorked: hoursWorked !== undefined ? parseFloat(hoursWorked) : undefined,
        description,
        defaultServiceName,
        currency,
        defaultLanguage,
        invoiceTemplate,
        googleAccountId: googleAccountId || null,
        bankAccountId: bankAccountId || null,
        emailSubjectTemplate,
        emailBodyTemplate,
        useCustomEmailTemplate
      },
      include: { bankAccount: true }
    });

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
      where: { id, userId: req.userId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

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
      data: { isActive: !existing.isActive }
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
      data: { isArchived: true }
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
      data: { isArchived: false }
    });

    res.json(task);
  } catch (error) {
    console.error('UnarchiveTask error:', error);
    res.status(500).json({ error: 'Failed to unarchive task' });
  }
}
