import { Router } from 'express';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  toggleTask,
  archiveTask,
  unarchiveTask
} from '../controllers/tasks.controller.js';
import { generateInvoice } from '../controllers/invoices.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getTasks);
router.get('/:id', getTask);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/toggle', toggleTask);
router.patch('/:id/archive', archiveTask);
router.patch('/:id/unarchive', unarchiveTask);
router.post('/:id/generate-invoice', generateInvoice);

export default router;
