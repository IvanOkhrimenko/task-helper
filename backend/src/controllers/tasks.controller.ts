import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware.js';

export async function getTasks(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');

  try {
    const tasks = await prisma.task.findMany({
      where: {
        userId: req.userId,
        type: 'INVOICE'  // Only return INVOICE tasks, not REMINDERs
      },
      include: {
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
      include: { invoices: { orderBy: { createdAt: 'desc' } } }
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
    clientName,
    clientAddress,
    clientEmail,
    clientBankAccount,
    hourlyRate,
    hoursWorked,
    description,
    currency,
    defaultLanguage
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
        clientName,
        clientAddress,
        clientEmail,
        clientBankAccount,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        hoursWorked: hoursWorked ? parseFloat(hoursWorked) : null,
        description,
        currency: currency || 'USD',
        defaultLanguage: defaultLanguage || 'PL',
        userId: req.userId!
      }
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
    clientName,
    clientAddress,
    clientEmail,
    clientBankAccount,
    hourlyRate,
    hoursWorked,
    description,
    currency,
    defaultLanguage
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
        clientName,
        clientAddress,
        clientEmail,
        clientBankAccount,
        hourlyRate: hourlyRate !== undefined ? parseFloat(hourlyRate) : undefined,
        hoursWorked: hoursWorked !== undefined ? parseFloat(hoursWorked) : undefined,
        description,
        currency,
        defaultLanguage
      }
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
