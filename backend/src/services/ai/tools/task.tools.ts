import { ToolDefinition } from '../providers/ai-provider.interface';
import { toolRegistry, ToolContext } from './tool-registry';

// List Tasks Tool
const listTasksDefinition: ToolDefinition = {
  name: 'listTasks',
  description: 'List invoice tasks (clients/companies). Use when user asks about their clients, companies, or invoice tasks.',
  parameters: {
    type: 'object',
    properties: {
      isActive: {
        type: 'boolean',
        description: 'Filter by active status (true = active only, false = inactive only, omit for all)'
      },
      clientName: {
        type: 'string',
        description: 'Filter by client name (partial match)'
      }
    },
    required: []
  },
  requiresConfirmation: false
};

async function listTasksHandler(
  args: Record<string, unknown>,
  context: ToolContext
): Promise<unknown> {
  const { userId, prisma } = context;
  const isActive = args.isActive as boolean | undefined;
  const clientName = args.clientName as string | undefined;

  const where: any = {
    userId,
    type: 'INVOICE'
  };

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (clientName) {
    where.clientName = { contains: clientName, mode: 'insensitive' };
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      clientName: true,
      clientEmail: true,
      hourlyRate: true,
      hoursWorked: true,
      currency: true,
      isActive: true,
      warningDate: true,
      deadlineDate: true,
      _count: { select: { invoices: true } }
    }
  });

  return {
    count: tasks.length,
    tasks: tasks.map(t => ({
      id: t.id,
      name: t.name,
      clientName: t.clientName,
      clientEmail: t.clientEmail,
      hourlyRate: t.hourlyRate ? Number(t.hourlyRate) : null,
      defaultHours: t.hoursWorked ? Number(t.hoursWorked) : null,
      currency: t.currency,
      isActive: t.isActive,
      warningDay: t.warningDate,
      deadlineDay: t.deadlineDate,
      invoiceCount: t._count.invoices
    }))
  };
}

// Get Client Info Tool
const getClientInfoDefinition: ToolDefinition = {
  name: 'getClientInfo',
  description: 'Get detailed information about a specific client/company by name. Use when user asks about a specific client.',
  parameters: {
    type: 'object',
    properties: {
      clientName: {
        type: 'string',
        description: 'The client name to search for'
      }
    },
    required: ['clientName']
  },
  requiresConfirmation: false
};

async function getClientInfoHandler(
  args: Record<string, unknown>,
  context: ToolContext
): Promise<unknown> {
  const { userId, prisma } = context;
  const clientName = args.clientName as string;

  const task = await prisma.task.findFirst({
    where: {
      userId,
      type: 'INVOICE',
      clientName: { contains: clientName, mode: 'insensitive' }
    },
    include: {
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          number: true,
          amount: true,
          currency: true,
          status: true,
          invoiceMonth: true,
          invoiceYear: true,
          hoursWorked: true,
          createdAt: true
        }
      },
      googleAccount: { select: { email: true } }
    }
  });

  if (!task) {
    return { error: `No client found matching "${clientName}"` };
  }

  // Calculate totals
  const totalInvoiced = task.invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const totalHours = task.invoices.reduce((sum, inv) => sum + (inv.hoursWorked ? Number(inv.hoursWorked) : 0), 0);
  const paidInvoices = task.invoices.filter(inv => inv.status === 'PAID').length;

  return {
    id: task.id,
    name: task.name,
    clientName: task.clientName,
    clientAddress: task.clientAddress,
    clientEmail: task.clientEmail,
    clientBankAccount: task.clientBankAccount,
    hourlyRate: task.hourlyRate ? Number(task.hourlyRate) : null,
    defaultHours: task.hoursWorked ? Number(task.hoursWorked) : null,
    currency: task.currency,
    isActive: task.isActive,
    warningDay: task.warningDate,
    deadlineDay: task.deadlineDate,
    gmailAccount: task.googleAccount?.email || null,
    stats: {
      totalInvoices: task.invoices.length,
      paidInvoices,
      pendingInvoices: task.invoices.length - paidInvoices,
      totalInvoiced,
      totalHours
    },
    recentInvoices: task.invoices.map(inv => ({
      number: inv.number,
      amount: Number(inv.amount),
      currency: inv.currency,
      status: inv.status,
      period: inv.invoiceMonth !== null && inv.invoiceYear
        ? `${inv.invoiceYear}-${String(inv.invoiceMonth + 1).padStart(2, '0')}`
        : null,
      hours: inv.hoursWorked ? Number(inv.hoursWorked) : null,
      date: inv.createdAt.toISOString()
    }))
  };
}

// Update Task Tool
const updateTaskDefinition: ToolDefinition = {
  name: 'updateTask',
  description: 'Update an existing invoice task. Use when user wants to change client details, rates, or other task settings.',
  parameters: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'The task ID to update (get from listTasks or getClientInfo)'
      },
      name: {
        type: 'string',
        description: 'New task name'
      },
      clientName: {
        type: 'string',
        description: 'New client name'
      },
      clientEmail: {
        type: 'string',
        description: 'New client email'
      },
      clientAddress: {
        type: 'string',
        description: 'New client address'
      },
      hourlyRate: {
        type: 'number',
        description: 'New hourly rate'
      },
      hoursWorked: {
        type: 'number',
        description: 'New default hours worked'
      },
      currency: {
        type: 'string',
        description: 'New currency (e.g., USD, EUR, PLN)'
      },
      isActive: {
        type: 'boolean',
        description: 'Set active/inactive status'
      }
    },
    required: ['taskId']
  },
  requiresConfirmation: true
};

async function updateTaskHandler(
  args: Record<string, unknown>,
  context: ToolContext
): Promise<unknown> {
  const { userId, prisma } = context;
  const taskId = args.taskId as string;

  // Verify task exists and belongs to user
  const existingTask = await prisma.task.findFirst({
    where: { id: taskId, userId, type: 'INVOICE' }
  });

  if (!existingTask) {
    return { error: 'Task not found or access denied' };
  }

  const updateData: any = {};

  if (args.name !== undefined) updateData.name = args.name;
  if (args.clientName !== undefined) updateData.clientName = args.clientName;
  if (args.clientEmail !== undefined) updateData.clientEmail = args.clientEmail;
  if (args.clientAddress !== undefined) updateData.clientAddress = args.clientAddress;
  if (args.hourlyRate !== undefined) updateData.hourlyRate = args.hourlyRate;
  if (args.hoursWorked !== undefined) updateData.hoursWorked = args.hoursWorked;
  if (args.currency !== undefined) updateData.currency = args.currency;
  if (args.isActive !== undefined) updateData.isActive = args.isActive;

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    select: {
      id: true,
      name: true,
      clientName: true,
      clientEmail: true,
      hourlyRate: true,
      hoursWorked: true,
      currency: true,
      isActive: true
    }
  });

  return {
    success: true,
    message: `Task "${updatedTask.name}" updated successfully`,
    task: {
      ...updatedTask,
      hourlyRate: updatedTask.hourlyRate ? Number(updatedTask.hourlyRate) : null,
      hoursWorked: updatedTask.hoursWorked ? Number(updatedTask.hoursWorked) : null
    }
  };
}

// Register tools
export function registerTaskTools(): void {
  toolRegistry.register(listTasksDefinition, listTasksHandler);
  toolRegistry.register(getClientInfoDefinition, getClientInfoHandler);
  toolRegistry.register(updateTaskDefinition, updateTaskHandler);
}
