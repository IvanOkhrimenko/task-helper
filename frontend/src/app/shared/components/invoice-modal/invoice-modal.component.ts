import { Component, inject, signal, computed, output, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Task } from '../../../core/services/task.service';
import { BankAccountService, BankAccount } from '../../../core/services/bank-account.service';
import { GoogleService, GoogleAccount } from '../../../core/services/google.service';
import { ChatService } from '../../../core/services/chat.service';
import { InvoiceTemplate } from '../../../core/services/client.service';

export interface InvoiceGenerationData {
  taskId: string;
  hoursWorked?: number;
  hourlyRate?: number;
  fixedAmount?: number;
  month: number;
  year: number;
  description: string;
  language: string;
  currency: string;
  invoiceTemplate: InvoiceTemplate;
  bankAccountId?: string;
  googleAccountId?: string;
  useCustomEmailTemplate?: boolean;
  emailSubject?: string;
  emailBody?: string;
}

@Component({
  selector: 'app-invoice-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    @if (isOpen()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h2 class="modal__title">{{ 'shared.invoiceModal.title' | translate }}</h2>
            <button class="modal__close" (click)="close()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="modal__body">
            <!-- Task & Client Info -->
            <div class="info-bar">
              <div class="info-item">
                <span class="info-label">{{ 'shared.invoiceModal.task' | translate }}</span>
                <span class="info-value">{{ task()?.name }}</span>
              </div>
              <div class="info-divider"></div>
              <div class="info-item">
                <span class="info-label">{{ 'shared.invoiceModal.client' | translate }}</span>
                <span class="info-value">{{ task()?.client?.name || ('shared.invoiceModal.notSpecified' | translate) }}</span>
              </div>
            </div>

            <!-- Invoice Period -->
            <section class="form-section">
              <h3 class="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {{ 'shared.invoiceModal.invoicePeriod' | translate }}
              </h3>

              <div class="form-row form-row--3">
                <div class="form-group">
                  <label class="form-label">{{ 'shared.invoiceModal.month' | translate }}</label>
                  <select class="form-select" [(ngModel)]="selectedMonth">
                    @for (m of months; track m.value) {
                      <option [value]="m.value">{{ m.label }}</option>
                    }
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">{{ 'shared.invoiceModal.year' | translate }}</label>
                  <select class="form-select" [(ngModel)]="selectedYear">
                    @for (y of years; track y) {
                      <option [value]="y">{{ y }}</option>
                    }
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">{{ 'shared.invoiceModal.language' | translate }}</label>
                  <select class="form-select" [(ngModel)]="selectedLanguage">
                    <option value="PL">Polski</option>
                    <option value="EN">English</option>
                  </select>
                </div>
              </div>
            </section>

            <!-- Invoice Settings -->
            <section class="form-section">
              <h3 class="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
                {{ 'shared.invoiceModal.invoiceSettings' | translate }}
              </h3>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">{{ 'shared.invoiceModal.currency' | translate }}</label>
                  <select class="form-select" [(ngModel)]="selectedCurrency">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="PLN">PLN (zł)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="UAH">UAH (₴)</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">{{ 'shared.invoiceModal.template' | translate }}</label>
                  <select class="form-select" [(ngModel)]="selectedTemplate">
                    <option value="STANDARD">Standard</option>
                    <option value="MINIMAL">Minimal</option>
                    <option value="MODERN">Modern</option>
                    <option value="CORPORATE">Corporate</option>
                    <option value="CREATIVE">Creative</option>
                    <option value="ELEGANT">Elegant</option>
                  </select>
                </div>
              </div>
            </section>

            <!-- Hours & Rate -->
            <section class="form-section">
              <h3 class="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  @if (useFixedAmount) {
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <line x1="6" y1="12" x2="18" y2="12"/>
                  } @else {
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  }
                </svg>
                {{ (useFixedAmount ? 'shared.invoiceModal.fixedAmount' : 'shared.invoiceModal.hoursAndRate') | translate }}
              </h3>

              @if (useFixedAmount) {
                <!-- Fixed Monthly Amount -->
                <div class="form-group">
                  <label class="form-label">{{ 'shared.invoiceModal.invoiceAmount' | translate }} *</label>
                  <div class="input-with-prefix">
                    <span class="input-prefix">{{ currentCurrencySymbol() }}</span>
                    <input
                      type="number"
                      class="form-input form-input--prefixed"
                      [(ngModel)]="fixedMonthlyAmount"
                      min="0"
                      step="0.01"
                      placeholder="e.g., 5000.00"
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">{{ 'shared.invoiceModal.workDescription' | translate }}</label>
                  <textarea
                    class="form-input form-textarea"
                    [(ngModel)]="description"
                    rows="2"
                    [placeholder]="defaultDescription()"
                  ></textarea>
                </div>

                <!-- Total Preview -->
                <div class="total-preview">
                  <div class="total-calc total-calc--fixed">
                    <span class="total-label">{{ 'shared.invoiceModal.total' | translate }}:</span>
                    <span class="total-amount">{{ currentCurrencySymbol() }}{{ calculatedTotal() }}</span>
                  </div>
                </div>
              } @else {
                <!-- Hours & Rate -->
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">{{ 'shared.invoiceModal.hoursWorked' | translate }} *</label>
                    <input
                      type="number"
                      class="form-input"
                      [(ngModel)]="hoursWorked"
                      min="0"
                      step="0.5"
                      placeholder="e.g., 160"
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label">{{ 'shared.invoiceModal.hourlyRate' | translate }} *</label>
                    <div class="input-with-prefix">
                      <span class="input-prefix">{{ currentCurrencySymbol() }}</span>
                      <input
                        type="number"
                        class="form-input form-input--prefixed"
                        [(ngModel)]="hourlyRate"
                        min="0"
                        step="0.01"
                        placeholder="e.g., 75.00"
                      />
                    </div>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">{{ 'shared.invoiceModal.workDescription' | translate }}</label>
                  <textarea
                    class="form-input form-textarea"
                    [(ngModel)]="description"
                    rows="2"
                    [placeholder]="defaultDescription()"
                  ></textarea>
                </div>

                <!-- Total Preview -->
                <div class="total-preview">
                  <div class="total-calc">
                    <span class="total-formula">{{ hoursWorked || 0 }} {{ 'shared.invoiceModal.hrs' | translate }} × {{ currentCurrencySymbol() }}{{ hourlyRate || 0 }}</span>
                    <span class="total-equals">=</span>
                    <span class="total-amount">{{ currentCurrencySymbol() }}{{ calculatedTotal() }}</span>
                  </div>
                </div>
              }
            </section>

            <!-- Integrations -->
            @if (bankAccounts().length > 0 || googleAccounts().length > 0) {
              <section class="form-section">
                <h3 class="section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                  </svg>
                  {{ 'shared.invoiceModal.integrations' | translate }}
                </h3>

                <div class="form-row">
                  @if (bankAccounts().length > 0) {
                    <div class="form-group">
                      <label class="form-label">{{ 'shared.invoiceModal.bankAccount' | translate }}</label>
                      <select class="form-select" [(ngModel)]="selectedBankAccountId">
                        <option value="">{{ 'shared.invoiceModal.selectBankAccount' | translate }}</option>
                        @for (account of bankAccounts(); track account.id) {
                          <option [value]="account.id">{{ account.name }} ({{ account.currency }})</option>
                        }
                      </select>
                      <span class="form-hint">{{ 'shared.invoiceModal.bankDetailsHint' | translate }}</span>
                    </div>
                  }

                  @if (googleAccounts().length > 0) {
                    <div class="form-group">
                      <label class="form-label">{{ 'shared.invoiceModal.sendViaGmail' | translate }}</label>
                      <select class="form-select" [(ngModel)]="selectedGoogleAccountId">
                        <option value="">{{ 'shared.invoiceModal.selectAccount' | translate }}</option>
                        @for (account of googleAccounts(); track account.id) {
                          <option [value]="account.id">{{ account.email }}</option>
                        }
                      </select>
                      <span class="form-hint">{{ 'shared.invoiceModal.gmailDraftHint' | translate }}</span>
                    </div>
                  }
                </div>
              </section>
            }

            <!-- Email Template Section -->
            <section class="form-section form-section--collapsible">
              <button
                type="button"
                class="section-toggle"
                (click)="toggleEmailSection()"
                [class.section-toggle--expanded]="isEmailSectionExpanded()"
              >
                <div class="section-toggle__left">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <span>{{ 'shared.invoiceModal.emailTemplate' | translate }}</span>
                  @if (useCustomEmailTemplate) {
                    <span class="badge badge--active">{{ 'shared.invoiceModal.custom' | translate }}</span>
                  } @else {
                    <span class="badge badge--default">{{ 'shared.invoiceModal.default' | translate }}</span>
                  }
                </div>
                <svg class="section-toggle__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              @if (isEmailSectionExpanded()) {
                <div class="section-content">
                  <!-- Custom Template Toggle -->
                  <div class="toggle-row">
                    <label class="toggle-label">
                      <span>{{ 'shared.invoiceModal.useCustomEmailTemplate' | translate }}</span>
                      <span class="toggle-hint">{{ 'shared.invoiceModal.overrideDefaultEmail' | translate }}</span>
                    </label>
                    <label class="toggle-switch">
                      <input type="checkbox" [(ngModel)]="useCustomEmailTemplate" />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>

                  @if (isEditingEmail()) {
                    <!-- Edit Mode -->
                    <div class="email-edit-form">
                      <div class="form-group">
                        <label class="form-label">{{ 'shared.invoiceModal.subject' | translate }}</label>
                        <input
                          type="text"
                          class="form-input"
                          [(ngModel)]="emailSubject"
                          [placeholder]="'shared.invoiceModal.emailSubjectPlaceholder' | translate"
                        />
                      </div>

                      <div class="form-group">
                        <label class="form-label">{{ 'shared.invoiceModal.emailBody' | translate }}</label>
                        <textarea
                          class="form-input form-textarea form-textarea--tall"
                          [(ngModel)]="emailBody"
                          rows="8"
                          [placeholder]="'shared.invoiceModal.emailBodyPlaceholder' | translate"
                        ></textarea>
                      </div>

                      <div class="email-edit-actions">
                        <button type="button" class="btn btn--small btn--secondary" (click)="cancelEmailEdit()">
                          {{ 'shared.invoiceModal.cancel' | translate }}
                        </button>
                        <button type="button" class="btn btn--small btn--primary" (click)="isEditingEmail.set(false)">
                          {{ 'shared.invoiceModal.done' | translate }}
                        </button>
                      </div>
                    </div>
                  } @else {
                    <!-- Email Preview (Custom or Default) -->
                    <div class="email-preview" [class.email-preview--custom]="useCustomEmailTemplate">
                      <div class="email-preview__header">
                        @if (useCustomEmailTemplate) {
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                          <span>{{ 'shared.invoiceModal.customEmailTemplate' | translate }}</span>
                        } @else {
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 16v-4"/>
                            <path d="M12 8h.01"/>
                          </svg>
                          <span>{{ 'shared.invoiceModal.defaultEmailTemplate' | translate }}</span>
                        }
                        <button type="button" class="btn-edit" (click)="startEmailEdit()">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                          {{ 'shared.invoiceModal.edit' | translate }}
                        </button>
                      </div>
                      <div class="email-preview__content">
                        <div class="email-preview__field">
                          <label>{{ 'shared.invoiceModal.subject' | translate }}:</label>
                          <span>{{ getCurrentEmailSubject() }}</span>
                        </div>
                        <div class="email-preview__body">
                          <label>{{ 'shared.invoiceModal.body' | translate }}:</label>
                          <pre>{{ getCurrentEmailBody() }}</pre>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </section>
          </div>

          <div class="modal__footer">
            <button class="btn btn--secondary" (click)="close()">{{ 'shared.invoiceModal.cancel' | translate }}</button>
            <button
              class="btn btn--primary"
              (click)="generate()"
              [disabled]="!isValid() || isGenerating()"
            >
              @if (isGenerating()) {
                <span class="btn__spinner"></span>
                {{ 'shared.invoiceModal.generating' | translate }}
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                {{ 'shared.invoiceModal.generateInvoice' | translate }}
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: var(--space-lg);
      animation: fadeIn 0.25s ease-out;
    }

    .modal {
      background: var(--color-surface);
      border-radius: 20px;
      box-shadow:
        0 25px 50px -12px rgba(0, 0, 0, 0.25),
        0 0 0 1px rgba(255, 255, 255, 0.05);
      width: 100%;
      max-width: 560px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: slideUp 0.3s ease-out;
    }

    .modal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-lg) var(--space-xl);
      border-bottom: 1px solid var(--color-border);
      background: linear-gradient(180deg, var(--color-surface) 0%, var(--color-bg-subtle) 100%);
    }

    .modal__title {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);
      letter-spacing: -0.02em;
    }

    .modal__close {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      color: var(--color-text-secondary);
      transition: all 0.15s ease;

      &:hover {
        background: var(--color-fill-tertiary);
        color: var(--color-text);
        transform: scale(1.05);
      }

      svg {
        width: 20px;
        height: 20px;
      }
    }

    .modal__body {
      padding: var(--space-lg) var(--space-xl);
      overflow-y: auto;
      flex: 1;
    }

    /* Info Bar */
    .info-bar {
      display: flex;
      align-items: center;
      gap: var(--space-lg);
      padding: var(--space-md) var(--space-lg);
      background: var(--color-fill-quaternary);
      border-radius: 12px;
      margin-bottom: var(--space-lg);
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .info-label {
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .info-value {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-text);
    }

    .info-divider {
      width: 1px;
      height: 32px;
      background: var(--color-border);
    }

    /* Form Sections */
    .form-section {
      margin-bottom: var(--space-lg);
      padding-bottom: var(--space-lg);
      border-bottom: 1px solid var(--color-border-subtle);

      &:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
      }
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-md);
      text-transform: uppercase;
      letter-spacing: 0.03em;

      svg {
        width: 16px;
        height: 16px;
        color: var(--color-primary);
        opacity: 0.8;
      }
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-md);
    }

    .form-row--3 {
      grid-template-columns: 1fr 1fr 1fr;
    }

    .form-group {
      margin-bottom: var(--space-md);

      &:last-child {
        margin-bottom: 0;
      }
    }

    .form-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      margin-bottom: var(--space-xs);
    }

    .form-hint {
      display: block;
      font-size: 0.6875rem;
      color: var(--color-text-tertiary);
      margin-top: 4px;
    }

    .form-input,
    .form-select {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 0.9375rem;
      transition: all 0.15s ease;

      &::placeholder {
        color: var(--color-text-muted);
      }

      &:hover {
        border-color: var(--color-text-muted);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-subtle);
      }
    }

    .form-select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 36px;
    }

    .form-textarea {
      resize: vertical;
      min-height: 64px;
      line-height: 1.5;
    }

    .form-textarea--tall {
      min-height: 120px;
    }

    .input-with-prefix {
      position: relative;
    }

    .input-prefix {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-text-muted);
      font-weight: 600;
      font-size: 0.9375rem;
      pointer-events: none;
    }

    .form-input--prefixed {
      padding-left: 36px;
    }

    /* Total Preview */
    .total-preview {
      background: linear-gradient(135deg, var(--color-primary-subtle) 0%, rgba(var(--color-primary-rgb), 0.05) 100%);
      border: 1px solid rgba(var(--color-primary-rgb), 0.15);
      border-radius: 12px;
      padding: var(--space-md) var(--space-lg);
      margin-top: var(--space-md);
    }

    .total-calc {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      flex-wrap: wrap;
    }

    .total-formula {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      font-family: var(--font-mono, monospace);
    }

    .total-equals {
      color: var(--color-text-muted);
    }

    .total-amount {
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-primary);
      letter-spacing: -0.02em;
    }

    .total-calc--fixed {
      justify-content: space-between;
      padding: 0 var(--space-sm);
    }

    .total-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* Collapsible Section */
    .form-section--collapsible {
      padding-bottom: 0;
    }

    .section-toggle {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-sm) 0;
      color: var(--color-text);
      transition: all 0.15s ease;

      &:hover {
        color: var(--color-primary);
      }
    }

    .section-toggle__left {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: 0.8125rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;

      svg {
        width: 16px;
        height: 16px;
        color: var(--color-primary);
        opacity: 0.8;
      }
    }

    .section-toggle__arrow {
      width: 18px;
      height: 18px;
      color: var(--color-text-muted);
      transition: transform 0.2s ease;
    }

    .section-toggle--expanded .section-toggle__arrow {
      transform: rotate(180deg);
    }

    .section-content {
      padding-top: var(--space-md);
      animation: slideDown 0.2s ease-out;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .badge--active {
      background: var(--color-success-subtle);
      color: var(--color-success);
    }

    .badge--default {
      background: var(--color-fill-tertiary);
      color: var(--color-text-secondary);
    }

    /* Toggle Row */
    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-md);
      background: var(--color-fill-quaternary);
      border-radius: 12px;
      margin-bottom: var(--space-md);
    }

    .toggle-label {
      display: flex;
      flex-direction: column;
      gap: 2px;

      span:first-child {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--color-text);
      }
    }

    .toggle-hint {
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
    }

    .toggle-switch {
      position: relative;
      width: 44px;
      height: 26px;
      cursor: pointer;

      input {
        opacity: 0;
        width: 0;
        height: 0;
      }
    }

    .toggle-slider {
      position: absolute;
      inset: 0;
      background: var(--color-fill-secondary);
      border-radius: 13px;
      transition: all 0.2s ease;

      &::before {
        content: '';
        position: absolute;
        width: 22px;
        height: 22px;
        left: 2px;
        bottom: 2px;
        background: white;
        border-radius: 50%;
        transition: transform 0.2s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
    }

    .toggle-switch input:checked + .toggle-slider {
      background: var(--color-primary);

      &::before {
        transform: translateX(18px);
      }
    }

    /* AI Generate Bar */
    .ai-generate-bar {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      margin-bottom: var(--space-md);
    }

    .btn--ai {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      padding: 8px 16px;
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
      color: white;
      border-radius: 10px;
      font-size: 0.8125rem;
      font-weight: 600;
      transition: all 0.15s ease;
      white-space: nowrap;

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .ai-hint {
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
      line-height: 1.3;
    }

    .email-template-form {
      animation: fadeIn 0.2s ease;
    }

    /* Email Preview (Default Template) */
    .email-preview {
      background: var(--color-fill-quaternary);
      border: 1px solid var(--color-border-subtle);
      border-radius: 12px;
      overflow: hidden;
      animation: fadeIn 0.2s ease;
    }

    .email-preview--custom {
      border-color: var(--color-success);
      border-width: 2px;
    }

    .email-preview--custom .email-preview__header {
      background: var(--color-success-subtle);
      color: var(--color-success);
    }

    .email-preview__header {
      justify-content: flex-start;
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-md);
      background: var(--color-primary-subtle);
      border-bottom: 1px solid var(--color-border-subtle);
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-primary);

      svg {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
      }
    }

    .email-preview__content {
      padding: var(--space-md);
    }

    .email-preview__field {
      margin-bottom: var(--space-md);

      label {
        display: block;
        font-size: 0.6875rem;
        font-weight: 600;
        color: var(--color-text-tertiary);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 4px;
      }

      span {
        display: block;
        font-size: 0.875rem;
        color: var(--color-text);
        font-weight: 500;
      }
    }

    .email-preview__body {
      label {
        display: block;
        font-size: 0.6875rem;
        font-weight: 600;
        color: var(--color-text-tertiary);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 4px;
      }

      pre {
        margin: 0;
        padding: var(--space-sm);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        font-family: var(--font-body);
        font-size: 0.8125rem;
        line-height: 1.5;
        color: var(--color-text-secondary);
        white-space: pre-wrap;
        word-wrap: break-word;
        max-height: 200px;
        overflow-y: auto;
      }
    }

    .template-vars {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-xs);
      margin-top: var(--space-sm);
      font-size: 0.75rem;
    }

    .template-vars__label {
      color: var(--color-text-tertiary);
    }

    .template-vars code {
      padding: 2px 6px;
      background: var(--color-fill-tertiary);
      border-radius: 4px;
      font-family: var(--font-mono, monospace);
      font-size: 0.6875rem;
      color: var(--color-text-secondary);
    }

    /* Edit Button */
    .btn-edit {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: transparent;
      border: 1px solid currentColor;
      border-radius: 6px;
      font-size: 0.6875rem;
      font-weight: 600;
      color: inherit;
      opacity: 0.8;
      transition: all 0.15s ease;

      svg {
        width: 12px;
        height: 12px;
      }

      &:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.05);
      }
    }

    /* Email Edit Form */
    .email-edit-form {
      animation: fadeIn 0.2s ease;
    }

    .email-edit-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-sm);
      margin-top: var(--space-md);
    }

    .btn--small {
      padding: 6px 12px;
      font-size: 0.8125rem;
    }

    /* Footer */
    .modal__footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-md);
      padding: var(--space-lg) var(--space-xl);
      background: var(--color-bg-subtle);
      border-top: 1px solid var(--color-border);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      padding: 10px 20px;
      font-size: 0.9375rem;
      font-weight: 600;
      border-radius: 12px;
      transition: all 0.15s ease;

      svg {
        width: 18px;
        height: 18px;
      }

      &--primary {
        background: var(--color-primary);
        color: white;

        &:hover:not(:disabled) {
          background: var(--color-primary-hover);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
        }
      }

      &--secondary {
        background: var(--color-surface);
        color: var(--color-text);
        border: 1px solid var(--color-border);

        &:hover {
          background: var(--color-fill-tertiary);
        }
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
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

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Responsive */
    @media (max-width: 600px) {
      .modal {
        max-width: 100%;
        max-height: 100vh;
        border-radius: 0;
      }

      .form-row,
      .form-row--3 {
        grid-template-columns: 1fr;
      }

      .info-bar {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-sm);
      }

      .info-divider {
        width: 100%;
        height: 1px;
      }

      .ai-generate-bar {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class InvoiceModalComponent implements OnInit {
  private bankAccountService = inject(BankAccountService);
  private googleService = inject(GoogleService);
  private chatService = inject(ChatService);

  task = input<Task | null>(null);
  isOpen = signal(false);
  isGenerating = signal(false);
  isGeneratingEmail = signal(false);
  isEmailSectionExpanded = signal(false);
  isEditingEmail = signal(false);

  // Data signals
  bankAccounts = signal<BankAccount[]>([]);
  googleAccounts = signal<GoogleAccount[]>([]);

  onGenerate = output<InvoiceGenerationData>();
  onClose = output<void>();

  // Form values
  hoursWorked: number | null = null;
  hourlyRate: number | null = null;
  fixedMonthlyAmount: number | null = null;
  useFixedAmount = false;
  selectedMonth: number;
  selectedYear: number;
  selectedLanguage = 'PL';
  selectedCurrency = 'USD';
  selectedTemplate: InvoiceTemplate = 'STANDARD';
  selectedBankAccountId = '';
  selectedGoogleAccountId = '';
  description = '';

  // Email template
  useCustomEmailTemplate = false;
  emailSubject = '';
  emailBody = '';

  months = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' }
  ];

  years: number[] = [];

  constructor() {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    this.selectedMonth = prevMonth.getMonth();
    this.selectedYear = prevMonth.getFullYear();

    const currentYear = now.getFullYear();
    this.years = [currentYear - 2, currentYear - 1, currentYear];
  }

  ngOnInit(): void {
    this.loadIntegrations();
  }

  loadIntegrations(): void {
    this.bankAccountService.getBankAccounts().subscribe({
      next: (accounts) => this.bankAccounts.set(accounts)
    });

    this.googleService.getAccounts().subscribe({
      next: (accounts) => this.googleAccounts.set(accounts)
    });
  }

  defaultDescription = computed(() => {
    const monthName = this.months[this.selectedMonth]?.label || '';
    return `Professional services for ${monthName} ${this.selectedYear}`;
  });

  currentCurrencySymbol = computed(() => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'PLN': 'zł',
      'GBP': '£'
    };
    return symbols[this.selectedCurrency] || this.selectedCurrency + ' ';
  });

  calculatedTotal(): string {
    if (this.useFixedAmount) {
      const amount = Number(this.fixedMonthlyAmount) || 0;
      return amount.toFixed(2);
    }
    const hours = Number(this.hoursWorked) || 0;
    const rate = Number(this.hourlyRate) || 0;
    return (hours * rate).toFixed(2);
  }

  isValid(): boolean {
    if (this.useFixedAmount) {
      const amount = Number(this.fixedMonthlyAmount) || 0;
      return amount > 0;
    }
    const hours = Number(this.hoursWorked) || 0;
    const rate = Number(this.hourlyRate) || 0;
    return hours > 0 && rate > 0;
  }

  toggleEmailSection(): void {
    this.isEmailSectionExpanded.update(v => !v);
  }

  // Store original values for cancel
  private originalEmailSubject = '';
  private originalEmailBody = '';

  startEmailEdit(): void {
    // Store current values to restore on cancel
    this.originalEmailSubject = this.emailSubject || this.getDefaultEmailSubject();
    this.originalEmailBody = this.emailBody || this.getDefaultEmailBody();

    // Pre-fill with current values if empty
    if (!this.emailSubject) {
      this.emailSubject = this.getDefaultEmailSubject();
    }
    if (!this.emailBody) {
      this.emailBody = this.getDefaultEmailBody();
    }

    this.isEditingEmail.set(true);
  }

  cancelEmailEdit(): void {
    // Restore original values
    this.emailSubject = this.originalEmailSubject;
    this.emailBody = this.originalEmailBody;
    this.isEditingEmail.set(false);
  }

  // Generate default email subject based on current form values
  // Matches the default template from task-form
  getDefaultEmailSubject(): string {
    const monthName = this.months[this.selectedMonth]?.label || '';
    return `Invoice for ${monthName} ${this.selectedYear}`;
  }

  // Generate default email body based on current form values
  // Matches the default template from task-form
  getDefaultEmailBody(): string {
    const monthName = this.months[this.selectedMonth]?.label || '';

    return `Hello,

I hope you are doing well.

Attached to this email is my invoice for ${monthName} ${this.selectedYear} for your reference. Please proceed with the payment.

If you need any additional information or have any questions, please feel free to contact me.

Thank you for your attention to this matter.

Best regards,`;
  }

  // Get current email subject (edited > custom > default)
  getCurrentEmailSubject(): string {
    // If user has edited the email, use their value
    if (this.emailSubject) {
      return this.emailSubject;
    }
    return this.getDefaultEmailSubject();
  }

  // Get current email body (edited > custom > default)
  getCurrentEmailBody(): string {
    // If user has edited the email, use their value
    if (this.emailBody) {
      return this.emailBody;
    }
    return this.getDefaultEmailBody();
  }

  open(task: Task): void {
    // Reset form with task defaults (configured in task form)
    // Determine billing type based on whether fixedMonthlyAmount is set
    this.useFixedAmount = !!task.fixedMonthlyAmount;
    this.fixedMonthlyAmount = task.fixedMonthlyAmount || null;
    this.hoursWorked = task.hoursWorked || null;
    this.hourlyRate = task.hourlyRate || null;
    this.selectedLanguage = task.defaultLanguage || 'PL';
    this.selectedCurrency = task.currency || 'USD';
    this.selectedTemplate = task.invoiceTemplate || 'STANDARD';
    this.selectedBankAccountId = task.bankAccountId || '';
    this.selectedGoogleAccountId = task.googleAccountId || '';
    this.description = '';

    // Set to previous month first (needed for template processing)
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    this.selectedMonth = prevMonth.getMonth();
    this.selectedYear = prevMonth.getFullYear();

    // Email template - process placeholders if task has custom template
    this.useCustomEmailTemplate = task.useCustomEmailTemplate || false;
    if (this.useCustomEmailTemplate && task.emailSubjectTemplate && task.emailBodyTemplate) {
      // Process placeholders in custom template
      this.emailSubject = this.processTemplatePlaceholders(task.emailSubjectTemplate, task);
      this.emailBody = this.processTemplatePlaceholders(task.emailBodyTemplate, task);
    } else {
      this.emailSubject = '';
      this.emailBody = '';
    }

    // Always expand email section so user sees the preview
    this.isEmailSectionExpanded.set(true);
    this.isEditingEmail.set(false);

    this.isOpen.set(true);
  }

  // Process template placeholders like {month}, {year}, {clientName}, etc.
  processTemplatePlaceholders(template: string, task: Task): string {
    const monthName = this.months[this.selectedMonth]?.label || '';
    const amount = this.calculatedTotal();

    // Strip HTML tags for plain text preview
    let processed = template
      .replace(/<[^>]*>/g, '\n')  // Replace HTML tags with newlines
      .replace(/&nbsp;/g, ' ')     // Replace &nbsp; with space
      .replace(/\n{3,}/g, '\n\n')  // Normalize multiple newlines
      .trim();

    // Replace placeholders
    processed = processed
      .replace(/\{clientName\}/g, task.client?.name || 'Client')
      .replace(/\{month\}/g, monthName)
      .replace(/\{year\}/g, this.selectedYear.toString())
      .replace(/\{amount\}/g, amount)
      .replace(/\{currency\}/g, this.selectedCurrency);

    return processed;
  }

  close(): void {
    this.isOpen.set(false);
    this.onClose.emit();
  }

  generateEmailWithAI(): void {
    const task = this.task();
    if (!task) return;

    this.isGeneratingEmail.set(true);

    const monthName = this.months[this.selectedMonth]?.label || '';
    const prompt = `Generate a professional invoice email for:
- Client: ${task.client?.name || 'Unknown'}
- Service period: ${monthName} ${this.selectedYear}
- Amount: ${this.currentCurrencySymbol()}${this.calculatedTotal()} ${this.selectedCurrency}
- Hours worked: ${this.hoursWorked || 0}
- Hourly rate: ${this.currentCurrencySymbol()}${this.hourlyRate || 0}
- Description: ${this.description || this.defaultDescription()}

The email should be professional, concise, and request timely payment. Language: ${this.selectedLanguage === 'PL' ? 'Polish' : 'English'}.`;

    this.chatService.generateEmailTemplate(prompt).subscribe({
      next: (response) => {
        if (response.success) {
          this.emailSubject = response.subject;
          this.emailBody = response.body;
        }
        this.isGeneratingEmail.set(false);
      },
      error: () => {
        this.isGeneratingEmail.set(false);
      }
    });
  }

  generate(): void {
    if (!this.isValid() || !this.task()) return;

    // Use current email values (edited > custom > default)
    // This ensures the preview matches what gets stored in the invoice
    const emailSubject = this.getCurrentEmailSubject();
    const emailBody = this.getCurrentEmailBody();

    const data: InvoiceGenerationData = {
      taskId: this.task()!.id,
      // Include hours/rate only for hourly billing, fixed amount for fixed billing
      hoursWorked: this.useFixedAmount ? undefined : this.hoursWorked!,
      hourlyRate: this.useFixedAmount ? undefined : this.hourlyRate!,
      fixedAmount: this.useFixedAmount ? this.fixedMonthlyAmount! : undefined,
      month: this.selectedMonth,
      year: this.selectedYear,
      description: this.description || this.defaultDescription(),
      language: this.selectedLanguage,
      currency: this.selectedCurrency,
      invoiceTemplate: this.selectedTemplate,
      bankAccountId: this.selectedBankAccountId || undefined,
      googleAccountId: this.selectedGoogleAccountId || undefined,
      useCustomEmailTemplate: true, // Always true since we're passing the actual content
      emailSubject,
      emailBody
    };

    this.onGenerate.emit(data);
  }

  setGenerating(value: boolean): void {
    this.isGenerating.set(value);
  }
}
