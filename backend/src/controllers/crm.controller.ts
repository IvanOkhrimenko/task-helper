import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { crmService } from '../services/crm.service.js';
import { GenericCRMService } from '../services/generic-crm.service.js';
import { PrismaClient } from '@prisma/client';
import { ActivityLogService } from '../services/activity-log.service.js';

/**
 * Test CRM connection (legacy hardcoded CRM)
 */
export async function testCRMConnection(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await crmService.testConnection();
    res.json(result);
  } catch (error) {
    console.error('CRM test connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing CRM connection',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Sync invoice to CRM
 * Uses GenericCRMService if task has crmIntegrationId,
 * otherwise falls back to legacy hardcoded crmService
 */
export async function syncInvoiceToCRM(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');

  try {
    const { invoiceId } = req.params;
    const { integrationId } = req.query; // Optional override
    const userId = req.userId;

    // Get invoice with task (including bank account and CRM integration) and user info
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId,
      },
      include: {
        task: {
          include: {
            bankAccount: true,
            crmIntegration: true,
          }
        },
        user: true,
      },
    });

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
      return;
    }

    // Check if already synced (prevent duplicates - critical for tax purposes!)
    if (invoice.crmInvoiceId || invoice.crmSyncedAt) {
      res.status(400).json({
        success: false,
        message: 'Invoice already synced to CRM. Cannot create duplicate invoices.',
        crmInvoiceId: invoice.crmInvoiceId,
        crmSyncedAt: invoice.crmSyncedAt,
      });
      return;
    }

    // Determine which CRM integration to use:
    // 1. Query param integrationId (explicit override)
    // 2. Task's crmIntegrationId
    // 3. User's first active CRM integration
    // 4. Fall back to legacy hardcoded CRM service
    let targetIntegrationId: string | null = null;

    if (typeof integrationId === 'string' && integrationId) {
      targetIntegrationId = integrationId;
    } else if (invoice.task?.crmIntegrationId) {
      targetIntegrationId = invoice.task.crmIntegrationId;
    } else {
      // Try to find user's default (first active) integration
      const defaultIntegration = await prisma.cRMIntegration.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      if (defaultIntegration) {
        targetIntegrationId = defaultIntegration.id;
      }
    }

    let result;

    if (targetIntegrationId) {
      // Verify integration belongs to user
      const integration = await prisma.cRMIntegration.findFirst({
        where: { id: targetIntegrationId, userId },
      });

      if (!integration) {
        res.status(404).json({
          success: false,
          message: 'CRM integration not found',
        });
        return;
      }

      // Use GenericCRMService
      console.log(`[CRM] Using integration "${integration.name}" (${integration.id})`);
      const genericCrmService = new GenericCRMService(prisma);
      result = await genericCrmService.createInvoice(targetIntegrationId, invoice);
    } else {
      // Fall back to legacy hardcoded CRM service
      console.log('[CRM] Using legacy hardcoded CRM service');
      result = await crmService.createInvoice(invoice);
    }

    if (result.success) {
      // Update invoice - always set crmSyncedAt, set crmInvoiceId if available
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          crmInvoiceId: result.crmInvoiceId || `synced-${Date.now()}`, // Fallback ID if CRM doesn't return one
          crmSyncedAt: new Date(),
        },
      });

      // Log activity
      const activityService = new ActivityLogService(prisma);
      await activityService.logInvoiceActivity(
        invoiceId,
        invoice.task!.id,
        'CRM_SYNCED',
        userId!,
        undefined,
        {
          crmInvoiceId: result.crmInvoiceId,
          integrationName: targetIntegrationId ? 'Generic CRM' : 'Legacy CRM'
        }
      );
    }

    res.json(result);
  } catch (error) {
    console.error('CRM sync invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Error syncing invoice to CRM',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get CRM configuration status
 */
export async function getCRMStatus(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const userId = req.userId;

  // Check for legacy config
  const legacyConfigured = !!(process.env.CRM_EMAIL && process.env.CRM_PASSWORD);

  // Check for user's CRM integrations
  const integrations = await prisma.cRMIntegration.findMany({
    where: { userId, isActive: true },
    select: { id: true, name: true },
  });

  res.json({
    legacyConfigured,
    legacyBaseUrl: legacyConfigured ? 'crm.mcgroup.pl' : null,
    integrations,
    hasIntegrations: integrations.length > 0,
  });
}

/**
 * Fetch and download PDF from CRM for an invoice
 */
export async function fetchInvoicePdf(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');

  try {
    const { invoiceId } = req.params;
    const { integrationId } = req.query;
    const userId = req.userId;

    // Get invoice with task
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId,
      },
      include: {
        task: {
          include: {
            crmIntegration: true,
          }
        },
      },
    });

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
      return;
    }

    // Determine which CRM integration to use
    let targetIntegrationId: string | null = null;

    if (typeof integrationId === 'string' && integrationId) {
      targetIntegrationId = integrationId;
    } else if (invoice.task?.crmIntegrationId) {
      targetIntegrationId = invoice.task.crmIntegrationId;
    } else {
      const defaultIntegration = await prisma.cRMIntegration.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      if (defaultIntegration) {
        targetIntegrationId = defaultIntegration.id;
      }
    }

    if (!targetIntegrationId) {
      res.status(400).json({
        success: false,
        message: 'No CRM integration configured',
      });
      return;
    }

    // Verify integration belongs to user and has listInvoicesUrl
    const integration = await prisma.cRMIntegration.findFirst({
      where: { id: targetIntegrationId, userId },
    });

    if (!integration) {
      res.status(404).json({
        success: false,
        message: 'CRM integration not found',
      });
      return;
    }

    if (!integration.listInvoicesUrl) {
      res.status(400).json({
        success: false,
        message: 'CRM integration does not have invoice list URL configured',
      });
      return;
    }

    // Fetch PDF using GenericCRMService
    const genericCrmService = new GenericCRMService(prisma);
    const result = await genericCrmService.fetchInvoicePdf(targetIntegrationId, invoice);

    if (result.pdfPath) {
      // Log activity
      const activityService = new ActivityLogService(prisma);
      await activityService.logInvoiceActivity(
        invoiceId,
        invoice.task!.id,
        'CRM_PDF_FETCHED',
        userId!,
        undefined,
        { pdfUrl: result.pdfUrl, pdfPath: result.pdfPath }
      );

      res.json({
        success: true,
        message: 'PDF downloaded successfully',
        pdfUrl: result.pdfUrl,
        pdfPath: result.pdfPath,
      });
    } else if (result.pdfUrl) {
      res.json({
        success: false,
        message: 'Found PDF URL but could not download',
        pdfUrl: result.pdfUrl,
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Could not find invoice PDF in CRM',
      });
    }
  } catch (error) {
    console.error('CRM fetch PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching PDF from CRM',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
