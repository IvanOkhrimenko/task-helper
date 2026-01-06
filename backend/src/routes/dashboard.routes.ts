import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getDashboardEvents, getDashboardStats } from '../controllers/dashboard.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/events', getDashboardEvents);
router.get('/stats', getDashboardStats);

export default router;
