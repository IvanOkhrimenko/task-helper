import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { TaxCalculatorService } from '../services/tax-calculator.service.js';

export async function getTaxSettings(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');

  try {
    let settings = await prisma.taxSettings.findUnique({
      where: { userId: req.userId! }
    });

    if (!settings) {
      // Create default settings
      settings = await prisma.taxSettings.create({
        data: {
          userId: req.userId!,
          taxForm: 'LINIOWY',
          zusType: 'STANDARD',
          ryczaltRate: 12
        }
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('GetTaxSettings error:', error);
    res.status(500).json({ error: 'Failed to get tax settings' });
  }
}

export async function updateTaxSettings(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const {
    taxForm,
    zusType,
    customZusAmount,
    ryczaltRate,
    zusStartDate,
    healthInsuranceBase,
    fiscalYearStart
  } = req.body;

  try {
    const settings = await prisma.taxSettings.upsert({
      where: { userId: req.userId! },
      update: {
        taxForm,
        zusType,
        customZusAmount: customZusAmount ? parseFloat(customZusAmount) : null,
        ryczaltRate: ryczaltRate ? parseFloat(ryczaltRate) : 12,
        zusStartDate: zusStartDate ? new Date(zusStartDate) : null,
        healthInsuranceBase: healthInsuranceBase ? parseFloat(healthInsuranceBase) : null,
        fiscalYearStart: fiscalYearStart || 1
      },
      create: {
        userId: req.userId!,
        taxForm: taxForm || 'LINIOWY',
        zusType: zusType || 'STANDARD',
        customZusAmount: customZusAmount ? parseFloat(customZusAmount) : null,
        ryczaltRate: ryczaltRate ? parseFloat(ryczaltRate) : 12
      }
    });

    res.json(settings);
  } catch (error) {
    console.error('UpdateTaxSettings error:', error);
    res.status(500).json({ error: 'Failed to update tax settings' });
  }
}

export async function calculateMonthlyTax(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { month, year } = req.query;

  if (!month || !year) {
    res.status(400).json({ error: 'Month and year are required' });
    return;
  }

  try {
    const calculator = new TaxCalculatorService(prisma);
    const result = await calculator.calculateMonthlyTax(
      req.userId!,
      parseInt(month as string),
      parseInt(year as string)
    );

    res.json(result);
  } catch (error) {
    console.error('CalculateMonthlyTax error:', error);
    res.status(500).json({ error: 'Failed to calculate tax' });
  }
}

export async function getYearlySummary(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { year } = req.params;

  try {
    const calculator = new TaxCalculatorService(prisma);
    const result = await calculator.calculateYearlySummary(
      req.userId!,
      parseInt(year)
    );

    res.json(result);
  } catch (error) {
    console.error('GetYearlySummary error:', error);
    res.status(500).json({ error: 'Failed to get yearly summary' });
  }
}

export async function getTaxDashboard(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');

  try {
    const calculator = new TaxCalculatorService(prisma);
    const result = await calculator.getTaxDashboard(req.userId!);

    res.json(result);
  } catch (error) {
    console.error('GetTaxDashboard error:', error);
    res.status(500).json({ error: 'Failed to get tax dashboard' });
  }
}

export async function getTaxConstants(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Import constants dynamically to avoid circular dependencies
    const { TAX_CONSTANTS, POLISH_MONTHS } = await import('../constants/polish-tax-2024.js');

    res.json({
      constants: TAX_CONSTANTS,
      months: POLISH_MONTHS,
      taxForms: [
        { value: 'LINIOWY', label: 'Podatek liniowy (19%)', description: 'Stała stawka 19% od dochodu' },
        { value: 'SKALA', label: 'Skala podatkowa (12%/32%)', description: 'Progresywny: 12% do 120k, 32% powyżej' },
        { value: 'RYCZALT', label: 'Ryczałt (12%)', description: 'Od przychodu, bez kosztów' }
      ],
      zusTypes: [
        { value: 'STANDARD', label: 'Pełny ZUS', amount: TAX_CONSTANTS.ZUS_STANDARD.TOTAL },
        { value: 'MALY_ZUS_PLUS', label: 'Mały ZUS Plus', amount: TAX_CONSTANTS.ZUS_MALY_PLUS.TOTAL },
        { value: 'PREFERENCYJNY', label: 'Preferencyjny', amount: TAX_CONSTANTS.ZUS_PREFERENCYJNY.TOTAL },
        { value: 'CUSTOM', label: 'Własna kwota', amount: null }
      ]
    });
  } catch (error) {
    console.error('GetTaxConstants error:', error);
    res.status(500).json({ error: 'Failed to get tax constants' });
  }
}
