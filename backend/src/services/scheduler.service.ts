import { PrismaClient, ScheduleType, NotificationType, NotificationStatus } from '@prisma/client';
import { calculateNextOccurrence } from '../controllers/reminders.controller.js';
import emailService from './email.service.js';

interface ScheduleConfig {
  time?: string;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  month?: number;
  intervalMinutes?: number;
}

/**
 * Scheduler service that processes due reminders and creates notifications
 */
export class SchedulerService {
  private prisma: PrismaClient;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Start the scheduler - runs every minute to check for due reminders
   */
  start(intervalMs: number = 60000): void {
    if (this.intervalId) {
      console.log('Scheduler is already running');
      return;
    }

    console.log('Starting reminder scheduler...');

    // Run immediately on start
    this.processReminders();

    // Then run at interval
    this.intervalId = setInterval(() => {
      this.processReminders();
    }, intervalMs);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Scheduler stopped');
    }
  }

  /**
   * Process all due reminders
   */
  async processReminders(): Promise<void> {
    if (this.isRunning) {
      return; // Prevent overlapping runs
    }

    this.isRunning = true;

    try {
      const now = new Date();

      // Find all active reminders that are due
      const dueReminders = await this.prisma.task.findMany({
        where: {
          type: 'REMINDER',
          isActive: true,
          nextOccurrence: {
            lte: now
          }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              emailNotifications: true,
              pushNotifications: true,
              pushSubscription: true
            }
          }
        }
      });

      console.log(`Processing ${dueReminders.length} due reminder(s)`);

      for (const reminder of dueReminders) {
        await this.triggerReminder(reminder);
      }
    } catch (error) {
      console.error('Scheduler error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Trigger a single reminder - create notifications and update next occurrence
   */
  private async triggerReminder(reminder: any): Promise<void> {
    const now = new Date();
    const user = reminder.user;

    try {
      // Create notifications based on user preferences
      const notificationsToCreate = [];

      // Always create in-app notification
      notificationsToCreate.push({
        type: NotificationType.IN_APP,
        status: NotificationStatus.SENT,
        title: reminder.reminderTitle || reminder.name,
        message: reminder.reminderMessage || `Reminder: ${reminder.name}`,
        scheduledFor: now,
        sentAt: now,
        taskId: reminder.id,
        userId: user.id
      });

      // Create email notification if enabled
      if (user.emailNotifications) {
        notificationsToCreate.push({
          type: NotificationType.EMAIL,
          status: NotificationStatus.PENDING,
          title: reminder.reminderTitle || reminder.name,
          message: reminder.reminderMessage || `Reminder: ${reminder.name}`,
          scheduledFor: now,
          taskId: reminder.id,
          userId: user.id
        });
      }

      // Create push notification if enabled and subscribed
      if (user.pushNotifications && user.pushSubscription) {
        notificationsToCreate.push({
          type: NotificationType.BROWSER_PUSH,
          status: NotificationStatus.PENDING,
          title: reminder.reminderTitle || reminder.name,
          message: reminder.reminderMessage || `Reminder: ${reminder.name}`,
          scheduledFor: now,
          taskId: reminder.id,
          userId: user.id
        });
      }

      // Create all notifications
      await this.prisma.notification.createMany({
        data: notificationsToCreate
      });

      // Calculate next occurrence
      const nextOccurrence = calculateNextOccurrence(
        reminder.scheduleType as ScheduleType,
        reminder.scheduleConfig as ScheduleConfig | null,
        reminder.reminderDateTime,
        now
      );

      // Update the reminder
      const updateData: any = {
        lastTriggered: now
      };

      if (reminder.scheduleType === 'ONE_TIME') {
        // One-time reminders become inactive after triggering
        updateData.isActive = false;
        updateData.nextOccurrence = null;
      } else if (nextOccurrence) {
        updateData.nextOccurrence = nextOccurrence;
      } else {
        // No more occurrences, deactivate
        updateData.isActive = false;
        updateData.nextOccurrence = null;
      }

      await this.prisma.task.update({
        where: { id: reminder.id },
        data: updateData
      });

      console.log(`Triggered reminder: ${reminder.name} (${reminder.id})`);

      // Process email and push notifications asynchronously
      this.processEmailNotifications();
      this.processPushNotifications();

    } catch (error) {
      console.error(`Failed to trigger reminder ${reminder.id}:`, error);
    }
  }

  /**
   * Process pending email notifications
   */
  private async processEmailNotifications(): Promise<void> {
    if (!emailService.isReady()) {
      console.log('Email service not configured, skipping email notifications');
      return;
    }

    try {
      const pendingEmails = await this.prisma.notification.findMany({
        where: {
          type: NotificationType.EMAIL,
          status: NotificationStatus.PENDING
        },
        include: {
          user: {
            select: {
              email: true,
              name: true
            }
          },
          task: {
            select: {
              name: true,
              notificationEmail: true,
              reminderTitle: true,
              reminderMessage: true,
              nextOccurrence: true
            }
          }
        },
        take: 10 // Process in batches
      });

      for (const notification of pendingEmails) {
        try {
          // Use custom notification email if set, otherwise use user's email
          const recipientEmail = notification.task?.notificationEmail || notification.user.email;

          const success = await emailService.sendReminderEmail({
            recipientEmail,
            recipientName: notification.user.name,
            reminderTitle: notification.title,
            reminderMessage: notification.message,
            reminderName: notification.task?.name || notification.title,
            nextOccurrence: notification.task?.nextOccurrence
          });

          if (success) {
            await this.prisma.notification.update({
              where: { id: notification.id },
              data: {
                status: NotificationStatus.SENT,
                sentAt: new Date()
              }
            });
            console.log(`Email notification sent: ${notification.id} to ${recipientEmail}`);
          } else {
            await this.prisma.notification.update({
              where: { id: notification.id },
              data: { status: NotificationStatus.FAILED }
            });
          }
        } catch (error) {
          await this.prisma.notification.update({
            where: { id: notification.id },
            data: { status: NotificationStatus.FAILED }
          });
          console.error(`Failed to send email notification ${notification.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Email processing error:', error);
    }
  }

  /**
   * Process pending push notifications
   */
  private async processPushNotifications(): Promise<void> {
    try {
      const pendingPush = await this.prisma.notification.findMany({
        where: {
          type: NotificationType.BROWSER_PUSH,
          status: NotificationStatus.PENDING
        },
        include: {
          user: {
            select: {
              pushSubscription: true
            }
          }
        },
        take: 10 // Process in batches
      });

      for (const notification of pendingPush) {
        try {
          // TODO: Integrate with web-push service
          // await pushService.sendPushNotification(notification);

          await this.prisma.notification.update({
            where: { id: notification.id },
            data: {
              status: NotificationStatus.SENT,
              sentAt: new Date()
            }
          });

          console.log(`Push notification sent: ${notification.id}`);
        } catch (error) {
          await this.prisma.notification.update({
            where: { id: notification.id },
            data: { status: NotificationStatus.FAILED }
          });
          console.error(`Failed to send push notification ${notification.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Push processing error:', error);
    }
  }

  /**
   * Process warning notifications for upcoming reminders
   */
  async processWarnings(): Promise<void> {
    try {
      const now = new Date();

      // Find reminders with warnings that haven't been sent yet
      const remindersWithWarnings = await this.prisma.task.findMany({
        where: {
          type: 'REMINDER',
          isActive: true,
          reminderWarning: { not: null },
          nextOccurrence: { not: null }
        },
        include: {
          user: {
            select: {
              id: true,
              emailNotifications: true,
              pushNotifications: true
            }
          }
        }
      });

      for (const reminder of remindersWithWarnings) {
        if (!reminder.nextOccurrence || !reminder.reminderWarning) continue;

        const warningTime = new Date(reminder.nextOccurrence);
        warningTime.setMinutes(warningTime.getMinutes() - reminder.reminderWarning);

        // Check if we're within the warning window
        if (warningTime <= now && now < reminder.nextOccurrence) {
          // Check if warning notification already exists
          const existingWarning = await this.prisma.notification.findFirst({
            where: {
              taskId: reminder.id,
              title: { contains: '[Warning]' },
              createdAt: { gte: warningTime }
            }
          });

          if (!existingWarning) {
            await this.prisma.notification.create({
              data: {
                type: NotificationType.IN_APP,
                status: NotificationStatus.SENT,
                title: `[Warning] ${reminder.reminderTitle || reminder.name}`,
                message: `Upcoming in ${reminder.reminderWarning} minutes: ${reminder.reminderMessage || reminder.name}`,
                scheduledFor: warningTime,
                sentAt: now,
                taskId: reminder.id,
                userId: reminder.userId
              }
            });

            console.log(`Warning notification created for: ${reminder.name}`);
          }
        }
      }
    } catch (error) {
      console.error('Warning processing error:', error);
    }
  }
}

// Singleton instance
let schedulerInstance: SchedulerService | null = null;

export function initScheduler(prisma: PrismaClient): SchedulerService {
  if (!schedulerInstance) {
    schedulerInstance = new SchedulerService(prisma);
  }
  return schedulerInstance;
}

export function getScheduler(): SchedulerService | null {
  return schedulerInstance;
}
