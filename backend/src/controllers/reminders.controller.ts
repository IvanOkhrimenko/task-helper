import { Response } from 'express';
import { PrismaClient, ScheduleType } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware.js';

interface ScheduleConfig {
  time?: string;          // HH:mm format
  daysOfWeek?: number[];  // 0=Sunday, 1=Monday, etc.
  dayOfMonth?: number;    // 1-31
  month?: number;         // 0-11 (JavaScript month)
  intervalMinutes?: number; // For custom intervals
}

/**
 * Calculate the next occurrence of a reminder based on its schedule
 */
function calculateNextOccurrence(
  scheduleType: ScheduleType,
  scheduleConfig: ScheduleConfig | null,
  reminderDateTime: Date | null,
  fromDate: Date = new Date()
): Date | null {
  if (!scheduleType) return null;

  const config = scheduleConfig || {};
  const [hours, minutes] = (config.time || '09:00').split(':').map(Number);

  switch (scheduleType) {
    case 'ONE_TIME': {
      if (!reminderDateTime) return null;
      return reminderDateTime > fromDate ? reminderDateTime : null;
    }

    case 'DAILY': {
      const next = new Date(fromDate);
      next.setHours(hours, minutes, 0, 0);
      if (next <= fromDate) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }

    case 'WEEKLY': {
      const daysOfWeek = config.daysOfWeek || [1]; // Default Monday
      const next = new Date(fromDate);
      next.setHours(hours, minutes, 0, 0);

      // Find next occurrence
      for (let i = 0; i < 8; i++) {
        const testDate = new Date(next);
        testDate.setDate(testDate.getDate() + i);
        const dayOfWeek = testDate.getDay();

        if (daysOfWeek.includes(dayOfWeek) && testDate > fromDate) {
          return testDate;
        }
      }
      return null;
    }

    case 'MONTHLY': {
      const dayOfMonth = config.dayOfMonth || 1;
      const next = new Date(fromDate);
      next.setDate(dayOfMonth);
      next.setHours(hours, minutes, 0, 0);

      if (next <= fromDate) {
        next.setMonth(next.getMonth() + 1);
      }

      // Handle months with fewer days
      while (next.getDate() !== dayOfMonth) {
        next.setDate(0); // Go to last day of previous month
        next.setMonth(next.getMonth() + 1);
        next.setDate(dayOfMonth);
      }

      return next;
    }

    case 'YEARLY': {
      const month = config.month ?? 0;
      const dayOfMonth = config.dayOfMonth || 1;
      const next = new Date(fromDate);
      next.setMonth(month, dayOfMonth);
      next.setHours(hours, minutes, 0, 0);

      if (next <= fromDate) {
        next.setFullYear(next.getFullYear() + 1);
      }

      return next;
    }

    case 'CUSTOM': {
      const intervalMinutes = config.intervalMinutes || 60;
      const next = new Date(fromDate);
      next.setMinutes(next.getMinutes() + intervalMinutes);
      next.setSeconds(0, 0);
      return next;
    }

    default:
      return null;
  }
}

export async function getReminders(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');

  try {
    const reminders = await prisma.task.findMany({
      where: {
        userId: req.userId,
        type: 'REMINDER'
      },
      include: {
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { nextOccurrence: 'asc' }
      ]
    });

    res.json(reminders);
  } catch (error) {
    console.error('GetReminders error:', error);
    res.status(500).json({ error: 'Failed to get reminders' });
  }
}

export async function getReminder(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const reminder = await prisma.task.findFirst({
      where: {
        id,
        userId: req.userId,
        type: 'REMINDER'
      },
      include: {
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!reminder) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }

    res.json(reminder);
  } catch (error) {
    console.error('GetReminder error:', error);
    res.status(500).json({ error: 'Failed to get reminder' });
  }
}

export async function createReminder(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const {
    name,
    scheduleType,
    scheduleConfig,
    reminderDateTime,
    reminderWarning,
    reminderDeadline,
    reminderTitle,
    reminderMessage,
    notificationEmail,
    isActive
  } = req.body;

  if (!name || !scheduleType) {
    res.status(400).json({ error: 'Name and scheduleType are required' });
    return;
  }

  try {
    // Calculate next occurrence
    const parsedDateTime = reminderDateTime ? new Date(reminderDateTime) : null;
    const nextOccurrence = calculateNextOccurrence(
      scheduleType as ScheduleType,
      scheduleConfig || null,
      parsedDateTime
    );

    const reminder = await prisma.task.create({
      data: {
        name,
        type: 'REMINDER',
        isActive: isActive !== false,
        scheduleType: scheduleType as ScheduleType,
        scheduleConfig: scheduleConfig || null,
        reminderDateTime: parsedDateTime,
        reminderWarning: reminderWarning ? parseInt(reminderWarning) : null,
        reminderDeadline: reminderDeadline ? parseInt(reminderDeadline) : null,
        reminderTitle: reminderTitle || name,
        reminderMessage,
        notificationEmail: notificationEmail || null,
        nextOccurrence,
        userId: req.userId!
      }
    });

    res.status(201).json(reminder);
  } catch (error) {
    console.error('CreateReminder error:', error);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
}

export async function updateReminder(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;
  const {
    name,
    scheduleType,
    scheduleConfig,
    reminderDateTime,
    reminderWarning,
    reminderDeadline,
    reminderTitle,
    reminderMessage,
    notificationEmail,
    isActive
  } = req.body;

  try {
    const existing = await prisma.task.findFirst({
      where: { id, userId: req.userId, type: 'REMINDER' }
    });

    if (!existing) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }

    // Recalculate next occurrence if schedule changed
    const newScheduleType = scheduleType || existing.scheduleType;
    const newScheduleConfig = scheduleConfig !== undefined ? scheduleConfig : existing.scheduleConfig;
    const newReminderDateTime = reminderDateTime !== undefined
      ? (reminderDateTime ? new Date(reminderDateTime) : null)
      : existing.reminderDateTime;

    const nextOccurrence = calculateNextOccurrence(
      newScheduleType as ScheduleType,
      newScheduleConfig as ScheduleConfig | null,
      newReminderDateTime
    );

    const reminder = await prisma.task.update({
      where: { id },
      data: {
        name,
        scheduleType: scheduleType as ScheduleType | undefined,
        scheduleConfig,
        reminderDateTime: newReminderDateTime,
        reminderWarning: reminderWarning !== undefined ? parseInt(reminderWarning) : undefined,
        reminderDeadline: reminderDeadline !== undefined ? parseInt(reminderDeadline) : undefined,
        reminderTitle,
        reminderMessage,
        notificationEmail: notificationEmail !== undefined ? (notificationEmail || null) : undefined,
        isActive,
        nextOccurrence
      }
    });

    res.json(reminder);
  } catch (error) {
    console.error('UpdateReminder error:', error);
    res.status(500).json({ error: 'Failed to update reminder' });
  }
}

export async function deleteReminder(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const existing = await prisma.task.findFirst({
      where: { id, userId: req.userId, type: 'REMINDER' }
    });

    if (!existing) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }

    await prisma.task.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('DeleteReminder error:', error);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
}

export async function toggleReminder(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const existing = await prisma.task.findFirst({
      where: { id, userId: req.userId, type: 'REMINDER' }
    });

    if (!existing) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }

    // Recalculate next occurrence when activating
    let nextOccurrence = existing.nextOccurrence;
    if (!existing.isActive) {
      nextOccurrence = calculateNextOccurrence(
        existing.scheduleType as ScheduleType,
        existing.scheduleConfig as ScheduleConfig | null,
        existing.reminderDateTime
      );
    }

    const reminder = await prisma.task.update({
      where: { id },
      data: {
        isActive: !existing.isActive,
        nextOccurrence
      }
    });

    res.json(reminder);
  } catch (error) {
    console.error('ToggleReminder error:', error);
    res.status(500).json({ error: 'Failed to toggle reminder' });
  }
}

export async function snoozeReminder(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;
  const { minutes } = req.body;

  if (!minutes || minutes < 1) {
    res.status(400).json({ error: 'Minutes must be a positive number' });
    return;
  }

  try {
    const existing = await prisma.task.findFirst({
      where: { id, userId: req.userId, type: 'REMINDER' }
    });

    if (!existing) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }

    const snoozeUntil = new Date();
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + parseInt(minutes));

    const reminder = await prisma.task.update({
      where: { id },
      data: { nextOccurrence: snoozeUntil }
    });

    res.json(reminder);
  } catch (error) {
    console.error('SnoozeReminder error:', error);
    res.status(500).json({ error: 'Failed to snooze reminder' });
  }
}

// Export helper for scheduler service
export { calculateNextOccurrence };
