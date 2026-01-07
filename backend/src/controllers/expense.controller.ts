import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { NBPExchangeService } from '../services/nbp-exchange.service.js';

export async function getExpenses(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { month, year, category, expenseType, startDate, endDate } = req.query;

  try {
    const where: any = { userId: req.userId };

    if (month && year) {
      where.expenseMonth = parseInt(month as string);
      where.expenseYear = parseInt(year as string);
    } else if (year) {
      where.expenseYear = parseInt(year as string);
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (expenseType && expenseType !== 'ALL') {
      where.expenseType = expenseType;
    }

    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) {
        where.expenseDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setDate(end.getDate() + 1);
        where.expenseDate.lt = end;
      }
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' }
    });

    res.json(expenses);
  } catch (error) {
    console.error('GetExpenses error:', error);
    res.status(500).json({ error: 'Failed to get expenses' });
  }
}

export async function getExpense(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const expense = await prisma.expense.findFirst({
      where: { id, userId: req.userId }
    });

    if (!expense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    res.json(expense);
  } catch (error) {
    console.error('GetExpense error:', error);
    res.status(500).json({ error: 'Failed to get expense' });
  }
}

export async function createExpense(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const {
    name,
    description,
    category,
    expenseType,
    amount,
    currency,
    expenseDate,
    vatRate,
    documentNumber,
    documentPath,
    isDeductible,
    deductiblePercent
  } = req.body;

  if (!name || !amount || !category || !expenseDate) {
    res.status(400).json({ error: 'Name, amount, category, and expense date are required' });
    return;
  }

  try {
    const date = new Date(expenseDate);
    const nbpService = new NBPExchangeService(prisma);
    const expenseCurrency = currency || 'PLN';

    // Convert to PLN if needed
    let amountPLN = parseFloat(amount);
    let exchangeRate: number | null = null;
    let exchangeRateDate: Date | null = null;
    let originalCurrency: string | null = null;
    let originalAmount: number | null = null;

    if (expenseCurrency !== 'PLN') {
      const conversion = await nbpService.convertToPLN(
        parseFloat(amount),
        expenseCurrency,
        date,
        false // For expenses, use the transaction date rate
      );
      amountPLN = conversion.amountPLN;
      exchangeRate = conversion.exchangeRate;
      exchangeRateDate = conversion.exchangeRateDate;
      originalCurrency = expenseCurrency;
      originalAmount = parseFloat(amount);
    }

    // Calculate VAT and net amount
    const vat = vatRate !== undefined ? parseFloat(vatRate) : 23;
    const vatMultiplier = 1 + vat / 100;
    const netAmount = amountPLN / vatMultiplier;
    const vatAmount = amountPLN - netAmount;

    const expense = await prisma.expense.create({
      data: {
        name,
        description,
        category,
        expenseType: expenseType || 'BUSINESS',
        amount: parseFloat(amount),
        currency: expenseCurrency,
        amountPLN,
        expenseDate: date,
        expenseMonth: date.getMonth() + 1,
        expenseYear: date.getFullYear(),
        vatRate: vat,
        vatAmount,
        netAmount,
        documentNumber,
        documentPath,
        isDeductible: expenseType === 'PERSONAL' ? false : (isDeductible !== false),
        deductiblePercent: expenseType === 'PERSONAL' ? 0 : (deductiblePercent || 100),
        originalCurrency,
        originalAmount,
        exchangeRate,
        exchangeRateDate,
        userId: req.userId!
      }
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('CreateExpense error:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
}

export async function updateExpense(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;
  const updateData = req.body;

  try {
    const existing = await prisma.expense.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    const data: any = {};

    // Handle basic fields
    if (updateData.name !== undefined) data.name = updateData.name;
    if (updateData.description !== undefined) data.description = updateData.description;
    if (updateData.category !== undefined) data.category = updateData.category;
    if (updateData.expenseType !== undefined) {
      data.expenseType = updateData.expenseType;
      // Personal expenses are not deductible
      if (updateData.expenseType === 'PERSONAL') {
        data.isDeductible = false;
        data.deductiblePercent = 0;
      }
    }
    if (updateData.documentNumber !== undefined) data.documentNumber = updateData.documentNumber;
    if (updateData.documentPath !== undefined) data.documentPath = updateData.documentPath;
    if (updateData.isDeductible !== undefined) data.isDeductible = updateData.isDeductible;
    if (updateData.deductiblePercent !== undefined) data.deductiblePercent = parseFloat(updateData.deductiblePercent);

    // Handle date change
    if (updateData.expenseDate) {
      const date = new Date(updateData.expenseDate);
      data.expenseDate = date;
      data.expenseMonth = date.getMonth() + 1;
      data.expenseYear = date.getFullYear();
    }

    // Handle amount/currency change
    if (updateData.amount !== undefined || updateData.currency !== undefined) {
      const nbpService = new NBPExchangeService(prisma);
      const amount = updateData.amount !== undefined
        ? parseFloat(updateData.amount)
        : Number(existing.amount);
      const currency = updateData.currency || existing.currency;
      const date = updateData.expenseDate
        ? new Date(updateData.expenseDate)
        : existing.expenseDate;

      data.amount = amount;
      data.currency = currency;

      if (currency !== 'PLN') {
        const conversion = await nbpService.convertToPLN(amount, currency, date, false);
        data.amountPLN = conversion.amountPLN;
        data.exchangeRate = conversion.exchangeRate;
        data.exchangeRateDate = conversion.exchangeRateDate;
        data.originalCurrency = currency;
        data.originalAmount = amount;
      } else {
        data.amountPLN = amount;
        data.exchangeRate = null;
        data.exchangeRateDate = null;
        data.originalCurrency = null;
        data.originalAmount = null;
      }

      // Recalculate VAT
      const vat = updateData.vatRate !== undefined
        ? parseFloat(updateData.vatRate)
        : Number(existing.vatRate) || 23;
      const vatMultiplier = 1 + vat / 100;
      data.netAmount = data.amountPLN / vatMultiplier;
      data.vatAmount = data.amountPLN - data.netAmount;
      data.vatRate = vat;
    } else if (updateData.vatRate !== undefined) {
      // Only VAT rate changed
      const vat = parseFloat(updateData.vatRate);
      const vatMultiplier = 1 + vat / 100;
      data.netAmount = Number(existing.amountPLN) / vatMultiplier;
      data.vatAmount = Number(existing.amountPLN) - data.netAmount;
      data.vatRate = vat;
    }

    const expense = await prisma.expense.update({
      where: { id },
      data
    });

    res.json(expense);
  } catch (error) {
    console.error('UpdateExpense error:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
}

export async function deleteExpense(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const existing = await prisma.expense.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    await prisma.expense.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('DeleteExpense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
}

export async function getExpensesSummary(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { year, expenseType } = req.query;

  try {
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

    const where: any = {
      userId: req.userId,
      expenseYear: targetYear
    };

    if (expenseType && expenseType !== 'ALL') {
      where.expenseType = expenseType;
    }

    const expenses = await prisma.expense.findMany({ where });

    // Group by month
    const byMonth: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      byMonth[m] = 0;
    }

    // Group by category
    const byCategory: Record<string, number> = {};

    // Separate business and personal
    const businessExpenses = expenses.filter(e => e.expenseType === 'BUSINESS');
    const personalExpenses = expenses.filter(e => e.expenseType === 'PERSONAL');

    for (const exp of expenses) {
      byMonth[exp.expenseMonth] = (byMonth[exp.expenseMonth] || 0) + Number(exp.amountPLN);
      byCategory[exp.category] = (byCategory[exp.category] || 0) + Number(exp.amountPLN);
    }

    const total = expenses.reduce((sum, e) => sum + Number(e.amountPLN), 0);
    const totalBusiness = businessExpenses.reduce((sum, e) => sum + Number(e.amountPLN), 0);
    const totalPersonal = personalExpenses.reduce((sum, e) => sum + Number(e.amountPLN), 0);
    const totalDeductible = businessExpenses
      .filter(e => e.isDeductible)
      .reduce((sum, e) => sum + (Number(e.netAmount) * Number(e.deductiblePercent) / 100), 0);

    res.json({
      year: targetYear,
      total: Math.round(total * 100) / 100,
      totalBusiness: Math.round(totalBusiness * 100) / 100,
      totalPersonal: Math.round(totalPersonal * 100) / 100,
      totalDeductible: Math.round(totalDeductible * 100) / 100,
      byMonth,
      byCategory,
      count: expenses.length,
      businessCount: businessExpenses.length,
      personalCount: personalExpenses.length
    });
  } catch (error) {
    console.error('GetExpensesSummary error:', error);
    res.status(500).json({ error: 'Failed to get expenses summary' });
  }
}

export async function getExpenseCategories(req: AuthRequest, res: Response): Promise<void> {
  const categories = [
    { value: 'OFFICE_SUPPLIES', label: 'Office supplies', icon: 'clipboard' },
    { value: 'SOFTWARE_SUBSCRIPTIONS', label: 'Software & subscriptions', icon: 'code' },
    { value: 'HARDWARE_EQUIPMENT', label: 'Hardware & equipment', icon: 'monitor' },
    { value: 'TRAVEL_TRANSPORT', label: 'Travel & transport', icon: 'car' },
    { value: 'MEALS_ENTERTAINMENT', label: 'Meals & entertainment', icon: 'coffee' },
    { value: 'PROFESSIONAL_SERVICES', label: 'Professional services', icon: 'briefcase' },
    { value: 'EDUCATION_TRAINING', label: 'Education & training', icon: 'book' },
    { value: 'MARKETING_ADVERTISING', label: 'Marketing & advertising', icon: 'megaphone' },
    { value: 'INSURANCE', label: 'Insurance', icon: 'shield' },
    { value: 'RENT_UTILITIES', label: 'Rent & utilities', icon: 'home' },
    { value: 'TELECOMMUNICATIONS', label: 'Telecommunications', icon: 'phone' },
    { value: 'BANKING_FEES', label: 'Banking fees', icon: 'credit-card' },
    { value: 'TAXES_FEES', label: 'Taxes & fees', icon: 'file-text' },
    { value: 'OTHER', label: 'Other', icon: 'more-horizontal' }
  ];

  res.json(categories);
}
