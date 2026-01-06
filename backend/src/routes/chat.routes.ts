import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';
import {
  streamMessage,
  sendMessage,
  getConversations,
  createConversation,
  getConversation,
  deleteConversation,
  approveAction,
  rejectAction,
  getChatSettings,
  updateChatSettings,
  getSettingsForAdmin
} from '../controllers/chat.controller.js';

const router = Router();

// All chat routes require authentication
router.use(authMiddleware);

// Message endpoints
router.post('/message/stream', streamMessage);
router.post('/message', sendMessage);

// Conversation management
router.get('/conversations', getConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:id', getConversation);
router.delete('/conversations/:id', deleteConversation);

// Action confirmation
router.post('/actions/:id/approve', approveAction);
router.post('/actions/:id/reject', rejectAction);

// Settings - public (limited info)
router.get('/settings', getChatSettings);

// Admin-only settings endpoints
router.get('/settings/admin', adminMiddleware, getSettingsForAdmin);
router.put('/settings', adminMiddleware, updateChatSettings);

export default router;
