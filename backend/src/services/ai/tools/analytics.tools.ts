import { ToolDefinition } from '../providers/ai-provider.interface';
import { toolRegistry, ToolContext } from './tool-registry';
import { Decimal } from '@prisma/client/runtime/library';

// Get Analytics Tool
const getAnalyticsDefinition: ToolDefinition = {
  name: 'getAnalytics',
  description: 'Get financial analytics and statistics. Use this when user asks about earnings, revenue, income, hours worked, or wants financial reports.',
  parameters: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: 'Type of analytics: revenue (money earned), invoices (invoice stats), clients (client breakdown), hours (time tracking)',
        enum: ['revenue', 'invoices', 'clients', 'hours']
      },
      period: {
        type: 'string',
        description: 'Time period for analytics',
        enum: ['month', 'quarter', 'year', 'all']
      },
      clientName: {
        type: 'string',
        description: 'Filter by specific client name (optional)'
      },
      year: {
        type: 'number',
        description: 'Specific year for the analysis (defaults to current year)'
      },
      month: {
        type: 'number',
        description: 'Specific month (0-11) for month period'
      }
    },
    required: ['type']
  },
  requiresConfirmation: false
};

async function getAnalyticsHandler(
  args: Record<string, unknown>,
  context: ToolContext
): Promise<unknown> {
  const { userId, prisma } = context;
  const type = args.type as string;
  const period = (args.period as string) || 'year';
  const clientName = args.clientName as string | undefined;
  const year = (args.year as number) || new Date().getFullYear();
  const month = args.month as number | undefined;

  // Build date range
  let startDate: Date;
  let endDate: Date = new Date();

  switch (period) {
    case 'month':
      const m = month !== undefined ? month : new Date().getMonth();
      startDate = new Date(year, m, 1);
      endDate = new Date(year, m + 1, 0);
      break;
    case 'quarter':
      const currentMonth = new Date().getMonth();
      const quarterStart = Math.floor(currentMonth / 3) * 3;
      startDate = new Date(year, quarterStart, 1);
      endDate = new Date(year, quarterStart + 3, 0);
      break;
    case 'year':
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
      break;
    case 'all':
    default:
      startDate = new Date(2000, 0, 1);
      break;
  }

  // Build base query
  const baseWhere: any = {
    userId,
    createdAt: { gte: startDate, lte: endDate }
  };

  if (clientName) {
    baseWhere.task = { clientName: { contains: clientName, mode: 'insensitive' } };
  }

  switch (type) {
    case 'revenue': {
      const invoices = await prisma.invoice.findMany({
        where: { ...baseWhere, status: { in: ['PAID', 'SENT'] } },
        select: { amount: true, currency: true, status: true }
      });

      const byCurrency: Record<string, { total: number; paid: number; pending: number }> = {};
      for (const inv of invoices) {
        const curr = inv.currency;
        if (!byCurrency[curr]) {
          byCurrency[curr] = { total: 0, paid: 0, pending: 0 };
        }
        const amount = Number(inv.amount);
        byCurrency[curr].total += amount;
        if (inv.status === 'PAID') {
          byCurrency[curr].paid += amount;
        } else {
          byCurrency[curr].pending += amount;
        }
      }

      return {
        period: `${period}${year ? ` ${year}` : ''}`,
        clientFilter: clientName || 'all clients',
        revenue: byCurrency,
        invoiceCount: invoices.length
      };
    }

    case 'invoices': {
      const invoices = await prisma.invoice.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: true,
        _sum: { amount: true }
      });

      return {
        period: `${period}${year ? ` ${year}` : ''}`,
        clientFilter: clientName || 'all clients',
        byStatus: invoices.map(i => ({
          status: i.status,
          count: i._count,
          totalAmount: i._sum.amount ? Number(i._sum.amount) : 0
        }))
      };
    }

    case 'clients': {
      const invoices = await prisma.invoice.findMany({
        where: baseWhere,
        include: { task: { select: { clientName: true } } }
      });

      const byClient: Record<string, { invoiceCount: number; totalAmount: number; currencies: Set<string> }> = {};
      for (const inv of invoices) {
        const client = inv.task?.clientName || 'Unknown';
        if (!byClient[client]) {
          byClient[client] = { invoiceCount: 0, totalAmount: 0, currencies: new Set() };
        }
        byClient[client].invoiceCount++;
        byClient[client].totalAmount += Number(inv.amount);
        byClient[client].currencies.add(inv.currency);
      }

      return {
        period: `${period}${year ? ` ${year}` : ''}`,
        clients: Object.entries(byClient).map(([name, data]) => ({
          name,
          invoiceCount: data.invoiceCount,
          totalAmount: data.totalAmount,
          currencies: Array.from(data.currencies)
        })).sort((a, b) => b.totalAmount - a.totalAmount)
      };
    }

    case 'hours': {
      const invoices = await prisma.invoice.findMany({
        where: baseWhere,
        include: { task: { select: { clientName: true } } },
        select: { hoursWorked: true, hourlyRate: true, task: { select: { clientName: true } } }
      });

      let totalHours = 0;
      const byClient: Record<string, number> = {};

      for (const inv of invoices) {
        const hours = inv.hoursWorked ? Number(inv.hoursWorked) : 0;
        totalHours += hours;
        const client = inv.task?.clientName || 'Unknown';
        byClient[client] = (byClient[client] || 0) + hours;
      }

      return {
        period: `${period}${year ? ` ${year}` : ''}`,
        clientFilter: clientName || 'all clients',
        totalHours,
        byClient: Object.entries(byClient).map(([name, hours]) => ({ name, hours }))
          .sort((a, b) => b.hours - a.hours)
      };
    }

    default:
      return { error: `Unknown analytics type: ${type}` };
  }
}

// Get Dashboard Summary Tool
const getDashboardSummaryDefinition: ToolDefinition = {
  name: 'getDashboardSummary',
  description: 'Get a quick overview of the dashboard including stats, upcoming events, and recent activity. Use when user asks for overview, summary, or "what\'s happening".',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  requiresConfirmation: false
};

async function getDashboardSummaryHandler(
  _args: Record<string, unknown>,
  context: ToolContext
): Promise<unknown> {
  const { userId, prisma } = context;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Get invoice stats
  const [totalInvoices, paidInvoices, pendingInvoices] = await Promise.all([
    prisma.invoice.count({ where: { userId } }),
    prisma.invoice.count({ where: { userId, status: 'PAID' } }),
    prisma.invoice.count({ where: { userId, status: { in: ['DRAFT', 'SENT'] } } })
  ]);

  // Get this month's revenue
  const monthlyInvoices = await prisma.invoice.findMany({
    where: {
      userId,
      status: 'PAID',
      createdAt: { gte: startOfMonth, lte: endOfMonth }
    },
    select: { amount: true, currency: true }
  });

  const monthlyRevenue: Record<string, number> = {};
  for (const inv of monthlyInvoices) {
    const curr = inv.currency;
    monthlyRevenue[curr] = (monthlyRevenue[curr] || 0) + Number(inv.amount);
  }

  // Get active tasks count
  const activeTasks = await prisma.task.count({
    where: { userId, isActive: true, type: 'INVOICE' }
  });

  // Get upcoming reminders
  const upcomingReminders = await prisma.task.findMany({
    where: {
      userId,
      type: 'REMINDER',
      isActive: true,
      nextOccurrence: { gte: now }
    },
    orderBy: { nextOccurrence: 'asc' },
    take: 5,
    select: { reminderTitle: true, nextOccurrence: true }
  });

  // Get recent notifications
  const recentNotifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { title: true, status: true, createdAt: true }
  });

  return {
    stats: {
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      activeTasks,
      monthlyRevenue
    },
    upcomingReminders: upcomingReminders.map(r => ({
      title: r.reminderTitle,
      dueAt: r.nextOccurrence?.toISOString()
    })),
    recentNotifications: recentNotifications.map(n => ({
      title: n.title,
      status: n.status,
      date: n.createdAt.toISOString()
    }))
  };
}

// Register tools
export function registerAnalyticsTools(): void {
  toolRegistry.register(getAnalyticsDefinition, getAnalyticsHandler);
  toolRegistry.register(getDashboardSummaryDefinition, getDashboardSummaryHandler);
}
