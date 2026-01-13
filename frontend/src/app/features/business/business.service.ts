/**
 * Business Finance Service
 * Angular service for interacting with Business Finance API
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Business,
  BusinessMembership,
  BusinessCategory,
  BusinessExpense,
  BusinessIncome,
  BusinessSettlement,
  BusinessInvite,
  LedgerSummary,
  MemberBalance,
  BusinessAnalytics,
  BusinessKPIs,
  CategoryBreakdown,
  TimeSeriesDataPoint,
  BusinessAuditLog,
  BusinessRole,
  CategoryType,
  CreateBusinessRequest,
  CreateExpenseRequest,
  CreateIncomeRequest,
  CreateSettlementRequest,
  CreateInviteRequest,
  CreateCategoryRequest,
  ExpensesResponse,
  IncomesResponse,
  SettlementsResponse,
} from './business.models';

@Injectable({
  providedIn: 'root',
})
export class BusinessService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/businesses`;

  // ========== Business CRUD ==========

  getMyBusinesses(): Observable<Business[]> {
    return this.http.get<Business[]>(this.baseUrl);
  }

  getBusiness(businessId: string): Observable<Business> {
    return this.http.get<Business>(`${this.baseUrl}/${businessId}`);
  }

  createBusiness(data: CreateBusinessRequest): Observable<Business> {
    return this.http.post<Business>(this.baseUrl, data);
  }

  updateBusiness(businessId: string, data: Partial<CreateBusinessRequest>): Observable<Business> {
    return this.http.patch<Business>(`${this.baseUrl}/${businessId}`, data);
  }

  archiveBusiness(businessId: string): Observable<Business> {
    return this.http.post<Business>(`${this.baseUrl}/${businessId}/archive`, {});
  }

  // ========== Members ==========

  getMembers(businessId: string): Observable<BusinessMembership[]> {
    return this.http.get<BusinessMembership[]>(`${this.baseUrl}/${businessId}/members`);
  }

  updateMemberRole(businessId: string, membershipId: string, role: BusinessRole): Observable<BusinessMembership> {
    return this.http.patch<BusinessMembership>(
      `${this.baseUrl}/${businessId}/members/${membershipId}/role`,
      { role }
    );
  }

  updateMemberPermissions(
    businessId: string,
    membershipId: string,
    permissions: Record<string, boolean>
  ): Observable<BusinessMembership> {
    return this.http.patch<BusinessMembership>(
      `${this.baseUrl}/${businessId}/members/${membershipId}/permissions`,
      { permissions }
    );
  }

  removeMember(businessId: string, membershipId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/${businessId}/members/${membershipId}`
    );
  }

  // ========== Invites ==========

  getInvites(businessId: string): Observable<BusinessInvite[]> {
    return this.http.get<BusinessInvite[]>(`${this.baseUrl}/${businessId}/invites`);
  }

  createInvite(businessId: string, data: CreateInviteRequest): Observable<BusinessInvite> {
    return this.http.post<BusinessInvite>(`${this.baseUrl}/${businessId}/invites`, data);
  }

  revokeInvite(businessId: string, inviteId: string): Observable<BusinessInvite> {
    return this.http.delete<BusinessInvite>(`${this.baseUrl}/${businessId}/invites/${inviteId}`);
  }

  getInviteByToken(token: string): Observable<{
    businessName: string;
    invitedBy: string;
    role: BusinessRole;
    expiresAt: string;
    email?: string;
  }> {
    return this.http.get<any>(`${this.baseUrl}/invite/${token}`);
  }

  acceptInvite(token: string): Observable<{ message: string; businessId: string }> {
    return this.http.post<any>(`${this.baseUrl}/invite/${token}/accept`, {});
  }

  // ========== Categories ==========

  getCategories(
    businessId: string,
    type?: CategoryType,
    includeArchived: boolean = false
  ): Observable<BusinessCategory[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    if (includeArchived) params = params.set('includeArchived', 'true');

    return this.http.get<BusinessCategory[]>(`${this.baseUrl}/${businessId}/categories`, { params });
  }

  createCategory(businessId: string, data: CreateCategoryRequest): Observable<BusinessCategory> {
    return this.http.post<BusinessCategory>(`${this.baseUrl}/${businessId}/categories`, data);
  }

  updateCategory(
    businessId: string,
    categoryId: string,
    data: Partial<CreateCategoryRequest & { isArchived: boolean }>
  ): Observable<BusinessCategory> {
    return this.http.patch<BusinessCategory>(
      `${this.baseUrl}/${businessId}/categories/${categoryId}`,
      data
    );
  }

  // ========== Expenses ==========

  getExpenses(
    businessId: string,
    options: {
      categoryId?: string;
      paidByMemberId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Observable<ExpensesResponse> {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<ExpensesResponse>(`${this.baseUrl}/${businessId}/expenses`, { params });
  }

  getExpense(businessId: string, expenseId: string): Observable<BusinessExpense> {
    return this.http.get<BusinessExpense>(`${this.baseUrl}/${businessId}/expenses/${expenseId}`);
  }

  createExpense(businessId: string, data: CreateExpenseRequest): Observable<BusinessExpense> {
    return this.http.post<BusinessExpense>(`${this.baseUrl}/${businessId}/expenses`, data);
  }

  updateExpense(
    businessId: string,
    expenseId: string,
    data: Partial<CreateExpenseRequest>
  ): Observable<BusinessExpense> {
    return this.http.patch<BusinessExpense>(
      `${this.baseUrl}/${businessId}/expenses/${expenseId}`,
      data
    );
  }

  deleteExpense(businessId: string, expenseId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/${businessId}/expenses/${expenseId}`
    );
  }

  // ========== Income ==========

  getIncomes(
    businessId: string,
    options: {
      categoryId?: string;
      receivedByMemberId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Observable<IncomesResponse> {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<IncomesResponse>(`${this.baseUrl}/${businessId}/incomes`, { params });
  }

  createIncome(businessId: string, data: CreateIncomeRequest): Observable<BusinessIncome> {
    return this.http.post<BusinessIncome>(`${this.baseUrl}/${businessId}/incomes`, data);
  }

  updateIncome(
    businessId: string,
    incomeId: string,
    data: Partial<CreateIncomeRequest>
  ): Observable<BusinessIncome> {
    return this.http.patch<BusinessIncome>(
      `${this.baseUrl}/${businessId}/incomes/${incomeId}`,
      data
    );
  }

  deleteIncome(businessId: string, incomeId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/${businessId}/incomes/${incomeId}`
    );
  }

  // ========== Ledger & Settlements ==========

  getLedger(businessId: string): Observable<LedgerSummary> {
    return this.http.get<LedgerSummary>(`${this.baseUrl}/${businessId}/ledger`);
  }

  getMemberLedger(
    businessId: string,
    membershipId: string,
    options: { startDate?: string; endDate?: string; limit?: number } = {}
  ): Observable<{
    balance: MemberBalance;
    history: {
      expenses: BusinessExpense[];
      incomes: BusinessIncome[];
      settlements: BusinessSettlement[];
    };
  }> {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) params = params.set(key, String(value));
    });

    return this.http.get<any>(`${this.baseUrl}/${businessId}/ledger/${membershipId}`, { params });
  }

  getSettlements(
    businessId: string,
    options: {
      memberId?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Observable<SettlementsResponse> {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) params = params.set(key, String(value));
    });

    return this.http.get<SettlementsResponse>(`${this.baseUrl}/${businessId}/settlements`, { params });
  }

  createSettlement(
    businessId: string,
    data: CreateSettlementRequest
  ): Observable<{ settlement: BusinessSettlement; newBalance: MemberBalance }> {
    return this.http.post<any>(`${this.baseUrl}/${businessId}/settlements`, data);
  }

  // ========== Analytics ==========

  getAnalytics(
    businessId: string,
    options: {
      period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
      startDate?: string;
      endDate?: string;
      groupBy?: 'day' | 'week' | 'month';
    } = {}
  ): Observable<BusinessAnalytics> {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) params = params.set(key, value);
    });

    return this.http.get<BusinessAnalytics>(`${this.baseUrl}/${businessId}/analytics`, { params });
  }

  getKPIs(
    businessId: string,
    options: { period?: string; startDate?: string; endDate?: string } = {}
  ): Observable<{ dateRange: { startDate: string; endDate: string }; kpis: BusinessKPIs }> {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) params = params.set(key, value);
    });

    return this.http.get<any>(`${this.baseUrl}/${businessId}/analytics/kpis`, { params });
  }

  getExpenseCategoryBreakdown(
    businessId: string,
    options: { period?: string; startDate?: string; endDate?: string } = {}
  ): Observable<{ dateRange: any; breakdown: CategoryBreakdown[] }> {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) params = params.set(key, value);
    });

    return this.http.get<any>(`${this.baseUrl}/${businessId}/analytics/expenses/categories`, { params });
  }

  getIncomeCategoryBreakdown(
    businessId: string,
    options: { period?: string; startDate?: string; endDate?: string } = {}
  ): Observable<{ dateRange: any; breakdown: CategoryBreakdown[] }> {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) params = params.set(key, value);
    });

    return this.http.get<any>(`${this.baseUrl}/${businessId}/analytics/incomes/categories`, { params });
  }

  getTimeSeries(
    businessId: string,
    options: { period?: string; startDate?: string; endDate?: string; groupBy?: string } = {}
  ): Observable<{ dateRange: any; timeSeries: TimeSeriesDataPoint[] }> {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) params = params.set(key, value);
    });

    return this.http.get<any>(`${this.baseUrl}/${businessId}/analytics/timeseries`, { params });
  }

  getBalancesWidget(businessId: string): Observable<LedgerSummary> {
    return this.http.get<LedgerSummary>(`${this.baseUrl}/${businessId}/analytics/balances`);
  }

  getOwnAnalytics(
    businessId: string,
    options: { period?: string; startDate?: string; endDate?: string } = {}
  ): Observable<any> {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) params = params.set(key, value);
    });

    return this.http.get<any>(`${this.baseUrl}/${businessId}/analytics/own`, { params });
  }

  getUserAnalytics(
    options: { period?: string; startDate?: string; endDate?: string } = {}
  ): Observable<any> {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) params = params.set(key, value);
    });

    return this.http.get<any>(`${this.baseUrl}/user/analytics`, { params });
  }

  // ========== Audit Log ==========

  getAuditLog(
    businessId: string,
    options: {
      action?: string;
      entityType?: string;
      entityId?: string;
      performedById?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Observable<{
    logs: BusinessAuditLog[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  }> {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) params = params.set(key, String(value));
    });

    return this.http.get<any>(`${this.baseUrl}/${businessId}/audit`, { params });
  }

  getEntityAuditTrail(
    businessId: string,
    entityType: string,
    entityId: string
  ): Observable<BusinessAuditLog[]> {
    return this.http.get<BusinessAuditLog[]>(
      `${this.baseUrl}/${businessId}/audit/${entityType}/${entityId}`
    );
  }
}
