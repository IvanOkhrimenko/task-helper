import { PrismaClient } from '@prisma/client';

const NBP_API_BASE = 'https://api.nbp.pl/api/exchangerates/rates/a';

interface NBPRateResponse {
  table: string;
  currency: string;
  code: string;
  rates: Array<{
    no: string;
    effectiveDate: string;
    mid: number;
  }>;
}

export interface ConversionResult {
  amountPLN: number;
  exchangeRate: number;
  exchangeRateDate: Date;
}

export class NBPExchangeService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get exchange rate for a currency on a specific date
   * First checks cache, then fetches from NBP API
   */
  async getExchangeRate(currency: string, date: Date): Promise<number> {
    const normalizedCurrency = currency.toUpperCase();

    // PLN doesn't need conversion
    if (normalizedCurrency === 'PLN') {
      return 1;
    }

    // Normalize date to start of day
    const rateDate = new Date(date);
    rateDate.setHours(0, 0, 0, 0);

    // Check cache first
    const cached = await this.prisma.exchangeRateCache.findUnique({
      where: {
        currency_rateDate: {
          currency: normalizedCurrency,
          rateDate
        }
      }
    });

    if (cached) {
      console.log(`[NBP] Cache hit for ${normalizedCurrency} on ${rateDate.toISOString().split('T')[0]}`);
      return Number(cached.rate);
    }

    // Fetch from NBP API
    const rate = await this.fetchFromNBP(normalizedCurrency, rateDate);

    // Cache the rate
    await this.prisma.exchangeRateCache.create({
      data: {
        currency: normalizedCurrency,
        rate,
        rateDate
      }
    });

    console.log(`[NBP] Fetched and cached ${normalizedCurrency}: ${rate} for ${rateDate.toISOString().split('T')[0]}`);
    return rate;
  }

  /**
   * Fetch rate from NBP API
   * Handles weekends/holidays by going back to previous business day
   */
  private async fetchFromNBP(currency: string, date: Date): Promise<number> {
    const dateStr = date.toISOString().split('T')[0];
    const url = `${NBP_API_BASE}/${currency}/${dateStr}/?format=json`;

    console.log(`[NBP] Fetching rate from: ${url}`);

    try {
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json() as NBPRateResponse;
        return data.rates[0].mid;
      }

      if (response.status === 404) {
        // Rate not available for this date (weekend/holiday), try previous days
        console.log(`[NBP] No rate for ${dateStr}, trying previous business days...`);
        return this.fetchPreviousBusinessDay(currency, date);
      }

      throw new Error(`NBP API error: ${response.status} ${response.statusText}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('NBP API error')) {
        throw error;
      }
      console.error(`[NBP] Fetch failed for ${currency}/${dateStr}:`, error);
      throw new Error(`Failed to fetch exchange rate for ${currency} on ${dateStr}`);
    }
  }

  /**
   * Try fetching rate from previous business days
   * Goes back up to 7 days to find a valid rate
   */
  private async fetchPreviousBusinessDay(currency: string, date: Date): Promise<number> {
    for (let i = 1; i <= 7; i++) {
      const prevDate = new Date(date);
      prevDate.setDate(prevDate.getDate() - i);
      const dateStr = prevDate.toISOString().split('T')[0];

      try {
        const url = `${NBP_API_BASE}/${currency}/${dateStr}/?format=json`;
        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json() as NBPRateResponse;
          console.log(`[NBP] Found rate on ${dateStr}: ${data.rates[0].mid}`);
          return data.rates[0].mid;
        }
      } catch {
        continue;
      }
    }

    throw new Error(`No exchange rate available for ${currency} within 7 days of ${date.toISOString().split('T')[0]}`);
  }

  /**
   * Convert amount from foreign currency to PLN
   * Per Polish tax law, use rate from day before the transaction for income
   */
  async convertToPLN(
    amount: number,
    currency: string,
    date: Date,
    usePreviousDay: boolean = true // Polish tax law requires previous day's rate for income
  ): Promise<ConversionResult> {
    const normalizedCurrency = currency.toUpperCase();

    if (normalizedCurrency === 'PLN') {
      return {
        amountPLN: amount,
        exchangeRate: 1,
        exchangeRateDate: date
      };
    }

    // For tax purposes, use rate from previous business day
    const rateDate = new Date(date);
    if (usePreviousDay) {
      rateDate.setDate(rateDate.getDate() - 1);
    }

    const rate = await this.getExchangeRate(normalizedCurrency, rateDate);

    return {
      amountPLN: Math.round(amount * rate * 100) / 100, // Round to 2 decimal places
      exchangeRate: rate,
      exchangeRateDate: rateDate
    };
  }

  /**
   * Get latest available rate for a currency
   * Useful for estimates/preview
   */
  async getLatestRate(currency: string): Promise<number> {
    const normalizedCurrency = currency.toUpperCase();

    if (normalizedCurrency === 'PLN') {
      return 1;
    }

    // Try today, then go back up to 7 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i <= 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);

      try {
        return await this.getExchangeRate(normalizedCurrency, checkDate);
      } catch {
        continue;
      }
    }

    throw new Error(`Could not find recent rate for ${currency}`);
  }

  /**
   * Get multiple rates for a date range (for reports)
   */
  async getRatesForRange(
    currency: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: Date; rate: number }>> {
    const normalizedCurrency = currency.toUpperCase();
    const rates: Array<{ date: Date; rate: number }> = [];

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      try {
        const rate = await this.getExchangeRate(normalizedCurrency, currentDate);
        rates.push({ date: new Date(currentDate), rate });
      } catch {
        // Skip dates with no rate
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return rates;
  }

  /**
   * Clear old cached rates (cleanup job)
   */
  async cleanupOldCache(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.exchangeRateCache.deleteMany({
      where: {
        rateDate: { lt: cutoffDate }
      }
    });

    console.log(`[NBP] Cleaned up ${result.count} old cache entries`);
    return result.count;
  }
}
