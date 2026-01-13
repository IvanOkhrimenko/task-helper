import { Injectable, signal, computed } from '@angular/core';
import { Business } from './business.models';

@Injectable({
  providedIn: 'root'
})
export class BusinessContextService {
  private _business = signal<Business | null>(null);
  private _loading = signal<boolean>(false);

  // Public readonly signals
  readonly business = this._business.asReadonly();
  readonly loading = this._loading.asReadonly();

  // Computed helpers
  readonly businessId = computed(() => this._business()?.id || '');
  readonly businessName = computed(() => this._business()?.name || '');
  readonly currency = computed(() => this._business()?.currency || 'USD');
  readonly timezone = computed(() => this._business()?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  readonly role = computed(() => this._business()?.role);
  readonly permissions = computed(() => this._business()?.permissions);

  setBusiness(business: Business | null): void {
    this._business.set(business);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  updateBusiness(updates: Partial<Business>): void {
    const current = this._business();
    if (current) {
      this._business.set({ ...current, ...updates });
    }
  }

  clear(): void {
    this._business.set(null);
    this._loading.set(false);
  }
}
