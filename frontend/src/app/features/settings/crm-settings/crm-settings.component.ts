import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CRMIntegrationService, CRMIntegration, ParsedCurlField, PlaceholderInfo } from '../../../core/services/crm-integration.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-crm-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="crm-settings">
      <!-- Page Header -->
      <div class="page-header">
        <div class="page-header__content">
          <h1 class="page-title">CRM Integrations</h1>
          <p class="page-description">Connect external CRM systems to automatically sync invoices</p>
        </div>
        <button class="btn btn--primary" (click)="openAddModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Integration
        </button>
      </div>

      <!-- Content -->
      <div class="crm-content">
        @if (isLoading()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <span>Loading integrations...</span>
          </div>
        } @else if (integrations().length === 0) {
          <div class="empty-state">
            <div class="empty-state__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h3 class="empty-state__title">No CRM integrations yet</h3>
            <p class="empty-state__description">
              Add your first CRM integration to automatically sync invoices to your accounting system.
            </p>
            <button class="btn btn--primary btn--lg" (click)="openAddModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Your First Integration
            </button>
          </div>
        } @else {
          <div class="integrations-grid">
            @for (integration of integrations(); track integration.id; let i = $index) {
              <div
                class="integration-card"
                [class.integration-card--inactive]="!integration.isActive"
                [style.animation-delay]="(i * 80) + 'ms'"
              >
                <div class="integration-card__header">
                  <div class="integration-card__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5"/>
                      <path d="M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  <div class="integration-card__status" [class.integration-card__status--active]="integration.isActive">
                    <span class="status-dot"></span>
                    {{ integration.isActive ? 'Active' : 'Inactive' }}
                  </div>
                </div>

                <div class="integration-card__body">
                  <h3 class="integration-card__name">{{ integration.name }}</h3>
                  <div class="integration-card__urls">
                    <div class="url-row">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                        <polyline points="10 17 15 12 10 7"/>
                        <line x1="15" y1="12" x2="3" y2="12"/>
                      </svg>
                      <span class="url-text" [title]="integration.loginUrl">{{ truncateUrl(integration.loginUrl) }}</span>
                    </div>
                    <div class="url-row">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="12" y1="18" x2="12" y2="12"/>
                        <line x1="9" y1="15" x2="15" y2="15"/>
                      </svg>
                      <span class="url-text" [title]="integration.createInvoiceUrl">{{ truncateUrl(integration.createInvoiceUrl) }}</span>
                    </div>
                  </div>
                </div>

                <div class="integration-card__actions">
                  <button
                    class="card-action card-action--test"
                    (click)="testConnection(integration)"
                    [disabled]="testingId() === integration.id"
                    title="Test Connection"
                  >
                    @if (testingId() === integration.id) {
                      <span class="btn-spinner btn-spinner--small"></span>
                    } @else {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    }
                  </button>
                  <button
                    class="card-action card-action--toggle"
                    (click)="toggleActive(integration)"
                    [title]="integration.isActive ? 'Deactivate' : 'Activate'"
                  >
                    @if (integration.isActive) {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
                        <line x1="12" y1="2" x2="12" y2="12"/>
                      </svg>
                    } @else {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polygon points="10 8 16 12 10 16 10 8"/>
                      </svg>
                    }
                  </button>
                  <button
                    class="card-action card-action--edit"
                    (click)="openEditModal(integration)"
                    title="Edit"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    class="card-action card-action--delete"
                    (click)="confirmDelete(integration)"
                    title="Delete"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>

                <!-- Test Result Toast -->
                @if (testResult() && testResultId() === integration.id) {
                  <div class="test-toast" [class.test-toast--success]="testResult()!.success" [class.test-toast--error]="!testResult()!.success">
                    @if (testResult()!.success) {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    } @else {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                    }
                    {{ testResult()!.message }}
                  </div>
                }
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
              <h2 class="modal__title">{{ editingIntegration() ? 'Edit Integration' : 'Add Integration' }}</h2>
              <button class="modal__close" (click)="closeModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="saveIntegration()" class="modal__body">
              <!-- Basic Info -->
              <section class="form-section">
                <h3 class="form-section__title">Basic Information</h3>
                <div class="form-group">
                  <label class="form-label">Integration Name *</label>
                  <input
                    type="text"
                    formControlName="name"
                    class="form-input"
                    placeholder="e.g., MCGroup CRM"
                  />
                </div>
                <div class="form-group form-group--checkbox">
                  <label class="checkbox-label">
                    <input type="checkbox" formControlName="isActive" class="checkbox-input" />
                    <span class="checkbox-custom"></span>
                    Integration is active
                  </label>
                </div>
              </section>

              <!-- Login Configuration -->
              <section class="form-section">
                <h3 class="form-section__title">Login Configuration</h3>
                <div class="form-group">
                  <label class="form-label">Login URL *</label>
                  <input
                    type="text"
                    formControlName="loginUrl"
                    class="form-input"
                    placeholder="https://crm.example.com/login"
                  />
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Email *</label>
                    <input
                      type="email"
                      formControlName="email"
                      class="form-input"
                      placeholder="CRM login email"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Password {{ editingIntegration() ? '' : '*' }}</label>
                    <input
                      type="password"
                      formControlName="password"
                      class="form-input"
                      [placeholder]="editingIntegration() ? 'Leave empty to keep current' : 'CRM password'"
                    />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">CSRF Selector</label>
                    <input
                      type="text"
                      formControlName="csrfSelector"
                      class="form-input"
                      placeholder="meta[name='csrf-token']"
                    />
                    <span class="form-hint">CSS selector to extract CSRF token</span>
                  </div>
                  <div class="form-group">
                    <label class="form-label">CSRF Header</label>
                    <input
                      type="text"
                      formControlName="csrfHeader"
                      class="form-input"
                      placeholder="X-XSRF-TOKEN"
                    />
                    <span class="form-hint">Header name for CSRF token</span>
                  </div>
                </div>
              </section>

              <!-- cURL Parser -->
              <section class="form-section">
                <h3 class="form-section__title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="4 17 10 11 4 5"/>
                    <line x1="12" y1="19" x2="20" y2="19"/>
                  </svg>
                  Quick Setup from cURL
                </h3>
                <p class="form-section__hint">Paste a cURL command from your CRM's invoice creation request</p>
                <div class="form-group">
                  <textarea
                    formControlName="curlCommand"
                    class="form-input form-textarea form-textarea--code"
                    placeholder="curl 'https://crm.example.com/api/invoices' -X POST -H 'Content-Type: application/json' ..."
                    rows="4"
                  ></textarea>
                </div>
                <button
                  type="button"
                  class="btn btn--secondary"
                  (click)="parseCurl()"
                  [disabled]="isParsing()"
                >
                  @if (isParsing()) {
                    <span class="btn-spinner"></span>
                    Parsing...
                  } @else {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="4 17 10 11 4 5"/>
                      <line x1="12" y1="19" x2="20" y2="19"/>
                    </svg>
                    Parse cURL
                  }
                </button>
              </section>

              <!-- Invoice Creation -->
              <section class="form-section">
                <h3 class="form-section__title">Invoice Creation</h3>
                <div class="form-group">
                  <label class="form-label">Create Invoice URL *</label>
                  <input
                    type="text"
                    formControlName="createInvoiceUrl"
                    class="form-input"
                    placeholder="https://crm.example.com/api/invoices"
                  />
                </div>
              </section>

              <!-- Invoice List & PDF Download -->
              <section class="form-section">
                <h3 class="form-section__title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                  Invoice List & PDF Download
                </h3>
                <p class="form-section__hint">Configure to download invoice PDFs from CRM after creation</p>
                <div class="form-group">
                  <label class="form-label">List Invoices URL</label>
                  <input
                    type="text"
                    formControlName="listInvoicesUrl"
                    class="form-input"
                    placeholder="https://crm.example.com/show-faktury-client"
                  />
                  <span class="form-hint">DataTables API endpoint that returns invoice list with PDF links</span>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Invoice Number Prefix</label>
                    <input
                      type="text"
                      formControlName="invoiceNumberPrefix"
                      class="form-input"
                      placeholder="FS/"
                    />
                    <span class="form-hint">Prefix CRM adds to invoice numbers</span>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Invoice Number Suffix</label>
                    <input
                      type="text"
                      formControlName="invoiceNumberSuffix"
                      class="form-input"
                      placeholder="/MCG"
                    />
                    <span class="form-hint">Suffix CRM adds to invoice numbers</span>
                  </div>
                </div>
              </section>

              <!-- Parsed Fields -->
              @if (parsedFields().length > 0) {
                <section class="form-section">
                  <h3 class="form-section__title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                      <line x1="12" y1="22.08" x2="12" y2="12"/>
                    </svg>
                    Parsed Fields
                  </h3>
                  <p class="form-section__hint">Map CRM fields to invoice data using placeholders</p>
                  <div class="parsed-fields-table">
                    <div class="parsed-fields-header">
                      <span>Field Name</span>
                      <span>Value</span>
                      <span>Placeholder</span>
                    </div>
                    @for (field of parsedFields(); track field.name) {
                      <div class="parsed-field-row">
                        <span class="parsed-field-name">{{ field.name }}</span>
                        <span class="parsed-field-value" [title]="field.value">{{ truncateValue(field.value) }}</span>
                        <select
                          class="form-input form-input--small"
                          (change)="updateFieldPlaceholder(field.name, $any($event.target).value)"
                        >
                          <option value="" [selected]="!getFieldPlaceholder(field.name)">Static value</option>
                          @for (ph of getPlaceholderKeys(); track ph) {
                            <option [value]="ph" [selected]="getFieldPlaceholder(field.name) === ph">{{ formatPlaceholderLabel(ph) }}</option>
                          }
                        </select>
                      </div>
                    }
                  </div>
                </section>
              }

              <!-- Field Mapping JSON -->
              <section class="form-section">
                <h3 class="form-section__title">Field Mapping (JSON)</h3>
                <p class="form-section__hint">Advanced: Edit field mapping directly</p>
                <div class="form-group">
                  <textarea
                    formControlName="fieldMapping"
                    class="form-input form-textarea form-textarea--code"
                    rows="6"
                    placeholder='e.g. {"company": "user.name", "nip": "user.nip"}'
                  ></textarea>
                </div>
              </section>

              <!-- Static Fields -->
              <section class="form-section">
                <h3 class="form-section__title">Static Fields (JSON)</h3>
                <p class="form-section__hint">Fields with constant values for every invoice</p>
                <div class="form-group">
                  <textarea
                    formControlName="staticFields"
                    class="form-input form-textarea form-textarea--code"
                    rows="4"
                    placeholder='{"currency": "PLN"}'
                  ></textarea>
                </div>
              </section>

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
                    {{ editingIntegration() ? 'Update' : 'Add' }} Integration
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
              <h2 class="modal__title">Delete Integration</h2>
            </div>
            <div class="modal__body">
              <p class="delete-text">
                Are you sure you want to delete <strong>{{ deletingIntegration()?.name }}</strong>?
              </p>
              <p class="delete-hint">This will remove the integration. Tasks using it will need to be updated.</p>
            </div>
            <div class="modal__actions">
              <button type="button" class="btn btn--ghost" (click)="cancelDelete()">Cancel</button>
              <button
                type="button"
                class="btn btn--danger"
                (click)="deleteIntegration()"
                [disabled]="isDeleting()"
              >
                @if (isDeleting()) {
                  <span class="btn-spinner btn-spinner--white"></span>
                  Deleting...
                } @else {
                  Delete Integration
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

    .crm-settings {
      max-width: 1000px;
      margin: 0 auto;
    }

    /* Page Header */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 32px;
      animation: fadeSlideDown 0.4s ease-out;
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

      svg {
        width: 18px;
        height: 18px;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .btn--primary {
      background: linear-gradient(135deg, var(--color-primary) 0%, #d06830 100%);
      color: white;
      box-shadow: 0 4px 14px var(--color-primary-glow);

      &:hover:not(:disabled) {
        background: linear-gradient(135deg, var(--color-primary-hover) 0%, #e07a40 100%);
        transform: translateY(-1px);
        box-shadow: 0 6px 20px var(--color-primary-glow);
      }
    }

    .btn--secondary {
      background: var(--color-surface-elevated);
      color: var(--color-text);
      border: 1px solid var(--color-border);

      &:hover:not(:disabled) {
        background: var(--color-border);
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

      &:hover:not(:disabled) {
        background: #dc2626;
      }
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

      &--small {
        width: 14px;
        height: 14px;
      }

      &--white {
        border-color: rgba(255, 255, 255, 0.3);
        border-top-color: white;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Loading State */
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

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 80px 40px;
      background: var(--color-surface);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-xl);
      animation: fadeIn 0.5s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .empty-state__icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      background: linear-gradient(135deg, var(--color-primary-subtle) 0%, transparent 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        width: 40px;
        height: 40px;
        color: var(--color-primary);
      }
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
      line-height: 1.6;
    }

    /* Integrations Grid */
    .integrations-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    .integration-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-lg);
      padding: 24px;
      position: relative;
      transition: all var(--transition-base);
      animation: cardSlideIn 0.4s ease-out both;

      &:hover {
        border-color: var(--color-border);
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
      }

      &--inactive {
        opacity: 0.6;
      }
    }

    @keyframes cardSlideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .integration-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .integration-card__icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, var(--color-primary) 0%, #d06830 100%);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px var(--color-primary-glow);

      svg {
        width: 24px;
        height: 24px;
        color: white;
      }
    }

    .integration-card__status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
      padding: 4px 10px;
      background: var(--color-surface-elevated);
      border-radius: var(--radius-sm);

      &--active {
        color: var(--color-success);
        background: var(--color-success-subtle);

        .status-dot {
          background: var(--color-success);
        }
      }
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-text-muted);
    }

    .integration-card__body {
      margin-bottom: 20px;
    }

    .integration-card__name {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0 0 12px;
    }

    .integration-card__urls {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .url-row {
      display: flex;
      align-items: center;
      gap: 8px;

      svg {
        width: 14px;
        height: 14px;
        color: var(--color-text-muted);
        flex-shrink: 0;
      }
    }

    .url-text {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--color-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .integration-card__actions {
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

      svg {
        width: 16px;
        height: 16px;
        color: var(--color-text-muted);
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

      &--test:hover:not(:disabled) {
        border-color: var(--color-success);
        background: var(--color-success-subtle);

        svg {
          color: var(--color-success);
        }
      }

      &--toggle:hover:not(:disabled) {
        border-color: var(--color-primary);
        background: var(--color-primary-subtle);

        svg {
          color: var(--color-primary);
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
        border-color: var(--color-danger);
        background: var(--color-danger-subtle);

        svg {
          color: var(--color-danger);
        }
      }
    }

    .test-toast {
      position: absolute;
      bottom: 16px;
      left: 16px;
      right: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      font-weight: 500;
      animation: toastSlide 0.3s ease-out;

      svg {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }

      &--success {
        background: var(--color-success-subtle);
        color: var(--color-success);
        border: 1px solid rgba(16, 185, 129, 0.3);
      }

      &--error {
        background: var(--color-danger-subtle);
        color: var(--color-danger);
        border: 1px solid rgba(239, 68, 68, 0.3);
      }
    }

    @keyframes toastSlide {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
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

    @keyframes overlayFade {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      width: 100%;
      max-width: 640px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      animation: modalSlide 0.3s ease-out;
    }

    .modal--small {
      max-width: 440px;
    }

    @keyframes modalSlide {
      from {
        opacity: 0;
        transform: translateY(-20px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
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

          svg {
            width: 28px;
            height: 28px;
            color: var(--color-danger);
          }
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

      svg {
        width: 20px;
        height: 20px;
        color: var(--color-text-muted);
      }

      &:hover {
        background: var(--color-surface-elevated);

        svg {
          color: var(--color-text);
        }
      }
    }

    .modal__body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;

      &::-webkit-scrollbar {
        width: 6px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      &::-webkit-scrollbar-thumb {
        background: var(--color-border);
        border-radius: 3px;
      }
    }

    .modal__actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 24px;
      border-top: 1px solid var(--color-border-subtle);
    }

    /* Form Styles */
    .form-section {
      margin-bottom: 28px;
      padding-bottom: 28px;
      border-bottom: 1px solid var(--color-border-subtle);

      &:last-of-type {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
      }
    }

    .form-section__title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0 0 16px;

      svg {
        width: 18px;
        height: 18px;
        color: var(--color-primary);
      }
    }

    .form-section__hint {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      margin: 0 0 16px;
    }

    .form-group {
      margin-bottom: 16px;

      &:last-child {
        margin-bottom: 0;
      }
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

    .form-input--small {
      padding: 8px 10px;
      font-size: 0.8125rem;
    }

    .form-textarea {
      resize: vertical;
      min-height: 80px;
      line-height: 1.5;
    }

    .form-textarea--code {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
    }

    .form-hint {
      display: block;
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin-top: 4px;
    }

    .form-group--checkbox {
      margin-top: 12px;
    }

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

        &::after {
          opacity: 1;
          transform: scale(1);
        }
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

    /* Parsed Fields Table */
    .parsed-fields-table {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .parsed-fields-header {
      display: grid;
      grid-template-columns: 1fr 1fr 1.5fr;
      gap: 12px;
      padding: 10px 14px;
      background: var(--color-bg);
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-border);
    }

    .parsed-field-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1.5fr;
      gap: 12px;
      padding: 10px 14px;
      align-items: center;
      border-bottom: 1px solid var(--color-border-subtle);

      &:last-child {
        border-bottom: none;
      }
    }

    .parsed-field-name {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text);
    }

    .parsed-field-value {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--color-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .delete-text {
      font-size: 0.9375rem;
      color: var(--color-text);
      margin: 0 0 8px;
      text-align: center;

      strong {
        color: var(--color-primary);
      }
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

      .integrations-grid {
        grid-template-columns: 1fr;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .parsed-fields-header,
      .parsed-field-row {
        grid-template-columns: 1fr;
        gap: 6px;
      }

      .parsed-fields-header span:not(:first-child) {
        display: none;
      }
    }
  `]
})
export class CRMSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CRMIntegrationService);
  private notificationService = inject(NotificationService);

  // State signals
  integrations = signal<CRMIntegration[]>([]);
  isLoading = signal(true);
  showModal = signal(false);
  editingIntegration = signal<CRMIntegration | null>(null);
  isSaving = signal(false);
  isParsing = signal(false);
  parsedFields = signal<ParsedCurlField[]>([]);
  placeholders = signal<Record<string, PlaceholderInfo>>({});
  showDeleteConfirm = signal(false);
  deletingIntegration = signal<CRMIntegration | null>(null);
  isDeleting = signal(false);
  testingId = signal<string | null>(null);
  testResult = signal<{ success: boolean; message: string } | null>(null);
  testResultId = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    loginUrl: ['', Validators.required],
    email: ['', Validators.required],
    password: [''],
    csrfSelector: [''],
    csrfHeader: [''],
    createInvoiceUrl: ['', Validators.required],
    listInvoicesUrl: [''],
    invoiceNumberPrefix: [''],
    invoiceNumberSuffix: [''],
    curlCommand: [''],
    fieldMapping: ['{}'],
    staticFields: ['{}'],
    isActive: [true]
  });

  ngOnInit(): void {
    this.loadIntegrations();
    this.loadPlaceholders();
  }

  private loadIntegrations(): void {
    this.isLoading.set(true);
    this.crmService.getIntegrations().subscribe({
      next: (data) => {
        this.integrations.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.notificationService.error('Failed to load CRM integrations');
        this.isLoading.set(false);
      }
    });
  }

  private loadPlaceholders(): void {
    this.crmService.getPlaceholders().subscribe({
      next: (data) => this.placeholders.set(data),
      error: () => {} // Silent fail
    });
  }

  truncateUrl(url: string, maxLen = 35): string {
    if (!url || url.length <= maxLen) return url;
    return url.substring(0, maxLen) + '...';
  }

  truncateValue(value: string, maxLen = 20): string {
    if (!value || value.length <= maxLen) return value;
    return value.substring(0, maxLen) + '...';
  }

  openAddModal(): void {
    this.editingIntegration.set(null);
    this.parsedFields.set([]);
    this.form.reset({
      name: '',
      loginUrl: '',
      email: '',
      password: '',
      csrfSelector: '',
      csrfHeader: '',
      createInvoiceUrl: '',
      listInvoicesUrl: '',
      invoiceNumberPrefix: '',
      invoiceNumberSuffix: '',
      curlCommand: '',
      fieldMapping: '{}',
      staticFields: '{}',
      isActive: true
    });
    this.showModal.set(true);
  }

  openEditModal(integration: CRMIntegration): void {
    this.editingIntegration.set(integration);
    this.parsedFields.set([]);
    this.form.patchValue({
      name: integration.name,
      loginUrl: integration.loginUrl,
      email: integration.email,
      password: '',
      csrfSelector: integration.csrfSelector || '',
      csrfHeader: integration.csrfHeader || '',
      createInvoiceUrl: integration.createInvoiceUrl,
      listInvoicesUrl: integration.listInvoicesUrl || '',
      invoiceNumberPrefix: integration.invoiceNumberPrefix || '',
      invoiceNumberSuffix: integration.invoiceNumberSuffix || '',
      curlCommand: '',
      fieldMapping: JSON.stringify(integration.fieldMapping, null, 2),
      staticFields: JSON.stringify(integration.staticFields || {}, null, 2),
      isActive: integration.isActive
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingIntegration.set(null);
    this.parsedFields.set([]);
  }

  parseCurl(): void {
    const cmd = this.form.get('curlCommand')?.value;
    if (!cmd?.trim()) {
      this.notificationService.error('Please enter a cURL command');
      return;
    }

    this.isParsing.set(true);
    this.crmService.parseCurl(cmd).subscribe({
      next: (result) => {
        this.isParsing.set(false);
        if (result.success && result.request) {
          this.form.patchValue({ createInvoiceUrl: result.request.url });

          if (result.fields) {
            this.parsedFields.set(result.fields);
            const mapping: Record<string, string> = {};
            result.fields.forEach(f => {
              mapping[f.name] = f.suggestedPlaceholder || f.value;
            });
            this.form.patchValue({ fieldMapping: JSON.stringify(mapping, null, 2) });
          }

          this.notificationService.success('cURL parsed successfully');
        } else {
          this.notificationService.error(result.error || 'Failed to parse cURL');
        }
      },
      error: () => {
        this.isParsing.set(false);
        this.notificationService.error('Failed to parse cURL command');
      }
    });
  }

  getPlaceholderKeys(): string[] {
    return Object.keys(this.placeholders());
  }

  formatPlaceholderLabel(placeholder: string): string {
    // Remove {{ and }} and format nicely
    const key = placeholder.replace(/^\{\{|\}\}$/g, '');
    const info = this.placeholders()[placeholder];
    return info?.description || key;
  }

  getFieldPlaceholder(fieldName: string): string {
    try {
      const mapping = JSON.parse(this.form.get('fieldMapping')?.value || '{}');
      return mapping[fieldName] || '';
    } catch {
      return '';
    }
  }

  updateFieldPlaceholder(fieldName: string, placeholder: string): void {
    try {
      const mapping = JSON.parse(this.form.get('fieldMapping')?.value || '{}');
      mapping[fieldName] = placeholder;
      this.form.patchValue({ fieldMapping: JSON.stringify(mapping, null, 2) });
    } catch {
      // Invalid JSON
    }
  }

  saveIntegration(): void {
    if (this.form.invalid) return;

    this.isSaving.set(true);
    const formValue = this.form.getRawValue();
    const editing = this.editingIntegration();

    let fieldMapping: Record<string, string> = {};
    let staticFields: Record<string, string> = {};

    try {
      fieldMapping = JSON.parse(formValue.fieldMapping || '{}');
    } catch {
      this.notificationService.error('Invalid JSON in field mapping');
      this.isSaving.set(false);
      return;
    }

    try {
      staticFields = JSON.parse(formValue.staticFields || '{}');
    } catch {
      this.notificationService.error('Invalid JSON in static fields');
      this.isSaving.set(false);
      return;
    }

    const data = {
      name: formValue.name,
      loginUrl: formValue.loginUrl,
      email: formValue.email,
      password: formValue.password || undefined,
      csrfSelector: formValue.csrfSelector || undefined,
      csrfHeader: formValue.csrfHeader || undefined,
      createInvoiceUrl: formValue.createInvoiceUrl,
      listInvoicesUrl: formValue.listInvoicesUrl || undefined,
      invoiceNumberPrefix: formValue.invoiceNumberPrefix || undefined,
      invoiceNumberSuffix: formValue.invoiceNumberSuffix || undefined,
      fieldMapping,
      staticFields,
      isActive: formValue.isActive
    };

    const req = editing
      ? this.crmService.updateIntegration(editing.id, data)
      : this.crmService.createIntegration(data as any);

    req.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeModal();
        this.loadIntegrations();
        this.notificationService.success(editing ? 'Integration updated' : 'Integration added');
      },
      error: () => {
        this.isSaving.set(false);
        this.notificationService.error(editing ? 'Failed to update' : 'Failed to add');
      }
    });
  }

  toggleActive(integration: CRMIntegration): void {
    this.crmService.updateIntegration(integration.id, { isActive: !integration.isActive }).subscribe({
      next: () => {
        this.loadIntegrations();
        this.notificationService.success(integration.isActive ? 'Deactivated' : 'Activated');
      },
      error: () => this.notificationService.error('Failed to update status')
    });
  }

  testConnection(integration: CRMIntegration): void {
    this.testingId.set(integration.id);
    this.testResult.set(null);
    this.testResultId.set(null);

    this.crmService.testConnection(integration.id).subscribe({
      next: (result) => {
        this.testingId.set(null);
        this.testResult.set(result);
        this.testResultId.set(integration.id);

        // Clear after 5 seconds
        setTimeout(() => {
          if (this.testResultId() === integration.id) {
            this.testResult.set(null);
            this.testResultId.set(null);
          }
        }, 5000);

        if (result.success) {
          this.notificationService.success('Connection successful!');
        } else {
          this.notificationService.error(result.message);
        }
      },
      error: (err) => {
        this.testingId.set(null);
        this.testResult.set({ success: false, message: err?.message || 'Test failed' });
        this.testResultId.set(integration.id);
        this.notificationService.error('Connection test failed');
      }
    });
  }

  confirmDelete(integration: CRMIntegration): void {
    this.deletingIntegration.set(integration);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.deletingIntegration.set(null);
  }

  deleteIntegration(): void {
    const integration = this.deletingIntegration();
    if (!integration) return;

    this.isDeleting.set(true);
    this.crmService.deleteIntegration(integration.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.cancelDelete();
        this.loadIntegrations();
        this.notificationService.success('Integration deleted');
      },
      error: () => {
        this.isDeleting.set(false);
        this.notificationService.error('Failed to delete');
      }
    });
  }
}
