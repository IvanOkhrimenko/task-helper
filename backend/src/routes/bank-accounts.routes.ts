import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  getBankAccounts,
  getBankAccount,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  setDefaultBankAccount
} from '../controllers/bank-accounts.controller.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', getBankAccounts);
router.get('/:id', getBankAccount);
router.post('/', createBankAccount);
router.put('/:id', updateBankAccount);
router.delete('/:id', deleteBankAccount);
router.patch('/:id/default', setDefaultBankAccount);

export default router;
