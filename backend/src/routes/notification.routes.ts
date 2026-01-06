import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
  deleteNotification,
  subscribeToPush,
  unsubscribeFromPush,
  updateNotificationPreferences
} from '../controllers/notifications.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get notifications with pagination
router.get('/', getNotifications);

// Get unread count for badge
router.get('/unread-count', getUnreadCount);

// Mark single notification as read
router.patch('/:id/read', markAsRead);

// Mark all notifications as read
router.patch('/read-all', markAllAsRead);

// Clear all notifications
router.delete('/clear-all', clearAllNotifications);

// Delete a notification
router.delete('/:id', deleteNotification);

// Push notification subscription
router.post('/push/subscribe', subscribeToPush);
router.delete('/push/unsubscribe', unsubscribeFromPush);

// Update notification preferences
router.patch('/preferences', updateNotificationPreferences);

export default router;
