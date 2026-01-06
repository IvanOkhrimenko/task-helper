import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';
import {
  getIntegrationSettings,
  updateIntegrationSettings,
  testGoogleConnection,
} from '../controllers/integrations.controller.js';

const router = Router();

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/integrations/settings - Get integration settings
router.get('/settings', getIntegrationSettings);

// PUT /api/integrations/settings - Update integration settings
router.put('/settings', updateIntegrationSettings);

// POST /api/integrations/google/test - Test Google connection
router.post('/google/test', testGoogleConnection);

export default router;
