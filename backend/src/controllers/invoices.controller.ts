import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { generateInvoicePDF, generateEmailDraft } from '../services/pdf.service.js';

export async function generateInvoice(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id: taskId } = req.params;
  const { hoursWorked, hourlyRate, month, year, description, language } = req.body;

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

    // Use provided hours and rate or task defaults
    const hours = hoursWorked !== undefined ? parseFloat(hoursWorked) : (Number(task.hoursWorked) || 0);
    const rate = hourlyRate !== undefined ? parseFloat(hourlyRate) : (Number(task.hourlyRate) || 0);
    const amount = hours * rate;

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

    // Generate email draft
    const emailDraft = generateEmailDraft(
      { ...task, description: invoiceDescription, hoursWorked: hours as any },
      invoice,
      user,
      periodInfo,
      invoiceLanguage
    );

    // Update invoice with PDF path and email content
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        pdfPath,
        emailSubject: emailDraft.subject,
        emailBody: emailDraft.body
      }
    });

    res.status(201).json(updatedInvoice);
  } catch (error) {
    console.error('GenerateInvoice error:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
}

export async function getInvoices(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { taskId, status, startDate, endDate, clientName } = req.query;

  try {
    // Build where clause
    const where: any = { userId: req.userId };

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

    if (!fs.existsSync(invoice.pdfPath)) {
      res.status(404).json({ error: 'PDF file not found' });
      return;
    }

    // Extract filename from path for download
    const fileName = invoice.pdfPath.split('/').pop() || `invoice-${invoice.number}.pdf`;
    res.download(invoice.pdfPath, fileName);
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

    res.json(invoice);
  } catch (error) {
    console.error('UpdateInvoiceComments error:', error);
    res.status(500).json({ error: 'Failed to update invoice comments' });
  }
}
