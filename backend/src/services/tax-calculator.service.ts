import { PrismaClient, TaxForm, ZUSType } from '@prisma/client';
import { TAX_CONSTANTS } from '../constants/polish-tax-2024.js';
import { NBPExchangeService } from './nbp-exchange.service.js';

export interface MonthlyTaxResult {
  month: number;
  year: number;

  // Income
  grossIncome: number;          // In original currencies
  grossIncomePLN: number;       // Converted to PLN
  invoiceCount: number;
  invoices: Array<{
    id: string;
    amount: number;
    currency: string;
    amountPLN: number;
    clientName?: string;
  }>;

  // Expenses
  totalExpenses: number;
  deductibleExpenses: number;
  expenseCount: number;

  // Tax base
  taxBase: number;

  // Taxes
  pit: number;
  zus: number;
  healthInsurance: number;
  totalTaxDue: number;

  // Net result
  netIncome: number;
  effectiveTaxRate: number;

  // YTD tracking (for skala progressive tax)
  ytdIncome: number;
  ytdTaxBase: number;
  ytdPitPaid: number;
}

export interface YearlySummary {
  year: number;
  taxForm: TaxForm;
  zusType: ZUSType;
  months: MonthlyTaxResult[];

  totals: {
    grossIncome: number;
    grossIncomePLN: number;
    totalExpenses: number;
    deductibleExpenses: number;
    taxBase: number;
    pit: number;
    zus: number;
    healthInsurance: number;
    totalTaxDue: number;
    netIncome: number;
    effectiveTaxRate: number;
    invoiceCount: number;
    expenseCount: number;
  };
}

export interface TaxDashboard {
  currentMonth: MonthlyTaxResult;
  yearToDate: YearlySummary['totals'];
  settings: {
    taxForm: TaxForm;
    zusType: ZUSType;
    ryczaltRate?: number;
  };
  lastUpdated: Date;
}

export class TaxCalculatorService {
  private nbpService: NBPExchangeService;

  constructor(private prisma: PrismaClient) {
    this.nbpService = new NBPExchangeService(prisma);
  }

  /**
   * Calculate taxes for a specific month
   */
  async calculateMonthlyTax(
    userId: string,
    month: number,  // 1-12
    year: number
  ): Promise<MonthlyTaxResult> {
    // Get user tax settings
    const settings = await this.getOrCreateTaxSettings(userId);

    // Get invoices for the month (using SENT and PAID statuses, excluding archived)
    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        invoiceMonth: month - 1, // JS months are 0-based in our schema
        invoiceYear: year,
        status: { in: ['SENT', 'PAID'] },
        isArchived: false
      },
      include: {
        task: {
          include: { client: true }
        }
      }
    });

    // Convert invoice amounts to PLN
    const invoicesWithPLN = await Promise.all(
      invoices.map(async (inv) => {
        if (inv.currency === 'PLN') {
          return {
            id: inv.id,
            amount: Number(inv.amount),
            currency: inv.currency,
            amountPLN: Number(inv.amount),
            clientName: inv.task?.client?.name || inv.task?.clientName || undefined
          };
        }

        const converted = await this.nbpService.convertToPLN(
          Number(inv.amount),
          inv.currency,
          inv.createdAt
        );

        return {
          id: inv.id,
          amount: Number(inv.amount),
          currency: inv.currency,
          amountPLN: converted.amountPLN,
          clientName: inv.task?.client?.name || inv.task?.clientName || undefined
        };
      })
    );

    const grossIncomePLN = invoicesWithPLN.reduce((sum, inv) => sum + inv.amountPLN, 0);
    const grossIncome = invoicesWithPLN.reduce((sum, inv) => sum + inv.amount, 0);

    // Get expenses for the month
    const expenses = await this.prisma.expense.findMany({
      where: {
        userId,
        expenseMonth: month,
        expenseYear: year
      }
    });

    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amountPLN), 0);
    const deductibleExpenses = expenses
      .filter(e => e.isDeductible)
      .reduce((sum, exp) =>
        sum + (Number(exp.netAmount) * Number(exp.deductiblePercent) / 100), 0
      );

    // Calculate tax base based on tax form
    let taxBase: number;
    if (settings.taxForm === 'RYCZALT') {
      taxBase = grossIncomePLN; // Ryczalt: no expense deduction
    } else {
      taxBase = Math.max(0, grossIncomePLN - deductibleExpenses);
    }

    // Get YTD data for skala progressive calculation
    const ytdData = await this.getYTDData(userId, month, year);

    // Calculate PIT
    const pit = this.calculatePIT(settings.taxForm, taxBase, ytdData, settings);

    // Calculate ZUS
    const zus = this.calculateZUS(settings.zusType, settings.customZusAmount);

    // Calculate health insurance
    const healthInsurance = this.calculateHealthInsurance(
      settings.taxForm,
      grossIncomePLN,
      ytdData.ytdIncome + grossIncomePLN,
      settings
    );

    const totalTaxDue = pit + zus + healthInsurance;
    const netIncome = grossIncomePLN - totalTaxDue;
    const effectiveTaxRate = grossIncomePLN > 0 ? (totalTaxDue / grossIncomePLN) * 100 : 0;

    return {
      month,
      year,
      grossIncome,
      grossIncomePLN,
      invoiceCount: invoices.length,
      invoices: invoicesWithPLN,
      totalExpenses,
      deductibleExpenses,
      expenseCount: expenses.length,
      taxBase,
      pit: Math.round(pit * 100) / 100,
      zus: Math.round(zus * 100) / 100,
      healthInsurance: Math.round(healthInsurance * 100) / 100,
      totalTaxDue: Math.round(totalTaxDue * 100) / 100,
      netIncome: Math.round(netIncome * 100) / 100,
      effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
      ytdIncome: ytdData.ytdIncome + grossIncomePLN,
      ytdTaxBase: ytdData.ytdTaxBase + taxBase,
      ytdPitPaid: ytdData.ytdPitPaid + pit
    };
  }

  /**
   * Calculate PIT based on tax form
   */
  private calculatePIT(
    taxForm: TaxForm,
    monthlyTaxBase: number,
    ytdData: { ytdTaxBase: number },
    settings: { ryczaltRate: any }
  ): number {
    switch (taxForm) {
      case 'LINIOWY':
        return monthlyTaxBase * TAX_CONSTANTS.LINIOWY_RATE;

      case 'SKALA':
        return this.calculateSkalaProgressiveTax(monthlyTaxBase, ytdData.ytdTaxBase);

      case 'RYCZALT':
        const ryczaltRate = Number(settings.ryczaltRate) / 100 || TAX_CONSTANTS.RYCZALT_IT_RATE;
        return monthlyTaxBase * ryczaltRate;

      default:
        return 0;
    }
  }

  /**
   * Calculate progressive tax for Skala podatkowa
   * Takes into account YTD income for proper bracket calculation
   */
  private calculateSkalaProgressiveTax(
    monthlyTaxBase: number,
    previousYtdTaxBase: number
  ): number {
    const {
      SKALA_THRESHOLD,
      SKALA_FREE_AMOUNT,
      SKALA_LOWER_RATE,
      SKALA_UPPER_RATE
    } = TAX_CONSTANTS;

    // Apply kwota wolna (free amount) proportionally to monthly income
    const monthlyFreeAmount = SKALA_FREE_AMOUNT / 12;
    const adjustedBase = Math.max(0, monthlyTaxBase - monthlyFreeAmount);

    const newYtdTaxBase = previousYtdTaxBase + adjustedBase;
    const previousApplied = Math.min(previousYtdTaxBase, SKALA_THRESHOLD);
    const newApplied = Math.min(newYtdTaxBase, SKALA_THRESHOLD);

    let tax = 0;

    // Lower bracket (12%)
    const lowerBracketNew = newApplied - previousApplied;
    if (lowerBracketNew > 0) {
      tax += lowerBracketNew * SKALA_LOWER_RATE;
    }

    // Upper bracket (32%)
    if (newYtdTaxBase > SKALA_THRESHOLD) {
      const upperBracketPrev = Math.max(0, previousYtdTaxBase - SKALA_THRESHOLD);
      const upperBracketNew = newYtdTaxBase - SKALA_THRESHOLD;
      tax += (upperBracketNew - upperBracketPrev) * SKALA_UPPER_RATE;
    }

    return Math.max(0, tax);
  }

  /**
   * Calculate ZUS contribution
   */
  private calculateZUS(zusType: ZUSType, customAmount?: any): number {
    switch (zusType) {
      case 'STANDARD':
        return TAX_CONSTANTS.ZUS_STANDARD.TOTAL;
      case 'MALY_ZUS_PLUS':
        return TAX_CONSTANTS.ZUS_MALY_PLUS.TOTAL;
      case 'PREFERENCYJNY':
        return TAX_CONSTANTS.ZUS_PREFERENCYJNY.TOTAL;
      case 'CUSTOM':
        return customAmount ? Number(customAmount) : TAX_CONSTANTS.ZUS_STANDARD.TOTAL;
      default:
        return TAX_CONSTANTS.ZUS_STANDARD.TOTAL;
    }
  }

  /**
   * Calculate health insurance (składka zdrowotna)
   */
  private calculateHealthInsurance(
    taxForm: TaxForm,
    monthlyIncome: number,
    ytdIncome: number,
    settings: any
  ): number {
    const {
      HEALTH_MINIMUM,
      AVERAGE_SALARY_2024,
      RYCZALT_HEALTH_BRACKETS,
      RYCZALT_HEALTH_RATE
    } = TAX_CONSTANTS;

    switch (taxForm) {
      case 'LINIOWY':
        return Math.max(HEALTH_MINIMUM, monthlyIncome * TAX_CONSTANTS.HEALTH_LINIOWY_RATE);

      case 'SKALA':
        return Math.max(HEALTH_MINIMUM, monthlyIncome * TAX_CONSTANTS.HEALTH_SKALA_RATE);

      case 'RYCZALT':
        // Based on YTD revenue brackets
        const bracket = RYCZALT_HEALTH_BRACKETS.find(b => ytdIncome <= b.maxRevenue);
        const multiplier = bracket?.multiplier || 1.80;
        return AVERAGE_SALARY_2024 * multiplier * RYCZALT_HEALTH_RATE;

      default:
        return HEALTH_MINIMUM;
    }
  }

  /**
   * Get Year-To-Date data for progressive tax calculation
   */
  private async getYTDData(userId: string, upToMonth: number, year: number) {
    // Get all invoices before this month in the same year (excluding archived)
    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        invoiceYear: year,
        invoiceMonth: { lt: upToMonth - 1 }, // JS months are 0-based
        status: { in: ['SENT', 'PAID'] },
        isArchived: false
      }
    });

    // Get all expenses before this month
    const expenses = await this.prisma.expense.findMany({
      where: {
        userId,
        expenseYear: year,
        expenseMonth: { lt: upToMonth },
        isDeductible: true
      }
    });

    // Calculate YTD income (converted to PLN)
    let ytdIncome = 0;
    for (const inv of invoices) {
      if (inv.currency === 'PLN') {
        ytdIncome += Number(inv.amount);
      } else {
        const converted = await this.nbpService.convertToPLN(
          Number(inv.amount),
          inv.currency,
          inv.createdAt
        );
        ytdIncome += converted.amountPLN;
      }
    }

    // Calculate YTD deductible expenses
    const ytdExpenses = expenses.reduce((sum, exp) =>
      sum + (Number(exp.netAmount) * Number(exp.deductiblePercent) / 100), 0
    );

    // Get tax settings to determine tax form
    const settings = await this.getOrCreateTaxSettings(userId);
    const ytdTaxBase = settings.taxForm === 'RYCZALT'
      ? ytdIncome
      : Math.max(0, ytdIncome - ytdExpenses);

    // Calculate YTD PIT (simplified for now)
    const ytdPitPaid = this.calculateYTDPit(settings.taxForm, ytdTaxBase, settings);

    return {
      ytdIncome,
      ytdTaxBase,
      ytdPitPaid
    };
  }

  /**
   * Calculate YTD PIT for reference
   */
  private calculateYTDPit(taxForm: TaxForm, ytdTaxBase: number, settings: any): number {
    switch (taxForm) {
      case 'LINIOWY':
        return ytdTaxBase * TAX_CONSTANTS.LINIOWY_RATE;

      case 'SKALA':
        const freeAmount = TAX_CONSTANTS.SKALA_FREE_AMOUNT;
        const threshold = TAX_CONSTANTS.SKALA_THRESHOLD;
        const adjustedBase = Math.max(0, ytdTaxBase - freeAmount);

        if (adjustedBase <= threshold) {
          return adjustedBase * TAX_CONSTANTS.SKALA_LOWER_RATE;
        } else {
          const lowerPart = threshold * TAX_CONSTANTS.SKALA_LOWER_RATE;
          const upperPart = (adjustedBase - threshold) * TAX_CONSTANTS.SKALA_UPPER_RATE;
          return lowerPart + upperPart;
        }

      case 'RYCZALT':
        const ryczaltRate = Number(settings.ryczaltRate) / 100 || TAX_CONSTANTS.RYCZALT_IT_RATE;
        return ytdTaxBase * ryczaltRate;

      default:
        return 0;
    }
  }

  /**
   * Get or create tax settings for a user
   */
  private async getOrCreateTaxSettings(userId: string) {
    let settings = await this.prisma.taxSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      settings = await this.prisma.taxSettings.create({
        data: {
          userId,
          taxForm: 'LINIOWY',
          zusType: 'STANDARD',
          ryczaltRate: 12
        }
      });
    }

    return settings;
  }

  /**
   * Calculate yearly summary
   */
  async calculateYearlySummary(userId: string, year: number): Promise<YearlySummary> {
    const settings = await this.getOrCreateTaxSettings(userId);

    const months: MonthlyTaxResult[] = [];
    const currentDate = new Date();
    const currentMonth = currentDate.getFullYear() === year ? currentDate.getMonth() + 1 : 12;

    // Calculate for each month up to current
    for (let month = 1; month <= currentMonth; month++) {
      const result = await this.calculateMonthlyTax(userId, month, year);
      months.push(result);
    }

    // Calculate totals
    const totals = {
      grossIncome: months.reduce((sum, m) => sum + m.grossIncome, 0),
      grossIncomePLN: months.reduce((sum, m) => sum + m.grossIncomePLN, 0),
      totalExpenses: months.reduce((sum, m) => sum + m.totalExpenses, 0),
      deductibleExpenses: months.reduce((sum, m) => sum + m.deductibleExpenses, 0),
      taxBase: months.reduce((sum, m) => sum + m.taxBase, 0),
      pit: months.reduce((sum, m) => sum + m.pit, 0),
      zus: months.reduce((sum, m) => sum + m.zus, 0),
      healthInsurance: months.reduce((sum, m) => sum + m.healthInsurance, 0),
      totalTaxDue: months.reduce((sum, m) => sum + m.totalTaxDue, 0),
      netIncome: months.reduce((sum, m) => sum + m.netIncome, 0),
      invoiceCount: months.reduce((sum, m) => sum + m.invoiceCount, 0),
      expenseCount: months.reduce((sum, m) => sum + m.expenseCount, 0),
      effectiveTaxRate: 0
    };

    totals.effectiveTaxRate = totals.grossIncomePLN > 0
      ? Math.round((totals.totalTaxDue / totals.grossIncomePLN) * 10000) / 100
      : 0;

    return {
      year,
      taxForm: settings.taxForm,
      zusType: settings.zusType,
      months,
      totals
    };
  }

  /**
   * Get tax dashboard data
   */
  async getTaxDashboard(userId: string): Promise<TaxDashboard> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get current month calculation
    const currentMonthData = await this.calculateMonthlyTax(userId, currentMonth, currentYear);

    // Get yearly summary
    const yearlySummary = await this.calculateYearlySummary(userId, currentYear);

    // Get tax settings
    const settings = await this.getOrCreateTaxSettings(userId);

    return {
      currentMonth: currentMonthData,
      yearToDate: yearlySummary.totals,
      settings: {
        taxForm: settings.taxForm,
        zusType: settings.zusType,
        ryczaltRate: settings.ryczaltRate ? Number(settings.ryczaltRate) : undefined
      },
      lastUpdated: new Date()
    };
  }
}
