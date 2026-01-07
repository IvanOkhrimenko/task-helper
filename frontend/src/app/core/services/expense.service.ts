import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Types
export type ExpenseCategory =
  | 'OFFICE_SUPPLIES'
  | 'SOFTWARE_SUBSCRIPTIONS'
  | 'HARDWARE_EQUIPMENT'
  | 'TRAVEL_TRANSPORT'
  | 'MEALS_ENTERTAINMENT'
  | 'PROFESSIONAL_SERVICES'
  | 'EDUCATION_TRAINING'
  | 'MARKETING_ADVERTISING'
  | 'INSURANCE'
  | 'RENT_UTILITIES'
  | 'TELECOMMUNICATIONS'
  | 'BANKING_FEES'
  | 'TAXES_FEES'
  | 'OTHER';

export type ExpenseType = 'BUSINESS' | 'PERSONAL';

export interface Expense {
  id: string;
  name: string;
  description?: string;
  category: ExpenseCategory;
  expenseType: ExpenseType;
  amount: number;
  currency: string;
  amountPLN: number;
  expenseDate: string;
  expenseMonth: number;
  expenseYear: number;
  vatRate?: number;
  vatAmount?: number;
  netAmount: number;
  documentNumber?: string;
  documentPath?: string;
  isDeductible: boolean;
  deductiblePercent: number;
  originalCurrency?: string;
  originalAmount?: number;
  exchangeRate?: number;
  exchangeRateDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseFilters {
  month?: number;
  year?: number;
  category?: ExpenseCategory | 'ALL';
  expenseType?: ExpenseType | 'ALL';
  startDate?: string;
  endDate?: string;
}

export interface ExpensesSummary {
  year: number;
  total: number;
  totalBusiness: number;
  totalPersonal: number;
  totalDeductible: number;
  byMonth: Record<number, number>;
  byCategory: Record<string, number>;
  count: number;
  businessCount: number;
  personalCount: number;
}

export interface CreateExpenseDto {
  name: string;
  description?: string;
  category: ExpenseCategory;
  expenseType?: ExpenseType;
  amount: number;
  currency: string;
  expenseDate: string;
  vatRate?: number;
  documentNumber?: string;
  documentPath?: string;
  isDeductible?: boolean;
  deductiblePercent?: number;
}

export interface ExpenseCategoryInfo {
  value: ExpenseCategory;
  label: string;
  icon: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/expenses`;

  // CRUD
  getExpenses(filters?: ExpenseFilters): Observable<Expense[]> {
    let params = new HttpParams();
    if (filters?.month) params = params.set('month', filters.month.toString());
    if (filters?.year) params = params.set('year', filters.year.toString());
    if (filters?.category && filters.category !== 'ALL') {
      params = params.set('category', filters.category);
    }
    if (filters?.expenseType && filters.expenseType !== 'ALL') {
      params = params.set('expenseType', filters.expenseType);
    }
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate) params = params.set('endDate', filters.endDate);

    return this.http.get<Expense[]>(this.apiUrl, { params });
  }

  getExpense(id: string): Observable<Expense> {
    return this.http.get<Expense>(`${this.apiUrl}/${id}`);
  }

  createExpense(data: CreateExpenseDto): Observable<Expense> {
    return this.http.post<Expense>(this.apiUrl, data);
  }

  updateExpense(id: string, data: Partial<CreateExpenseDto>): Observable<Expense> {
    return this.http.put<Expense>(`${this.apiUrl}/${id}`, data);
  }

  deleteExpense(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Summary
  getSummary(year?: number): Observable<ExpensesSummary> {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());
    return this.http.get<ExpensesSummary>(`${this.apiUrl}/summary`, { params });
  }

  // Reference data
  getCategories(): Observable<ExpenseCategoryInfo[]> {
    return this.http.get<ExpenseCategoryInfo[]>(`${this.apiUrl}/categories`);
  }

  // Helpers
  getCategoryLabel(category: ExpenseCategory): string {
    const labels: Record<ExpenseCategory, string> = {
      OFFICE_SUPPLIES: 'Office supplies',
      SOFTWARE_SUBSCRIPTIONS: 'Software',
      HARDWARE_EQUIPMENT: 'Hardware',
      TRAVEL_TRANSPORT: 'Travel',
      MEALS_ENTERTAINMENT: 'Meals',
      PROFESSIONAL_SERVICES: 'Services',
      EDUCATION_TRAINING: 'Training',
      MARKETING_ADVERTISING: 'Marketing',
      INSURANCE: 'Insurance',
      RENT_UTILITIES: 'Rent & utilities',
      TELECOMMUNICATIONS: 'Telecom',
      BANKING_FEES: 'Bank fees',
      TAXES_FEES: 'Taxes',
      OTHER: 'Other'
    };
    return labels[category] || category;
  }

  getExpenseTypeLabel(type: ExpenseType): string {
    return type === 'BUSINESS' ? 'Business' : 'Personal';
  }

  getCategoryIcon(category: ExpenseCategory): string {
    const icons: Record<ExpenseCategory, string> = {
      OFFICE_SUPPLIES: 'clipboard',
      SOFTWARE_SUBSCRIPTIONS: 'code',
      HARDWARE_EQUIPMENT: 'monitor',
      TRAVEL_TRANSPORT: 'car',
      MEALS_ENTERTAINMENT: 'coffee',
      PROFESSIONAL_SERVICES: 'briefcase',
      EDUCATION_TRAINING: 'book',
      MARKETING_ADVERTISING: 'megaphone',
      INSURANCE: 'shield',
      RENT_UTILITIES: 'home',
      TELECOMMUNICATIONS: 'phone',
      BANKING_FEES: 'credit-card',
      TAXES_FEES: 'file-text',
      OTHER: 'more-horizontal'
    };
    return icons[category] || 'circle';
  }

  getCategoryColor(category: ExpenseCategory): string {
    const colors: Record<ExpenseCategory, string> = {
      OFFICE_SUPPLIES: '#6366f1',
      SOFTWARE_SUBSCRIPTIONS: '#8b5cf6',
      HARDWARE_EQUIPMENT: '#ec4899',
      TRAVEL_TRANSPORT: '#f59e0b',
      MEALS_ENTERTAINMENT: '#10b981',
      PROFESSIONAL_SERVICES: '#3b82f6',
      EDUCATION_TRAINING: '#06b6d4',
      MARKETING_ADVERTISING: '#f97316',
      INSURANCE: '#14b8a6',
      RENT_UTILITIES: '#6366f1',
      TELECOMMUNICATIONS: '#8b5cf6',
      BANKING_FEES: '#64748b',
      TAXES_FEES: '#ef4444',
      OTHER: '#94a3b8'
    };
    return colors[category] || '#64748b';
  }

  formatPLN(amount: number): string {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 2
    }).format(amount);
  }

  getAllCategories(): ExpenseCategory[] {
    return [
      'OFFICE_SUPPLIES',
      'SOFTWARE_SUBSCRIPTIONS',
      'HARDWARE_EQUIPMENT',
      'TRAVEL_TRANSPORT',
      'MEALS_ENTERTAINMENT',
      'PROFESSIONAL_SERVICES',
      'EDUCATION_TRAINING',
      'MARKETING_ADVERTISING',
      'INSURANCE',
      'RENT_UTILITIES',
      'TELECOMMUNICATIONS',
      'BANKING_FEES',
      'TAXES_FEES',
      'OTHER'
    ];
  }
}
