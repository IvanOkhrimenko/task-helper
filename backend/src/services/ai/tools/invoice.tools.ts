import { ToolDefinition } from '../providers/ai-provider.interface';
import { toolRegistry, ToolContext } from './tool-registry';
import { generateInvoicePDF, generateEmailDraft } from '../../pdf.service';

// Search Invoices Tool
const searchInvoicesDefinition: ToolDefinition = {
  name: 'searchInvoices',
  description: 'Search and filter invoices by various criteria. Use when user asks about invoices, payments, or wants to find specific invoices.',
  parameters: {
    type: 'object',
    properties: {
      clientName: {
        type: 'string',
        description: 'Filter by client name (partial match)'
      },
      status: {
        type: 'string',
        description: 'Filter by status',
        enum: ['DRAFT', 'SENT', 'PAID', 'CANCELLED']
      },
      year: {
        type: 'number',
        description: 'Filter by invoice year'
      },
      month: {
        type: 'number',
        description: 'Filter by invoice month (0-11)'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default 20)'
      }
    },
    required: []
  },
  requiresConfirmation: false
};

async function searchInvoicesHandler(
  args: Record<string, unknown>,
  context: ToolContext
): Promise<unknown> {
  const { userId, prisma } = context;
  const clientName = args.clientName as string | undefined;
  const status = args.status as string | undefined;
  const year = args.year as number | undefined;
  const month = args.month as number | undefined;
  const limit = Math.min((args.limit as number) || 20, 50);

  const where: any = { userId };

  if (clientName) {
    where.task = { clientName: { contains: clientName, mode: 'insensitive' } };
  }

  if (status) {
    where.status = status;
  }

  if (year !== undefined) {
    where.invoiceYear = year;
  }

  if (month !== undefined) {
    where.invoiceMonth = month;
  }

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      task: { select: { clientName: true, name: true } }
    }
  });

  return {
    count: invoices.length,
    filters: { clientName, status, year, month },
    invoices: invoices.map(inv => ({
      id: inv.id,
      number: inv.number,
      clientName: inv.task?.clientName || 'Unknown',
      taskName: inv.task?.name || 'Unknown',
      amount: Number(inv.amount),
      currency: inv.currency,
      status: inv.status,
      period: inv.invoiceMonth !== null && inv.invoiceYear
        ? `${inv.invoiceYear}-${String(inv.invoiceMonth + 1).padStart(2, '0')}`
        : null,
      hours: inv.hoursWorked ? Number(inv.hoursWorked) : null,
      hourlyRate: inv.hourlyRate ? Number(inv.hourlyRate) : null,
      language: inv.language,
      createdAt: inv.createdAt.toISOString()
    }))
  };
}

// Create Invoice Tool
const createInvoiceDefinition: ToolDefinition = {
  name: 'createInvoice',
  description: 'Generate a new invoice for an existing client. IMPORTANT: You MUST call listTasks first to get available clients and their taskId. Use taskId for precise matching.',
  parameters: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'The task ID from listTasks result. Use this for precise client matching.'
      },
      clientName: {
        type: 'string',
        description: 'Name of the client (used as fallback if taskId not provided). MUST be an exact client name from listTasks.'
      },
      month: {
        type: 'number',
        description: 'Invoice month (0-11, JavaScript month). If not specified, uses previous month.'
      },
      year: {
        type: 'number',
        description: 'Invoice year. If not specified, uses current year (or previous year if current month is January and invoice is for December).'
      },
      hoursWorked: {
        type: 'number',
        description: 'Hours worked. If not specified, uses task default.'
      },
      hourlyRate: {
        type: 'number',
        description: 'Hourly rate. If not specified, uses task default.'
      },
      description: {
        type: 'string',
        description: 'Work description for the invoice (optional)'
      },
      language: {
        type: 'string',
        description: 'Invoice language',
        enum: ['PL', 'EN']
      }
    },
    required: []
  },
  requiresConfirmation: true
};

async function createInvoiceHandler(
  args: Record<string, unknown>,
  context: ToolContext
): Promise<unknown> {
  const { userId, prisma } = context;
  const taskId = args.taskId as string | undefined;
  const clientName = args.clientName as string | undefined;

  if (!taskId && !clientName) {
    return {
      error: 'Either taskId or clientName is required. Call listTasks first to get available clients.',
      suggestion: 'Use listTasks to see available clients and their IDs.'
    };
  }

  // Find task by taskId (preferred) or client name
  let task;
  if (taskId) {
    task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
        type: 'INVOICE',
        isActive: true
      },
      include: {
        user: {
          select: {
            name: true,
            address: true,
            nip: true,
            bankName: true,
            bankIban: true,
            bankSwift: true
          }
        }
      }
    });
  } else if (clientName) {
    task = await prisma.task.findFirst({
      where: {
        userId,
        type: 'INVOICE',
        clientName: { equals: clientName, mode: 'insensitive' },
        isActive: true
      },
      include: {
        user: {
          select: {
            name: true,
            address: true,
            nip: true,
            bankName: true,
            bankIban: true,
            bankSwift: true
          }
        }
      }
    });
  }

  if (!task) {
    return {
      error: taskId
        ? `No active task found with ID "${taskId}". It may have been deleted or deactivated.`
        : `No active task found for client "${clientName}". The name must match exactly.`,
      suggestion: 'Use listTasks to see available clients with their exact names and IDs.'
    };
  }

  // Determine invoice period
  const now = new Date();
  let invoiceMonth: number;
  let invoiceYear: number;

  if (args.month !== undefined) {
    invoiceMonth = args.month as number;
    invoiceYear = args.year !== undefined ? (args.year as number) : now.getFullYear();
  } else {
    // Default to previous month
    if (now.getMonth() === 0) {
      invoiceMonth = 11;
      invoiceYear = now.getFullYear() - 1;
    } else {
      invoiceMonth = now.getMonth() - 1;
      invoiceYear = now.getFullYear();
    }
  }

  // Get hours and rate
  const hoursWorked = args.hoursWorked !== undefined
    ? (args.hoursWorked as number)
    : (task.hoursWorked ? Number(task.hoursWorked) : 0);

  const hourlyRate = args.hourlyRate !== undefined
    ? (args.hourlyRate as number)
    : (task.hourlyRate ? Number(task.hourlyRate) : 0);

  const amount = hoursWorked * hourlyRate;
  const language = (args.language as string) || task.defaultLanguage || 'PL';

  // Generate invoice number
  const monthStr = String(invoiceMonth + 1).padStart(2, '0');
  const existingInvoices = await prisma.invoice.count({
    where: {
      userId,
      invoiceYear,
      invoiceMonth
    }
  });
  const invoiceNumber = `INV-${invoiceYear}-${monthStr}-${String(existingInvoices + 1).padStart(3, '0')}`;

  // Create invoice
  const invoice = await prisma.invoice.create({
    data: {
      number: invoiceNumber,
      amount,
      currency: task.currency,
      status: 'DRAFT',
      invoiceMonth,
      invoiceYear,
      hoursWorked,
      hourlyRate,
      language,
      emailSubject: args.description as string || null,
      taskId: task.id,
      userId,
      createdByAI: true  // Mark as created by AI assistant
    },
    include: {
      task: { select: { clientName: true, name: true } }
    }
  });

  // Get full user data for PDF generation
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return {
      success: true,
      warning: 'Invoice created but PDF generation failed - user not found',
      invoice: {
        id: invoice.id,
        number: invoice.number
      }
    };
  }

  // Prepare data for PDF generation
  const periodInfo = {
    month: invoiceMonth,
    year: invoiceYear,
    hours: hoursWorked
  };

  const invoiceDescription = args.description as string || task.description || '';

  try {
    // Generate PDF
    const pdfPath = await generateInvoicePDF({
      task: { ...task, description: invoiceDescription, hoursWorked: hoursWorked as any },
      invoice,
      user,
      period: periodInfo,
      language
    });

    // Generate email draft
    const emailDraft = generateEmailDraft(
      { ...task, description: invoiceDescription, hoursWorked: hoursWorked as any },
      invoice,
      user,
      periodInfo,
      language
    );

    // Update invoice with PDF path and email content
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        pdfPath,
        emailSubject: emailDraft.subject,
        emailBody: emailDraft.body
      }
    });
  } catch (pdfError) {
    console.error('PDF generation error:', pdfError);
    // Continue even if PDF fails - invoice is still created
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return {
    success: true,
    message: `Invoice ${invoiceNumber} created successfully with PDF`,
    invoice: {
      id: invoice.id,
      number: invoice.number,
      clientName: invoice.task?.clientName,
      period: `${monthNames[invoiceMonth]} ${invoiceYear}`,
      hours: hoursWorked,
      hourlyRate,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      status: invoice.status,
      language: invoice.language
    },
    // Pre-formatted link for AI to include in response
    viewLink: `[View Invoice](/invoices/${invoice.id})`,
    formattedResponse: `✅ Invoice **${invoiceNumber}** created for **${invoice.task?.clientName}**:\n\n• Period: ${monthNames[invoiceMonth]} ${invoiceYear}\n• Hours: ${hoursWorked}h × ${invoice.currency} ${hourlyRate}/hr = **${invoice.currency} ${Number(invoice.amount).toLocaleString()}**\n• Status: Draft\n\n[View Invoice](/invoices/${invoice.id})`
  };
}

// Register tools
export function registerInvoiceTools(): void {
  toolRegistry.register(searchInvoicesDefinition, searchInvoicesHandler);
  toolRegistry.register(createInvoiceDefinition, createInvoiceHandler);
}
