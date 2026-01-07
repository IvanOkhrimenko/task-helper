import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  testCRMConnection,
  syncInvoiceToCRM,
  getCRMStatus,
  fetchInvoicePdf,
} from '../controllers/crm.controller.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/crm/status - Get CRM configuration status
router.get('/status', getCRMStatus);

// POST /api/crm/test - Test CRM connection
router.post('/test', testCRMConnection);

// POST /api/crm/sync/:invoiceId - Sync invoice to CRM
router.post('/sync/:invoiceId', syncInvoiceToCRM);

// POST /api/crm/fetch-pdf/:invoiceId - Fetch and download PDF from CRM
router.post('/fetch-pdf/:invoiceId', fetchInvoicePdf);

export default router;
