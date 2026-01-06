import { Router } from 'express';
import {
  getReminders,
  getReminder,
  createReminder,
  updateReminder,
  deleteReminder,
  toggleReminder,
  snoozeReminder
} from '../controllers/reminders.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// CRUD operations
router.get('/', getReminders);
router.get('/:id', getReminder);
router.post('/', createReminder);
router.put('/:id', updateReminder);
router.delete('/:id', deleteReminder);

// Special actions
router.patch('/:id/toggle', toggleReminder);
router.patch('/:id/snooze', snoozeReminder);

export default router;
