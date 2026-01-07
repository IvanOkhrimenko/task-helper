import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BankAccount } from './bank-account.service';

export type InvoiceTemplate = 'STANDARD' | 'MINIMAL' | 'MODERN' | 'CORPORATE' | 'CREATIVE' | 'ELEGANT';

export interface Task {
  id: string;
  type: 'INVOICE';
  name: string;
  isActive: boolean;
  isArchived: boolean;
  warningDate: number;
  deadlineDate: number;
  // Client info
  clientName?: string;
  clientNip?: string;
  clientStreetAddress?: string;
  clientPostcode?: string;
  clientCity?: string;
  clientCountry?: string;
  clientAddress?: string;  // deprecated - use split fields
  clientEmail?: string;
  clientBankAccount?: string;
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
  defaultServiceName?: string;  // Default service name for CRM invoices
  currency: string;
  defaultLanguage: string;
  invoiceTemplate: InvoiceTemplate;
  googleAccountId?: string;
  // Bank account for invoices
  bankAccountId?: string;
  bankAccount?: BankAccount;
  // Email template fields
  emailSubjectTemplate?: string;
  emailBodyTemplate?: string;
  useCustomEmailTemplate?: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  invoices?: Invoice[];
}

export interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  language: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED';
  isArchived: boolean;
  pdfPath?: string;
  emailSubject?: string;
  emailBody?: string;
  comments?: string;
  invoiceMonth?: number;
  invoiceYear?: number;
  hoursWorked?: number;
  hourlyRate?: number;
  createdByAI?: boolean;  // True if created via AI assistant
  crmInvoiceId?: string;  // ID in external CRM system
  crmSyncedAt?: string;   // When synced to CRM
  crmPdfUrl?: string;     // URL to PDF in external CRM system
  crmPdfPath?: string;    // Local path to downloaded CRM PDF
  taskId: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
  task?: Task;
}

export interface CreateTaskDto {
  name: string;
  type?: 'INVOICE';
  warningDate: number;
  deadlineDate: number;
  // Client info
  clientName?: string;
  clientNip?: string;
  clientStreetAddress?: string;
  clientPostcode?: string;
  clientCity?: string;
  clientCountry?: string;
  clientAddress?: string;  // deprecated
  clientEmail?: string;
  clientBankAccount?: string;
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
  googleAccountId?: string;
  bankAccountId?: string;
  // Email template fields
  emailSubjectTemplate?: string;
  emailBodyTemplate?: string;
  useCustomEmailTemplate?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly apiUrl = `${environment.apiUrl}/tasks`;

  constructor(private http: HttpClient) {}

  getTasks(includeArchived = false): Observable<Task[]> {
    let params = new HttpParams();
    if (includeArchived) {
      params = params.set('includeArchived', 'true');
    }
    return this.http.get<Task[]>(this.apiUrl, { params });
  }

  getTask(id: string): Observable<Task> {
    return this.http.get<Task>(`${this.apiUrl}/${id}`);
  }

  createTask(task: CreateTaskDto): Observable<Task> {
    return this.http.post<Task>(this.apiUrl, task);
  }

  updateTask(id: string, task: Partial<CreateTaskDto>): Observable<Task> {
    return this.http.put<Task>(`${this.apiUrl}/${id}`, task);
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleTask(id: string): Observable<Task> {
    return this.http.patch<Task>(`${this.apiUrl}/${id}/toggle`, {});
  }

  archiveTask(id: string): Observable<Task> {
    return this.http.patch<Task>(`${this.apiUrl}/${id}/archive`, {});
  }

  unarchiveTask(id: string): Observable<Task> {
    return this.http.patch<Task>(`${this.apiUrl}/${id}/unarchive`, {});
  }

  generateInvoice(
    taskId: string,
    hoursWorked?: number,
    hourlyRate?: number,
    month?: number,
    year?: number,
    description?: string,
    language?: string
  ): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.apiUrl}/${taskId}/generate-invoice`, {
      hoursWorked,
      hourlyRate,
      month,
      year,
      description,
      language
    });
  }
}
