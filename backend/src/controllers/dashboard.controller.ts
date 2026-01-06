import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware.js';

export interface DashboardEvent {
  id: string;
  type: 'reminder' | 'invoice_warning' | 'invoice_deadline' | 'invoice_due';
  title: string;
  subtitle?: string;
  date: Date;
  status: 'upcoming' | 'today' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  taskId?: string;
  taskName?: string;
  reminderScheduleType?: string;
  isActive?: boolean;
  metadata?: {
    clientName?: string;
    amount?: number;
    currency?: string;
    hoursWorked?: number;
    hourlyRate?: number;
  };
}

export async function getDashboardEvents(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0); // Next 2 months

    const events: DashboardEvent[] = [];

    // 1. Get active reminders with upcoming occurrences
    const reminders = await prisma.task.findMany({
      where: {
        userId: req.userId,
        type: 'REMINDER',
        isActive: true,
        nextOccurrence: {
          gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Include today's passed reminders
          lte: endOfMonth
        }
      },
      orderBy: { nextOccurrence: 'asc' }
    });

    for (const reminder of reminders) {
      if (!reminder.nextOccurrence) continue;

      const eventDate = new Date(reminder.nextOccurrence);
      const isToday = eventDate.toDateString() === today.toDateString();
      const isOverdue = eventDate < now;

      events.push({
        id: `reminder-${reminder.id}`,
        type: 'reminder',
        title: reminder.reminderTitle || reminder.name,
        subtitle: reminder.reminderMessage || undefined,
        date: eventDate,
        status: isOverdue ? 'overdue' : isToday ? 'today' : 'upcoming',
        priority: isOverdue ? 'high' : isToday ? 'medium' : 'low',
        taskId: reminder.id,
        taskName: reminder.name,
        reminderScheduleType: reminder.scheduleType || undefined,
        isActive: reminder.isActive
      });
    }

    // 2. Get invoice tasks with warning/deadline dates
    const invoiceTasks = await prisma.task.findMany({
      where: {
        userId: req.userId,
        type: 'INVOICE',
        isActive: true
      },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    for (const task of invoiceTasks) {
      // Calculate warning date for current month
      if (task.warningDate) {
        let warningDate = new Date(currentYear, currentMonth, task.warningDate);

        // If warning date has passed this month, show for next month
        if (warningDate < today) {
          warningDate = new Date(currentYear, currentMonth + 1, task.warningDate);
        }

        if (warningDate <= endOfMonth) {
          const isToday = warningDate.toDateString() === today.toDateString();
          const isOverdue = warningDate < today;

          events.push({
            id: `warning-${task.id}-${warningDate.getMonth()}`,
            type: 'invoice_warning',
            title: `Invoice Warning: ${task.name}`,
            subtitle: `Prepare invoice for ${task.clientName || 'client'}`,
            date: warningDate,
            status: isOverdue ? 'overdue' : isToday ? 'today' : 'upcoming',
            priority: 'medium',
            taskId: task.id,
            taskName: task.name,
            metadata: {
              clientName: task.clientName || undefined,
              hourlyRate: task.hourlyRate ? Number(task.hourlyRate) : undefined,
              hoursWorked: task.hoursWorked ? Number(task.hoursWorked) : undefined,
              currency: task.currency
            }
          });
        }
      }

      // Calculate deadline date for current month
      if (task.deadlineDate) {
        let deadlineDate = new Date(currentYear, currentMonth, task.deadlineDate);

        // If deadline has passed this month, show for next month
        if (deadlineDate < today) {
          deadlineDate = new Date(currentYear, currentMonth + 1, task.deadlineDate);
        }

        if (deadlineDate <= endOfMonth) {
          const isToday = deadlineDate.toDateString() === today.toDateString();
          const isOverdue = deadlineDate < today;

          events.push({
            id: `deadline-${task.id}-${deadlineDate.getMonth()}`,
            type: 'invoice_deadline',
            title: `Invoice Deadline: ${task.name}`,
            subtitle: `Submit invoice for ${task.clientName || 'client'}`,
            date: deadlineDate,
            status: isOverdue ? 'overdue' : isToday ? 'today' : 'upcoming',
            priority: isOverdue ? 'high' : 'medium',
            taskId: task.id,
            taskName: task.name,
            metadata: {
              clientName: task.clientName || undefined,
              hourlyRate: task.hourlyRate ? Number(task.hourlyRate) : undefined,
              hoursWorked: task.hoursWorked ? Number(task.hoursWorked) : undefined,
              currency: task.currency
            }
          });
        }
      }

      // Check if invoice is due this month (not yet created for current month)
      const lastInvoice = task.invoices[0];
      const hasInvoiceThisMonth = lastInvoice &&
        lastInvoice.invoiceMonth === currentMonth &&
        lastInvoice.invoiceYear === currentYear;

      if (!hasInvoiceThisMonth && task.deadlineDate) {
        // Show invoice due event at the start of warning period
        const dueDate = new Date(currentYear, currentMonth, task.warningDate || 1);

        if (dueDate >= today && dueDate <= endOfMonth) {
          const isToday = dueDate.toDateString() === today.toDateString();

          events.push({
            id: `due-${task.id}-${currentMonth}`,
            type: 'invoice_due',
            title: `Invoice Due: ${task.name}`,
            subtitle: `Create invoice for ${task.clientName || 'client'}`,
            date: dueDate,
            status: isToday ? 'today' : 'upcoming',
            priority: 'medium',
            taskId: task.id,
            taskName: task.name,
            metadata: {
              clientName: task.clientName || undefined,
              amount: task.hourlyRate && task.hoursWorked
                ? Number(task.hourlyRate) * Number(task.hoursWorked)
                : undefined,
              currency: task.currency
            }
          });
        }
      }
    }

    // Sort events by date
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    res.json(events);
  } catch (error) {
    console.error('GetDashboardEvents error:', error);
    res.status(500).json({ error: 'Failed to get dashboard events' });
  }
}

export async function getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Count active reminders
    const activeReminders = await prisma.task.count({
      where: {
        userId: req.userId,
        type: 'REMINDER',
        isActive: true
      }
    });

    // Count reminders due today
    const remindersToday = await prisma.task.count({
      where: {
        userId: req.userId,
        type: 'REMINDER',
        isActive: true,
        nextOccurrence: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    // Count active invoice tasks
    const activeInvoiceTasks = await prisma.task.count({
      where: {
        userId: req.userId,
        type: 'INVOICE',
        isActive: true
      }
    });

    // Count unpaid invoices
    const unpaidInvoices = await prisma.invoice.count({
      where: {
        userId: req.userId,
        status: { in: ['DRAFT', 'SENT'] }
      }
    });

    // Total invoiced amount this month
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthlyInvoices = await prisma.invoice.aggregate({
      where: {
        userId: req.userId,
        invoiceMonth: currentMonth,
        invoiceYear: currentYear
      },
      _sum: { amount: true }
    });

    res.json({
      activeReminders,
      remindersToday,
      activeInvoiceTasks,
      unpaidInvoices,
      monthlyTotal: monthlyInvoices._sum.amount ? Number(monthlyInvoices._sum.amount) : 0
    });
  } catch (error) {
    console.error('GetDashboardStats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
}
