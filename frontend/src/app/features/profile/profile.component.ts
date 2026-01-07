import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { GoogleService, GoogleAccount } from '../../core/services/google.service';
import { IntegrationsService } from '../../core/services/integrations.service';
import { BankAccountService, BankAccount } from '../../core/services/bank-account.service';
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
                <p class="section-description">Your company or personal business address for invoices</p>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Street Address</label>
              <input
                type="text"
                formControlName="streetAddress"
                class="form-input"
                placeholder="e.g., Racjonalizacji 3/64"
              />
            </div>

            <div class="form-grid form-grid--three">
              <div class="form-group">
                <label class="form-label">Postcode</label>
                <input
                  type="text"
                  formControlName="postcode"
                  class="form-input"
                  placeholder="e.g., 02-069"
                />
              </div>

              <div class="form-group">
                <label class="form-label">City</label>
                <input
                  type="text"
                  formControlName="city"
                  class="form-input"
                  placeholder="e.g., Warszawa"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Country</label>
                <input
                  type="text"
                  formControlName="country"
                  class="form-input"
                  placeholder="e.g., Polska"
                />
              </div>
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

          <!-- Bank Accounts Section -->
          <section class="form-section" style="animation-delay: 0.4s">
            <div class="section-header">
              <div class="section-icon section-icon--bank">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 21h18"/>
                  <path d="M3 10h18"/>
                  <path d="M5 6l7-3 7 3"/>
                  <path d="M4 10v11"/>
                  <path d="M20 10v11"/>
                  <path d="M8 10v11"/>
                  <path d="M12 10v11"/>
                  <path d="M16 10v11"/>
                </svg>
              </div>
              <div>
                <h2 class="section-title">Bank Accounts</h2>
                <p class="section-description">Manage bank accounts for different currencies and CRM integration</p>
              </div>
            </div>

            <div class="bank-accounts-container">
              @if (isLoadingBankAccounts()) {
                <div class="bank-accounts-loading">
                  <div class="loading-spinner"></div>
                  <span>Loading bank accounts...</span>
                </div>
              } @else if (bankAccounts().length === 0) {
                <div class="empty-bank-accounts">
                  <div class="empty-bank-accounts__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                      <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                  </div>
                  <p class="empty-bank-accounts__text">No bank accounts added yet</p>
                  <p class="empty-bank-accounts__hint">Add bank accounts for different currencies to use in invoices and CRM sync</p>
                </div>
              } @else {
                <div class="bank-accounts-list">
                  @for (account of bankAccounts(); track account.id) {
                    <div class="bank-account-card" [class.bank-account-card--default]="account.isDefault">
                      <div class="bank-account-card__header">
                        <div class="bank-account-card__currency-badge">{{ account.currency }}</div>
                        @if (account.isDefault) {
                          <div class="bank-account-card__default-badge">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                              <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                            Default
                          </div>
                        }
                      </div>
                      <div class="bank-account-card__body">
                        <div class="bank-account-card__name">{{ account.name }}</div>
                        <div class="bank-account-card__bank">{{ account.bankName }}</div>
                        <div class="bank-account-card__iban">{{ maskIban(account.iban) }}</div>
                        @if (account.crmRequisitesId) {
                          <div class="bank-account-card__crm">CRM ID: {{ account.crmRequisitesId }}</div>
                        }
                      </div>
                      <div class="bank-account-card__actions">
                        @if (!account.isDefault) {
                          <button
                            type="button"
                            class="bank-account-action bank-account-action--default"
                            (click)="setDefaultBankAccount(account.id)"
                            [disabled]="isSettingDefault()"
                            title="Set as default"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                              <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                          </button>
                        }
                        <button
                          type="button"
                          class="bank-account-action bank-account-action--edit"
                          (click)="openEditBankAccount(account)"
                          title="Edit"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          class="bank-account-action bank-account-action--delete"
                          (click)="confirmDeleteBankAccount(account)"
                          [disabled]="isDeletingBankAccount()"
                          title="Delete"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }

              <button
                type="button"
                class="btn btn--add-bank"
                (click)="openAddBankAccount()"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add Bank Account
              </button>
            </div>
          </section>

          <!-- Bank Account Modal -->
          @if (showBankAccountModal()) {
            <div class="modal-overlay" (click)="closeBankAccountModal()">
              <div class="modal-content" (click)="$event.stopPropagation()">
                <div class="modal-header">
                  <h3 class="modal-title">{{ editingBankAccount() ? 'Edit Bank Account' : 'Add Bank Account' }}</h3>
                  <button type="button" class="modal-close" (click)="closeBankAccountModal()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                <form [formGroup]="bankAccountForm" (ngSubmit)="saveBankAccount()" class="modal-body">
                  <div class="form-group">
                    <label class="form-label">Account Name *</label>
                    <input
                      type="text"
                      formControlName="name"
                      class="form-input"
                      placeholder="e.g., PKO PLN, Wise EUR"
                    />
                    <span class="form-hint">A friendly name to identify this account</span>
                  </div>

                  <div class="form-grid">
                    <div class="form-group">
                      <label class="form-label">Currency *</label>
                      <select formControlName="currency" class="form-input">
                        <option value="PLN">PLN - Polish Zloty</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="GBP">GBP - British Pound</option>
                      </select>
                    </div>

                    <div class="form-group">
                      <label class="form-label">Bank Name *</label>
                      <input
                        type="text"
                        formControlName="bankName"
                        class="form-input"
                        placeholder="e.g., PKO Bank Polski"
                      />
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label">IBAN *</label>
                    <input
                      type="text"
                      formControlName="iban"
                      class="form-input"
                      placeholder="e.g., PL61 1090 1014 0000 0712 1981 2874"
                    />
                  </div>

                  <div class="form-grid">
                    <div class="form-group">
                      <label class="form-label">SWIFT / BIC</label>
                      <input
                        type="text"
                        formControlName="swift"
                        class="form-input"
                        placeholder="e.g., BPKOPLPW"
                      />
                    </div>

                    <div class="form-group">
                      <label class="form-label">CRM Requisites ID</label>
                      <input
                        type="text"
                        formControlName="crmRequisitesId"
                        class="form-input"
                        placeholder="e.g., 2929"
                      />
                      <span class="form-hint">ID from CRM system</span>
                    </div>
                  </div>

                  <div class="form-group form-group--checkbox">
                    <label class="checkbox-label">
                      <input type="checkbox" formControlName="isDefault" class="checkbox-input" />
                      <span class="checkbox-custom"></span>
                      Set as default bank account
                    </label>
                  </div>

                  <div class="modal-actions">
                    <button type="button" class="btn btn--secondary" (click)="closeBankAccountModal()">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      class="btn btn--primary"
                      [disabled]="isSavingBankAccount() || bankAccountForm.invalid"
                    >
                      @if (isSavingBankAccount()) {
                        <span class="btn__spinner"></span>
                        Saving...
                      } @else {
                        {{ editingBankAccount() ? 'Update' : 'Add' }} Account
                      }
                    </button>
                  </div>
                </form>
              </div>
            </div>
          }

          <!-- Delete Confirmation Modal -->
          @if (showDeleteConfirm()) {
            <div class="modal-overlay" (click)="cancelDeleteBankAccount()">
              <div class="modal-content modal-content--small" (click)="$event.stopPropagation()">
                <div class="modal-header modal-header--danger">
                  <div class="modal-danger-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <h3 class="modal-title">Delete Bank Account</h3>
                </div>
                <div class="modal-body">
                  <p class="delete-confirm-text">
                    Are you sure you want to delete <strong>{{ deletingAccount()?.name }}</strong>?
                  </p>
                  <p class="delete-confirm-hint">This action cannot be undone.</p>
                </div>
                <div class="modal-actions">
                  <button type="button" class="btn btn--secondary" (click)="cancelDeleteBankAccount()">
                    Cancel
                  </button>
                  <button
                    type="button"
                    class="btn btn--danger"
                    (click)="deleteBankAccount()"
                    [disabled]="isDeletingBankAccount()"
                  >
                    @if (isDeletingBankAccount()) {
                      <span class="btn__spinner btn__spinner--white"></span>
                      Deleting...
                    } @else {
                      Delete Account
                    }
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- Connected Accounts Section - Only show when Google integration is enabled -->
          @if (googleEnabled()) {
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
          }

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
      background: linear-gradient(135deg, var(--color-primary) 0%, #059669 100%);
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);

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

    .form-grid--three {
      grid-template-columns: 1fr 1.5fr 1fr;

      @media (max-width: 600px) {
        grid-template-columns: 1fr 1fr;
      }

      @media (max-width: 400px) {
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
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);

        &:hover:not(:disabled) {
          background: var(--color-primary-hover);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
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

    .btn__spinner--white {
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
    }

    /* Bank Accounts Section */
    .section-icon--bank {
      background: linear-gradient(135deg, #e07a3a 0%, #c45a20 100%);

      svg {
        color: white;
      }
    }

    .bank-accounts-container {
      display: flex;
      flex-direction: column;
      gap: var(--space-lg);
    }

    .bank-accounts-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-md);
      padding: var(--space-xl);
      color: var(--color-text-muted);
    }

    .loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--color-border);
      border-top-color: #e07a3a;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .empty-bank-accounts {
      text-align: center;
      padding: var(--space-xl) var(--space-lg);
      background: var(--color-bg-subtle);
      border-radius: var(--radius-lg);
      border: 2px dashed var(--color-border);

      &__icon {
        width: 56px;
        height: 56px;
        margin: 0 auto var(--space-md);
        background: linear-gradient(135deg, rgba(224, 122, 58, 0.15) 0%, rgba(196, 90, 32, 0.1) 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;

        svg {
          width: 28px;
          height: 28px;
          color: #e07a3a;
        }
      }

      &__text {
        font-weight: 600;
        color: var(--color-text);
        margin-bottom: var(--space-xs);
      }

      &__hint {
        font-size: 0.875rem;
        color: var(--color-text-muted);
        max-width: 300px;
        margin: 0 auto;
      }
    }

    .bank-accounts-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .bank-account-card {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: var(--space-md);
      padding: var(--space-lg);
      background: var(--color-bg-subtle);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      transition: all var(--transition-fast);

      &:hover {
        border-color: rgba(224, 122, 58, 0.3);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      &--default {
        border-color: rgba(224, 122, 58, 0.4);
        background: linear-gradient(135deg, rgba(224, 122, 58, 0.05) 0%, transparent 100%);
      }

      &__header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-xs);
      }

      &__currency-badge {
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #e07a3a 0%, #c45a20 100%);
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.8125rem;
        color: white;
        letter-spacing: 0.02em;
      }

      &__default-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.6875rem;
        font-weight: 600;
        color: #e07a3a;
        text-transform: uppercase;
        letter-spacing: 0.05em;

        svg {
          width: 12px;
          height: 12px;
        }
      }

      &__body {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 2px;
        min-width: 0;
      }

      &__name {
        font-weight: 600;
        color: var(--color-text);
        font-size: 1rem;
      }

      &__bank {
        font-size: 0.875rem;
        color: var(--color-text-secondary);
      }

      &__iban {
        font-size: 0.8125rem;
        font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
        color: var(--color-text-muted);
        letter-spacing: 0.05em;
      }

      &__crm {
        font-size: 0.75rem;
        color: #e07a3a;
        font-weight: 500;
        margin-top: 2px;
      }

      &__actions {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
      }
    }

    .bank-account-action {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);

      svg {
        width: 16px;
        height: 16px;
        color: var(--color-text-muted);
        transition: color var(--transition-fast);
      }

      &:hover:not(:disabled) {
        border-color: var(--color-text-muted);

        svg {
          color: var(--color-text);
        }
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &--default:hover:not(:disabled) {
        border-color: #e07a3a;
        background: rgba(224, 122, 58, 0.1);

        svg {
          color: #e07a3a;
        }
      }

      &--edit:hover:not(:disabled) {
        border-color: var(--color-primary);
        background: var(--color-primary-subtle);

        svg {
          color: var(--color-primary);
        }
      }

      &--delete:hover:not(:disabled) {
        border-color: #dc2626;
        background: rgba(220, 38, 38, 0.1);

        svg {
          color: #dc2626;
        }
      }
    }

    .btn--add-bank {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      width: 100%;
      padding: var(--space-md) var(--space-xl);
      font-size: 0.9375rem;
      font-weight: 500;
      color: #e07a3a;
      background: transparent;
      border: 2px dashed rgba(224, 122, 58, 0.4);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: rgba(224, 122, 58, 0.05);
        border-color: #e07a3a;
      }
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: var(--space-lg);
      animation: fadeIn 0.2s ease-out;
    }

    .modal-content {
      background: var(--color-surface);
      border-radius: var(--radius-xl);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      border: 1px solid var(--color-border);
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
      overflow: hidden;
      animation: slideUp 0.3s ease-out;

      &--small {
        max-width: 400px;
      }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-lg) var(--space-xl);
      border-bottom: 1px solid var(--color-border);

      &--danger {
        flex-direction: column;
        text-align: center;
        gap: var(--space-md);
        padding-top: var(--space-xl);
      }
    }

    .modal-danger-icon {
      width: 56px;
      height: 56px;
      background: rgba(220, 38, 38, 0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        width: 28px;
        height: 28px;
        color: #dc2626;
      }
    }

    .modal-title {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);
    }

    .modal-close {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background var(--transition-fast);

      svg {
        width: 20px;
        height: 20px;
        color: var(--color-text-muted);
      }

      &:hover {
        background: var(--color-bg-subtle);

        svg {
          color: var(--color-text);
        }
      }
    }

    .modal-body {
      padding: var(--space-xl);
      overflow-y: auto;
      max-height: calc(90vh - 200px);
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-md);
      padding-top: var(--space-lg);
      margin-top: var(--space-lg);
      border-top: 1px solid var(--color-border);
    }

    .delete-confirm-text {
      font-size: 1rem;
      color: var(--color-text);
      margin-bottom: var(--space-sm);

      strong {
        color: #dc2626;
      }
    }

    .delete-confirm-hint {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    .btn--danger {
      background: #dc2626;
      color: white;
      box-shadow: 0 2px 8px rgba(220, 38, 38, 0.25);

      &:hover:not(:disabled) {
        background: #b91c1c;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.35);
      }
    }

    /* Checkbox Styles */
    .form-group--checkbox {
      margin-top: var(--space-md);
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      cursor: pointer;
      font-size: 0.9375rem;
      color: var(--color-text);
    }

    .checkbox-input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .checkbox-custom {
      width: 20px;
      height: 20px;
      border: 2px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
      flex-shrink: 0;

      &::after {
        content: '';
        width: 10px;
        height: 6px;
        border: 2px solid white;
        border-top: none;
        border-right: none;
        transform: rotate(-45deg) scale(0);
        transition: transform var(--transition-fast);
      }
    }

    .checkbox-input:checked + .checkbox-custom {
      background: #e07a3a;
      border-color: #e07a3a;

      &::after {
        transform: rotate(-45deg) scale(1);
      }
    }

    .checkbox-input:focus + .checkbox-custom {
      box-shadow: 0 0 0 3px rgba(224, 122, 58, 0.2);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @media (max-width: 500px) {
      .bank-account-card {
        grid-template-columns: 1fr;
        text-align: center;

        &__header {
          flex-direction: row;
          justify-content: center;
        }

        &__actions {
          justify-content: center;
          margin-top: var(--space-sm);
        }
      }
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
  private integrationsService = inject(IntegrationsService);
  private bankAccountService = inject(BankAccountService);

  user = this.authService.user;
  isLoading = signal(false);
  googleAccounts = this.googleService.accounts;
  googleEnabled = this.integrationsService.googleEnabled;
  isDisconnecting = signal(false);
  disconnectingId = signal<string | null>(null);

  // Bank accounts state
  bankAccounts = signal<BankAccount[]>([]);
  isLoadingBankAccounts = signal(true);
  showBankAccountModal = signal(false);
  editingBankAccount = signal<BankAccount | null>(null);
  isSavingBankAccount = signal(false);
  showDeleteConfirm = signal(false);
  deletingAccount = signal<BankAccount | null>(null);
  isDeletingBankAccount = signal(false);
  isSettingDefault = signal(false);

  form = this.fb.nonNullable.group({
    name: [''],
    streetAddress: [''],
    postcode: [''],
    city: [''],
    country: ['Polska'],
    nip: [''],
    bankName: [''],
    bankIban: [''],
    bankSwift: [''],
    crmRequisitesId: ['']
  });

  bankAccountForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    currency: ['PLN', Validators.required],
    bankName: ['', Validators.required],
    iban: ['', Validators.required],
    swift: [''],
    crmRequisitesId: [''],
    isDefault: [false]
  });

  ngOnInit() {
    const currentUser = this.user();
    if (currentUser) {
      this.form.patchValue({
        name: currentUser.name || '',
        streetAddress: currentUser.streetAddress || '',
        postcode: currentUser.postcode || '',
        city: currentUser.city || '',
        country: currentUser.country || 'Polska',
        nip: currentUser.nip || '',
        bankName: currentUser.bankName || '',
        bankIban: currentUser.bankIban || '',
        bankSwift: currentUser.bankSwift || '',
        crmRequisitesId: currentUser.crmRequisitesId || ''
      });
    }

    // Fetch integration status to check if Google is enabled
    this.integrationsService.fetchPublicStatus();

    // Fetch Google accounts (only if Google is enabled, but fetch anyway to populate the signal)
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

    // Load bank accounts
    this.loadBankAccounts();
  }

  private loadBankAccounts(): void {
    this.isLoadingBankAccounts.set(true);
    this.bankAccountService.getBankAccounts().subscribe({
      next: (accounts) => {
        this.bankAccounts.set(accounts);
        this.isLoadingBankAccounts.set(false);
      },
      error: () => {
        this.notificationService.error('Failed to load bank accounts');
        this.isLoadingBankAccounts.set(false);
      }
    });
  }

  maskIban(iban: string): string {
    if (!iban || iban.length < 8) return iban;
    const visible = iban.slice(0, 4);
    const lastFour = iban.slice(-4);
    return `${visible} •••• •••• ${lastFour}`;
  }

  openAddBankAccount(): void {
    this.editingBankAccount.set(null);
    this.bankAccountForm.reset({
      name: '',
      currency: 'PLN',
      bankName: '',
      iban: '',
      swift: '',
      crmRequisitesId: '',
      isDefault: false
    });
    this.showBankAccountModal.set(true);
  }

  openEditBankAccount(account: BankAccount): void {
    this.editingBankAccount.set(account);
    this.bankAccountForm.patchValue({
      name: account.name,
      currency: account.currency,
      bankName: account.bankName,
      iban: account.iban,
      swift: account.swift || '',
      crmRequisitesId: account.crmRequisitesId || '',
      isDefault: account.isDefault
    });
    this.showBankAccountModal.set(true);
  }

  closeBankAccountModal(): void {
    this.showBankAccountModal.set(false);
    this.editingBankAccount.set(null);
    this.bankAccountForm.reset();
  }

  saveBankAccount(): void {
    if (this.bankAccountForm.invalid) return;

    this.isSavingBankAccount.set(true);
    const formValue = this.bankAccountForm.getRawValue();
    const editing = this.editingBankAccount();

    const data = {
      name: formValue.name,
      currency: formValue.currency,
      bankName: formValue.bankName,
      iban: formValue.iban,
      swift: formValue.swift || undefined,
      crmRequisitesId: formValue.crmRequisitesId || undefined,
      isDefault: formValue.isDefault
    };

    const request = editing
      ? this.bankAccountService.updateBankAccount(editing.id, data)
      : this.bankAccountService.createBankAccount(data);

    request.subscribe({
      next: () => {
        this.isSavingBankAccount.set(false);
        this.closeBankAccountModal();
        this.loadBankAccounts();
        this.notificationService.success(
          editing ? 'Bank account updated successfully' : 'Bank account added successfully'
        );
      },
      error: () => {
        this.isSavingBankAccount.set(false);
        this.notificationService.error(
          editing ? 'Failed to update bank account' : 'Failed to add bank account'
        );
      }
    });
  }

  confirmDeleteBankAccount(account: BankAccount): void {
    this.deletingAccount.set(account);
    this.showDeleteConfirm.set(true);
  }

  cancelDeleteBankAccount(): void {
    this.showDeleteConfirm.set(false);
    this.deletingAccount.set(null);
  }

  deleteBankAccount(): void {
    const account = this.deletingAccount();
    if (!account) return;

    this.isDeletingBankAccount.set(true);
    this.bankAccountService.deleteBankAccount(account.id).subscribe({
      next: () => {
        this.isDeletingBankAccount.set(false);
        this.cancelDeleteBankAccount();
        this.loadBankAccounts();
        this.notificationService.success('Bank account deleted successfully');
      },
      error: () => {
        this.isDeletingBankAccount.set(false);
        this.notificationService.error('Failed to delete bank account');
      }
    });
  }

  setDefaultBankAccount(id: string): void {
    this.isSettingDefault.set(true);
    this.bankAccountService.setDefault(id).subscribe({
      next: () => {
        this.isSettingDefault.set(false);
        this.loadBankAccounts();
        this.notificationService.success('Default bank account updated');
      },
      error: () => {
        this.isSettingDefault.set(false);
        this.notificationService.error('Failed to set default bank account');
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
      streetAddress: formValue.streetAddress || undefined,
      postcode: formValue.postcode || undefined,
      city: formValue.city || undefined,
      country: formValue.country || undefined,
      nip: formValue.nip || undefined,
      bankName: formValue.bankName || undefined,
      bankIban: formValue.bankIban || undefined,
      bankSwift: formValue.bankSwift || undefined,
      crmRequisitesId: formValue.crmRequisitesId || undefined
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
