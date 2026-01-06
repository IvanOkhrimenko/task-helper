import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware.js';

export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string | undefined;

  try {
    const where: any = {
      userId: req.userId,
      type: 'IN_APP' // Only return in-app notifications for the UI
    };
    if (status) {
      where.status = status;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          task: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.notification.count({ where })
    ]);

    res.json({
      data: notifications,
      total,
      page,
      limit,
      hasMore: page * limit < total
    });
  } catch (error) {
    console.error('GetNotifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
}

export async function getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');

  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.userId,
        type: 'IN_APP', // Only count in-app notifications
        status: { in: ['PENDING', 'SENT'] },
        readAt: null
      }
    });

    res.json({ count });
  } catch (error) {
    console.error('GetUnreadCount error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
}

export async function clearAllNotifications(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');

  try {
    const result = await prisma.notification.deleteMany({
      where: {
        userId: req.userId,
        type: 'IN_APP'
      }
    });

    res.json({ count: result.count });
  } catch (error) {
    console.error('ClearAllNotifications error:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
}

export async function markAsRead(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const existing = await prisma.notification.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: {
        status: 'READ',
        readAt: new Date()
      }
    });

    res.json(notification);
  } catch (error) {
    console.error('MarkAsRead error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}

export async function markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');

  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: req.userId,
        readAt: null
      },
      data: {
        status: 'READ',
        readAt: new Date()
      }
    });

    res.json({ count: result.count });
  } catch (error) {
    console.error('MarkAllAsRead error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
}

export async function deleteNotification(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const existing = await prisma.notification.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    await prisma.notification.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('DeleteNotification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
}

export async function subscribeToPush(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { subscription } = req.body;

  if (!subscription) {
    res.status(400).json({ error: 'Subscription object is required' });
    return;
  }

  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        pushSubscription: subscription,
        pushNotifications: true
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('SubscribeToPush error:', error);
    res.status(500).json({ error: 'Failed to subscribe to push notifications' });
  }
}

export async function unsubscribeFromPush(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');

  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        pushSubscription: null,
        pushNotifications: false
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('UnsubscribeFromPush error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from push notifications' });
  }
}

export async function updateNotificationPreferences(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { emailNotifications, pushNotifications } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        emailNotifications: emailNotifications !== undefined ? emailNotifications : undefined,
        pushNotifications: pushNotifications !== undefined ? pushNotifications : undefined
      },
      select: {
        id: true,
        emailNotifications: true,
        pushNotifications: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error('UpdateNotificationPreferences error:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
}
