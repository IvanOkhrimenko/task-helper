import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { generateInvoicePDF, generateEmailDraft } from '../services/pdf.service.js';
import { StorageService } from '../services/storage.service.js';
import { ActivityLogService } from '../services/activity-log.service.js';

export async function generateInvoice(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id: taskId } = req.params;
  const {
    hoursWorked,
    hourlyRate,
    fixedAmount,
    month,
    year,
    description,
    language,
    currency: requestCurrency,
    invoiceTemplate,
    bankAccountId,
    googleAccountId,
    useCustomEmailTemplate,
    emailSubject,
    emailBody
  } = req.body;

  try {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId: req.userId }
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Determine amount based on billing type
    let amount: number;
    let hours: number;
    let rate: number;

    if (fixedAmount !== undefined) {
      // Fixed monthly amount - use provided or task default
      amount = parseFloat(fixedAmount) || Number(task.fixedMonthlyAmount) || 0;
      hours = 0;  // Not applicable for fixed amount
      rate = 0;   // Not applicable for fixed amount
    } else {
      // Hourly billing - calculate from hours * rate
      hours = hoursWorked !== undefined ? parseFloat(hoursWorked) : (Number(task.hoursWorked) || 0);
      rate = hourlyRate !== undefined ? parseFloat(hourlyRate) : (Number(task.hourlyRate) || 0);
      amount = hours * rate;
    }

    // Use provided month/year or current date
    const invoiceMonth = month !== undefined ? parseInt(month) : new Date().getMonth();
    const invoiceYear = year !== undefined ? parseInt(year) : new Date().getFullYear();

    // Use provided language or task default
    const invoiceLanguage = language || task.defaultLanguage || 'PL';

    // Generate invoice number based on invoice period
    const invoiceNumber = `INV-${invoiceYear}${String(invoiceMonth + 1).padStart(2, '0')}-${uuidv4().slice(0, 6).toUpperCase()}`;

    // Create invoice record
    const invoice = await prisma.invoice.create({
      data: {
        number: invoiceNumber,
        amount,
        currency: task.currency,
        language: invoiceLanguage,
        taskId,
        userId: req.userId!,
        invoiceMonth,
        invoiceYear,
        hoursWorked: hours,
        hourlyRate: rate
      }
    });

    // Prepare invoice data with period info
    const invoiceDescription = description || task.description || 'Professional services';
    const periodInfo = {
      month: invoiceMonth,
      year: invoiceYear,
      hours: hours
    };

    // Generate PDF
    const pdfPath = await generateInvoicePDF({
      task: { ...task, description: invoiceDescription, hoursWorked: hours as any },
      invoice,
      user,
      period: periodInfo,
      language: invoiceLanguage
    });

    // Generate email draft - use passed email template if provided, otherwise generate default
    let emailDraft: { subject: string; body: string };

    if (useCustomEmailTemplate && emailSubject && emailBody) {
      // Use custom email template provided from the frontend
      emailDraft = { subject: emailSubject, body: emailBody };
    } else {
      // Generate default email draft
      emailDraft = generateEmailDraft(
        { ...task, description: invoiceDescription, hoursWorked: hours as any },
        invoice,
        user,
        periodInfo,
        invoiceLanguage
      );
    }

    // Update invoice with PDF path and email content
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        pdfPath,
        emailSubject: emailDraft.subject,
        emailBody: emailDraft.body
      }
    });

    // Log activity
    const activityService = new ActivityLogService(prisma);
    await activityService.logInvoiceActivity(
      updatedInvoice.id,
      taskId,
      'INVOICE_GENERATED',
      req.userId!,
      undefined,
      {
        invoiceNumber: updatedInvoice.number,
        amount: updatedInvoice.amount,
        currency: updatedInvoice.currency,
        hoursWorked: hours,
        hourlyRate: rate
      }
    );
    await activityService.logInvoiceActivity(
      updatedInvoice.id,
      taskId,
      'PDF_GENERATED',
      req.userId!,
      undefined,
      { pdfPath }
    );

    res.status(201).json(updatedInvoice);
  } catch (error) {
    console.error('GenerateInvoice error:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
}

export async function getInvoices(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { taskId, status, startDate, endDate, clientName, includeArchived } = req.query;

  try {
    // Build where clause
    const where: any = { userId: req.userId };

    // By default, exclude archived invoices unless explicitly requested
    if (includeArchived !== 'true') {
      where.isArchived = false;
    }

    // Filter by task
    if (taskId && typeof taskId === 'string') {
      where.taskId = taskId;
    }

    // Filter by status
    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }

    // Filter by date range
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate && typeof startDate === 'string') {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate && typeof endDate === 'string') {
        // Add one day to include the end date fully
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        where.createdAt.lte = end;
      }
    }

    // Filter by client name (search in task relation)
    if (clientName && typeof clientName === 'string') {
      where.task = {
        clientName: {
          contains: clientName,
          mode: 'insensitive'
        }
      };
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: { task: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json(invoices);
  } catch (error) {
    console.error('GetInvoices error:', error);
    res.status(500).json({ error: 'Failed to get invoices' });
  }
}

export async function getInvoice(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: req.userId },
      include: { task: true }
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    res.json(invoice);
  } catch (error) {
    console.error('GetInvoice error:', error);
    res.status(500).json({ error: 'Failed to get invoice' });
  }
}

export async function downloadInvoicePDF(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: req.userId }
    });

    if (!invoice || !invoice.pdfPath) {
      res.status(404).json({ error: 'Invoice PDF not found' });
      return;
    }

    const fileName = StorageService.getFileName(invoice.pdfPath);

    // Check if file is in cloud storage (R2)
    if (invoice.pdfPath.startsWith('r2://')) {
      // Fetch from cloud storage
      const fileBuffer = await StorageService.getFile(invoice.pdfPath);

      if (!fileBuffer) {
        res.status(404).json({ error: 'PDF file not found in storage' });
        return;
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(fileBuffer);
    } else {
      // Local file - use existing logic
      if (!fs.existsSync(invoice.pdfPath)) {
        res.status(404).json({ error: 'PDF file not found' });
        return;
      }

      res.download(invoice.pdfPath, fileName);
    }
  } catch (error) {
    console.error('DownloadInvoicePDF error:', error);
    res.status(500).json({ error: 'Failed to download PDF' });
  }
}

export async function getEmailDraft(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: req.userId },
      include: { task: true }
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    res.json({
      to: invoice.task.clientEmail || '',
      subject: invoice.emailSubject,
      body: invoice.emailBody
    });
  } catch (error) {
    console.error('GetEmailDraft error:', error);
    res.status(500).json({ error: 'Failed to get email draft' });
  }
}

export async function updateInvoiceStatus(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;
  const { status } = req.body;

  if (!['DRAFT', 'SENT', 'PAID', 'CANCELLED'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  try {
    const existing = await prisma.invoice.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status }
    });

    // Log activity
    const activityService = new ActivityLogService(prisma);
    await activityService.logInvoiceActivity(
      invoice.id,
      invoice.taskId,
      'STATUS_CHANGED',
      req.userId!,
      { status: { oldValue: existing.status, newValue: status } }
    );

    res.json(invoice);
  } catch (error) {
    console.error('UpdateInvoiceStatus error:', error);
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
}

export async function updateInvoiceComments(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;
  const { comments } = req.body;

  try {
    const existing = await prisma.invoice.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { comments }
    });

    // Log activity if comments changed
    if (existing.comments !== comments) {
      const activityService = new ActivityLogService(prisma);
      await activityService.logInvoiceActivity(
        invoice.id,
        invoice.taskId,
        'COMMENTS_UPDATED',
        req.userId!,
        { comments: { oldValue: existing.comments, newValue: comments } }
      );
    }

    res.json(invoice);
  } catch (error) {
    console.error('UpdateInvoiceComments error:', error);
    res.status(500).json({ error: 'Failed to update invoice comments' });
  }
}

export async function archiveInvoice(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const existing = await prisma.invoice.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { isArchived: true }
    });

    // Log activity
    const activityService = new ActivityLogService(prisma);
    await activityService.logInvoiceActivity(
      invoice.id,
      invoice.taskId,
      'ARCHIVED',
      req.userId!,
      { isArchived: { oldValue: false, newValue: true } }
    );

    res.json(invoice);
  } catch (error) {
    console.error('ArchiveInvoice error:', error);
    res.status(500).json({ error: 'Failed to archive invoice' });
  }
}

export async function unarchiveInvoice(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const existing = await prisma.invoice.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { isArchived: false }
    });

    // Log activity
    const activityService = new ActivityLogService(prisma);
    await activityService.logInvoiceActivity(
      invoice.id,
      invoice.taskId,
      'UNARCHIVED',
      req.userId!,
      { isArchived: { oldValue: true, newValue: false } }
    );

    res.json(invoice);
  } catch (error) {
    console.error('UnarchiveInvoice error:', error);
    res.status(500).json({ error: 'Failed to unarchive invoice' });
  }
}

export async function deleteInvoice(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const existing = await prisma.invoice.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    // Log activity before deletion
    const activityService = new ActivityLogService(prisma);
    await activityService.logInvoiceActivity(
      id,
      existing.taskId,
      'DELETED',
      req.userId!,
      undefined,
      { invoiceNumber: existing.number }
    );

    // Delete PDF from storage if exists
    if (existing.pdfPath) {
      await StorageService.deleteFile(existing.pdfPath);
    }

    await prisma.invoice.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('DeleteInvoice error:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
}

export async function downloadCrmPdf(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: req.userId }
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (!invoice.crmPdfPath) {
      res.status(404).json({ error: 'CRM PDF not available. Please fetch it from CRM first.' });
      return;
    }

    // Check if file exists
    if (!fs.existsSync(invoice.crmPdfPath)) {
      res.status(404).json({ error: 'CRM PDF file not found on disk' });
      return;
    }

    const fileName = path.basename(invoice.crmPdfPath);
    res.download(invoice.crmPdfPath, `crm-${invoice.number}.pdf`);
  } catch (error) {
    console.error('DownloadCrmPdf error:', error);
    res.status(500).json({ error: 'Failed to download CRM PDF' });
  }
}
