// 2024/2025 Polish B2B Tax Constants
// Based on official Polish tax law and ZUS regulations

export const TAX_CONSTANTS = {
  // ============================================
  // PIT (Income Tax) Rates
  // ============================================

  // Podatek liniowy (Flat Tax)
  LINIOWY_RATE: 0.19,           // 19%

  // Skala podatkowa (Progressive Tax)
  SKALA_LOWER_RATE: 0.12,       // 12% for income up to threshold
  SKALA_UPPER_RATE: 0.32,       // 32% for income above threshold
  SKALA_THRESHOLD: 120000,      // PLN - threshold for 32% bracket
  SKALA_FREE_AMOUNT: 30000,     // PLN - kwota wolna od podatku

  // Ryczałt (Lump Sum Tax)
  RYCZALT_IT_RATE: 0.12,        // 12% for IT services
  RYCZALT_RATES: {
    IT_SERVICES: 0.12,          // 12% - usługi IT
    LIBERAL_PROFESSIONS: 0.12,  // 12% - wolne zawody
    TRADE: 0.03,                // 3% - handel
    CONSTRUCTION: 0.055,        // 5.5% - budownictwo
    MANUFACTURING: 0.085,       // 8.5% - produkcja
    RENTAL: 0.085,              // 8.5% - najem (up to 100k)
    RENTAL_ABOVE: 0.125,        // 12.5% - najem (above 100k)
    MEDICAL: 0.14,              // 14% - usługi medyczne
    HOSPITALITY: 0.15,          // 15% - hotelarstwo, gastronomia
  },

  // ============================================
  // ZUS (Social Security) 2024
  // ============================================

  // Base amounts (for calculating contributions)
  ZUS_BASE_STANDARD: 4694.40,      // 60% of average salary
  ZUS_BASE_PREFERENTIAL: 1047.90,  // 30% of minimum wage
  AVERAGE_SALARY_2024: 7824.00,    // Average salary for 2024
  MINIMUM_WAGE_2024: 4300.00,      // Minimum wage 2024

  // Monthly contributions (standard - big ZUS)
  ZUS_STANDARD: {
    TOTAL: 1600.32,
    BREAKDOWN: {
      EMERYTALNE: 912.23,     // 19.52% of base
      RENTOWE: 384.74,        // 8% of base
      CHOROBOWE: 114.98,      // 2.45% of base (voluntary for B2B)
      WYPADKOWE: 78.40,       // 1.67% of base
      FUNDUSZ_PRACY: 109.97,  // 2.45% of base
    }
  },

  // Mały ZUS Plus (first 2 years, revenue < 120k)
  ZUS_MALY_PLUS: {
    TOTAL: 402.65,
    // Calculated individually based on previous year's revenue
    BASE_MULTIPLIER: 0.50,    // 50% of average salary
  },

  // Preferencyjny ZUS (first 6 months)
  ZUS_PREFERENCYJNY: {
    TOTAL: 331.26,
    BASE: 1047.90,            // 30% of minimum wage
  },

  // ============================================
  // Składka Zdrowotna (Health Insurance) 2024
  // ============================================

  // Rates by tax form
  HEALTH_LINIOWY_RATE: 0.049,     // 4.9% of income
  HEALTH_SKALA_RATE: 0.09,        // 9% of income

  // Minimum contribution
  HEALTH_MINIMUM: 381.78,         // Minimum monthly (9% of minimum wage)

  // Ryczalt health insurance brackets
  RYCZALT_HEALTH_BRACKETS: [
    { maxRevenue: 60000, multiplier: 0.60 },   // 60% of average salary
    { maxRevenue: 300000, multiplier: 1.00 },  // 100% of average salary
    { maxRevenue: Infinity, multiplier: 1.80 } // 180% of average salary
  ],

  // Health base for ryczalt (9% of bracket amount)
  RYCZALT_HEALTH_RATE: 0.09,

  // ============================================
  // Tax Deadlines (days of month)
  // ============================================

  DEADLINES: {
    PIT_ADVANCE: 20,         // 20th of following month
    ZUS_STANDARD: 20,        // 20th for standard
    ZUS_NO_EMPLOYEES: 20,    // 20th if no employees
    VAT_MONTHLY: 25,         // 25th for monthly VAT
    VAT_QUARTERLY: 25,       // 25th for quarterly VAT
  },

  // ============================================
  // VAT Rates
  // ============================================

  VAT_RATES: {
    STANDARD: 23,
    REDUCED_1: 8,
    REDUCED_2: 5,
    ZERO: 0,
  },

  // ============================================
  // Expense Deductibility Rules
  // ============================================

  EXPENSE_RULES: {
    // Car expenses (non-electric, not fully company-owned)
    CAR_DEDUCTIBLE_PERCENT: 75,  // 75% deductible
    CAR_LEASING_LIMIT: 150000,   // PLN limit for leasing deduction

    // Meals/entertainment - partially deductible
    MEALS_DEDUCTIBLE_PERCENT: 100, // Fully deductible if business purpose
    ENTERTAINMENT_DEDUCTIBLE_PERCENT: 100, // Fully if documented

    // Home office
    HOME_OFFICE_DEDUCTIBLE_PERCENT: 100, // Based on actual usage ratio
  },
};

// Type exports for TypeScript
export type TaxFormType = 'LINIOWY' | 'SKALA' | 'RYCZALT';
export type ZUSTypeType = 'STANDARD' | 'MALY_ZUS_PLUS' | 'PREFERENCYJNY' | 'CUSTOM';

// Helper function to get month name in Polish
export const POLISH_MONTHS = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień'
];

// Helper function to format PLN currency
export function formatPLN(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2
  }).format(amount);
}
