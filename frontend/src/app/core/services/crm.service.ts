import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CRMStatus {
  configured: boolean;
  baseUrl: string;
}

export interface CRMSyncResult {
  success: boolean;
  message: string;
  crmInvoiceId?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class CRMService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/crm`;

  // State
  status = signal<CRMStatus | null>(null);
  isSyncing = signal(false);

  /**
   * Get CRM configuration status
   */
  getStatus(): Observable<CRMStatus> {
    return this.http.get<CRMStatus>(`${this.apiUrl}/status`)
      .pipe(
        tap(status => this.status.set(status)),
        catchError(err => {
          console.error('Failed to get CRM status:', err);
          return of({ configured: false, baseUrl: '' });
        })
      );
  }

  /**
   * Test CRM connection
   */
  testConnection(): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/test`, {});
  }

  /**
   * Sync invoice to CRM
   * @param invoiceId - The invoice ID to sync
   * @param integrationId - Optional CRM integration ID (uses task's default or first active if not specified)
   */
  syncInvoice(invoiceId: string, integrationId?: string): Observable<CRMSyncResult> {
    this.isSyncing.set(true);
    const params = integrationId ? `?integrationId=${integrationId}` : '';
    return this.http.post<CRMSyncResult>(`${this.apiUrl}/sync/${invoiceId}${params}`, {})
      .pipe(
        tap(() => this.isSyncing.set(false)),
        catchError(err => {
          this.isSyncing.set(false);
          console.error('Failed to sync invoice to CRM:', err);
          return of({
            success: false,
            message: 'Failed to sync invoice',
            error: err.error?.message || err.message || 'Unknown error'
          });
        })
      );
  }
}
