import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Invoice } from './task.service';

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
}

export interface InvoiceFilters {
  taskId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  clientName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private readonly apiUrl = `${environment.apiUrl}/invoices`;

  constructor(private http: HttpClient) {}

  getInvoices(filters?: InvoiceFilters): Observable<Invoice[]> {
    let params = new HttpParams();

    if (filters) {
      if (filters.taskId) params = params.set('taskId', filters.taskId);
      if (filters.status && filters.status !== 'ALL') params = params.set('status', filters.status);
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.clientName) params = params.set('clientName', filters.clientName);
    }

    return this.http.get<Invoice[]>(this.apiUrl, { params });
  }

  getInvoice(id: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.apiUrl}/${id}`);
  }

  getEmailDraft(id: string): Observable<EmailDraft> {
    return this.http.get<EmailDraft>(`${this.apiUrl}/${id}/email-draft`);
  }

  downloadPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, { responseType: 'blob' });
  }

  updateStatus(id: string, status: 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED'): Observable<Invoice> {
    return this.http.patch<Invoice>(`${this.apiUrl}/${id}/status`, { status });
  }

  updateComments(id: string, comments: string): Observable<Invoice> {
    return this.http.patch<Invoice>(`${this.apiUrl}/${id}/comments`, { comments });
  }

  getPdfUrl(id: string): string {
    return `${this.apiUrl}/${id}/pdf`;
  }
}
