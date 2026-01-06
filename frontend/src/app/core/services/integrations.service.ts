import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IntegrationSettings {
  id: string;
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  googleEnabled: boolean;
  hasGoogleCredentials: boolean;
}

export interface UpdateIntegrationSettings {
  googleClientId?: string;
  googleClientSecret?: string;
  googleRedirectUri?: string;
  googleEnabled?: boolean;
}

export interface TestConnectionResult {
  success: boolean;
  message?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class IntegrationsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/integrations`;

  // State
  settings = signal<IntegrationSettings | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Get integration settings (admin only)
  fetchSettings(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.http.get<IntegrationSettings>(`${this.apiUrl}/settings`)
      .pipe(
        tap(settings => {
          this.settings.set(settings);
          this.isLoading.set(false);
        }),
        catchError(err => {
          this.error.set(err.error?.error || 'Failed to load integration settings');
          this.isLoading.set(false);
          return of(null);
        })
      )
      .subscribe();
  }

  // Update integration settings (admin only)
  updateSettings(data: UpdateIntegrationSettings): Observable<IntegrationSettings> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.put<any>(`${this.apiUrl}/settings`, data)
      .pipe(
        tap(response => {
          // Refresh settings after update
          this.fetchSettings();
        }),
        catchError(err => {
          this.error.set(err.error?.error || 'Failed to update integration settings');
          this.isLoading.set(false);
          throw err;
        })
      );
  }

  // Test Google connection
  testGoogleConnection(): Observable<TestConnectionResult> {
    return this.http.post<TestConnectionResult>(`${this.apiUrl}/google/test`, {});
  }
}
