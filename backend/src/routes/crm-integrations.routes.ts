import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  getCRMIntegrations,
  getCRMIntegration,
  createCRMIntegration,
  updateCRMIntegration,
  deleteCRMIntegration,
  testCRMConnection,
  parseCurl,
  getPlaceholders,
} from '../controllers/crm-integrations.controller.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// CRUD operations
router.get('/', getCRMIntegrations);
router.get('/placeholders', getPlaceholders);
router.get('/:id', getCRMIntegration);
router.post('/', createCRMIntegration);
router.put('/:id', updateCRMIntegration);
router.delete('/:id', deleteCRMIntegration);

// Special operations
router.post('/:id/test', testCRMConnection);
router.post('/parse-curl', parseCurl);

export default router;
