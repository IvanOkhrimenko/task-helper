import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  archiveClient,
  unarchiveClient,
  toggleClientActive
} from '../controllers/clients.controller.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// CRUD operations
router.get('/', getClients);
router.get('/:id', getClient);
router.post('/', createClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

// Status operations
router.patch('/:id/toggle', toggleClientActive);
router.patch('/:id/archive', archiveClient);
router.patch('/:id/unarchive', unarchiveClient);

export default router;
