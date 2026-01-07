import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CRMIntegration {
  id: string;
  name: string;
  isActive: boolean;
  loginUrl: string;
  email: string;
  createInvoiceUrl: string;
  createInvoiceMethod: string;
  headers: Record<string, string>;
  fieldMapping: Record<string, string>;
  staticFields?: Record<string, string>;
  csrfSelector?: string;
  csrfHeader?: string;
  // Invoice list/download configuration
  listInvoicesUrl?: string;
  invoiceNumberPrefix?: string;
  invoiceNumberSuffix?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCRMIntegrationDto {
  name: string;
  loginUrl: string;
  loginMethod?: string;
  email: string;
  password: string;
  csrfSelector?: string;
  csrfHeader?: string;
  createInvoiceUrl: string;
  createInvoiceMethod?: string;
  headers?: Record<string, string>;
  fieldMapping: Record<string, string>;
  staticFields?: Record<string, string>;
  isActive?: boolean;
  // Invoice list/download configuration
  listInvoicesUrl?: string;
  invoiceNumberPrefix?: string;
  invoiceNumberSuffix?: string;
}

export interface ParsedCurlField {
  name: string;
  value: string;
  suggestedPlaceholder?: string;
}

export interface ParsedCurlRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  body: Record<string, string>;
  contentType: string;
}

export interface ParseCurlResult {
  success: boolean;
  request?: ParsedCurlRequest;
  fields?: ParsedCurlField[];
  error?: string;
}

export interface PlaceholderInfo {
  description: string;
  example: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class CRMIntegrationService {
  private readonly apiUrl = `${environment.apiUrl}/crm-integrations`;

  constructor(private http: HttpClient) {}

  getIntegrations(): Observable<CRMIntegration[]> {
    return this.http.get<CRMIntegration[]>(this.apiUrl);
  }

  getIntegration(id: string): Observable<CRMIntegration> {
    return this.http.get<CRMIntegration>(`${this.apiUrl}/${id}`);
  }

  createIntegration(data: CreateCRMIntegrationDto): Observable<CRMIntegration> {
    return this.http.post<CRMIntegration>(this.apiUrl, data);
  }

  updateIntegration(id: string, data: Partial<CreateCRMIntegrationDto>): Observable<CRMIntegration> {
    return this.http.put<CRMIntegration>(`${this.apiUrl}/${id}`, data);
  }

  deleteIntegration(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  testConnection(id: string): Observable<TestConnectionResult> {
    return this.http.post<TestConnectionResult>(`${this.apiUrl}/${id}/test`, {});
  }

  parseCurl(curlCommand: string): Observable<ParseCurlResult> {
    return this.http.post<ParseCurlResult>(`${this.apiUrl}/parse-curl`, { curlCommand });
  }

  getPlaceholders(): Observable<Record<string, PlaceholderInfo>> {
    return this.http.get<Record<string, PlaceholderInfo>>(`${this.apiUrl}/placeholders`);
  }
}
