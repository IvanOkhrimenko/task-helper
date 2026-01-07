import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';
import {
  getIntegrationSettings,
  updateIntegrationSettings,
  testGoogleConnection,
  getPublicIntegrationStatus,
} from '../controllers/integrations.controller.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Public endpoint - available to all authenticated users
// GET /api/integrations/status - Get public status (googleEnabled only)
router.get('/status', getPublicIntegrationStatus);

// Admin-only routes
// GET /api/integrations/settings - Get integration settings (admin)
router.get('/settings', adminMiddleware, getIntegrationSettings);

// PUT /api/integrations/settings - Update integration settings (admin)
router.put('/settings', adminMiddleware, updateIntegrationSettings);

// POST /api/integrations/google/test - Test Google connection (admin)
router.post('/google/test', adminMiddleware, testGoogleConnection);

export default router;
