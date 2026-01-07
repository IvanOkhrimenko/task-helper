import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EntityType = 'TASK' | 'INVOICE';

export type ActionType =
  | 'CREATED'
  | 'UPDATED'
  | 'DELETED'
  | 'STATUS_CHANGED'
  | 'ARCHIVED'
  | 'UNARCHIVED'
  | 'ACTIVATED'
  | 'DEACTIVATED'
  | 'INVOICE_GENERATED'
  | 'PDF_GENERATED'
  | 'EMAIL_SENT'
  | 'EMAIL_DRAFT_CREATED'
  | 'CRM_SYNCED'
  | 'CRM_PDF_FETCHED'
  | 'COMMENTS_UPDATED';

export interface ActivityLog {
  id: string;
  entityType: EntityType;
  entityId: string;
  action: ActionType;
  changes?: Record<string, { oldValue: any; newValue: any }>;
  metadata?: Record<string, any>;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  taskId?: string;
  invoiceId?: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityLogService {
  private readonly apiUrl = `${environment.apiUrl}/activity`;

  constructor(private http: HttpClient) {}

  getTaskActivity(taskId: string, limit = 50): Observable<ActivityLog[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ActivityLog[]>(`${this.apiUrl}/tasks/${taskId}`, { params });
  }

  getInvoiceActivity(invoiceId: string, limit = 50): Observable<ActivityLog[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ActivityLog[]>(`${this.apiUrl}/invoices/${invoiceId}`, { params });
  }
}
