import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { GoogleService, GoogleAccount } from '../../core/services/google.service';
import { ToastComponent } from '../../shared/components/toast/toast.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ToastComponent],
  template: `
    <app-toast />
    <div class="profile-page">
      <div class="container">
        <header class="page-header">
          <a routerLink="/dashboard" class="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to Dashboard
          </a>
          <div class="header-content">
            <div class="header-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <h1 class="page-title">Your Business Profile</h1>
              <p class="page-subtitle">This information will appear on your generated invoices as seller details</p>
            </div>
          </div>
        </header>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="profile-form">
          <!-- Personal Info Section -->
          <section class="form-section" style="animation-delay: 0.1s">
            <div class="section-header">
              <div class="section-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div>
                <h2 class="section-title">Personal Information</h2>
                <p class="section-description">Your account details</p>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input
                  type="text"
                  formControlName="name"
                  class="form-input"
                  placeholder="Your full name"
                />
              </div>

              <div class="form-group">
                <label class="form-label">
                  Email Address
                  <span class="label-badge">Read-only</span>
                </label>
                <input
                  type="email"
                  [value]="user()?.email || ''"
                  class="form-input form-input--readonly"
                  readonly
                />
              </div>
            </div>
          </section>

          <!-- Business Address Section -->
          <section class="form-section" style="animation-delay: 0.2s">
            <div class="section-header">
              <div class="section-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div>
                <h2 class="section-title">Business Address</h2>
                <p class="section-description">Your company or personal business address</p>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Full Address</label>
              <textarea
                formControlName="address"
                class="form-input form-textarea"
                placeholder="Street address, city, postal code, country"
                rows="3"
              ></textarea>
              <span class="form-hint">This address will appear in the seller section of your invoices</span>
            </div>
          </section>

          <!-- Tax Information Section -->
          <section class="form-section" style="animation-delay: 0.3s">
            <div class="section-header">
              <div class="section-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <div>
                <h2 class="section-title">Tax Information</h2>
                <p class="section-description">Tax identification for legal invoices</p>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">NIP / Tax ID</label>
              <input
                type="text"
                formControlName="nip"
                class="form-input"
                placeholder="e.g., 1234567890"
              />
              <span class="form-hint">Your tax identification number (NIP in Poland, VAT ID in EU, EIN in US)</span>
            </div>
          </section>

          <!-- Bank Details Section -->
          <section class="form-section" style="animation-delay: 0.4s">
            <div class="section-header">
              <div class="section-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <div>
                <h2 class="section-title">Bank Details</h2>
                <p class="section-description">Payment information for receiving invoice payments</p>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Bank Name</label>
              <input
                type="text"
                formControlName="bankName"
                class="form-input"
                placeholder="e.g., PKO Bank Polski"
              />
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">IBAN</label>
                <input
                  type="text"
                  formControlName="bankIban"
                  class="form-input"
                  placeholder="e.g., PL61 1090 1014 0000 0712 1981 2874"
                />
                <span class="form-hint">International Bank Account Number</span>
              </div>

              <div class="form-group">
                <label class="form-label">SWIFT / BIC</label>
                <input
                  type="text"
                  formControlName="bankSwift"
                  class="form-input"
                  placeholder="e.g., WBKPPLPP"
                />
                <span class="form-hint">Bank Identifier Code</span>
              </div>
            </div>
          </section>

          <!-- Connected Accounts Section -->
          <section class="form-section" style="animation-delay: 0.5s">
            <div class="section-header">
              <div class="section-icon section-icon--google">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div>
                <h2 class="section-title">Connected Accounts</h2>
                <p class="section-description">Link your Google account to create Gmail drafts for invoices</p>
              </div>
            </div>

            <div class="connected-accounts">
              @if (googleAccounts().length === 0) {
                <div class="empty-accounts">
                  <div class="empty-accounts__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"/>
                    </svg>
                  </div>
                  <p class="empty-accounts__text">No Google accounts connected yet</p>
                  <p class="empty-accounts__hint">Connect your Google account to send invoices directly via Gmail</p>
                </div>
              } @else {
                <div class="accounts-list">
                  @for (account of googleAccounts(); track account.id) {
                    <div class="account-item">
                      <div class="account-item__icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                      </div>
                      <div class="account-item__info">
                        <span class="account-item__email">{{ account.email }}</span>
                        <span class="account-item__date">Connected {{ formatDate(account.createdAt) }}</span>
                      </div>
                      <button
                        type="button"
                        class="account-item__remove"
                        (click)="disconnectGoogle(account.id)"
                        [disabled]="isDisconnecting()"
                      >
                        @if (isDisconnecting() && disconnectingId() === account.id) {
                          <span class="btn__spinner btn__spinner--small"></span>
                        } @else {
                          Remove
                        }
                      </button>
                    </div>
                  }
                </div>
              }

              <button
                type="button"
                class="btn btn--google"
                (click)="connectGoogle()"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" class="btn__icon">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Connect Google Account
              </button>
            </div>
          </section>

          <!-- Form Actions -->
          <div class="form-actions" style="animation-delay: 0.6s">
            <a routerLink="/dashboard" class="btn btn--secondary">
              Cancel
            </a>
            <button
              type="submit"
              class="btn btn--primary"
              [disabled]="isLoading() || !form.dirty"
            >
              @if (isLoading()) {
                <span class="btn__spinner"></span>
                Saving...
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn__icon">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                Save Changes
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      min-height: 100vh;
      background: var(--color-bg);
      padding: var(--space-2xl) 0;
    }

    .container {
      max-width: 720px;
      margin: 0 auto;
      padding: 0 var(--space-lg);
    }

    .page-header {
      margin-bottom: var(--space-2xl);
      animation: fadeSlideDown 0.5s ease-out;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      color: var(--color-text-secondary);
      font-size: 0.9375rem;
      margin-bottom: var(--space-lg);
      transition: color var(--transition-fast);

      &:hover {
        color: var(--color-primary);
      }

      svg {
        width: 18px;
        height: 18px;
      }
    }

    .header-content {
      display: flex;
      align-items: flex-start;
      gap: var(--space-lg);
    }

    .header-icon {
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, var(--color-primary) 0%, #1d4ed8 100%);
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);

      svg {
        width: 28px;
        height: 28px;
        color: white;
      }
    }

    .page-title {
      font-family: var(--font-display);
      font-size: 1.875rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-xs);
    }

    .page-subtitle {
      color: var(--color-text-secondary);
      font-size: 1rem;
      line-height: 1.5;
    }

    .profile-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-lg);
    }

    .form-section {
      background: var(--color-surface);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-card);
      border: 1px solid var(--color-border);
      padding: var(--space-xl);
      animation: fadeSlideUp 0.5s ease-out both;
    }

    .section-header {
      display: flex;
      align-items: flex-start;
      gap: var(--space-md);
      margin-bottom: var(--space-xl);
      padding-bottom: var(--space-lg);
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .section-icon {
      width: 40px;
      height: 40px;
      background: var(--color-primary-subtle);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      svg {
        width: 20px;
        height: 20px;
        color: var(--color-primary);
      }
    }

    .section-title {
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 2px;
    }

    .section-description {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-lg);

      @media (max-width: 500px) {
        grid-template-columns: 1fr;
      }
    }

    .form-group {
      margin-bottom: var(--space-lg);

      &:last-child {
        margin-bottom: 0;
      }
    }

    .form-label {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
      margin-bottom: var(--space-sm);
    }

    .label-badge {
      font-size: 0.6875rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 6px;
      background: var(--color-bg-subtle);
      color: var(--color-text-muted);
      border-radius: var(--radius-sm);
    }

    .form-input {
      width: 100%;
      padding: var(--space-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 0.9375rem;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

      &::placeholder {
        color: var(--color-text-muted);
      }

      &:hover:not(:disabled):not(:read-only) {
        border-color: var(--color-text-muted);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-subtle);
      }

      &--readonly {
        background: var(--color-bg-subtle);
        color: var(--color-text-secondary);
        cursor: not-allowed;

        &:hover {
          border-color: var(--color-border);
        }
      }
    }

    .form-textarea {
      resize: vertical;
      min-height: 80px;
      line-height: 1.5;
    }

    .form-hint {
      display: block;
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      margin-top: var(--space-xs);
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-md);
      padding-top: var(--space-lg);
      animation: fadeSlideUp 0.5s ease-out both;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      padding: var(--space-md) var(--space-xl);
      font-size: 0.9375rem;
      font-weight: 500;
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
      text-decoration: none;
      border: none;
      cursor: pointer;

      &__icon {
        width: 18px;
        height: 18px;
      }

      &--primary {
        background: var(--color-primary);
        color: white;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);

        &:hover:not(:disabled) {
          background: var(--color-primary-hover);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
        }

        &:active:not(:disabled) {
          transform: translateY(0);
        }
      }

      &--secondary {
        background: var(--color-surface);
        color: var(--color-text);
        border: 1px solid var(--color-border);

        &:hover {
          background: var(--color-bg-subtle);
        }
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }
    }

    .btn__spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes fadeSlideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeSlideUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Connected Accounts Section */
    .section-icon--google {
      background: linear-gradient(135deg, #4285f4 0%, #34a853 50%, #fbbc05 75%, #ea4335 100%);

      svg {
        width: 20px;
        height: 20px;
        color: white;
      }
    }

    .connected-accounts {
      display: flex;
      flex-direction: column;
      gap: var(--space-lg);
    }

    .empty-accounts {
      text-align: center;
      padding: var(--space-xl) var(--space-lg);
      background: var(--color-bg-subtle);
      border-radius: var(--radius-lg);
      border: 2px dashed var(--color-border);

      &__icon {
        width: 48px;
        height: 48px;
        margin: 0 auto var(--space-md);
        background: var(--color-surface);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;

        svg {
          width: 24px;
          height: 24px;
          color: var(--color-text-muted);
        }
      }

      &__text {
        font-weight: 500;
        color: var(--color-text);
        margin-bottom: var(--space-xs);
      }

      &__hint {
        font-size: 0.875rem;
        color: var(--color-text-muted);
      }
    }

    .accounts-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .account-item {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      padding: var(--space-md);
      background: var(--color-bg-subtle);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      transition: border-color var(--transition-fast);

      &:hover {
        border-color: var(--color-text-muted);
      }

      &__icon {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #ea4335 0%, #fbbc05 100%);
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        svg {
          width: 20px;
          height: 20px;
          color: white;
        }
      }

      &__info {
        flex: 1;
        min-width: 0;
      }

      &__email {
        display: block;
        font-weight: 500;
        color: var(--color-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      &__date {
        display: block;
        font-size: 0.8125rem;
        color: var(--color-text-muted);
        margin-top: 2px;
      }

      &__remove {
        padding: var(--space-sm) var(--space-md);
        font-size: 0.8125rem;
        font-weight: 500;
        color: #dc2626;
        background: transparent;
        border: 1px solid #fecaca;
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all var(--transition-fast);
        min-width: 72px;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover:not(:disabled) {
          background: #fef2f2;
          border-color: #dc2626;
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }
    }

    .btn--google {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      width: 100%;
      padding: var(--space-md) var(--space-xl);
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--color-text);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: var(--color-bg-subtle);
        border-color: var(--color-text-muted);
      }
    }

    .btn__spinner--small {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(220, 38, 38, 0.3);
      border-top-color: #dc2626;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  `]
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private googleService = inject(GoogleService);

  user = this.authService.user;
  isLoading = signal(false);
  googleAccounts = this.googleService.accounts;
  isDisconnecting = signal(false);
  disconnectingId = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    name: [''],
    address: [''],
    nip: [''],
    bankName: [''],
    bankIban: [''],
    bankSwift: ['']
  });

  ngOnInit() {
    const currentUser = this.user();
    if (currentUser) {
      this.form.patchValue({
        name: currentUser.name || '',
        address: currentUser.address || '',
        nip: currentUser.nip || '',
        bankName: currentUser.bankName || '',
        bankIban: currentUser.bankIban || '',
        bankSwift: currentUser.bankSwift || ''
      });
    }

    // Fetch Google accounts
    this.googleService.fetchAccounts();

    // Handle Google OAuth callback results
    this.route.queryParams.subscribe(params => {
      if (params['google'] === 'success') {
        const email = params['email'];
        this.notificationService.success(
          email ? `Google account ${email} connected successfully!` : 'Google account connected successfully!'
        );
        // Remove query params from URL
        this.router.navigate([], { queryParams: {}, replaceUrl: true });
        // Refresh accounts list
        this.googleService.fetchAccounts();
      } else if (params['google'] === 'error') {
        const message = params['message'] || 'Failed to connect Google account';
        this.notificationService.error(message);
        this.router.navigate([], { queryParams: {}, replaceUrl: true });
      }
    });
  }

  connectGoogle(): void {
    this.googleService.connectAccount();
  }

  disconnectGoogle(accountId: string): void {
    this.isDisconnecting.set(true);
    this.disconnectingId.set(accountId);

    this.googleService.deleteAccount(accountId).subscribe({
      next: () => {
        this.isDisconnecting.set(false);
        this.disconnectingId.set(null);
        this.notificationService.success('Google account disconnected');
      },
      error: () => {
        this.isDisconnecting.set(false);
        this.disconnectingId.set(null);
        this.notificationService.error('Failed to disconnect account');
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  onSubmit() {
    if (!this.form.dirty) return;

    this.isLoading.set(true);
    const formValue = this.form.getRawValue();

    this.authService.updateProfile({
      name: formValue.name,
      address: formValue.address || undefined,
      nip: formValue.nip || undefined,
      bankName: formValue.bankName || undefined,
      bankIban: formValue.bankIban || undefined,
      bankSwift: formValue.bankSwift || undefined
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.form.markAsPristine();
        this.notificationService.success('Profile updated successfully!');
      },
      error: (error) => {
        this.isLoading.set(false);
        this.notificationService.error(error || 'Failed to update profile');
      }
    });
  }
}
