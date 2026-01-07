import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Client, InvoiceTemplate } from './client.service';
import { BankAccount } from './bank-account.service';
import { GoogleAccount } from './google.service';

export interface Task {
  id: string;
  type: 'INVOICE';
  name: string;
  isActive: boolean;
  isArchived: boolean;
  warningDate: number;
  deadlineDate: number;
  // Client relation
  clientId?: string;
  client?: Client;
  // Invoice defaults
  currency: string;
  defaultLanguage: string;
  invoiceTemplate: InvoiceTemplate;
  hourlyRate?: number;
  hoursWorked?: number;
  fixedMonthlyAmount?: number;
  bankAccountId?: string;
  bankAccount?: BankAccount;
  googleAccountId?: string;
  googleAccount?: GoogleAccount;
  useCustomEmailTemplate?: boolean;
  emailSubjectTemplate?: string;
  emailBodyTemplate?: string;
  // Metadata
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
  createdByAI?: boolean;
  crmInvoiceId?: string;
  crmSyncedAt?: string;
  crmPdfUrl?: string;
  crmPdfPath?: string;
  taskId: string;
  clientId?: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
  task?: Task;
  client?: Client;
}

export interface CreateTaskDto {
  name: string;
  type?: 'INVOICE';
  warningDate: number;
  deadlineDate: number;
  clientId: string;
  // Invoice defaults
  currency?: string;
  defaultLanguage?: string;
  invoiceTemplate?: InvoiceTemplate;
  hourlyRate?: number;
  hoursWorked?: number;
  fixedMonthlyAmount?: number;
  bankAccountId?: string;
  googleAccountId?: string;
  useCustomEmailTemplate?: boolean;
  emailSubjectTemplate?: string;
  emailBodyTemplate?: string;
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
    data: {
      hoursWorked?: number;
      hourlyRate?: number;
      fixedAmount?: number;
      month?: number;
      year?: number;
      description?: string;
      language?: string;
      currency?: string;
      invoiceTemplate?: InvoiceTemplate;
      bankAccountId?: string;
      googleAccountId?: string;
      useCustomEmailTemplate?: boolean;
      emailSubject?: string;
      emailBody?: string;
    }
  ): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.apiUrl}/${taskId}/generate-invoice`, data);
  }
}
