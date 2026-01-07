import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { parseCurlCommand, getAvailablePlaceholders } from '../utils/curl-parser.js';
import { GenericCRMService } from '../services/generic-crm.service.js';

/**
 * Get all CRM integrations for the current user
 */
export async function getCRMIntegrations(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');

  try {
    const integrations = await prisma.cRMIntegration.findMany({
      where: { userId: req.userId },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        isActive: true,
        loginUrl: true,
        email: true,
        createInvoiceUrl: true,
        createInvoiceMethod: true,
        headers: true,
        fieldMapping: true,
        staticFields: true,
        csrfSelector: true,
        csrfHeader: true,
        listInvoicesUrl: true,
        invoiceNumberPrefix: true,
        invoiceNumberSuffix: true,
        // Don't expose password and session data
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(integrations);
  } catch (error) {
    console.error('GetCRMIntegrations error:', error);
    res.status(500).json({ error: 'Failed to get CRM integrations' });
  }
}

/**
 * Get a single CRM integration
 */
export async function getCRMIntegration(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const integration = await prisma.cRMIntegration.findFirst({
      where: { id, userId: req.userId },
      select: {
        id: true,
        name: true,
        isActive: true,
        loginUrl: true,
        loginMethod: true,
        email: true,
        createInvoiceUrl: true,
        createInvoiceMethod: true,
        headers: true,
        fieldMapping: true,
        staticFields: true,
        csrfSelector: true,
        csrfHeader: true,
        listInvoicesUrl: true,
        invoiceNumberPrefix: true,
        invoiceNumberSuffix: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!integration) {
      res.status(404).json({ error: 'CRM integration not found' });
      return;
    }

    res.json(integration);
  } catch (error) {
    console.error('GetCRMIntegration error:', error);
    res.status(500).json({ error: 'Failed to get CRM integration' });
  }
}

/**
 * Create a new CRM integration
 */
export async function createCRMIntegration(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const {
    name,
    loginUrl,
    loginMethod,
    email,
    password,
    csrfSelector,
    csrfHeader,
    createInvoiceUrl,
    createInvoiceMethod,
    headers,
    fieldMapping,
    staticFields,
    isActive,
    listInvoicesUrl,
    invoiceNumberPrefix,
    invoiceNumberSuffix,
  } = req.body;

  // Validate required fields
  if (!name || !loginUrl || !email || !password || !createInvoiceUrl) {
    res.status(400).json({
      error: 'name, loginUrl, email, password, and createInvoiceUrl are required',
    });
    return;
  }

  // Validate URLs
  try {
    new URL(loginUrl);
    new URL(createInvoiceUrl);
    if (listInvoicesUrl) new URL(listInvoicesUrl);
  } catch {
    res.status(400).json({ error: 'Invalid URL format' });
    return;
  }

  try {
    const integration = await prisma.cRMIntegration.create({
      data: {
        name,
        loginUrl,
        loginMethod: loginMethod || 'POST',
        email,
        password, // TODO: encrypt in production
        csrfSelector: csrfSelector || null,
        csrfHeader: csrfHeader || null,
        createInvoiceUrl,
        createInvoiceMethod: createInvoiceMethod || 'POST',
        headers: headers || {},
        fieldMapping: fieldMapping || {},
        staticFields: staticFields || null,
        isActive: isActive !== false,
        listInvoicesUrl: listInvoicesUrl || null,
        invoiceNumberPrefix: invoiceNumberPrefix || null,
        invoiceNumberSuffix: invoiceNumberSuffix || null,
        userId: req.userId!,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        loginUrl: true,
        email: true,
        createInvoiceUrl: true,
        createInvoiceMethod: true,
        headers: true,
        fieldMapping: true,
        staticFields: true,
        csrfSelector: true,
        csrfHeader: true,
        listInvoicesUrl: true,
        invoiceNumberPrefix: true,
        invoiceNumberSuffix: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(integration);
  } catch (error) {
    console.error('CreateCRMIntegration error:', error);
    res.status(500).json({ error: 'Failed to create CRM integration' });
  }
}

/**
 * Update a CRM integration
 */
export async function updateCRMIntegration(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;
  const {
    name,
    loginUrl,
    loginMethod,
    email,
    password,
    csrfSelector,
    csrfHeader,
    createInvoiceUrl,
    createInvoiceMethod,
    headers,
    fieldMapping,
    staticFields,
    isActive,
    listInvoicesUrl,
    invoiceNumberPrefix,
    invoiceNumberSuffix,
  } = req.body;

  try {
    // Check ownership
    const existing = await prisma.cRMIntegration.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'CRM integration not found' });
      return;
    }

    // Validate URLs if provided
    if (loginUrl) {
      try {
        new URL(loginUrl);
      } catch {
        res.status(400).json({ error: 'Invalid loginUrl format' });
        return;
      }
    }
    if (createInvoiceUrl) {
      try {
        new URL(createInvoiceUrl);
      } catch {
        res.status(400).json({ error: 'Invalid createInvoiceUrl format' });
        return;
      }
    }
    if (listInvoicesUrl) {
      try {
        new URL(listInvoicesUrl);
      } catch {
        res.status(400).json({ error: 'Invalid listInvoicesUrl format' });
        return;
      }
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (loginUrl !== undefined) updateData.loginUrl = loginUrl;
    if (loginMethod !== undefined) updateData.loginMethod = loginMethod;
    if (email !== undefined) updateData.email = email;
    if (password !== undefined) updateData.password = password;
    if (csrfSelector !== undefined) updateData.csrfSelector = csrfSelector;
    if (csrfHeader !== undefined) updateData.csrfHeader = csrfHeader;
    if (createInvoiceUrl !== undefined) updateData.createInvoiceUrl = createInvoiceUrl;
    if (createInvoiceMethod !== undefined) updateData.createInvoiceMethod = createInvoiceMethod;
    if (headers !== undefined) updateData.headers = headers;
    if (fieldMapping !== undefined) updateData.fieldMapping = fieldMapping;
    if (staticFields !== undefined) updateData.staticFields = staticFields;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (listInvoicesUrl !== undefined) updateData.listInvoicesUrl = listInvoicesUrl || null;
    if (invoiceNumberPrefix !== undefined) updateData.invoiceNumberPrefix = invoiceNumberPrefix || null;
    if (invoiceNumberSuffix !== undefined) updateData.invoiceNumberSuffix = invoiceNumberSuffix || null;

    // Clear session if credentials changed
    if (password !== undefined || email !== undefined || loginUrl !== undefined) {
      updateData.sessionCookies = null;
      updateData.csrfToken = null;
      updateData.sessionExpiresAt = null;
    }

    const integration = await prisma.cRMIntegration.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        isActive: true,
        loginUrl: true,
        email: true,
        createInvoiceUrl: true,
        createInvoiceMethod: true,
        headers: true,
        fieldMapping: true,
        staticFields: true,
        csrfSelector: true,
        csrfHeader: true,
        listInvoicesUrl: true,
        invoiceNumberPrefix: true,
        invoiceNumberSuffix: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(integration);
  } catch (error) {
    console.error('UpdateCRMIntegration error:', error);
    res.status(500).json({ error: 'Failed to update CRM integration' });
  }
}

/**
 * Delete a CRM integration
 */
export async function deleteCRMIntegration(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    // Check ownership
    const existing = await prisma.cRMIntegration.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'CRM integration not found' });
      return;
    }

    // Check if any tasks are using this integration
    const taskCount = await prisma.task.count({
      where: { crmIntegrationId: id },
    });

    if (taskCount > 0) {
      res.status(400).json({
        error: `Cannot delete: ${taskCount} task(s) are using this CRM integration. Update them first.`,
      });
      return;
    }

    await prisma.cRMIntegration.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('DeleteCRMIntegration error:', error);
    res.status(500).json({ error: 'Failed to delete CRM integration' });
  }
}

/**
 * Test connection to a CRM integration
 */
export async function testCRMConnection(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    // Check ownership
    const existing = await prisma.cRMIntegration.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'CRM integration not found' });
      return;
    }

    const crmService = new GenericCRMService(prisma);
    const result = await crmService.testConnection(id);

    res.json(result);
  } catch (error) {
    console.error('TestCRMConnection error:', error);
    res.status(500).json({ error: 'Failed to test CRM connection' });
  }
}

/**
 * Parse a cURL command to extract configuration
 */
export async function parseCurl(req: AuthRequest, res: Response): Promise<void> {
  const { curlCommand } = req.body;

  if (!curlCommand || typeof curlCommand !== 'string') {
    res.status(400).json({ error: 'curlCommand is required' });
    return;
  }

  try {
    const result = parseCurlCommand(curlCommand);
    res.json(result);
  } catch (error) {
    console.error('ParseCurl error:', error);
    res.status(500).json({ error: 'Failed to parse cURL command' });
  }
}

/**
 * Get available placeholders for field mapping
 */
export async function getPlaceholders(req: AuthRequest, res: Response): Promise<void> {
  try {
    const placeholders = getAvailablePlaceholders();
    res.json(placeholders);
  } catch (error) {
    console.error('GetPlaceholders error:', error);
    res.status(500).json({ error: 'Failed to get placeholders' });
  }
}
