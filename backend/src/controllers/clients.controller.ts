import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { ActivityLogService } from '../services/activity-log.service.js';

// Fields to track for changes in client updates
const CLIENT_TRACKED_FIELDS = [
  'name', 'nip', 'streetAddress', 'postcode', 'city', 'country',
  'email', 'billingEmail', 'bankAccount',
  'crmClientId', 'crmIntegrationId',
  'hourlyRate', 'hoursWorked', 'description', 'defaultServiceName',
  'currency', 'defaultLanguage', 'invoiceTemplate',
  'googleAccountId', 'bankAccountId',
  'emailSubjectTemplate', 'emailBodyTemplate', 'useCustomEmailTemplate'
];

function getActivityLogService(prisma: PrismaClient): ActivityLogService {
  return new ActivityLogService(prisma);
}

export async function getClients(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { includeArchived } = req.query;

  try {
    const where: any = { userId: req.userId };

    // By default, exclude archived clients unless explicitly requested
    if (includeArchived !== 'true') {
      where.isArchived = false;
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        _count: {
          select: {
            tasks: true,
            invoices: true
          }
        },
        crmIntegration: {
          select: { id: true, name: true, isActive: true }
        },
        bankAccountRef: {
          select: { id: true, name: true, currency: true }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ]
    });

    res.json(clients);
  } catch (error) {
    console.error('GetClients error:', error);
    res.status(500).json({ error: 'Failed to get clients' });
  }
}

export async function getClient(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const client = await prisma.client.findFirst({
      where: {
        id,
        userId: req.userId
      },
      include: {
        tasks: {
          where: { isArchived: false },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            warningDate: true,
            deadlineDate: true,
            isActive: true
          }
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            number: true,
            amount: true,
            currency: true,
            status: true,
            createdAt: true
          }
        },
        crmIntegration: {
          select: { id: true, name: true, isActive: true }
        },
        bankAccountRef: true,
        googleAccount: {
          select: { id: true, email: true }
        },
        _count: {
          select: {
            tasks: true,
            invoices: true
          }
        }
      }
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    res.json(client);
  } catch (error) {
    console.error('GetClient error:', error);
    res.status(500).json({ error: 'Failed to get client' });
  }
}

export async function createClient(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const {
    name,
    // Contact info
    nip,
    streetAddress,
    postcode,
    city,
    country,
    email,
    billingEmail,
    bankAccount,
    // CRM integration
    crmClientId,
    crmIntegrationId,
    // Invoice defaults
    hourlyRate,
    hoursWorked,
    description,
    defaultServiceName,
    currency,
    defaultLanguage,
    invoiceTemplate,
    // Email templates
    emailSubjectTemplate,
    emailBodyTemplate,
    useCustomEmailTemplate,
    // Integrations
    googleAccountId,
    bankAccountId
  } = req.body;

  try {
    const client = await prisma.client.create({
      data: {
        name,
        userId: req.userId!,
        // Contact info
        nip,
        streetAddress,
        postcode,
        city,
        country,
        email,
        billingEmail,
        bankAccount,
        // CRM integration
        crmClientId,
        crmIntegrationId,
        // Invoice defaults
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        hoursWorked: hoursWorked ? parseFloat(hoursWorked) : undefined,
        description,
        defaultServiceName,
        currency: currency || 'USD',
        defaultLanguage: defaultLanguage || 'PL',
        invoiceTemplate: invoiceTemplate || 'STANDARD',
        // Email templates
        emailSubjectTemplate,
        emailBodyTemplate,
        useCustomEmailTemplate: useCustomEmailTemplate || false,
        // Integrations
        googleAccountId,
        bankAccountId
      },
      include: {
        crmIntegration: {
          select: { id: true, name: true, isActive: true }
        },
        bankAccountRef: true
      }
    });

    // Log activity
    const activityService = getActivityLogService(prisma);
    await activityService.logClientActivity(client.id, 'CREATED', req.userId!);

    res.status(201).json(client);
  } catch (error) {
    console.error('CreateClient error:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
}

export async function updateClient(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;
  const {
    name,
    // Contact info
    nip,
    streetAddress,
    postcode,
    city,
    country,
    email,
    billingEmail,
    bankAccount,
    // CRM integration
    crmClientId,
    crmIntegrationId,
    // Invoice defaults
    hourlyRate,
    hoursWorked,
    description,
    defaultServiceName,
    currency,
    defaultLanguage,
    invoiceTemplate,
    // Email templates
    emailSubjectTemplate,
    emailBodyTemplate,
    useCustomEmailTemplate,
    // Integrations
    googleAccountId,
    bankAccountId
  } = req.body;

  try {
    // Get existing client for change tracking
    const existingClient = await prisma.client.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existingClient) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    const updateData: any = {};

    // Only include fields that are provided
    if (name !== undefined) updateData.name = name;
    if (nip !== undefined) updateData.nip = nip;
    if (streetAddress !== undefined) updateData.streetAddress = streetAddress;
    if (postcode !== undefined) updateData.postcode = postcode;
    if (city !== undefined) updateData.city = city;
    if (country !== undefined) updateData.country = country;
    if (email !== undefined) updateData.email = email;
    if (billingEmail !== undefined) updateData.billingEmail = billingEmail;
    if (bankAccount !== undefined) updateData.bankAccount = bankAccount;
    if (crmClientId !== undefined) updateData.crmClientId = crmClientId;
    if (crmIntegrationId !== undefined) updateData.crmIntegrationId = crmIntegrationId || null;
    if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate ? parseFloat(hourlyRate) : null;
    if (hoursWorked !== undefined) updateData.hoursWorked = hoursWorked ? parseFloat(hoursWorked) : null;
    if (description !== undefined) updateData.description = description;
    if (defaultServiceName !== undefined) updateData.defaultServiceName = defaultServiceName;
    if (currency !== undefined) updateData.currency = currency;
    if (defaultLanguage !== undefined) updateData.defaultLanguage = defaultLanguage;
    if (invoiceTemplate !== undefined) updateData.invoiceTemplate = invoiceTemplate;
    if (emailSubjectTemplate !== undefined) updateData.emailSubjectTemplate = emailSubjectTemplate;
    if (emailBodyTemplate !== undefined) updateData.emailBodyTemplate = emailBodyTemplate;
    if (useCustomEmailTemplate !== undefined) updateData.useCustomEmailTemplate = useCustomEmailTemplate;
    if (googleAccountId !== undefined) updateData.googleAccountId = googleAccountId || null;
    if (bankAccountId !== undefined) updateData.bankAccountId = bankAccountId || null;

    const client = await prisma.client.update({
      where: { id },
      data: updateData,
      include: {
        crmIntegration: {
          select: { id: true, name: true, isActive: true }
        },
        bankAccountRef: true
      }
    });

    // Track changes for activity log
    const changes = ActivityLogService.detectChanges(existingClient, client, CLIENT_TRACKED_FIELDS);
    if (changes) {
      const activityService = getActivityLogService(prisma);
      await activityService.logClientActivity(client.id, 'UPDATED', req.userId!, changes);
    }

    res.json(client);
  } catch (error) {
    console.error('UpdateClient error:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
}

export async function deleteClient(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    // Check if client exists and belongs to user
    const client = await prisma.client.findFirst({
      where: { id, userId: req.userId },
      include: {
        _count: {
          select: { tasks: true, invoices: true }
        }
      }
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    // Check if client has tasks or invoices
    if (client._count.tasks > 0 || client._count.invoices > 0) {
      res.status(400).json({
        error: `Cannot delete: Client has ${client._count.tasks} task(s) and ${client._count.invoices} invoice(s). Archive it instead.`
      });
      return;
    }

    await prisma.client.delete({ where: { id } });

    // Log activity
    const activityService = getActivityLogService(prisma);
    await activityService.logClientActivity(id, 'DELETED', req.userId!);

    res.status(204).send();
  } catch (error) {
    console.error('DeleteClient error:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
}

export async function archiveClient(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const client = await prisma.client.findFirst({
      where: { id, userId: req.userId }
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: { isArchived: true, isActive: false }
    });

    const activityService = getActivityLogService(prisma);
    await activityService.logClientActivity(id, 'ARCHIVED', req.userId!);

    res.json(updatedClient);
  } catch (error) {
    console.error('ArchiveClient error:', error);
    res.status(500).json({ error: 'Failed to archive client' });
  }
}

export async function unarchiveClient(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const client = await prisma.client.findFirst({
      where: { id, userId: req.userId }
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: { isArchived: false, isActive: true }
    });

    const activityService = getActivityLogService(prisma);
    await activityService.logClientActivity(id, 'UNARCHIVED', req.userId!);

    res.json(updatedClient);
  } catch (error) {
    console.error('UnarchiveClient error:', error);
    res.status(500).json({ error: 'Failed to unarchive client' });
  }
}

export async function toggleClientActive(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const client = await prisma.client.findFirst({
      where: { id, userId: req.userId }
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: { isActive: !client.isActive }
    });

    const activityService = getActivityLogService(prisma);
    await activityService.logClientActivity(
      id,
      updatedClient.isActive ? 'ACTIVATED' : 'DEACTIVATED',
      req.userId!
    );

    res.json(updatedClient);
  } catch (error) {
    console.error('ToggleClientActive error:', error);
    res.status(500).json({ error: 'Failed to toggle client' });
  }
}
