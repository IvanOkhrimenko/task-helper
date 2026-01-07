import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Types
export type TaxForm = 'LINIOWY' | 'SKALA' | 'RYCZALT';
export type ZUSType = 'STANDARD' | 'MALY_ZUS_PLUS' | 'PREFERENCYJNY' | 'CUSTOM';

export interface TaxSettings {
  id: string;
  taxForm: TaxForm;
  zusType: ZUSType;
  customZusAmount?: number;
  zusStartDate?: string;
  healthInsuranceBase?: number;
  ryczaltRate: number;
  fiscalYearStart: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyTaxResult {
  month: number;
  year: number;
  grossIncome: number;
  grossIncomePLN: number;
  invoiceCount: number;
  invoices: Array<{
    id: string;
    amount: number;
    currency: string;
    amountPLN: number;
    clientName?: string;
  }>;
  totalExpenses: number;
  deductibleExpenses: number;
  expenseCount: number;
  taxBase: number;
  pit: number;
  zus: number;
  healthInsurance: number;
  totalTaxDue: number;
  netIncome: number;
  effectiveTaxRate: number;
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
  lastUpdated: string;
}

export interface TaxConstants {
  constants: any;
  months: string[];
  taxForms: Array<{ value: TaxForm; label: string; description: string }>;
  zusTypes: Array<{ value: ZUSType; label: string; amount: number | null }>;
}

@Injectable({
  providedIn: 'root'
})
export class TaxService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/tax`;

  // Settings
  getSettings(): Observable<TaxSettings> {
    return this.http.get<TaxSettings>(`${this.apiUrl}/settings`);
  }

  updateSettings(settings: Partial<TaxSettings>): Observable<TaxSettings> {
    return this.http.put<TaxSettings>(`${this.apiUrl}/settings`, settings);
  }

  // Calculations
  calculateMonthly(month: number, year: number): Observable<MonthlyTaxResult> {
    return this.http.get<MonthlyTaxResult>(`${this.apiUrl}/calculate`, {
      params: { month: month.toString(), year: year.toString() }
    });
  }

  getYearlySummary(year: number): Observable<YearlySummary> {
    return this.http.get<YearlySummary>(`${this.apiUrl}/yearly/${year}`);
  }

  getDashboard(): Observable<TaxDashboard> {
    return this.http.get<TaxDashboard>(`${this.apiUrl}/dashboard`);
  }

  // Reference data
  getConstants(): Observable<TaxConstants> {
    return this.http.get<TaxConstants>(`${this.apiUrl}/constants`);
  }

  // Helpers
  getTaxFormLabel(form: TaxForm): string {
    const labels: Record<TaxForm, string> = {
      LINIOWY: 'Podatek liniowy (19%)',
      SKALA: 'Skala podatkowa (12%/32%)',
      RYCZALT: 'Ryczałt'
    };
    return labels[form] || form;
  }

  getTaxFormShortLabel(form: TaxForm): string {
    const labels: Record<TaxForm, string> = {
      LINIOWY: 'Liniowy 19%',
      SKALA: 'Skala 12/32%',
      RYCZALT: 'Ryczałt'
    };
    return labels[form] || form;
  }

  getZUSTypeLabel(type: ZUSType): string {
    const labels: Record<ZUSType, string> = {
      STANDARD: 'Pełny ZUS',
      MALY_ZUS_PLUS: 'Mały ZUS Plus',
      PREFERENCYJNY: 'Preferencyjny',
      CUSTOM: 'Własna kwota'
    };
    return labels[type] || type;
  }

  formatPLN(amount: number): string {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 2
    }).format(amount);
  }

  getPolishMonthName(month: number): string {
    const months = [
      'Styczeń', 'Luty', 'Marzec', 'Kwiecień',
      'Maj', 'Czerwiec', 'Lipiec', 'Sierpień',
      'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ];
    return months[month - 1] || '';
  }
}
