import { Router } from 'express';
import { getTaskActivity, getInvoiceActivity } from '../controllers/activity-log.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/tasks/:taskId', getTaskActivity);
router.get('/invoices/:invoiceId', getInvoiceActivity);

export default router;
