import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpensesSummary,
  getExpenseCategories
} from '../controllers/expense.controller.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Reference data
router.get('/categories', getExpenseCategories);

// Summary
router.get('/summary', getExpensesSummary);

// CRUD
router.get('/', getExpenses);
router.get('/:id', getExpense);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;
