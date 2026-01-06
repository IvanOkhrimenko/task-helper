import { Router } from 'express';
import {
  getInvoices,
  getInvoice,
  downloadInvoicePDF,
  getEmailDraft,
  updateInvoiceStatus,
  updateInvoiceComments,
  archiveInvoice,
  unarchiveInvoice,
  deleteInvoice
} from '../controllers/invoices.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getInvoices);
router.get('/:id', getInvoice);
router.get('/:id/pdf', downloadInvoicePDF);
router.get('/:id/email-draft', getEmailDraft);
router.patch('/:id/status', updateInvoiceStatus);
router.patch('/:id/comments', updateInvoiceComments);
router.patch('/:id/archive', archiveInvoice);
router.patch('/:id/unarchive', unarchiveInvoice);
router.delete('/:id', deleteInvoice);

export default router;
