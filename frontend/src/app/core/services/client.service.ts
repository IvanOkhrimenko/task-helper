import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BankAccount } from './bank-account.service';

export type InvoiceTemplate = 'STANDARD' | 'MINIMAL' | 'MODERN' | 'CORPORATE' | 'CREATIVE' | 'ELEGANT';

export interface Client {
  id: string;
  name: string;
  isActive: boolean;
  isArchived: boolean;
  // Contact info
  nip?: string;
  streetAddress?: string;
  postcode?: string;
  city?: string;
  country?: string;
  email?: string;
  billingEmail?: string;
  bankAccount?: string;  // Client's bank account number
  // CRM integration
  crmClientId?: string;
  crmIntegrationId?: string;
  crmIntegration?: {
    id: string;
    name: string;
    isActive: boolean;
  };
  // Invoice defaults
  hourlyRate?: number;
  hoursWorked?: number;
  description?: string;
  defaultServiceName?: string;
  currency: string;
  defaultLanguage: string;
  invoiceTemplate: InvoiceTemplate;
  // Email templates
  emailSubjectTemplate?: string;
  emailBodyTemplate?: string;
  useCustomEmailTemplate?: boolean;
  // Integrations
  googleAccountId?: string;
  googleAccount?: {
    id: string;
    email: string;
  };
  bankAccountId?: string;
  bankAccountRef?: BankAccount;
  // Counts
  _count?: {
    tasks: number;
    invoices: number;
  };
  // Related data (from detail endpoint)
  tasks?: ClientTask[];
  invoices?: ClientInvoice[];
  // Metadata
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientTask {
  id: string;
  name: string;
  warningDate?: number;
  deadlineDate?: number;
  isActive: boolean;
}

export interface ClientInvoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED';
  createdAt: string;
}

export interface CreateClientDto {
  name: string;
  // Contact info
  nip?: string;
  streetAddress?: string;
  postcode?: string;
  city?: string;
  country?: string;
  email?: string;
  billingEmail?: string;
  bankAccount?: string;
  // CRM integration
  crmClientId?: string;
  crmIntegrationId?: string;
  // Invoice defaults
  hourlyRate?: number;
  hoursWorked?: number;
  description?: string;
  defaultServiceName?: string;
  currency?: string;
  defaultLanguage?: string;
  invoiceTemplate?: InvoiceTemplate;
  // Email templates
  emailSubjectTemplate?: string;
  emailBodyTemplate?: string;
  useCustomEmailTemplate?: boolean;
  // Integrations
  googleAccountId?: string;
  bankAccountId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private readonly apiUrl = `${environment.apiUrl}/clients`;

  constructor(private http: HttpClient) {}

  getClients(includeArchived = false): Observable<Client[]> {
    let params = new HttpParams();
    if (includeArchived) {
      params = params.set('includeArchived', 'true');
    }
    return this.http.get<Client[]>(this.apiUrl, { params });
  }

  getClient(id: string): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/${id}`);
  }

  createClient(client: CreateClientDto): Observable<Client> {
    return this.http.post<Client>(this.apiUrl, client);
  }

  updateClient(id: string, client: Partial<CreateClientDto>): Observable<Client> {
    return this.http.put<Client>(`${this.apiUrl}/${id}`, client);
  }

  deleteClient(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleClient(id: string): Observable<Client> {
    return this.http.patch<Client>(`${this.apiUrl}/${id}/toggle`, {});
  }

  archiveClient(id: string): Observable<Client> {
    return this.http.patch<Client>(`${this.apiUrl}/${id}/archive`, {});
  }

  unarchiveClient(id: string): Observable<Client> {
    return this.http.patch<Client>(`${this.apiUrl}/${id}/unarchive`, {});
  }
}
