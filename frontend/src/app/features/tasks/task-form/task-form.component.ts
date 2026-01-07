import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { TaskService, CreateTaskDto } from '../../../core/services/task.service';
import { ClientService, Client, InvoiceTemplate } from '../../../core/services/client.service';
import { BankAccountService, BankAccount } from '../../../core/services/bank-account.service';
import { GoogleService, GoogleAccount } from '../../../core/services/google.service';
import { ChatService } from '../../../core/services/chat.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastComponent } from '../../../shared/components/toast/toast.component';
import { TemplateSelectorComponent } from '../../../shared/components/template-selector/template-selector.component';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, ToastComponent, QuillModule, TemplateSelectorComponent],
  template: `
    <app-toast />
    <div class="task-form-page">
      <div class="container">
        <header class="page-header">
          <a routerLink="/tasks/invoices" class="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to Tasks
          </a>
          <h1 class="page-title">{{ isEditing() ? 'Edit Task' : 'New Task' }}</h1>
          <p class="page-subtitle">{{ isEditing() ? 'Update task details and invoice defaults' : 'Create a recurring invoice task' }}</p>
        </header>

        @if (isLoadingClients()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading...</p>
          </div>
        } @else if (clients().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h2>No Clients Yet</h2>
            <p>Create a client first to associate with this task</p>
            <a routerLink="/clients/new" class="btn btn--primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create Client
            </a>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-card">
            <div class="form-body">
              <!-- Task Name -->
              <div class="form-group form-group--prominent">
                <label for="name" class="form-label">Task Name</label>
                <input
                  type="text"
                  id="name"
                  formControlName="name"
                  class="form-input form-input--large"
                  placeholder="e.g., Monthly Invoice"
                  [class.form-input--error]="form.get('name')?.touched && form.get('name')?.invalid"
                />
                @if (form.get('name')?.touched && form.get('name')?.errors?.['required']) {
                  <span class="form-error">Task name is required</span>
                }
              </div>

              <!-- Client Selector -->
              <div class="form-group">
                <label for="clientId" class="form-label">
                  Client
                  <a routerLink="/clients/new" class="label-action">+ Add new</a>
                </label>
                <div class="select-wrapper">
                  <select
                    id="clientId"
                    formControlName="clientId"
                    class="form-input form-select"
                    [class.form-input--error]="form.get('clientId')?.touched && form.get('clientId')?.invalid"
                  >
                    <option value="">Select a client...</option>
                    @for (client of clients(); track client.id) {
                      <option [value]="client.id">
                        {{ client.name }}{{ client.email ? ' (' + client.email + ')' : '' }}
                      </option>
                    }
                  </select>
                  <svg class="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
                @if (form.get('clientId')?.touched && form.get('clientId')?.errors?.['required']) {
                  <span class="form-error">Please select a client</span>
                }
                @if (selectedClient()) {
                  <div class="client-preview">
                    <span class="client-badge">{{ selectedClient()!.name }}</span>
                    @if (selectedClient()!.crmIntegration) {
                      <span class="crm-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                          <path d="M2 17l10 5 10-5"/>
                          <path d="M2 12l10 5 10-5"/>
                        </svg>
                        {{ selectedClient()!.crmIntegration!.name }}
                      </span>
                    }
                  </div>
                }
              </div>

              <!-- Date Fields -->
              <div class="form-row">
                <div class="form-group">
                  <label for="warningDate" class="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    Warning Day
                  </label>
                  <div class="number-input-wrapper">
                    <input
                      type="number"
                      id="warningDate"
                      formControlName="warningDate"
                      class="form-input"
                      placeholder="1"
                      min="1"
                      max="31"
                      [class.form-input--error]="form.get('warningDate')?.touched && form.get('warningDate')?.invalid"
                    />
                    <span class="number-suffix">of each month</span>
                  </div>
                  <span class="form-hint">Day to start showing reminders</span>
                </div>

                <div class="form-group">
                  <label for="deadlineDate" class="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Deadline Day
                  </label>
                  <div class="number-input-wrapper">
                    <input
                      type="number"
                      id="deadlineDate"
                      formControlName="deadlineDate"
                      class="form-input"
                      placeholder="5"
                      min="1"
                      max="31"
                      [class.form-input--error]="form.get('deadlineDate')?.touched && form.get('deadlineDate')?.invalid"
                    />
                    <span class="number-suffix">of each month</span>
                  </div>
                  <span class="form-hint">Invoice due date each month</span>
                </div>
              </div>
            </div>

            <!-- Invoice Defaults Section -->
            <section class="form-section">
              <h2 class="section-title">Invoice Defaults</h2>
              <p class="section-description">Default values used when generating invoices from this task</p>

              <!-- Currency & Language -->
              <div class="form-row">
                <div class="form-group">
                  <label for="currency" class="form-label">Currency</label>
                  <select id="currency" formControlName="currency" class="form-input">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="PLN">PLN (zł)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="defaultLanguage" class="form-label">Invoice Language</label>
                  <select id="defaultLanguage" formControlName="defaultLanguage" class="form-input">
                    <option value="PL">Polski (PL/EN)</option>
                    <option value="EN">English</option>
                  </select>
                </div>
              </div>

              <!-- Template Selection -->
              <div class="form-group">
                <label class="form-label">Invoice Template</label>
                <app-template-selector
                  [value]="form.get('invoiceTemplate')?.value || 'STANDARD'"
                  (valueChange)="form.get('invoiceTemplate')?.setValue($event)"
                ></app-template-selector>
              </div>

              <!-- Billing Type Toggle -->
              <div class="billing-type-toggle">
                <button
                  type="button"
                  class="billing-option"
                  [class.billing-option--active]="!useFixedAmount()"
                  (click)="useFixedAmount.set(false)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Hourly Rate
                </button>
                <button
                  type="button"
                  class="billing-option"
                  [class.billing-option--active]="useFixedAmount()"
                  (click)="useFixedAmount.set(true)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <line x1="6" y1="12" x2="18" y2="12"/>
                  </svg>
                  Fixed Amount
                </button>
              </div>

              <!-- Hourly Rate & Hours -->
              @if (!useFixedAmount()) {
                <div class="form-row">
                  <div class="form-group">
                    <label for="hourlyRate" class="form-label">Hourly Rate</label>
                    <input
                      type="number"
                      id="hourlyRate"
                      formControlName="hourlyRate"
                      class="form-input"
                      placeholder="e.g., 75.00"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div class="form-group">
                    <label for="hoursWorked" class="form-label">Default Hours</label>
                    <input
                      type="number"
                      id="hoursWorked"
                      formControlName="hoursWorked"
                      class="form-input"
                      placeholder="e.g., 160"
                      min="0"
                      step="0.5"
                    />
                    <span class="form-hint">Typical hours per invoice</span>
                  </div>
                </div>
              }

              <!-- Fixed Monthly Amount -->
              @if (useFixedAmount()) {
                <div class="form-group">
                  <label for="fixedMonthlyAmount" class="form-label">Monthly Amount</label>
                  <div class="input-with-prefix">
                    <span class="input-prefix">{{ getCurrencySymbol() }}</span>
                    <input
                      type="number"
                      id="fixedMonthlyAmount"
                      formControlName="fixedMonthlyAmount"
                      class="form-input form-input--prefixed"
                      placeholder="e.g., 5000.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <span class="form-hint">Fixed amount for each invoice</span>
                </div>
              }

              <!-- Bank Account -->
              <div class="form-group">
                <label for="bankAccountId" class="form-label">Bank Account</label>
                <select id="bankAccountId" formControlName="bankAccountId" class="form-input">
                  <option value="">Select bank account...</option>
                  @for (account of bankAccounts(); track account.id) {
                    <option [value]="account.id">{{ account.name }} ({{ account.currency }})</option>
                  }
                </select>
                <span class="form-hint">Your bank details on invoice</span>
              </div>

              <!-- Google Account -->
              @if (googleAccounts().length > 0) {
                <div class="form-group">
                  <label for="googleAccountId" class="form-label">Gmail Account</label>
                  <select id="googleAccountId" formControlName="googleAccountId" class="form-input">
                    <option value="">Select Gmail account...</option>
                    @for (account of googleAccounts(); track account.id) {
                      <option [value]="account.id">{{ account.email }}</option>
                    }
                  </select>
                  <span class="form-hint">Create email drafts in this account</span>
                </div>
              }
            </section>

            <!-- Email Template Section -->
            <section class="form-section">
              <h2 class="section-title">Email Template</h2>

              <!-- Always show preview -->
              <div class="email-preview email-preview--prominent">
                <div class="email-preview__header">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  @if (form.get('useCustomEmailTemplate')?.value) {
                    Custom Template
                  } @else {
                    Default Template
                  }
                </div>
                <div class="email-preview__content">
                  <div class="email-preview__subject">
                    <strong>Subject:</strong> {{ getSubjectPreview() }}
                  </div>
                  <div class="email-preview__body" [innerHTML]="getEmailPreviewHtml()"></div>
                </div>
              </div>

              <!-- Toggle to enable customization -->
              <div class="toggle-row">
                <label class="toggle-label">
                  <span>Customize Email Template</span>
                  <span class="toggle-hint">Edit the default email template above</span>
                </label>
                <label class="toggle-switch">
                  <input type="checkbox" formControlName="useCustomEmailTemplate" />
                  <span class="toggle-slider"></span>
                </label>
              </div>

              @if (form.get('useCustomEmailTemplate')?.value) {
                <div class="email-fields">
                  <!-- AI Generation -->
                  <div class="ai-generate-section">
                    <div class="form-group">
                      <label for="aiPrompt" class="form-label">AI Prompt (optional)</label>
                      <textarea
                        id="aiPrompt"
                        [(ngModel)]="aiPrompt"
                        [ngModelOptions]="{standalone: true}"
                        class="form-input"
                        rows="2"
                        placeholder="Describe what kind of email you want, e.g., 'formal tone, mention payment terms of 14 days'"
                      ></textarea>
                    </div>
                    <button
                      type="button"
                      class="btn btn--ai"
                      (click)="generateEmailWithAI()"
                      [disabled]="isGeneratingEmail()"
                    >
                      @if (isGeneratingEmail()) {
                        <span class="btn-spinner"></span>
                        Generating...
                      } @else {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                          <path d="M2 17l10 5 10-5"/>
                          <path d="M2 12l10 5 10-5"/>
                        </svg>
                        Generate with AI
                      }
                    </button>
                  </div>

                  <div class="email-editor">
                    <div class="form-group">
                      <label for="emailSubjectTemplate" class="form-label">Subject</label>
                      <input
                        type="text"
                        id="emailSubjectTemplate"
                        formControlName="emailSubjectTemplate"
                        class="form-input"
                        placeholder="Invoice for {{ '{' }}month{{ '}' }} {{ '{' }}year{{ '}' }}"
                      />
                    </div>

                    <div class="form-group">
                      <label for="emailBodyTemplate" class="form-label">Body</label>
                      <quill-editor
                        formControlName="emailBodyTemplate"
                        format="html"
                        [modules]="quillModules"
                        [styles]="{ height: '200px' }"
                        placeholder="Write your email template here..."
                        class="email-quill-editor"
                      ></quill-editor>
                      <div class="template-vars">
                        <span class="template-vars__label">Variables:</span>
                        <code>{{ '{' }}clientName{{ '}' }}</code>
                        <code>{{ '{' }}month{{ '}' }}</code>
                        <code>{{ '{' }}year{{ '}' }}</code>
                        <code>{{ '{' }}amount{{ '}' }}</code>
                        <code>{{ '{' }}currency{{ '}' }}</code>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </section>

            <!-- Form Actions -->
            <div class="form-actions">
              <a routerLink="/tasks/invoices" class="btn btn--ghost">Cancel</a>
              <button
                type="submit"
                class="btn btn--primary"
                [disabled]="isLoading() || form.invalid"
              >
                @if (isLoading()) {
                  <span class="btn-spinner"></span>
                  {{ isEditing() ? 'Saving...' : 'Creating...' }}
                } @else {
                  {{ isEditing() ? 'Save Changes' : 'Create Task' }}
                }
              </button>
            </div>
          </form>

          <!-- Danger Zone (Edit Mode Only) -->
          @if (isEditing()) {
            <section class="danger-zone">
              <h3 class="danger-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Danger Zone
              </h3>

              @if (isArchived()) {
                <div class="archived-notice">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="21 8 21 21 3 21 3 8"/>
                    <rect x="1" y="3" width="22" height="5"/>
                  </svg>
                  This task is archived
                </div>
              }

              <div class="danger-actions">
                @if (!isArchived()) {
                  <button
                    type="button"
                    class="btn btn--warning"
                    (click)="archiveTask()"
                    [disabled]="isArchiving()"
                  >
                    @if (isArchiving()) {
                      <span class="btn-spinner btn-spinner--dark"></span>
                    } @else {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="21 8 21 21 3 21 3 8"/>
                        <rect x="1" y="3" width="22" height="5"/>
                      </svg>
                    }
                    Archive Task
                  </button>
                } @else {
                  <button
                    type="button"
                    class="btn btn--ghost"
                    (click)="unarchiveTask()"
                    [disabled]="isArchiving()"
                  >
                    @if (isArchiving()) {
                      <span class="btn-spinner btn-spinner--dark"></span>
                    } @else {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="1 4 1 10 7 10"/>
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                      </svg>
                    }
                    Restore Task
                  </button>
                }

                <button
                  type="button"
                  class="btn btn--danger"
                  (click)="deleteTask()"
                  [disabled]="isDeleting()"
                >
                  @if (isDeleting()) {
                    <span class="btn-spinner"></span>
                  } @else {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  }
                  Delete Forever
                </button>
              </div>
            </section>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .task-form-page {
      min-height: 100vh;
      background: var(--color-bg);
      padding: var(--space-xl) 0 var(--space-3xl);
    }

    .container {
      max-width: 90%;
      width: 900px;
      margin: 0 auto;
      padding: 0 var(--space-lg);
    }

    /* Header */
    .page-header {
      margin-bottom: var(--space-xl);
      animation: fadeSlideDown 0.4s ease-out;
    }

    @keyframes fadeSlideDown {
      from {
        opacity: 0;
        transform: translateY(-12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: var(--space-md);
      transition: color var(--transition-fast);

      &:hover {
        color: var(--color-primary);
      }

      svg {
        width: 16px;
        height: 16px;
      }
    }

    .page-title {
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 4px;
      letter-spacing: -0.02em;
    }

    .page-subtitle {
      color: var(--color-text-tertiary);
      font-size: 0.9375rem;
    }

    /* Loading & Empty States */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-3xl);
      color: var(--color-text-tertiary);
      animation: fadeIn 0.3s ease-out;

      p {
        margin-top: var(--space-md);
        font-size: 0.9375rem;
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-state {
      text-align: center;
      padding: var(--space-3xl) var(--space-xl);
      background: var(--color-surface);
      border-radius: var(--radius-xl);
      border: 1px solid var(--color-border);
      animation: fadeSlideUp 0.4s ease-out;
    }

    @keyframes fadeSlideUp {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .empty-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto var(--space-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-primary-subtle);
      border-radius: 50%;

      svg {
        width: 32px;
        height: 32px;
        color: var(--color-primary);
      }
    }

    .empty-state h2 {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-xs);
    }

    .empty-state p {
      color: var(--color-text-tertiary);
      margin-bottom: var(--space-xl);
    }

    /* Form Card */
    .form-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 20px;
      overflow: hidden;
      animation: fadeSlideUp 0.4s ease-out 0.1s both;
    }

    .form-body {
      padding: var(--space-xl);
    }

    /* Form Sections */
    .form-section {
      padding: var(--space-xl);
      border-bottom: 1px solid var(--color-border);

      &:last-of-type {
        border-bottom: none;
      }
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0 0 var(--space-sm);
    }

    .section-description {
      font-size: 0.875rem;
      color: var(--color-text-tertiary);
      margin: 0 0 var(--space-lg);
    }

    /* Form Groups */
    .form-group {
      margin-bottom: var(--space-lg);

      &:last-child {
        margin-bottom: 0;
      }

      &--prominent {
        margin-bottom: var(--space-xl);
      }
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-lg);

      @media (max-width: 480px) {
        grid-template-columns: 1fr;
      }
    }

    .form-label {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-text-secondary);
      margin-bottom: var(--space-sm);
      text-transform: uppercase;
      letter-spacing: 0.04em;

      svg {
        width: 14px;
        height: 14px;
        opacity: 0.7;
      }
    }

    .label-action {
      margin-left: auto;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: none;
      letter-spacing: 0;
      color: var(--color-primary);
      opacity: 0.8;
      transition: opacity var(--transition-fast);

      &:hover {
        opacity: 1;
      }
    }

    .form-input {
      width: 100%;
      padding: var(--space-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg);
      color: var(--color-text);
      font-size: 0.9375rem;
      transition: all var(--transition-fast);

      &::placeholder {
        color: var(--color-text-tertiary);
      }

      &:hover {
        border-color: var(--color-text-tertiary);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-subtle);
        background: var(--color-surface);
      }

      &--large {
        padding: var(--space-md) var(--space-lg);
        font-size: 1.125rem;
        font-weight: 500;
      }

      &--error {
        border-color: var(--color-danger);

        &:focus {
          box-shadow: 0 0 0 3px var(--color-danger-subtle);
        }
      }

      &--prefixed {
        padding-left: 36px;
      }
    }

    .form-textarea {
      resize: vertical;
      min-height: 120px;
      line-height: 1.5;
    }

    /* Input with prefix */
    .input-with-prefix {
      position: relative;
    }

    .input-prefix {
      position: absolute;
      left: var(--space-md);
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-text-muted);
      font-weight: 600;
      font-size: 0.9375rem;
      pointer-events: none;
    }

    /* Select Wrapper */
    .select-wrapper {
      position: relative;
    }

    .form-select {
      appearance: none;
      padding-right: 40px;
      cursor: pointer;
    }

    .select-chevron {
      position: absolute;
      right: var(--space-md);
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: var(--color-text-tertiary);
      pointer-events: none;
    }

    /* Number Input */
    .number-input-wrapper {
      display: flex;
      align-items: center;
      gap: var(--space-sm);

      .form-input {
        width: 80px;
        text-align: center;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
    }

    .number-suffix {
      font-size: 0.875rem;
      color: var(--color-text-tertiary);
    }

    .form-hint {
      display: block;
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
      margin-top: var(--space-xs);
    }

    .form-error {
      display: block;
      font-size: 0.75rem;
      color: var(--color-danger);
      margin-top: var(--space-xs);
    }

    /* Client Preview */
    .client-preview {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      margin-top: var(--space-sm);
      animation: fadeIn 0.2s ease-out;
    }

    .client-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      font-size: 0.75rem;
      font-weight: 500;
      background: var(--color-primary-subtle);
      color: var(--color-primary);
      border-radius: var(--radius-full);
    }

    .crm-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      font-size: 0.6875rem;
      font-weight: 600;
      background: var(--color-indigo);
      color: white;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.03em;

      svg {
        width: 10px;
        height: 10px;
      }
    }

    /* AI Generate Section */
    .ai-generate-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      margin-bottom: var(--space-lg);
      padding: var(--space-md);
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%);
      border: 1px solid rgba(124, 58, 237, 0.15);
      border-radius: var(--radius-lg);
    }

    /* Toggle Row */
    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-md);
      background: var(--color-surface);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
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

    /* Billing Type Toggle */
    .billing-type-toggle {
      display: flex;
      gap: var(--space-sm);
      margin-bottom: var(--space-lg);
      padding: 4px;
      background: var(--color-fill-quaternary);
      border-radius: var(--radius-lg);
    }

    .billing-option {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-xs);
      padding: var(--space-sm) var(--space-md);
      background: transparent;
      border: none;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-muted);
      cursor: pointer;
      transition: all 0.2s ease;

      svg {
        width: 16px;
        height: 16px;
        opacity: 0.6;
      }

      &:hover:not(.billing-option--active) {
        background: var(--color-surface);
        color: var(--color-text-secondary);
      }

      &--active {
        background: var(--color-surface);
        color: var(--color-primary);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

        svg {
          opacity: 1;
        }
      }
    }

    /* Email Fields */
    .email-fields {
      animation: fadeIn 0.2s ease-out;
    }

    .btn--ai {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      padding: 8px 16px;
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
      color: white;
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      font-weight: 600;
      transition: all 0.15s ease;
      white-space: nowrap;

      svg {
        width: 14px;
        height: 14px;
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

    .ai-generate-section .form-group {
      margin-bottom: 0;
    }

    /* Email Editor & Preview */
    .email-editor {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      margin-top: var(--space-lg);
    }

    .email-preview--prominent {
      margin-bottom: var(--space-lg);
    }

    .email-quill-editor {
      ::ng-deep {
        .ql-toolbar {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md) var(--radius-md) 0 0;
          background: var(--color-fill-quaternary);
        }

        .ql-container {
          border: 1px solid var(--color-border);
          border-top: none;
          border-radius: 0 0 var(--radius-md) var(--radius-md);
          background: var(--color-bg);
          font-size: 0.9375rem;
          font-family: inherit;
        }

        .ql-editor {
          min-height: 200px;
          line-height: 1.6;
          color: var(--color-text);

          &.ql-blank::before {
            color: var(--color-text-tertiary);
            font-style: normal;
          }
        }

        .ql-snow .ql-stroke {
          stroke: var(--color-text-secondary);
        }

        .ql-snow .ql-fill {
          fill: var(--color-text-secondary);
        }

        .ql-snow .ql-picker {
          color: var(--color-text-secondary);
        }

        .ql-toolbar button:hover,
        .ql-toolbar button.ql-active {
          .ql-stroke {
            stroke: var(--color-primary);
          }
          .ql-fill {
            fill: var(--color-primary);
          }
        }
      }
    }

    .email-preview {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .email-preview__header {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      padding: var(--space-sm) var(--space-md);
      background: var(--color-fill-quaternary);
      border-bottom: 1px solid var(--color-border);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;

      svg {
        width: 14px;
        height: 14px;
      }
    }

    .email-preview__content {
      padding: var(--space-md);
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--color-text);
      max-height: 320px;
      overflow-y: auto;
    }

    .email-preview__subject {
      padding-bottom: var(--space-sm);
      margin-bottom: var(--space-sm);
      border-bottom: 1px solid var(--color-border-subtle);
      font-size: 0.8125rem;
      color: var(--color-text-secondary);

      strong {
        color: var(--color-text);
      }
    }

    .email-preview__body {
      word-wrap: break-word;
    }

    /* Styles for innerHTML content - needs ::ng-deep at root level */
    :host ::ng-deep .email-preview__body {
      p {
        margin: 0 0 1em 0;
        line-height: 1.6;

        &:last-child {
          margin-bottom: 0;
        }

        &:empty {
          min-height: 1em;
        }
      }

      br {
        display: block;
        content: '';
        margin-top: 0.5em;
      }

      strong, b {
        font-weight: 600;
      }

      em, i {
        font-style: italic;
      }

      ul, ol {
        margin: 0 0 1em 1.5em;
        padding: 0;
      }

      li {
        margin-bottom: 0.25em;
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
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      font-family: var(--font-mono, monospace);
      font-size: 0.6875rem;
      color: var(--color-text-secondary);
    }

    /* Form Actions */
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-md);
      padding: var(--space-lg) var(--space-xl);
      background: var(--color-surface);
      border-top: 1px solid var(--color-border);
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-lg);
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: var(--radius-md);
      border: none;
      cursor: pointer;
      transition: all var(--transition-fast);
      text-decoration: none;

      svg {
        width: 16px;
        height: 16px;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      &--primary {
        background: var(--color-primary);
        color: var(--color-primary-text);

        &:hover:not(:disabled) {
          background: var(--color-primary-hover);
          transform: translateY(-1px);
        }
      }

      &--ghost {
        background: transparent;
        color: var(--color-text-secondary);
        border: 1px solid var(--color-border);

        &:hover:not(:disabled) {
          background: var(--color-fill-quaternary);
          border-color: var(--color-text-tertiary);
        }
      }

      &--warning {
        background: var(--color-warning);
        color: white;

        &:hover:not(:disabled) {
          filter: brightness(0.9);
        }
      }

      &--danger {
        background: var(--color-danger);
        color: white;

        &:hover:not(:disabled) {
          filter: brightness(0.9);
        }
      }
    }

    .btn-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;

      &--dark {
        border-color: rgba(0, 0, 0, 0.2);
        border-top-color: currentColor;
      }
    }

    /* Danger Zone */
    .danger-zone {
      margin-top: var(--space-xl);
      padding: var(--space-lg);
      background: rgba(239, 68, 68, 0.04);
      border: 1px dashed rgba(239, 68, 68, 0.25);
      border-radius: var(--radius-lg);
      animation: fadeSlideUp 0.4s ease-out 0.2s both;
    }

    .danger-title {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-danger);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: var(--space-md);

      svg {
        width: 16px;
        height: 16px;
      }
    }

    .archived-notice {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-md);
      background: var(--color-warning-subtle);
      color: var(--color-warning);
      font-size: 0.8125rem;
      font-weight: 500;
      border-radius: var(--radius-md);
      margin-bottom: var(--space-md);

      svg {
        width: 14px;
        height: 14px;
      }
    }

    .danger-actions {
      display: flex;
      gap: var(--space-md);
      flex-wrap: wrap;
    }
  `]
})
export class TaskFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private taskService = inject(TaskService);
  private clientService = inject(ClientService);
  private bankAccountService = inject(BankAccountService);
  private googleService = inject(GoogleService);
  private chatService = inject(ChatService);
  private notificationService = inject(NotificationService);

  // State
  isLoading = signal(false);
  isEditing = signal(false);
  isLoadingClients = signal(true);
  isArchiving = signal(false);
  isDeleting = signal(false);
  isArchived = signal(false);
  isGeneratingEmail = signal(false);
  useFixedAmount = signal(false);

  clients = signal<Client[]>([]);
  bankAccounts = signal<BankAccount[]>([]);
  googleAccounts = signal<GoogleAccount[]>([]);
  taskId: string | null = null;
  aiPrompt = '';

  // Default email template
  readonly defaultEmailSubject = 'Invoice for {month} {year}';
  readonly defaultEmailBody = `<p>Hello,</p>
<p>I hope you are doing well.</p>
<p>Attached to this email is my invoice for {month} {year} for your reference. Please proceed with the payment.</p>
<p>If you need any additional information or have any questions, please feel free to contact me.</p>
<p>Thank you for your attention to this matter.</p>
<p>Best regards,</p>`;

  // Quill editor configuration
  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'color': [] }],
      ['link'],
      ['clean']
    ]
  };

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    clientId: ['', Validators.required],
    warningDate: [1, [Validators.required, Validators.min(1), Validators.max(31)]],
    deadlineDate: [5, [Validators.required, Validators.min(1), Validators.max(31)]],
    // Invoice defaults
    currency: ['USD'],
    defaultLanguage: ['PL'],
    invoiceTemplate: ['STANDARD' as InvoiceTemplate],
    hourlyRate: [null as number | null],
    hoursWorked: [null as number | null],
    fixedMonthlyAmount: [null as number | null],
    bankAccountId: [''],
    googleAccountId: [''],
    useCustomEmailTemplate: [false],
    emailSubjectTemplate: [this.defaultEmailSubject],
    emailBodyTemplate: [this.defaultEmailBody]
  });

  // Computed: selected client
  selectedClient = computed(() => {
    const clientId = this.form.get('clientId')?.value;
    if (!clientId) return null;
    return this.clients().find(c => c.id === clientId) || null;
  });

  // Method to get currency symbol (reactive to form changes)
  getCurrencySymbol(): string {
    const currency = this.form.get('currency')?.value || 'USD';
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'PLN': 'zł',
      'GBP': '£'
    };
    return symbols[currency] || currency + ' ';
  }

  ngOnInit() {
    this.taskId = this.route.snapshot.paramMap.get('id');

    if (this.taskId) {
      this.isEditing.set(true);
    }

    // Load all data in parallel
    this.loadData();
  }

  loadData() {
    // Load clients
    this.clientService.getClients().subscribe({
      next: (clients) => {
        this.clients.set(clients);
        this.isLoadingClients.set(false);

        // Load task after clients are loaded (for edit mode)
        if (this.taskId) {
          this.loadTask();
        }
      },
      error: () => {
        this.isLoadingClients.set(false);
        this.notificationService.error('Failed to load clients');
      }
    });

    // Load bank accounts
    this.bankAccountService.getBankAccounts().subscribe({
      next: (accounts) => this.bankAccounts.set(accounts)
    });

    // Load google accounts
    this.googleService.getAccounts().subscribe({
      next: (accounts) => this.googleAccounts.set(accounts)
    });
  }

  loadTask() {
    if (!this.taskId) return;

    this.taskService.getTask(this.taskId).subscribe({
      next: (task) => {
        this.form.patchValue({
          name: task.name,
          clientId: task.clientId || '',
          warningDate: task.warningDate,
          deadlineDate: task.deadlineDate,
          // Invoice defaults
          currency: task.currency || 'USD',
          defaultLanguage: task.defaultLanguage || 'PL',
          invoiceTemplate: task.invoiceTemplate || 'STANDARD',
          hourlyRate: task.hourlyRate || null,
          hoursWorked: task.hoursWorked || null,
          fixedMonthlyAmount: task.fixedMonthlyAmount || null,
          bankAccountId: task.bankAccountId || '',
          googleAccountId: task.googleAccountId || '',
          useCustomEmailTemplate: task.useCustomEmailTemplate || false,
          emailSubjectTemplate: task.emailSubjectTemplate || this.defaultEmailSubject,
          emailBodyTemplate: task.emailBodyTemplate || this.defaultEmailBody
        });
        this.isArchived.set(task.isArchived || false);
        // Set billing type based on whether fixed amount is set
        this.useFixedAmount.set(!!task.fixedMonthlyAmount);
      },
      error: () => {
        this.notificationService.error('Failed to load task');
        this.router.navigate(['/tasks/invoices']);
      }
    });
  }

  getEmailPreviewHtml(): string {
    // Use default template if custom is disabled, otherwise use form value
    const useCustom = this.form.get('useCustomEmailTemplate')?.value;
    let body = useCustom
      ? (this.form.get('emailBodyTemplate')?.value || this.defaultEmailBody)
      : this.defaultEmailBody;

    // Replace variables with example values for preview
    const client = this.selectedClient();
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthName = prevMonth.toLocaleString('en', { month: 'long' });
    const year = prevMonth.getFullYear().toString();
    const currency = this.form.get('currency')?.value || 'USD';

    // Calculate amount based on billing type
    let amount: string;
    if (this.useFixedAmount()) {
      amount = (this.form.get('fixedMonthlyAmount')?.value || 5000).toFixed(2);
    } else {
      const rate = this.form.get('hourlyRate')?.value || 75;
      const hours = this.form.get('hoursWorked')?.value || 160;
      amount = (rate * hours).toFixed(2);
    }

    body = body.replace(/\{clientName\}/g, client?.name || 'Client Name');
    body = body.replace(/\{month\}/g, monthName);
    body = body.replace(/\{year\}/g, year);
    body = body.replace(/\{amount\}/g, amount);
    body = body.replace(/\{currency\}/g, currency);

    return body;
  }

  getSubjectPreview(): string {
    // Use default template if custom is disabled, otherwise use form value
    const useCustom = this.form.get('useCustomEmailTemplate')?.value;
    let subject = useCustom
      ? (this.form.get('emailSubjectTemplate')?.value || this.defaultEmailSubject)
      : this.defaultEmailSubject;

    const client = this.selectedClient();
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthName = prevMonth.toLocaleString('en', { month: 'long' });
    const year = prevMonth.getFullYear().toString();

    subject = subject.replace(/\{clientName\}/g, client?.name || 'Client Name');
    subject = subject.replace(/\{month\}/g, monthName);
    subject = subject.replace(/\{year\}/g, year);

    return subject;
  }

  generateEmailWithAI() {
    this.isGeneratingEmail.set(true);

    const client = this.selectedClient();
    const taskName = this.form.get('name')?.value || 'Monthly invoice';
    const currency = this.form.get('currency')?.value || 'USD';
    const language = this.form.get('defaultLanguage')?.value === 'PL' ? 'Polish' : 'English';

    let prompt = `Generate a professional invoice email template for:
- Task: ${taskName}
- Currency: ${currency}
- Language: ${language}`;

    if (client) {
      prompt += `\n- Client: ${client.name}`;
    }

    if (this.aiPrompt.trim()) {
      prompt += `\n\nAdditional instructions: ${this.aiPrompt}`;
    }

    prompt += `

The template should:
1. Be professional and concise
2. Use placeholders: {clientName}, {month}, {year}, {amount}, {currency}
3. Request timely payment`;

    this.chatService.generateEmailTemplate(prompt).subscribe({
      next: (response) => {
        if (response.success) {
          this.form.patchValue({
            emailSubjectTemplate: response.subject,
            emailBodyTemplate: response.body
          });
          this.notificationService.success('Email template generated');
        }
        this.isGeneratingEmail.set(false);
      },
      error: () => {
        this.isGeneratingEmail.set(false);
        this.notificationService.error('Failed to generate email template');
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    const formValue = this.form.getRawValue();

    // Clear irrelevant billing fields based on billing type
    const isFixed = this.useFixedAmount();

    const taskData: CreateTaskDto = {
      name: formValue.name,
      clientId: formValue.clientId,
      warningDate: formValue.warningDate,
      deadlineDate: formValue.deadlineDate,
      // Invoice defaults
      currency: formValue.currency,
      defaultLanguage: formValue.defaultLanguage,
      invoiceTemplate: formValue.invoiceTemplate as InvoiceTemplate,
      // Clear hourly fields if using fixed amount, and vice versa
      hourlyRate: isFixed ? undefined : (formValue.hourlyRate || undefined),
      hoursWorked: isFixed ? undefined : (formValue.hoursWorked || undefined),
      fixedMonthlyAmount: isFixed ? (formValue.fixedMonthlyAmount || undefined) : undefined,
      bankAccountId: formValue.bankAccountId || undefined,
      googleAccountId: formValue.googleAccountId || undefined,
      useCustomEmailTemplate: formValue.useCustomEmailTemplate,
      emailSubjectTemplate: formValue.emailSubjectTemplate || undefined,
      emailBodyTemplate: formValue.emailBodyTemplate || undefined
    };

    const request = this.isEditing()
      ? this.taskService.updateTask(this.taskId!, taskData)
      : this.taskService.createTask(taskData);

    request.subscribe({
      next: () => {
        this.notificationService.success(
          this.isEditing() ? 'Task updated successfully' : 'Task created successfully'
        );
        this.router.navigate(['/tasks/invoices']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notificationService.error(err.error?.error || 'Failed to save task');
      }
    });
  }

  archiveTask() {
    if (!this.taskId) return;
    if (!confirm('Archive this task? It will be hidden from the active list.')) return;

    this.isArchiving.set(true);
    this.taskService.archiveTask(this.taskId).subscribe({
      next: () => {
        this.isArchived.set(true);
        this.isArchiving.set(false);
        this.notificationService.success('Task archived');
      },
      error: () => {
        this.isArchiving.set(false);
        this.notificationService.error('Failed to archive task');
      }
    });
  }

  unarchiveTask() {
    if (!this.taskId) return;

    this.isArchiving.set(true);
    this.taskService.unarchiveTask(this.taskId).subscribe({
      next: () => {
        this.isArchived.set(false);
        this.isArchiving.set(false);
        this.notificationService.success('Task restored');
      },
      error: () => {
        this.isArchiving.set(false);
        this.notificationService.error('Failed to restore task');
      }
    });
  }

  deleteTask() {
    if (!this.taskId) return;
    if (!confirm('Permanently delete this task and all its invoices? This cannot be undone.')) return;

    this.isDeleting.set(true);
    this.taskService.deleteTask(this.taskId).subscribe({
      next: () => {
        this.notificationService.success('Task deleted');
        this.router.navigate(['/tasks/invoices']);
      },
      error: () => {
        this.isDeleting.set(false);
        this.notificationService.error('Failed to delete task');
      }
    });
  }
}
