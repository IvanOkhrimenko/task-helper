import { Router } from 'express';
import {
  getGoogleAccounts,
  initiateGoogleAuth,
  handleGoogleCallback,
  deleteGoogleAccount,
  createDraft
} from '../controllers/google.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// OAuth callback doesn't need auth (user redirected from Google)
router.get('/callback', handleGoogleCallback);

// All other routes require authentication
router.use(authMiddleware);

// Get connected Google accounts
router.get('/accounts', getGoogleAccounts);

// Initiate Google OAuth flow
router.get('/auth', initiateGoogleAuth);

// Delete a connected Google account
router.delete('/accounts/:id', deleteGoogleAccount);

// Create Gmail draft
router.post('/gmail/draft', createDraft);

export default router;
