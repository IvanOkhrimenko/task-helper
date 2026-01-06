import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';

export interface GoogleAccount {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDraftRequest {
  googleAccountId: string;
  to: string;
  subject: string;
  body: string;
  invoiceId?: string;
}

export interface CreateDraftResponse {
  success: boolean;
  draftId: string;
  webLink: string;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/google';

  // Signals for reactive state
  accounts = signal<GoogleAccount[]>([]);
  isLoading = signal(false);

  /**
   * Fetch all connected Google accounts
   */
  fetchAccounts(): void {
    this.isLoading.set(true);

    this.http.get<GoogleAccount[]>(`${this.apiUrl}/accounts`)
      .pipe(catchError(() => of([])))
      .subscribe(accounts => {
        this.accounts.set(accounts);
        this.isLoading.set(false);
      });
  }

  /**
   * Get Google accounts (Observable version)
   */
  getAccounts(): Observable<GoogleAccount[]> {
    return this.http.get<GoogleAccount[]>(`${this.apiUrl}/accounts`);
  }

  /**
   * Initiate Google OAuth flow
   * Redirects user to Google consent screen
   */
  connectAccount(): void {
    this.http.get<{ authUrl: string }>(`${this.apiUrl}/auth`)
      .subscribe(response => {
        window.location.href = response.authUrl;
      });
  }

  /**
   * Delete a connected Google account
   */
  deleteAccount(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/accounts/${id}`)
      .pipe(
        tap(() => {
          this.accounts.update(list => list.filter(a => a.id !== id));
        })
      );
  }

  /**
   * Create a Gmail draft
   */
  createDraft(request: CreateDraftRequest): Observable<CreateDraftResponse> {
    return this.http.post<CreateDraftResponse>(`${this.apiUrl}/gmail/draft`, request);
  }
}
