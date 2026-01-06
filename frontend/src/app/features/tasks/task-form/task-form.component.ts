import { Component, inject, signal, OnInit, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TaskService, CreateTaskDto, InvoiceTemplate } from '../../../core/services/task.service';
import { NotificationService } from '../../../core/services/notification.service';
import { GoogleService } from '../../../core/services/google.service';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastComponent } from '../../../shared/components/toast/toast.component';
import { TemplateSelectorComponent } from '../../../shared/components/template-selector/template-selector.component';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ToastComponent, TemplateSelectorComponent],
  template: `
    <app-toast />
    <div class="task-form-page">
      <div class="container">
        <header class="page-header">
          <a routerLink="/dashboard" class="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to Dashboard
          </a>
          <h1 class="page-title">{{ isEditing() ? 'Edit Task' : 'Create New Task' }}</h1>
          <p class="page-subtitle">{{ isEditing() ? 'Update your task details' : 'Set up a new invoice task' }}</p>
        </header>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-card">
          <section class="form-section">
            <h2 class="section-title">Basic Information</h2>

            <div class="form-group">
              <label for="name" class="form-label">Task Name *</label>
              <input
                type="text"
                id="name"
                formControlName="name"
                class="form-input"
                placeholder="e.g., Monthly Invoice for Acme Corp"
                [class.form-input--error]="form.get('name')?.touched && form.get('name')?.invalid"
              />
              @if (form.get('name')?.touched && form.get('name')?.errors?.['required']) {
                <span class="form-error">Task name is required</span>
              }
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="warningDate" class="form-label">Warning Day *</label>
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
                <span class="form-hint">Day of month to show warning</span>
              </div>

              <div class="form-group">
                <label for="deadlineDate" class="form-label">Deadline Day *</label>
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
                <span class="form-hint">Day of month for deadline</span>
              </div>
            </div>
          </section>

          <section class="form-section">
            <h2 class="section-title">Client Details</h2>

            <div class="form-group">
              <label for="clientName" class="form-label">Client Name</label>
              <input
                type="text"
                id="clientName"
                formControlName="clientName"
                class="form-input"
                placeholder="Acme Corporation"
              />
            </div>

            <div class="form-group">
              <label for="clientEmail" class="form-label">Client Email</label>
              <input
                type="email"
                id="clientEmail"
                formControlName="clientEmail"
                class="form-input"
                placeholder="billing@acme.com"
              />
            </div>

            <div class="form-group">
              <label for="clientAddress" class="form-label">Client Address</label>
              <textarea
                id="clientAddress"
                formControlName="clientAddress"
                class="form-input form-textarea"
                placeholder="123 Business St, Suite 100&#10;New York, NY 10001"
                rows="3"
              ></textarea>
            </div>
          </section>

          <section class="form-section">
            <h2 class="section-title">Invoice Details</h2>

            <div class="form-row">
              <div class="form-group">
                <label for="hourlyRate" class="form-label">Hourly Rate</label>
                <div class="input-prefix">
                  <span class="prefix">$</span>
                  <input
                    type="number"
                    id="hourlyRate"
                    formControlName="hourlyRate"
                    class="form-input"
                    placeholder="75.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="hoursWorked" class="form-label">Hours Worked</label>
                <input
                  type="number"
                  id="hoursWorked"
                  formControlName="hoursWorked"
                  class="form-input"
                  placeholder="40"
                  min="0"
                  step="0.5"
                />
              </div>
            </div>

            @if (estimatedTotal() !== null) {
              <div class="amount-preview">
                <span>Estimated Total:</span>
                <strong>\${{ estimatedTotal() }}</strong>
              </div>
            }

            <div class="form-group">
              <label for="description" class="form-label">Work Description</label>
              <textarea
                id="description"
                formControlName="description"
                class="form-input form-textarea"
                placeholder="Software development services for the month of..."
                rows="3"
              ></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="clientBankAccount" class="form-label">Client Bank Account</label>
                <input
                  type="text"
                  id="clientBankAccount"
                  formControlName="clientBankAccount"
                  class="form-input"
                  placeholder="009137014238"
                />
                <span class="form-hint">Client's bank account for invoice</span>
              </div>

              <div class="form-group">
                <label for="currency" class="form-label">Currency</label>
                <select
                  id="currency"
                  formControlName="currency"
                  class="form-input"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="PLN">PLN - Polish Zloty</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="defaultLanguage" class="form-label">Default Invoice Language</label>
                <select
                  id="defaultLanguage"
                  formControlName="defaultLanguage"
                  class="form-input"
                >
                  <option value="PL">Polski (PL/EN bilingual)</option>
                  <option value="EN">English</option>
                </select>
                <span class="form-hint">Language used for invoice text</span>
              </div>

              <div class="form-group form-group--full">
                <label class="form-label">Invoice Template</label>
                <app-template-selector
                  [value]="selectedTemplate()"
                  (valueChange)="onTemplateChange($event)"
                />
                <span class="form-hint">Choose a PDF template style for your invoices</span>
              </div>
            </div>
          </section>

          <!-- Email Template Section -->
          <section class="form-section email-template-section">
            <h2 class="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="section-icon-email">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Email Template
            </h2>

            <div class="toggle-row">
              <label class="toggle-switch">
                <input
                  type="checkbox"
                  formControlName="useCustomEmailTemplate"
                />
                <span class="toggle-slider"></span>
              </label>
              <div class="toggle-label">
                <span class="toggle-label-text">Use custom email template</span>
                <span class="toggle-label-hint">Define your own email format for invoice drafts</span>
              </div>
            </div>

            <!-- AI Generation Section -->
            <div class="ai-generation-section">
              <div class="ai-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                  <circle cx="7.5" cy="14.5" r="1.5"/>
                  <circle cx="16.5" cy="14.5" r="1.5"/>
                </svg>
                <span>Generate with AI</span>
              </div>
              <p class="ai-hint">Describe what kind of email you want and AI will generate a template for you</p>
              <textarea
                class="form-input ai-prompt-input"
                [value]="aiPrompt()"
                (input)="updateAiPrompt($event)"
                placeholder="e.g., Write a formal invoice email in English mentioning my working hours, hourly rate, and payment details. Include a polite greeting and professional closing."
                rows="3"
              ></textarea>
              <button
                type="button"
                class="btn btn--ai"
                [disabled]="isGeneratingTemplate() || !aiPrompt()"
                (click)="generateWithAI()"
              >
                @if (isGeneratingTemplate()) {
                  <span class="btn__spinner"></span>
                  Generating...
                } @else {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                  Generate Template
                }
              </button>
            </div>

            @if (form.get('useCustomEmailTemplate')?.value) {
              <div class="template-editor">
                <!-- Placeholder Pills -->
                <div class="placeholder-section">
                  <label class="form-label placeholder-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                    Available Placeholders
                  </label>
                  <div class="placeholder-chips">
                    @for (placeholder of placeholders; track placeholder.key) {
                      <button
                        type="button"
                        class="placeholder-chip"
                        [title]="placeholder.description"
                        (click)="insertPlaceholder(placeholder.key)"
                      >
                        <span class="chip-syntax">{{"{{"}}</span>{{ placeholder.key }}<span class="chip-syntax">{{"}}"}}</span>
                      </button>
                    }
                  </div>
                </div>

                <!-- Subject Input -->
                <div class="form-group">
                  <label for="emailSubjectTemplate" class="form-label">Email Subject</label>
                  <input
                    #subjectInput
                    type="text"
                    id="emailSubjectTemplate"
                    formControlName="emailSubjectTemplate"
                    class="form-input template-input"
                    [attr.placeholder]="subjectPlaceholder"
                    (focus)="setActiveField('subject')"
                  />
                </div>

                <!-- Body Textarea -->
                <div class="form-group">
                  <label for="emailBodyTemplate" class="form-label">Email Body</label>
                  <textarea
                    #bodyInput
                    id="emailBodyTemplate"
                    formControlName="emailBodyTemplate"
                    class="form-input form-textarea template-input template-body"
                    [attr.placeholder]="bodyPlaceholder"
                    rows="12"
                    (focus)="setActiveField('body')"
                  ></textarea>
                </div>

                <!-- Live Preview -->
                <div class="preview-section">
                  <div class="preview-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <span>Live Preview</span>
                    <span class="preview-badge">Sample Data</span>
                  </div>
                  <div class="preview-content">
                    <div class="preview-subject">
                      <span class="preview-label">Subject:</span>
                      <span class="preview-text">{{ previewSubject() }}</span>
                    </div>
                    <div class="preview-body">
                      <span class="preview-label">Body:</span>
                      <pre class="preview-text">{{ previewBody() }}</pre>
                    </div>
                  </div>
                </div>
              </div>
            }
          </section>

          <section class="form-section">
            <h2 class="section-title">
              <svg viewBox="0 0 24 24" fill="currentColor" class="section-icon-google">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Gmail Integration
            </h2>

            <div class="form-group">
              <label for="googleAccountId" class="form-label">Gmail Account for Drafts</label>
              @if (isLoadingAccounts()) {
                <div class="skeleton-select"></div>
                <span class="form-hint">Loading accounts...</span>
              } @else if (googleAccounts().length > 0) {
                <select
                  id="googleAccountId"
                  formControlName="googleAccountId"
                  class="form-input"
                >
                  <option value="">None - Don't create drafts automatically</option>
                  @for (account of googleAccounts(); track account.id) {
                    <option [value]="account.id">{{ account.email }}</option>
                  }
                </select>
                <span class="form-hint">Select which Gmail account to use when creating invoice email drafts</span>
              } @else {
                <div class="no-accounts-message">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <div>
                    <p>No Google accounts connected</p>
                    <a routerLink="/profile" class="link-primary">Connect a Google account in your profile settings</a>
                  </div>
                </div>
              }
            </div>
          </section>

          <div class="form-actions">
            <a routerLink="/dashboard" class="btn btn--secondary">Cancel</a>
            <button
              type="submit"
              class="btn btn--primary"
              [disabled]="isLoading() || form.invalid"
            >
              @if (isLoading()) {
                <span class="btn__spinner"></span>
                {{ isEditing() ? 'Saving...' : 'Creating...' }}
              } @else {
                {{ isEditing() ? 'Save Changes' : 'Create Task' }}
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .task-form-page {
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

    .page-title {
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-xs);
    }

    .page-subtitle {
      color: var(--color-text-secondary);
      font-size: 1rem;
    }

    .form-card {
      background: var(--color-surface);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-card);
      border: 1px solid var(--color-border);
      overflow: hidden;
    }

    .form-section {
      padding: var(--space-xl);
      border-bottom: 1px solid var(--color-border-subtle);

      &:last-of-type {
        border-bottom: none;
      }
    }

    .section-title {
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-lg);
      padding-bottom: var(--space-md);
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .form-group {
      margin-bottom: var(--space-lg);

      &:last-child {
        margin-bottom: 0;
      }
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-lg);

      @media (max-width: 500px) {
        grid-template-columns: 1fr;
      }
    }

    .form-group--full {
      grid-column: 1 / -1;
      margin-top: var(--space-md);
    }

    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
      margin-bottom: var(--space-sm);
    }

    .form-input {
      width: 100%;
      padding: var(--space-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

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

      &--error {
        border-color: var(--color-danger);

        &:focus {
          box-shadow: 0 0 0 3px var(--color-danger-subtle);
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

    .form-error {
      display: block;
      font-size: 0.8125rem;
      color: var(--color-danger);
      margin-top: var(--space-xs);
    }

    .input-prefix {
      position: relative;

      .prefix {
        position: absolute;
        left: var(--space-md);
        top: 50%;
        transform: translateY(-50%);
        color: var(--color-text-muted);
        font-weight: 500;
      }

      .form-input {
        padding-left: 32px;
      }
    }

    .amount-preview {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      padding: var(--space-md);
      background: var(--color-primary-subtle);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-lg);

      span {
        color: var(--color-text-secondary);
      }

      strong {
        font-family: var(--font-display);
        font-size: 1.25rem;
        color: var(--color-primary);
      }
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-md);
      padding: var(--space-lg) var(--space-xl);
      background: var(--color-bg-subtle);
      border-top: 1px solid var(--color-border-subtle);
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

      &--primary {
        background: var(--color-primary);
        color: white;

        &:hover:not(:disabled) {
          background: var(--color-primary-hover);
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

    .section-icon-google {
      width: 20px;
      height: 20px;
      margin-right: var(--space-sm);
      vertical-align: middle;
    }

    .no-accounts-message {
      display: flex;
      align-items: flex-start;
      gap: var(--space-md);
      padding: var(--space-md);
      background: var(--color-bg-subtle);
      border-radius: var(--radius-md);
      border: 1px dashed var(--color-border);

      svg {
        width: 20px;
        height: 20px;
        color: var(--color-text-muted);
        flex-shrink: 0;
        margin-top: 2px;
      }

      p {
        font-size: 0.9375rem;
        color: var(--color-text);
        margin-bottom: var(--space-xs);
      }
    }

    .link-primary {
      font-size: 0.875rem;
      color: var(--color-primary);

      &:hover {
        text-decoration: underline;
      }
    }

    /* Email Template Section Styles */
    .section-icon-email {
      width: 20px;
      height: 20px;
      margin-right: var(--space-sm);
      vertical-align: middle;
      color: var(--color-primary);
    }

    .toggle-row {
      display: flex;
      align-items: flex-start;
      gap: var(--space-md);
      padding: var(--space-md);
      background: var(--color-bg-subtle);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-subtle);
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 48px;
      height: 26px;
      flex-shrink: 0;

      input {
        opacity: 0;
        width: 0;
        height: 0;

        &:checked + .toggle-slider {
          background: var(--color-primary);
        }

        &:checked + .toggle-slider:before {
          transform: translateX(22px);
        }

        &:focus + .toggle-slider {
          box-shadow: 0 0 0 3px var(--color-primary-subtle);
        }
      }
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background: var(--color-border);
      border-radius: 26px;
      transition: background var(--transition-fast);

      &:before {
        content: '';
        position: absolute;
        height: 20px;
        width: 20px;
        left: 3px;
        bottom: 3px;
        background: white;
        border-radius: 50%;
        transition: transform var(--transition-fast);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }
    }

    .toggle-label {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .toggle-label-text {
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--color-text);
    }

    .toggle-label-hint {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .template-editor {
      margin-top: var(--space-lg);
      animation: fadeSlideIn 0.3s ease-out;
    }

    @keyframes fadeSlideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .placeholder-section {
      margin-bottom: var(--space-lg);
      padding: var(--space-md);
      background: linear-gradient(135deg, var(--color-primary-subtle) 0%, transparent 100%);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-primary-subtle);
    }

    .placeholder-label {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      margin-bottom: var(--space-md);
      color: var(--color-primary);
      font-weight: 600;

      svg {
        width: 16px;
        height: 16px;
      }
    }

    .placeholder-chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
    }

    .placeholder-chip {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      font-size: 0.75rem;
      font-family: 'SF Mono', 'Fira Code', monospace;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      color: var(--color-text);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-primary);
        color: white;
        border-color: var(--color-primary);
        transform: translateY(-1px);

        .chip-syntax {
          color: rgba(255, 255, 255, 0.7);
        }
      }

      &:active {
        transform: translateY(0);
      }
    }

    .chip-syntax {
      color: var(--color-text-muted);
      font-weight: 600;
    }

    .template-input {
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 0.875rem;
    }

    .template-body {
      min-height: 200px;
      line-height: 1.6;
    }

    .preview-section {
      margin-top: var(--space-lg);
      border-radius: var(--radius-md);
      overflow: hidden;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
    }

    .preview-header {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-md);
      background: var(--color-bg-subtle);
      border-bottom: 1px solid var(--color-border-subtle);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-secondary);

      svg {
        width: 16px;
        height: 16px;
        color: var(--color-primary);
      }
    }

    .preview-badge {
      margin-left: auto;
      padding: 2px 8px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: var(--color-warning-subtle);
      color: var(--color-warning);
      border-radius: var(--radius-sm);
    }

    .preview-content {
      padding: var(--space-md);
    }

    .preview-subject {
      display: flex;
      gap: var(--space-md);
      padding-bottom: var(--space-md);
      border-bottom: 1px dashed var(--color-border-subtle);
      margin-bottom: var(--space-md);
    }

    .preview-body {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .preview-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    .preview-text {
      font-size: 0.875rem;
      color: var(--color-text);
      white-space: pre-wrap;
      word-break: break-word;
      margin: 0;
      font-family: inherit;
      line-height: 1.5;
    }

    .preview-body .preview-text {
      padding: var(--space-md);
      background: var(--color-bg-subtle);
      border-radius: var(--radius-sm);
      max-height: 300px;
      overflow-y: auto;
    }

    /* AI Generation Section Styles */
    .ai-generation-section {
      margin-top: var(--space-lg);
      padding: var(--space-lg);
      background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
      border-radius: var(--radius-md);
      border: 1px solid #667eea30;
    }

    .ai-header {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: 0.9375rem;
      font-weight: 600;
      color: #667eea;
      margin-bottom: var(--space-sm);

      svg {
        width: 20px;
        height: 20px;
      }
    }

    .ai-hint {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      margin-bottom: var(--space-md);
    }

    .ai-prompt-input {
      margin-bottom: var(--space-md);
      min-height: 80px;
      resize: vertical;
    }

    .btn--ai {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-lg);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    /* Skeleton loader styles */
    .skeleton-select {
      height: 44px;
      background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border-subtle) 50%, var(--color-bg-subtle) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `]
})
export class TaskFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private taskService = inject(TaskService);
  private notificationService = inject(NotificationService);
  private googleService = inject(GoogleService);
  private chatService = inject(ChatService);
  private authService = inject(AuthService);

  @ViewChild('subjectInput') subjectInput!: ElementRef<HTMLInputElement>;
  @ViewChild('bodyInput') bodyInput!: ElementRef<HTMLTextAreaElement>;

  isLoading = signal(false);
  isEditing = signal(false);
  isLoadingTask = signal(false);
  isLoadingAccounts = signal(true);
  taskId: string | null = null;
  googleAccounts = this.googleService.accounts;
  selectedTemplate = signal<InvoiceTemplate>('STANDARD');
  activeField = signal<'subject' | 'body'>('subject');
  isGeneratingTemplate = signal(false);
  aiPrompt = signal('');

  // Placeholder definitions
  placeholders = [
    { key: 'clientName', description: 'Client/company name' },
    { key: 'invoiceNumber', description: 'Invoice number (e.g., INV-202512-ABC)' },
    { key: 'invoiceAmount', description: 'Formatted amount with currency' },
    { key: 'invoicePeriod', description: 'Month and year (e.g., December 2025)' },
    { key: 'taskName', description: 'Task name' },
    { key: 'description', description: 'Work description' },
    { key: 'sellerName', description: 'Your name (sender)' },
    { key: 'bankName', description: 'Bank name' },
    { key: 'bankIban', description: 'IBAN' },
    { key: 'bankSwift', description: 'SWIFT code' },
    { key: 'currency', description: 'Currency code' },
    { key: 'hoursWorked', description: 'Hours worked' },
    { key: 'hourlyRate', description: 'Hourly rate' }
  ];

  // Placeholder text for templates (using properties to avoid Angular interpolation issues)
  subjectPlaceholder = 'Invoice #{{invoiceNumber}} - {{taskName}} ({{invoicePeriod}})';

  bodyPlaceholder = `Dear {{clientName}},

Please find attached invoice #{{invoiceNumber}} for {{description}} for {{invoicePeriod}}.

Invoice Details:
- Amount: {{invoiceAmount}}
- Hours: {{hoursWorked}}h @ {{hourlyRate}}/hr

Payment Details:
Bank: {{bankName}}
IBAN: {{bankIban}}
SWIFT: {{bankSwift}}

Best regards,
{{sellerName}}`;

  // Get preview data from form and user profile
  private getPreviewData(): Record<string, string> {
    const f = this.form.getRawValue();
    const user = this.authService.user();
    const currency = f.currency || 'USD';
    const hours = f.hoursWorked || 160;
    const rate = f.hourlyRate || 50;
    const amount = hours * rate;

    return {
      clientName: f.clientName || 'Client Name',
      invoiceNumber: 'INV-202501-ABC123',
      invoiceAmount: `${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}`,
      invoicePeriod: 'January 2025',
      taskName: f.name || 'Task Name',
      description: f.description || 'Professional services',
      sellerName: user?.name || 'Your Name',
      bankName: user?.bankName || 'Your Bank',
      bankIban: user?.bankIban || 'XX00 0000 0000 0000 0000 0000',
      bankSwift: user?.bankSwift || 'XXXXXXXX',
      currency: currency,
      hoursWorked: String(hours),
      hourlyRate: String(rate)
    };
  }

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    warningDate: [1, [Validators.required, Validators.min(1), Validators.max(31)]],
    deadlineDate: [5, [Validators.required, Validators.min(1), Validators.max(31)]],
    clientName: [''],
    clientEmail: [''],
    clientAddress: [''],
    hourlyRate: [null as number | null],
    hoursWorked: [null as number | null],
    description: [''],
    clientBankAccount: [''],
    currency: ['USD'],
    defaultLanguage: ['PL'],
    invoiceTemplate: ['STANDARD'],
    googleAccountId: [''],  // Use empty string instead of null for reliable select binding
    useCustomEmailTemplate: [false],
    emailSubjectTemplate: [''],
    emailBodyTemplate: ['']
  });

  // Preview signals - updated when form changes
  previewSubject = signal('(No template defined)');
  previewBody = signal('(No template defined)');

  private processTemplate(template: string): string {
    if (!template) return '(No template defined)';
    let result = template;
    const previewData = this.getPreviewData();
    for (const [key, value] of Object.entries(previewData)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
  }

  private updatePreview(): void {
    const subject = this.form.get('emailSubjectTemplate')?.value || '';
    const body = this.form.get('emailBodyTemplate')?.value || '';
    this.previewSubject.set(this.processTemplate(subject));
    this.previewBody.set(this.processTemplate(body));
  }

  setActiveField(field: 'subject' | 'body'): void {
    this.activeField.set(field);
  }

  insertPlaceholder(key: string): void {
    const placeholder = `{{${key}}}`;
    const field = this.activeField();

    if (field === 'subject' && this.subjectInput) {
      const input = this.subjectInput.nativeElement;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const currentValue = this.form.get('emailSubjectTemplate')?.value || '';
      const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
      this.form.patchValue({ emailSubjectTemplate: newValue });
      // Restore cursor position after the inserted placeholder
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + placeholder.length, start + placeholder.length);
      });
    } else if (field === 'body' && this.bodyInput) {
      const textarea = this.bodyInput.nativeElement;
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const currentValue = this.form.get('emailBodyTemplate')?.value || '';
      const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
      this.form.patchValue({ emailBodyTemplate: newValue });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      });
    }
  }

  updateAiPrompt(event: Event): void {
    const input = event.target as HTMLTextAreaElement;
    this.aiPrompt.set(input.value);
  }

  generateWithAI(): void {
    const prompt = this.aiPrompt();
    if (!prompt.trim()) {
      this.notificationService.error('Please enter a prompt for the AI');
      return;
    }

    this.isGeneratingTemplate.set(true);
    this.chatService.generateEmailTemplate(prompt).subscribe({
      next: (result) => {
        if (result.success) {
          // Set all values at once, including enabling custom template
          this.form.patchValue({
            useCustomEmailTemplate: true,
            emailSubjectTemplate: result.subject,
            emailBodyTemplate: result.body
          });
          this.updatePreview();
          this.notificationService.success('Template generated successfully!');
          this.aiPrompt.set('');
        }
        this.isGeneratingTemplate.set(false);
      },
      error: (err) => {
        this.notificationService.error(err.error?.error || 'Failed to generate template');
        this.isGeneratingTemplate.set(false);
      }
    });
  }

  estimatedTotal(): string | null {
    const rate = this.form.get('hourlyRate')?.value;
    const hours = this.form.get('hoursWorked')?.value;
    if (rate && hours) {
      return (rate * hours).toFixed(2);
    }
    return null;
  }

  onTemplateChange(template: InvoiceTemplate): void {
    this.selectedTemplate.set(template);
    this.form.patchValue({ invoiceTemplate: template });
  }

  ngOnInit() {
    this.taskId = this.route.snapshot.paramMap.get('id');

    // Subscribe to form changes to update preview
    this.form.valueChanges.subscribe(() => {
      this.updatePreview();
    });

    // Set editing state early so UI shows correct state
    if (this.taskId) {
      this.isEditing.set(true);
      this.isLoadingTask.set(true);
    }

    // Fetch Google accounts first, then load task after Angular updates the view
    this.googleService.getAccounts().subscribe({
      next: (accounts) => {
        this.googleService.accounts.set(accounts);
        this.isLoadingAccounts.set(false);

        if (this.taskId) {
          // Wait for Angular to render the select options before loading task
          setTimeout(() => this.loadTask(), 50);
        }
      },
      error: () => {
        this.isLoadingAccounts.set(false);
        // Even if accounts fail to load, still load the task
        if (this.taskId) {
          this.loadTask();
        }
      }
    });

    // Update preview on init
    this.updatePreview();
  }

  loadTask() {
    if (!this.taskId) return;

    this.taskService.getTask(this.taskId).subscribe({
      next: (task) => {
        const template = (task.invoiceTemplate || 'STANDARD') as InvoiceTemplate;
        this.selectedTemplate.set(template);

        // Patch all form values including googleAccountId
        this.form.patchValue({
          name: task.name,
          warningDate: task.warningDate,
          deadlineDate: task.deadlineDate,
          clientName: task.clientName || '',
          clientEmail: task.clientEmail || '',
          clientAddress: task.clientAddress || '',
          hourlyRate: task.hourlyRate || null,
          hoursWorked: task.hoursWorked || null,
          description: task.description || '',
          clientBankAccount: task.clientBankAccount || '',
          currency: task.currency || 'USD',
          defaultLanguage: task.defaultLanguage || 'PL',
          invoiceTemplate: template,
          googleAccountId: task.googleAccountId || '',  // Use empty string for "None"
          useCustomEmailTemplate: task.useCustomEmailTemplate || false,
          emailSubjectTemplate: task.emailSubjectTemplate || '',
          emailBodyTemplate: task.emailBodyTemplate || ''
        });

        // Update preview after loading task with templates
        this.updatePreview();
        this.isLoadingTask.set(false);
      },
      error: () => {
        this.isLoadingTask.set(false);
        this.notificationService.error('Failed to load task');
        this.router.navigate(['/dashboard']);
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    const formValue = this.form.getRawValue();

    const taskData: CreateTaskDto = {
      name: formValue.name,
      warningDate: formValue.warningDate,
      deadlineDate: formValue.deadlineDate,
      clientName: formValue.clientName || undefined,
      clientEmail: formValue.clientEmail || undefined,
      clientAddress: formValue.clientAddress || undefined,
      hourlyRate: formValue.hourlyRate || undefined,
      hoursWorked: formValue.hoursWorked || undefined,
      description: formValue.description || undefined,
      clientBankAccount: formValue.clientBankAccount || undefined,
      currency: formValue.currency || undefined,
      defaultLanguage: formValue.defaultLanguage || undefined,
      invoiceTemplate: formValue.invoiceTemplate as any || undefined,
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
          this.isEditing() ? 'Task updated successfully!' : 'Task created successfully!'
        );
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.isLoading.set(false);
        this.notificationService.error(
          this.isEditing() ? 'Failed to update task' : 'Failed to create task'
        );
      }
    });
  }
}
