import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BankAccountService, BankAccount } from '../../../core/services/bank-account.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-bank-accounts-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="bank-settings">
      <!-- Page Header -->
      <div class="page-header">
        <div class="page-header__content">
          <h1 class="page-title">Bank Accounts</h1>
          <p class="page-description">Manage bank accounts for invoice payments</p>
        </div>
        <button class="btn btn--primary" (click)="openAddModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Account
        </button>
      </div>

      <!-- Content -->
      <div class="bank-content">
        @if (isLoading()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <span>Loading accounts...</span>
          </div>
        } @else if (accounts().length === 0) {
          <div class="empty-state">
            <div class="empty-state__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            </div>
            <h3 class="empty-state__title">No bank accounts yet</h3>
            <p class="empty-state__description">
              Add your bank account details for invoices and CRM integrations.
            </p>
            <button class="btn btn--primary btn--lg" (click)="openAddModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Your First Account
            </button>
          </div>
        } @else {
          <div class="accounts-grid">
            @for (account of accounts(); track account.id; let i = $index) {
              <div
                class="account-card"
                [class.account-card--default]="account.isDefault"
                [style.animation-delay]="(i * 80) + 'ms'"
              >
                <div class="account-card__header">
                  <div class="account-card__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                      <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                  </div>
                  @if (account.isDefault) {
                    <div class="account-card__badge">Default</div>
                  }
                </div>

                <div class="account-card__body">
                  <h3 class="account-card__name">{{ account.name }}</h3>
                  <div class="account-card__bank">{{ account.bankName }}</div>
                  <div class="account-card__details">
                    <div class="detail-row">
                      <span class="detail-label">IBAN</span>
                      <span class="detail-value detail-value--mono">{{ formatIban(account.iban) }}</span>
                    </div>
                    @if (account.swift) {
                      <div class="detail-row">
                        <span class="detail-label">SWIFT</span>
                        <span class="detail-value detail-value--mono">{{ account.swift }}</span>
                      </div>
                    }
                    <div class="detail-row">
                      <span class="detail-label">Currency</span>
                      <span class="detail-value">{{ account.currency }}</span>
                    </div>
                    @if (account.crmRequisitesId) {
                      <div class="detail-row">
                        <span class="detail-label">CRM ID</span>
                        <span class="detail-value detail-value--mono">{{ account.crmRequisitesId }}</span>
                      </div>
                    }
                  </div>
                </div>

                <div class="account-card__actions">
                  @if (!account.isDefault) {
                    <button
                      class="card-action card-action--default"
                      (click)="setDefault(account)"
                      [disabled]="settingDefaultId() === account.id"
                      title="Set as default"
                    >
                      @if (settingDefaultId() === account.id) {
                        <span class="btn-spinner btn-spinner--small"></span>
                      } @else {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      }
                    </button>
                  }
                  <button
                    class="card-action card-action--edit"
                    (click)="openEditModal(account)"
                    title="Edit"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    class="card-action card-action--delete"
                    (click)="confirmDelete(account)"
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
      </div>

      <!-- Add/Edit Modal -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal__header">
              <h2 class="modal__title">{{ editingAccount() ? 'Edit Account' : 'Add Account' }}</h2>
              <button class="modal__close" (click)="closeModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="saveAccount()" class="modal__body">
              <div class="form-group">
                <label class="form-label">Account Name *</label>
                <input
                  type="text"
                  formControlName="name"
                  class="form-input"
                  placeholder="e.g., Main Business Account"
                />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Bank Name *</label>
                  <input
                    type="text"
                    formControlName="bankName"
                    class="form-input"
                    placeholder="e.g., mBank"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Currency *</label>
                  <select formControlName="currency" class="form-input">
                    <option value="PLN">PLN - Polish Zloty</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">IBAN *</label>
                <input
                  type="text"
                  formControlName="iban"
                  class="form-input form-input--mono"
                  placeholder="PL00 0000 0000 0000 0000 0000 0000"
                />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">SWIFT/BIC</label>
                  <input
                    type="text"
                    formControlName="swift"
                    class="form-input form-input--mono"
                    placeholder="e.g., BREXPLPW"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">CRM Requisites ID</label>
                  <input
                    type="text"
                    formControlName="crmRequisitesId"
                    class="form-input form-input--mono"
                    placeholder="e.g., 2929"
                  />
                  <span class="form-hint">ID from your CRM system</span>
                </div>
              </div>

              <div class="form-group form-group--checkbox">
                <label class="checkbox-label">
                  <input type="checkbox" formControlName="isDefault" class="checkbox-input" />
                  <span class="checkbox-custom"></span>
                  Set as default account
                </label>
              </div>

              <div class="modal__actions">
                <button type="button" class="btn btn--ghost" (click)="closeModal()">Cancel</button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  [disabled]="isSaving() || form.invalid"
                >
                  @if (isSaving()) {
                    <span class="btn-spinner"></span>
                    Saving...
                  } @else {
                    {{ editingAccount() ? 'Update' : 'Add' }} Account
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteConfirm()) {
        <div class="modal-overlay" (click)="cancelDelete()">
          <div class="modal modal--small" (click)="$event.stopPropagation()">
            <div class="modal__header modal__header--danger">
              <div class="danger-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h2 class="modal__title">Delete Account</h2>
            </div>
            <div class="modal__body">
              <p class="delete-text">
                Are you sure you want to delete <strong>{{ deletingAccount()?.name }}</strong>?
              </p>
              <p class="delete-hint">This cannot be undone.</p>
            </div>
            <div class="modal__actions">
              <button type="button" class="btn btn--ghost" (click)="cancelDelete()">Cancel</button>
              <button
                type="button"
                class="btn btn--danger"
                (click)="deleteAccount()"
                [disabled]="isDeleting()"
              >
                @if (isDeleting()) {
                  <span class="btn-spinner btn-spinner--white"></span>
                  Deleting...
                } @else {
                  Delete Account
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .bank-settings {
      max-width: 1000px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 32px;
      animation: fadeSlideDown 0.4s ease-out;
    }

    @keyframes fadeSlideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--color-text);
      margin: 0;
      letter-spacing: -0.02em;
    }

    .page-description {
      font-size: 0.9375rem;
      color: var(--color-text-muted);
      margin: 4px 0 0;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 20px;
      font-size: 0.9375rem;
      font-weight: 600;
      font-family: inherit;
      border-radius: var(--radius-md);
      border: none;
      cursor: pointer;
      transition: all var(--transition-fast);

      svg { width: 18px; height: 18px; }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }

    .btn--primary {
      background: linear-gradient(135deg, var(--color-primary) 0%, #d06830 100%);
      color: white;
      box-shadow: 0 4px 14px var(--color-primary-glow);

      &:hover:not(:disabled) {
        background: linear-gradient(135deg, var(--color-primary-hover) 0%, #e07a40 100%);
        transform: translateY(-1px);
      }
    }

    .btn--ghost {
      background: transparent;
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border);

      &:hover:not(:disabled) {
        background: var(--color-surface-elevated);
        color: var(--color-text);
      }
    }

    .btn--danger {
      background: var(--color-danger);
      color: white;

      &:hover:not(:disabled) { background: #dc2626; }
    }

    .btn--lg {
      padding: 14px 28px;
      font-size: 1rem;
    }

    .btn-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;

      &--small { width: 14px; height: 14px; }
      &--white { border-color: rgba(255, 255, 255, 0.3); border-top-color: white; }
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Loading & Empty States */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      color: var(--color-text-muted);
      gap: 16px;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .empty-state {
      text-align: center;
      padding: 80px 40px;
      background: var(--color-surface);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-xl);
      animation: fadeIn 0.5s ease-out;
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .empty-state__icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      background: linear-gradient(135deg, var(--color-primary-subtle) 0%, transparent 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;

      svg { width: 40px; height: 40px; color: var(--color-primary); }
    }

    .empty-state__title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0 0 8px;
    }

    .empty-state__description {
      font-size: 0.9375rem;
      color: var(--color-text-muted);
      max-width: 400px;
      margin: 0 auto 28px;
    }

    /* Accounts Grid */
    .accounts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    .account-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-lg);
      padding: 24px;
      transition: all var(--transition-base);
      animation: cardSlideIn 0.4s ease-out both;

      &:hover {
        border-color: var(--color-border);
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
      }

      &--default {
        border-color: var(--color-primary);
        background: linear-gradient(135deg, var(--color-surface) 0%, rgba(224, 122, 58, 0.03) 100%);
      }
    }

    @keyframes cardSlideIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .account-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .account-card__icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, var(--color-primary) 0%, #d06830 100%);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px var(--color-primary-glow);

      svg { width: 24px; height: 24px; color: white; }
    }

    .account-card__badge {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-primary);
      padding: 4px 10px;
      background: var(--color-primary-subtle);
      border-radius: var(--radius-sm);
      border: 1px solid rgba(224, 122, 58, 0.3);
    }

    .account-card__body {
      margin-bottom: 20px;
    }

    .account-card__name {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0 0 4px;
    }

    .account-card__bank {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      margin-bottom: 16px;
    }

    .account-card__details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .detail-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .detail-value {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);

      &--mono {
        font-family: var(--font-mono);
        font-size: 0.75rem;
      }
    }

    .account-card__actions {
      display: flex;
      gap: 8px;
      padding-top: 16px;
      border-top: 1px solid var(--color-border-subtle);
    }

    .card-action {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: var(--color-surface-elevated);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);

      svg { width: 16px; height: 16px; color: var(--color-text-muted); }

      &:hover:not(:disabled) {
        border-color: var(--color-text-muted);
        svg { color: var(--color-text); }
      }

      &:disabled { opacity: 0.5; cursor: not-allowed; }

      &--default:hover:not(:disabled) {
        border-color: var(--color-warning);
        background: var(--color-warning-subtle);
        svg { color: var(--color-warning); }
      }

      &--edit:hover:not(:disabled) {
        border-color: var(--color-primary);
        background: var(--color-primary-subtle);
        svg { color: var(--color-primary); }
      }

      &--delete:hover:not(:disabled) {
        border-color: var(--color-danger);
        background: var(--color-danger-subtle);
        svg { color: var(--color-danger); }
      }
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      z-index: 1000;
      animation: overlayFade 0.2s ease-out;
    }

    @keyframes overlayFade { from { opacity: 0; } to { opacity: 1; } }

    .modal {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      width: 100%;
      max-width: 520px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      animation: modalSlide 0.3s ease-out;
    }

    .modal--small { max-width: 400px; }

    @keyframes modalSlide {
      from { opacity: 0; transform: translateY(-20px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .modal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px;
      border-bottom: 1px solid var(--color-border-subtle);

      &--danger {
        flex-direction: column;
        gap: 12px;
        text-align: center;

        .danger-icon {
          width: 56px;
          height: 56px;
          background: var(--color-danger-subtle);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;

          svg { width: 28px; height: 28px; color: var(--color-danger); }
        }
      }
    }

    .modal__title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0;
    }

    .modal__close {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-sm);
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);

      svg { width: 20px; height: 20px; color: var(--color-text-muted); }

      &:hover {
        background: var(--color-surface-elevated);
        svg { color: var(--color-text); }
      }
    }

    .modal__body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .modal__actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 24px;
      border-top: 1px solid var(--color-border-subtle);
    }

    /* Form Styles */
    .form-group {
      margin-bottom: 16px;
      &:last-child { margin-bottom: 0; }
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
      margin-bottom: 8px;
    }

    .form-input {
      width: 100%;
      padding: 12px 14px;
      font-size: 0.9375rem;
      font-family: inherit;
      color: var(--color-text);
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);

      &::placeholder { color: var(--color-text-muted); }
      &:hover { border-color: var(--color-text-muted); }
      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-subtle);
      }
    }

    .form-input--mono {
      font-family: var(--font-mono);
      font-size: 0.875rem;
    }

    .form-hint {
      display: block;
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin-top: 4px;
    }

    .form-group--checkbox { margin-top: 20px; }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-size: 0.9375rem;
      color: var(--color-text);
    }

    .checkbox-input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;

      &:checked + .checkbox-custom {
        background: var(--color-primary);
        border-color: var(--color-primary);

        &::after { opacity: 1; transform: scale(1); }
      }

      &:focus + .checkbox-custom {
        box-shadow: 0 0 0 3px var(--color-primary-subtle);
      }
    }

    .checkbox-custom {
      width: 20px;
      height: 20px;
      border: 2px solid var(--color-border);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
      position: relative;

      &::after {
        content: '';
        width: 10px;
        height: 6px;
        border: 2px solid white;
        border-top: none;
        border-right: none;
        transform: rotate(-45deg) scale(0);
        opacity: 0;
        transition: all var(--transition-fast);
        position: absolute;
        top: 4px;
      }
    }

    .delete-text {
      font-size: 0.9375rem;
      color: var(--color-text);
      margin: 0 0 8px;
      text-align: center;

      strong { color: var(--color-primary); }
    }

    .delete-hint {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      text-align: center;
      margin: 0;
    }

    @media (max-width: 600px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .accounts-grid { grid-template-columns: 1fr; }
      .form-row { grid-template-columns: 1fr; }
    }
  `]
})
export class BankAccountsSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private bankService = inject(BankAccountService);
  private notificationService = inject(NotificationService);

  accounts = signal<BankAccount[]>([]);
  isLoading = signal(true);
  showModal = signal(false);
  editingAccount = signal<BankAccount | null>(null);
  isSaving = signal(false);
  showDeleteConfirm = signal(false);
  deletingAccount = signal<BankAccount | null>(null);
  isDeleting = signal(false);
  settingDefaultId = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    bankName: ['', Validators.required],
    currency: ['PLN', Validators.required],
    iban: ['', Validators.required],
    swift: [''],
    crmRequisitesId: [''],
    isDefault: [false]
  });

  ngOnInit(): void {
    this.loadAccounts();
  }

  private loadAccounts(): void {
    this.isLoading.set(true);
    this.bankService.getBankAccounts().subscribe({
      next: (data) => {
        this.accounts.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.notificationService.error('Failed to load bank accounts');
        this.isLoading.set(false);
      }
    });
  }

  formatIban(iban: string): string {
    if (!iban) return '';
    return iban.replace(/(.{4})/g, '$1 ').trim();
  }

  openAddModal(): void {
    this.editingAccount.set(null);
    this.form.reset({
      name: '',
      bankName: '',
      currency: 'PLN',
      iban: '',
      swift: '',
      crmRequisitesId: '',
      isDefault: false
    });
    this.showModal.set(true);
  }

  openEditModal(account: BankAccount): void {
    this.editingAccount.set(account);
    this.form.patchValue({
      name: account.name,
      bankName: account.bankName,
      currency: account.currency,
      iban: account.iban,
      swift: account.swift || '',
      crmRequisitesId: account.crmRequisitesId || '',
      isDefault: account.isDefault
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingAccount.set(null);
  }

  saveAccount(): void {
    if (this.form.invalid) return;

    this.isSaving.set(true);
    const formValue = this.form.getRawValue();
    const editing = this.editingAccount();

    const data = {
      name: formValue.name,
      bankName: formValue.bankName,
      currency: formValue.currency,
      iban: formValue.iban,
      swift: formValue.swift || undefined,
      crmRequisitesId: formValue.crmRequisitesId || undefined,
      isDefault: formValue.isDefault
    };

    const req = editing
      ? this.bankService.updateBankAccount(editing.id, data)
      : this.bankService.createBankAccount(data);

    req.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeModal();
        this.loadAccounts();
        this.notificationService.success(editing ? 'Account updated' : 'Account added');
      },
      error: () => {
        this.isSaving.set(false);
        this.notificationService.error(editing ? 'Failed to update' : 'Failed to add');
      }
    });
  }

  setDefault(account: BankAccount): void {
    this.settingDefaultId.set(account.id);
    this.bankService.setDefault(account.id).subscribe({
      next: () => {
        this.settingDefaultId.set(null);
        this.loadAccounts();
        this.notificationService.success('Default account updated');
      },
      error: () => {
        this.settingDefaultId.set(null);
        this.notificationService.error('Failed to set default');
      }
    });
  }

  confirmDelete(account: BankAccount): void {
    this.deletingAccount.set(account);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.deletingAccount.set(null);
  }

  deleteAccount(): void {
    const account = this.deletingAccount();
    if (!account) return;

    this.isDeleting.set(true);
    this.bankService.deleteBankAccount(account.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.cancelDelete();
        this.loadAccounts();
        this.notificationService.success('Account deleted');
      },
      error: () => {
        this.isDeleting.set(false);
        this.notificationService.error('Failed to delete');
      }
    });
  }
}
