import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  getTaxSettings,
  updateTaxSettings,
  calculateMonthlyTax,
  getYearlySummary,
  getTaxDashboard,
  getTaxConstants
} from '../controllers/tax.controller.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Tax settings
router.get('/settings', getTaxSettings);
router.put('/settings', updateTaxSettings);

// Tax calculations
router.get('/calculate', calculateMonthlyTax);
router.get('/yearly/:year', getYearlySummary);
router.get('/dashboard', getTaxDashboard);

// Reference data
router.get('/constants', getTaxConstants);

export default router;
