import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware.js';
import {
  getAuthUrl,
  exchangeCodeForTokens,
  getUserInfo,
  createGmailDraft
} from '../services/gmail.service.js';
import { StorageService } from '../services/storage.service.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

export async function getGoogleAccounts(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');

  try {
    const accounts = await prisma.googleAccount.findMany({
      where: { userId: req.userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(accounts);
  } catch (error) {
    console.error('GetGoogleAccounts error:', error);
    res.status(500).json({ error: 'Failed to get Google accounts' });
  }
}

export async function initiateGoogleAuth(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');

  try {
    // Include userId in state for the callback
    const state = Buffer.from(JSON.stringify({ userId: req.userId })).toString('base64');
    const authUrl = await getAuthUrl(prisma, state);

    res.json({ authUrl });
  } catch (error: any) {
    console.error('InitiateGoogleAuth error:', error);
    res.status(500).json({ error: error.message || 'Failed to initiate Google auth' });
  }
}

export async function handleGoogleCallback(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { code, state, error: oauthError } = req.query;

  try {
    // Handle OAuth errors
    if (oauthError) {
      console.error('OAuth error:', oauthError);
      res.redirect(`${FRONTEND_URL}/profile?google=error&message=${encodeURIComponent(oauthError as string)}`);
      return;
    }

    if (!code || typeof code !== 'string') {
      res.redirect(`${FRONTEND_URL}/profile?google=error&message=No authorization code`);
      return;
    }

    // Decode state to get userId
    let userId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      userId = stateData.userId;
    } catch {
      res.redirect(`${FRONTEND_URL}/profile?google=error&message=Invalid state`);
      return;
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(prisma, code);

    if (!tokens.access_token || !tokens.refresh_token) {
      res.redirect(`${FRONTEND_URL}/profile?google=error&message=Failed to get tokens`);
      return;
    }

    // Get user info from Google
    const userInfo = await getUserInfo(prisma, tokens.access_token);

    if (!userInfo.email) {
      res.redirect(`${FRONTEND_URL}/profile?google=error&message=Failed to get email`);
      return;
    }

    // Save or update Google account
    await prisma.googleAccount.upsert({
      where: {
        userId_email: {
          userId,
          email: userInfo.email
        }
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expiry_date!)
      },
      create: {
        userId,
        email: userInfo.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expiry_date!)
      }
    });

    res.redirect(`${FRONTEND_URL}/profile?google=success&email=${encodeURIComponent(userInfo.email)}`);
  } catch (error: any) {
    console.error('HandleGoogleCallback error:', error);
    res.redirect(`${FRONTEND_URL}/profile?google=error&message=${encodeURIComponent(error.message || 'Authentication failed')}`);
  }
}

export async function deleteGoogleAccount(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    // Verify ownership
    const account = await prisma.googleAccount.findFirst({
      where: { id, userId: req.userId }
    });

    if (!account) {
      res.status(404).json({ error: 'Google account not found' });
      return;
    }

    // Clear googleAccountId from tasks using this account
    await prisma.task.updateMany({
      where: { googleAccountId: id },
      data: { googleAccountId: null }
    });

    // Delete the account
    await prisma.googleAccount.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('DeleteGoogleAccount error:', error);
    res.status(500).json({ error: 'Failed to delete Google account' });
  }
}

interface CreateDraftBody {
  googleAccountId: string;
  to: string;
  subject: string;
  body: string;
  invoiceId?: string;
}

export async function createDraft(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { googleAccountId, to, subject, body, invoiceId } = req.body as CreateDraftBody;

  try {
    if (!googleAccountId || !to || !subject || !body) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Get Google account and verify ownership
    const googleAccount = await prisma.googleAccount.findFirst({
      where: { id: googleAccountId, userId: req.userId }
    });

    if (!googleAccount) {
      res.status(404).json({ error: 'Google account not found' });
      return;
    }

    // Get invoice PDF if provided
    let attachmentBase64: string | undefined;
    let attachmentFilename: string | undefined;

    if (invoiceId) {
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, userId: req.userId }
      });

      if (invoice?.pdfPath) {
        // Read PDF file from storage (local or R2) and convert to base64
        try {
          const pdfBuffer = await StorageService.getFile(invoice.pdfPath);
          if (pdfBuffer) {
            attachmentBase64 = pdfBuffer.toString('base64');
            attachmentFilename = StorageService.getFileName(invoice.pdfPath);
          }
        } catch (err) {
          console.error('Failed to read PDF:', err);
          // Continue without attachment
        }
      }
    }

    const result = await createGmailDraft(prisma, googleAccount, {
      to,
      subject,
      body,
      attachmentBase64,
      attachmentFilename
    });

    res.json({
      success: true,
      draftId: result.draftId,
      webLink: result.webLink
    });
  } catch (error) {
    console.error('CreateDraft error:', error);
    res.status(500).json({ error: 'Failed to create Gmail draft' });
  }
}
