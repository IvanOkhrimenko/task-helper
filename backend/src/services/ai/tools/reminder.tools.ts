import { ToolDefinition } from '../providers/ai-provider.interface';
import { toolRegistry, ToolContext } from './tool-registry';
import { ScheduleType } from '@prisma/client';

// Helper to calculate next occurrence
function calculateNextOccurrence(
  scheduleType: ScheduleType,
  scheduleConfig: any,
  reminderDateTime?: Date
): Date {
  const now = new Date();

  switch (scheduleType) {
    case 'ONE_TIME':
      return reminderDateTime || now;

    case 'DAILY': {
      const [hours, minutes] = (scheduleConfig?.time || '09:00').split(':').map(Number);
      const next = new Date();
      next.setHours(hours, minutes, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }

    case 'WEEKLY': {
      const daysOfWeek: number[] = scheduleConfig?.daysOfWeek || [1]; // Default Monday
      const [hours, minutes] = (scheduleConfig?.time || '09:00').split(':').map(Number);
      const next = new Date();
      next.setHours(hours, minutes, 0, 0);

      // Find next valid day
      for (let i = 0; i < 8; i++) {
        const checkDate = new Date(next);
        checkDate.setDate(checkDate.getDate() + i);
        if (daysOfWeek.includes(checkDate.getDay()) && checkDate > now) {
          return checkDate;
        }
      }
      return next;
    }

    case 'MONTHLY': {
      const dayOfMonth = scheduleConfig?.dayOfMonth || 1;
      const [hours, minutes] = (scheduleConfig?.time || '09:00').split(':').map(Number);
      const next = new Date();
      next.setDate(dayOfMonth);
      next.setHours(hours, minutes, 0, 0);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      return next;
    }

    case 'YEARLY': {
      const month = scheduleConfig?.month ?? now.getMonth();
      const dayOfMonth = scheduleConfig?.dayOfMonth || 1;
      const [hours, minutes] = (scheduleConfig?.time || '09:00').split(':').map(Number);
      const next = new Date(now.getFullYear(), month, dayOfMonth, hours, minutes, 0, 0);
      if (next <= now) {
        next.setFullYear(next.getFullYear() + 1);
      }
      return next;
    }

    default:
      return now;
  }
}

// List Reminders Tool
const listRemindersDefinition: ToolDefinition = {
  name: 'listReminders',
  description: 'List all reminders. Use when user asks about their reminders or scheduled tasks.',
  parameters: {
    type: 'object',
    properties: {
      isActive: {
        type: 'boolean',
        description: 'Filter by active status'
      },
      upcoming: {
        type: 'boolean',
        description: 'Only show upcoming reminders (next 7 days)'
      }
    },
    required: []
  },
  requiresConfirmation: false
};

async function listRemindersHandler(
  args: Record<string, unknown>,
  context: ToolContext
): Promise<unknown> {
  const { userId, prisma } = context;
  const isActive = args.isActive as boolean | undefined;
  const upcoming = args.upcoming as boolean | undefined;

  const where: any = {
    userId,
    type: 'REMINDER'
  };

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (upcoming) {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    where.nextOccurrence = {
      gte: new Date(),
      lte: sevenDaysFromNow
    };
  }

  const reminders = await prisma.task.findMany({
    where,
    orderBy: { nextOccurrence: 'asc' },
    select: {
      id: true,
      reminderTitle: true,
      reminderMessage: true,
      scheduleType: true,
      scheduleConfig: true,
      reminderDateTime: true,
      nextOccurrence: true,
      lastTriggered: true,
      isActive: true,
      notificationEmail: true
    }
  });

  return {
    count: reminders.length,
    reminders: reminders.map(r => ({
      id: r.id,
      title: r.reminderTitle,
      message: r.reminderMessage,
      scheduleType: r.scheduleType,
      scheduleConfig: r.scheduleConfig,
      nextOccurrence: r.nextOccurrence?.toISOString(),
      lastTriggered: r.lastTriggered?.toISOString(),
      isActive: r.isActive,
      notificationEmail: r.notificationEmail
    }))
  };
}

// Create Reminder Tool
const createReminderDefinition: ToolDefinition = {
  name: 'createReminder',
  description: 'Create a new reminder. Use when user asks to remind them about something, set a reminder, or schedule a notification.',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Title/name of the reminder'
      },
      message: {
        type: 'string',
        description: 'Detailed message or description'
      },
      scheduleType: {
        type: 'string',
        description: 'How often the reminder should repeat',
        enum: ['ONE_TIME', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']
      },
      dateTime: {
        type: 'string',
        description: 'For ONE_TIME: specific date and time in ISO format (e.g., "2024-12-25T10:00:00")'
      },
      time: {
        type: 'string',
        description: 'Time of day for recurring reminders (e.g., "09:00", "14:30")'
      },
      daysOfWeek: {
        type: 'array',
        description: 'For WEEKLY: array of days (0=Sunday, 1=Monday, ... 6=Saturday)',
        items: { type: 'number' }
      },
      dayOfMonth: {
        type: 'number',
        description: 'For MONTHLY: day of month (1-31)'
      },
      month: {
        type: 'number',
        description: 'For YEARLY: month (0-11)'
      },
      notificationEmail: {
        type: 'string',
        description: 'Email to send notifications to (optional, defaults to user email)'
      }
    },
    required: ['title', 'scheduleType']
  },
  requiresConfirmation: true
};

async function createReminderHandler(
  args: Record<string, unknown>,
  context: ToolContext
): Promise<unknown> {
  const { userId, prisma } = context;

  const title = args.title as string;
  const message = args.message as string | undefined;
  const scheduleType = args.scheduleType as ScheduleType;

  // Build schedule config
  const scheduleConfig: any = {};

  if (args.time) {
    scheduleConfig.time = args.time;
  }

  if (args.daysOfWeek) {
    scheduleConfig.daysOfWeek = args.daysOfWeek;
  }

  if (args.dayOfMonth !== undefined) {
    scheduleConfig.dayOfMonth = args.dayOfMonth;
  }

  if (args.month !== undefined) {
    scheduleConfig.month = args.month;
  }

  // Parse dateTime for ONE_TIME
  let reminderDateTime: Date | undefined;
  if (scheduleType === 'ONE_TIME' && args.dateTime) {
    reminderDateTime = new Date(args.dateTime as string);
    if (isNaN(reminderDateTime.getTime())) {
      return { error: 'Invalid dateTime format. Please use ISO format (e.g., "2024-12-25T10:00:00")' };
    }
  }

  // Calculate next occurrence
  const nextOccurrence = calculateNextOccurrence(scheduleType, scheduleConfig, reminderDateTime);

  const reminder = await prisma.task.create({
    data: {
      type: 'REMINDER',
      name: title,
      reminderTitle: title,
      reminderMessage: message,
      scheduleType,
      scheduleConfig: Object.keys(scheduleConfig).length > 0 ? scheduleConfig : null,
      reminderDateTime,
      nextOccurrence,
      isActive: true,
      notificationEmail: args.notificationEmail as string || null,
      userId
    },
    select: {
      id: true,
      reminderTitle: true,
      scheduleType: true,
      nextOccurrence: true
    }
  });

  const scheduleTypeLabels: Record<string, string> = {
    ONE_TIME: 'One-time',
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    MONTHLY: 'Monthly',
    YEARLY: 'Yearly'
  };

  return {
    success: true,
    message: `Reminder "${title}" created successfully`,
    reminder: {
      id: reminder.id,
      title: reminder.reminderTitle,
      scheduleType: scheduleTypeLabels[scheduleType] || scheduleType,
      nextOccurrence: reminder.nextOccurrence?.toISOString()
    }
  };
}

// Delete Reminder Tool
const deleteReminderDefinition: ToolDefinition = {
  name: 'deleteReminder',
  description: 'Delete an existing reminder. Use when user wants to remove or cancel a reminder.',
  parameters: {
    type: 'object',
    properties: {
      reminderId: {
        type: 'string',
        description: 'The reminder ID to delete (get from listReminders)'
      },
      title: {
        type: 'string',
        description: 'Alternatively, find reminder by title (partial match)'
      }
    },
    required: []
  },
  requiresConfirmation: true
};

async function deleteReminderHandler(
  args: Record<string, unknown>,
  context: ToolContext
): Promise<unknown> {
  const { userId, prisma } = context;
  const reminderId = args.reminderId as string | undefined;
  const title = args.title as string | undefined;

  if (!reminderId && !title) {
    return { error: 'Please provide either reminderId or title to identify the reminder' };
  }

  // Find the reminder
  const where: any = { userId, type: 'REMINDER' };
  if (reminderId) {
    where.id = reminderId;
  } else if (title) {
    where.reminderTitle = { contains: title, mode: 'insensitive' };
  }

  const reminder = await prisma.task.findFirst({ where });

  if (!reminder) {
    return { error: 'Reminder not found' };
  }

  await prisma.task.delete({ where: { id: reminder.id } });

  return {
    success: true,
    message: `Reminder "${reminder.reminderTitle}" deleted successfully`
  };
}

// Register tools
export function registerReminderTools(): void {
  toolRegistry.register(listRemindersDefinition, listRemindersHandler);
  toolRegistry.register(createReminderDefinition, createReminderHandler);
  toolRegistry.register(deleteReminderDefinition, deleteReminderHandler);
}
