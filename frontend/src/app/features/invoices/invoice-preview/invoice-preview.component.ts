import { Component, inject, signal, OnInit, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { InvoiceService, EmailDraft } from '../../../core/services/invoice.service';
import { Invoice } from '../../../core/services/task.service';
import { NotificationService } from '../../../core/services/notification.service';
import { GoogleService } from '../../../core/services/google.service';
import { ToastComponent } from '../../../shared/components/toast/toast.component';

@Component({
  selector: 'app-invoice-preview',
  standalone: true,
  imports: [CommonModule, RouterLink, ToastComponent, FormsModule],
  template: `
    <app-toast />
    <div class="invoice-page">
      <div class="container">
        <!-- Header -->
        <header class="page-header">
          <a routerLink="/dashboard" class="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Dashboard
          </a>
          <a routerLink="/invoices" class="nav-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            All Invoices
          </a>
        </header>

        @if (isLoading()) {
          <div class="loading">
            <div class="loading__spinner"></div>
            <p>Loading invoice...</p>
          </div>
        } @else if (invoice()) {
          <!-- Main Content Grid -->
          <div class="invoice-grid">
            <!-- Left Column: Invoice Details -->
            <div class="details-column">
              <!-- Invoice Header Card -->
              <div class="card card--header">
                <div class="invoice-badge">
                  <span class="invoice-badge__label">Invoice</span>
                  <span class="invoice-badge__number">#{{ invoice()!.number }}</span>
                </div>
                <div class="status-row">
                  <div class="status-row__left">
                    <span class="status-badge" [class]="'status-badge--' + invoice()!.status.toLowerCase()">
                      <span class="status-badge__dot"></span>
                      {{ getStatusLabel(invoice()!.status) }}
                    </span>
                    @if (invoice()!.createdByAI) {
                      <span class="ai-badge" title="Created by AI Assistant">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"/>
                          <path d="M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2"/>
                        </svg>
                        AI
                      </span>
                    }
                  </div>
                  <span class="invoice-date">{{ invoice()!.createdAt | date:'MMM d, yyyy' }}</span>
                </div>
              </div>

              <!-- Invoice Period -->
              <div class="card">
                <h3 class="card__title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Billing Period
                </h3>
                <div class="period-display">
                  <span class="period-month">{{ getMonthName(invoice()!.invoiceMonth) }}</span>
                  <span class="period-year">{{ invoice()!.invoiceYear }}</span>
                </div>
              </div>

              <!-- Task & Client Info -->
              <div class="card">
                <h3 class="card__title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Client Details
                </h3>
                <div class="info-grid">
                  @if (invoice()!.task) {
                    <div class="info-item info-item--full">
                      <span class="info-label">Task</span>
                      <a [routerLink]="['/tasks', invoice()!.task!.id]" class="info-value info-value--link">
                        {{ invoice()!.task!.name }}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                          <polyline points="15 3 21 3 21 9"/>
                          <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </a>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Client Name</span>
                      <span class="info-value">{{ invoice()!.task!.clientName || '—' }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Email</span>
                      <span class="info-value">
                        @if (invoice()!.task!.clientEmail) {
                          <a href="mailto:{{ invoice()!.task!.clientEmail }}" class="email-link">
                            {{ invoice()!.task!.clientEmail }}
                          </a>
                        } @else {
                          —
                        }
                      </span>
                    </div>
                    @if (invoice()!.task!.clientAddress) {
                      <div class="info-item info-item--full">
                        <span class="info-label">Address</span>
                        <span class="info-value info-value--address">{{ invoice()!.task!.clientAddress }}</span>
                      </div>
                    }
                  }
                </div>
              </div>

              <!-- Financial Details -->
              <div class="card">
                <h3 class="card__title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                  </svg>
                  Financial Summary
                </h3>
                <div class="financial-grid">
                  <div class="financial-item">
                    <span class="financial-label">Hours Worked</span>
                    <span class="financial-value">{{ invoice()!.hoursWorked || 0 }} hrs</span>
                  </div>
                  <div class="financial-item">
                    <span class="financial-label">Hourly Rate</span>
                    <span class="financial-value">{{ getCurrencySymbol() }}{{ invoice()!.hourlyRate || 0 }}</span>
                  </div>
                  <div class="financial-item financial-item--total">
                    <span class="financial-label">Total Amount</span>
                    <span class="financial-value financial-value--total">
                      {{ getCurrencySymbol() }}{{ invoice()!.amount }}
                      <span class="currency-code">{{ invoice()!.currency }}</span>
                    </span>
                  </div>
                </div>
              </div>

              <!-- Additional Info -->
              <div class="card">
                <h3 class="card__title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  Additional Information
                </h3>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Language</span>
                    <span class="info-value">
                      <span class="language-badge">{{ invoice()!.language === 'PL' ? 'Polski (Bilingual)' : 'English' }}</span>
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Created</span>
                    <span class="info-value">{{ invoice()!.createdAt | date:'medium' }}</span>
                  </div>
                </div>
              </div>

              <!-- Email Draft Section -->
              @if (emailDraft()) {
                <div class="card card--email">
                  <h3 class="card__title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    Email Draft
                  </h3>
                  <div class="email-draft">
                    <div class="email-field">
                      <span class="email-field__label">To:</span>
                      <span class="email-field__value">{{ emailDraft()!.to || 'No email specified' }}</span>
                    </div>
                    <div class="email-field">
                      <span class="email-field__label">Subject:</span>
                      <span class="email-field__value">{{ emailDraft()!.subject }}</span>
                    </div>
                    <div class="email-body">
                      <pre>{{ emailDraft()!.body }}</pre>
                    </div>
                    <div class="email-actions">
                      <button class="btn btn--ghost" (click)="copySubject()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                        Copy Subject
                      </button>
                      <button class="btn btn--ghost" (click)="copyBody()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                        Copy Body
                      </button>
                    </div>
                    @if (googleService.accounts().length > 0) {
                      <div class="gmail-draft-section">
                        @if (googleService.accounts().length > 1 && !invoice()?.task?.googleAccountId) {
                          <div class="account-select">
                            <label class="account-select__label">Send from:</label>
                            <select
                              class="account-select__dropdown"
                              [value]="selectedGoogleAccountId() || ''"
                              (change)="selectGoogleAccount($any($event.target).value)"
                            >
                              <option value="" disabled>Select account...</option>
                              @for (account of googleService.accounts(); track account.id) {
                                <option [value]="account.id">{{ account.email }}</option>
                              }
                            </select>
                          </div>
                        } @else {
                          <div class="account-info">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                              <polyline points="22,6 12,13 2,6"/>
                            </svg>
                            <span>{{ googleService.accounts()[0].email }}</span>
                          </div>
                        }
                        <button
                          class="btn btn--gmail"
                          (click)="createGmailDraft()"
                          [disabled]="isCreatingDraft() || (googleService.accounts().length > 1 && !selectedGoogleAccountId() && !invoice()?.task?.googleAccountId)"
                        >
                          @if (isCreatingDraft()) {
                            <span class="btn__spinner btn__spinner--dark"></span>
                            Creating...
                          } @else {
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Create Gmail Draft
                          }
                        </button>
                      </div>
                    } @else {
                      <div class="no-google-account">
                        <a routerLink="/profile" class="btn btn--ghost">
                          <svg viewBox="0 0 24 24" fill="currentColor" class="google-icon">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          Connect Google Account
                        </a>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Status Update -->
              <div class="card">
                <h3 class="card__title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 11 12 14 22 4"/>
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                  </svg>
                  Update Status
                </h3>
                <div class="status-buttons">
                  <button
                    class="status-btn"
                    [class.status-btn--active]="invoice()!.status === 'DRAFT'"
                    (click)="updateStatus('DRAFT')"
                  >
                    <span class="status-btn__dot status-btn__dot--draft"></span>
                    Draft
                  </button>
                  <button
                    class="status-btn"
                    [class.status-btn--active]="invoice()!.status === 'SENT'"
                    (click)="updateStatus('SENT')"
                  >
                    <span class="status-btn__dot status-btn__dot--sent"></span>
                    Sent
                  </button>
                  <button
                    class="status-btn"
                    [class.status-btn--active]="invoice()!.status === 'PAID'"
                    (click)="updateStatus('PAID')"
                  >
                    <span class="status-btn__dot status-btn__dot--paid"></span>
                    Paid
                  </button>
                </div>
              </div>
            </div>

            <!-- Right Column: PDF Preview -->
            <div class="preview-column">
              <div class="pdf-card">
                <div class="pdf-header">
                  <h3 class="pdf-title">Document Preview</h3>
                  <button
                    class="btn btn--primary"
                    (click)="downloadPdf()"
                    [disabled]="isDownloading()"
                  >
                    @if (isDownloading()) {
                      <span class="btn__spinner"></span>
                      Downloading...
                    } @else {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Download PDF
                    }
                  </button>
                </div>
                <div class="pdf-container">
                  @if (isPdfLoading()) {
                    <div class="pdf-loading">
                      <div class="loading__spinner"></div>
                      <p>Loading preview...</p>
                    </div>
                  } @else if (pdfUrl()) {
                    <iframe
                      [src]="pdfUrl()"
                      class="pdf-viewer"
                      title="Invoice PDF Preview"
                    ></iframe>
                  } @else {
                    <div class="pdf-error">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <p>Could not load PDF preview</p>
                      <button class="btn btn--ghost" (click)="loadPdfPreview(invoice()!.id)">
                        Try Again
                      </button>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

    :host {
      --color-bg: #FAFBFC;
      --color-surface: #FFFFFF;
      --color-primary: #2563EB;
      --color-primary-hover: #1D4ED8;
      --color-primary-subtle: rgba(37, 99, 235, 0.08);
      --color-text: #1F2937;
      --color-text-secondary: #6B7280;
      --color-text-muted: #9CA3AF;
      --color-border: #E5E7EB;
      --color-border-subtle: #F3F4F6;
      --color-success: #10B981;
      --color-success-subtle: rgba(16, 185, 129, 0.1);
      --color-warning: #F59E0B;
      --color-warning-subtle: rgba(245, 158, 11, 0.1);
      --color-danger: #EF4444;
      --color-danger-subtle: rgba(239, 68, 68, 0.1);

      --font-display: 'Outfit', system-ui, sans-serif;
      --font-body: 'Outfit', system-ui, sans-serif;

      --space-xs: 4px;
      --space-sm: 8px;
      --space-md: 12px;
      --space-lg: 16px;
      --space-xl: 24px;
      --space-2xl: 32px;
      --space-3xl: 48px;

      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 14px;
      --radius-xl: 20px;
      --radius-full: 9999px;

      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
      --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
      --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.08);

      --transition-fast: 0.15s ease;
      --transition-normal: 0.25s ease;

      display: block;
      font-family: var(--font-body);
    }

    .invoice-page {
      min-height: 100vh;
      background: var(--color-bg);
      padding: var(--space-2xl) 0;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 var(--space-xl);
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-2xl);
    }

    .back-link,
    .nav-link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      color: var(--color-text-secondary);
      font-size: 0.9375rem;
      font-weight: 500;
      text-decoration: none;
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover {
        color: var(--color-primary);
        background: var(--color-primary-subtle);
      }
    }

    /* Loading State */
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-3xl);
      color: var(--color-text-secondary);

      p {
        margin-top: var(--space-md);
        font-size: 0.9375rem;
      }
    }

    .loading__spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Main Grid Layout */
    .invoice-grid {
      display: grid;
      grid-template-columns: 420px 1fr;
      gap: var(--space-xl);
      align-items: start;

      @media (max-width: 1100px) {
        grid-template-columns: 1fr;
      }
    }

    /* Cards */
    .card {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: var(--space-xl);
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--color-border-subtle);
      margin-bottom: var(--space-lg);
      animation: fadeInUp 0.4s ease backwards;

      &:nth-child(1) { animation-delay: 0.05s; }
      &:nth-child(2) { animation-delay: 0.1s; }
      &:nth-child(3) { animation-delay: 0.15s; }
      &:nth-child(4) { animation-delay: 0.2s; }
      &:nth-child(5) { animation-delay: 0.25s; }
      &:nth-child(6) { animation-delay: 0.3s; }
      &:nth-child(7) { animation-delay: 0.35s; }
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .card__title {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-family: var(--font-display);
      font-size: 0.8125rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-secondary);
      margin-bottom: var(--space-lg);

      svg {
        width: 16px;
        height: 16px;
        opacity: 0.7;
      }
    }

    /* Header Card */
    .card--header {
      background: linear-gradient(135deg, var(--color-primary) 0%, #1E40AF 100%);
      color: white;
      padding: var(--space-2xl);
    }

    .invoice-badge {
      margin-bottom: var(--space-lg);
    }

    .invoice-badge__label {
      display: block;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.8;
      margin-bottom: var(--space-xs);
    }

    .invoice-badge__number {
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-md);

      &__left {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
      }
    }

    .ai-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: var(--radius-full);
      background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
      color: white;

      svg {
        width: 14px;
        height: 14px;
      }
    }

    .invoice-date {
      font-size: 0.875rem;
      opacity: 0.9;
    }

    /* Status Badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-xs) var(--space-md);
      font-size: 0.8125rem;
      font-weight: 600;
      border-radius: var(--radius-full);
      background: rgba(255, 255, 255, 0.2);
    }

    .status-badge__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }

    .status-badge--draft {
      color: var(--color-text-secondary);
      background: var(--color-bg);
    }

    .status-badge--sent {
      color: var(--color-warning);
      background: var(--color-warning-subtle);
    }

    .status-badge--paid {
      color: var(--color-success);
      background: var(--color-success-subtle);
    }

    .status-badge--cancelled {
      color: var(--color-danger);
      background: var(--color-danger-subtle);
    }

    /* Card in header has white badge */
    .card--header .status-badge {
      color: white;
      background: rgba(255, 255, 255, 0.2);
    }

    /* Period Display */
    .period-display {
      display: flex;
      align-items: baseline;
      gap: var(--space-sm);
    }

    .period-month {
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text);
    }

    .period-year {
      font-size: 1.125rem;
      color: var(--color-text-secondary);
    }

    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-lg);
    }

    .info-item {
      &--full {
        grid-column: 1 / -1;
      }
    }

    .info-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-muted);
      margin-bottom: var(--space-xs);
    }

    .info-value {
      font-size: 0.9375rem;
      color: var(--color-text);

      &--link {
        display: inline-flex;
        align-items: center;
        gap: var(--space-xs);
        color: var(--color-primary);
        text-decoration: none;
        font-weight: 500;

        svg {
          width: 14px;
          height: 14px;
          opacity: 0.6;
        }

        &:hover {
          text-decoration: underline;
        }
      }

      &--address {
        white-space: pre-line;
        line-height: 1.5;
      }
    }

    .email-link {
      color: var(--color-primary);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    .language-badge {
      display: inline-block;
      padding: var(--space-xs) var(--space-sm);
      font-size: 0.8125rem;
      font-weight: 500;
      background: var(--color-bg);
      border-radius: var(--radius-sm);
      color: var(--color-text-secondary);
    }

    /* Financial Grid */
    .financial-grid {
      display: grid;
      gap: var(--space-md);
    }

    .financial-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-md) 0;
      border-bottom: 1px solid var(--color-border-subtle);

      &:last-child {
        border-bottom: none;
      }

      &--total {
        padding-top: var(--space-lg);
        margin-top: var(--space-sm);
        border-top: 2px solid var(--color-border);
        border-bottom: none;
      }
    }

    .financial-label {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }

    .financial-value {
      font-family: var(--font-display);
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);

      &--total {
        font-size: 1.25rem;
        color: var(--color-primary);
      }
    }

    .currency-code {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-muted);
      margin-left: var(--space-xs);
    }

    /* Email Draft */
    .card--email {
      background: var(--color-bg);
      border: 1px dashed var(--color-border);
    }

    .email-draft {
      font-size: 0.875rem;
    }

    .email-field {
      display: flex;
      gap: var(--space-sm);
      margin-bottom: var(--space-sm);
    }

    .email-field__label {
      font-weight: 600;
      color: var(--color-text-secondary);
      min-width: 60px;
    }

    .email-field__value {
      color: var(--color-text);
    }

    .email-body {
      margin-top: var(--space-md);
      padding: var(--space-md);
      background: var(--color-surface);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-subtle);

      pre {
        font-family: var(--font-body);
        font-size: 0.8125rem;
        color: var(--color-text-secondary);
        white-space: pre-wrap;
        word-break: break-word;
        margin: 0;
        max-height: 150px;
        overflow-y: auto;
        line-height: 1.6;
      }
    }

    .email-actions {
      display: flex;
      gap: var(--space-sm);
      margin-top: var(--space-md);
    }

    .gmail-draft-section {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      margin-top: var(--space-lg);
      padding-top: var(--space-lg);
      border-top: 1px solid var(--color-border-subtle);
    }

    .account-select {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      flex: 1;
    }

    .account-select__label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      white-space: nowrap;
    }

    .account-select__dropdown {
      flex: 1;
      padding: var(--space-sm) var(--space-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      font-family: var(--font-body);
      font-size: 0.875rem;
      color: var(--color-text);
      cursor: pointer;

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-subtle);
      }
    }

    .account-info {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      flex: 1;
      font-size: 0.875rem;
      color: var(--color-text-secondary);

      svg {
        width: 16px;
        height: 16px;
        opacity: 0.6;
      }
    }

    .no-google-account {
      margin-top: var(--space-lg);
      padding-top: var(--space-lg);
      border-top: 1px solid var(--color-border-subtle);
    }

    .google-icon {
      width: 18px;
      height: 18px;
    }

    /* Status Buttons */
    .status-buttons {
      display: flex;
      gap: var(--space-sm);
    }

    .status-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      padding: var(--space-md);
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: var(--radius-md);
      background: var(--color-bg);
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-text-muted);
      }

      &--active {
        background: var(--color-primary);
        color: white;
        border-color: var(--color-primary);
      }
    }

    .status-btn__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;

      &--draft { background: var(--color-text-muted); }
      &--sent { background: var(--color-warning); }
      &--paid { background: var(--color-success); }
    }

    .status-btn--active .status-btn__dot {
      background: white;
    }

    /* PDF Preview Column */
    .preview-column {
      position: sticky;
      top: var(--space-xl);
    }

    .pdf-card {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-md);
      border: 1px solid var(--color-border-subtle);
      animation: fadeInUp 0.4s ease backwards;
      animation-delay: 0.1s;
    }

    .pdf-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-lg) var(--space-xl);
      background: var(--color-bg);
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .pdf-title {
      font-family: var(--font-display);
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0;
    }

    .pdf-container {
      height: 800px;
      background: #525659;
      position: relative;
    }

    .pdf-viewer {
      width: 100%;
      height: 100%;
      border: none;
    }

    .pdf-loading,
    .pdf-error {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-md);
      color: rgba(255, 255, 255, 0.8);
      background: #525659;

      p {
        margin: 0;
        font-size: 0.9375rem;
      }

      svg {
        width: 48px;
        height: 48px;
        opacity: 0.5;
      }
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      padding: var(--space-md) var(--space-lg);
      font-family: var(--font-body);
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: var(--radius-md);
      border: none;
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 16px;
        height: 16px;
      }

      &--primary {
        background: var(--color-primary);
        color: white;

        &:hover:not(:disabled) {
          background: var(--color-primary-hover);
        }
      }

      &--ghost {
        background: transparent;
        color: var(--color-text-secondary);
        border: 1px solid var(--color-border);

        &:hover {
          background: var(--color-bg);
          color: var(--color-text);
        }
      }

      &--gmail {
        background: linear-gradient(135deg, #4285f4 0%, #ea4335 100%);
        color: white;
        border: none;

        svg {
          width: 16px;
          height: 16px;
        }

        &:hover:not(:disabled) {
          background: linear-gradient(135deg, #3367d6 0%, #d33a2c 100%);
        }
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .btn__spinner--dark {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .btn__spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* Responsive */
    @media (max-width: 1100px) {
      .preview-column {
        position: static;
        order: -1;
      }

      .pdf-container {
        height: 500px;
      }
    }

    @media (max-width: 640px) {
      .container {
        padding: 0 var(--space-md);
      }

      .invoice-grid {
        gap: var(--space-md);
      }

      .card {
        padding: var(--space-lg);
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .status-buttons {
        flex-direction: column;
      }

      .email-actions {
        flex-direction: column;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-sm);
      }
    }
  `]
})
export class InvoicePreviewComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private invoiceService = inject(InvoiceService);
  private notificationService = inject(NotificationService);
  googleService = inject(GoogleService);
  private sanitizer = inject(DomSanitizer);

  invoice = signal<Invoice | null>(null);
  emailDraft = signal<EmailDraft | null>(null);
  isLoading = signal(true);
  isDownloading = signal(false);
  isPdfLoading = signal(false);
  isCreatingDraft = signal(false);
  selectedGoogleAccountId = signal<string | null>(null);

  private rawPdfUrl = signal<string | null>(null);
  private objectUrl: string | null = null;

  pdfUrl = computed(() => {
    const url = this.rawPdfUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  private monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadInvoice(id);
    }
    // Load user's connected Google accounts
    this.googleService.fetchAccounts();
  }

  ngOnDestroy() {
    if (this.objectUrl) {
      window.URL.revokeObjectURL(this.objectUrl);
    }
  }

  getMonthName(month?: number): string {
    if (month === undefined || month === null) return '';
    return this.monthNames[month] || '';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'DRAFT': 'Draft',
      'SENT': 'Sent',
      'PAID': 'Paid',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  }

  getCurrencySymbol(): string {
    const currency = this.invoice()?.currency || 'USD';
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'PLN': 'zł',
      'GBP': '£'
    };
    return symbols[currency] || currency + ' ';
  }

  loadInvoice(id: string) {
    this.invoiceService.getInvoice(id).subscribe({
      next: (invoice) => {
        this.invoice.set(invoice);
        this.loadEmailDraft(id);
        this.loadPdfPreview(id);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.notificationService.error('Failed to load invoice');
      }
    });
  }

  loadPdfPreview(id: string) {
    this.isPdfLoading.set(true);
    this.invoiceService.downloadPdf(id).subscribe({
      next: (blob) => {
        if (this.objectUrl) {
          window.URL.revokeObjectURL(this.objectUrl);
        }
        this.objectUrl = window.URL.createObjectURL(blob);
        this.rawPdfUrl.set(this.objectUrl);
        this.isPdfLoading.set(false);
      },
      error: () => {
        this.isPdfLoading.set(false);
      }
    });
  }

  loadEmailDraft(id: string) {
    this.invoiceService.getEmailDraft(id).subscribe({
      next: (draft) => this.emailDraft.set(draft),
      error: () => console.error('Failed to load email draft')
    });
  }

  downloadPdf() {
    const inv = this.invoice();
    if (!inv) return;

    this.isDownloading.set(true);

    this.invoiceService.downloadPdf(inv.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${inv.number}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.isDownloading.set(false);
        this.notificationService.success('PDF downloaded!');
      },
      error: () => {
        this.isDownloading.set(false);
        this.notificationService.error('Failed to download PDF');
      }
    });
  }

  copySubject() {
    const draft = this.emailDraft();
    if (draft?.subject) {
      navigator.clipboard.writeText(draft.subject);
      this.notificationService.success('Subject copied!');
    }
  }

  copyBody() {
    const draft = this.emailDraft();
    if (draft?.body) {
      navigator.clipboard.writeText(draft.body);
      this.notificationService.success('Email body copied!');
    }
  }

  updateStatus(status: 'DRAFT' | 'SENT' | 'PAID') {
    const inv = this.invoice();
    if (!inv || inv.status === status) return;

    this.invoiceService.updateStatus(inv.id, status).subscribe({
      next: (updated) => {
        this.invoice.set(updated);
        this.notificationService.success(`Status updated to ${this.getStatusLabel(status)}`);
      },
      error: () => {
        this.notificationService.error('Failed to update status');
      }
    });
  }

  createGmailDraft() {
    const inv = this.invoice();
    const draft = this.emailDraft();
    const accounts = this.googleService.accounts();

    // Use task's googleAccountId, or selected one, or first available account
    const googleAccountId = inv?.task?.googleAccountId
      || this.selectedGoogleAccountId()
      || (accounts.length === 1 ? accounts[0].id : null);

    if (!googleAccountId || !draft) {
      this.notificationService.error('Please select a Google account to use');
      return;
    }

    this.isCreatingDraft.set(true);

    this.googleService.createDraft({
      googleAccountId,
      to: inv?.task?.clientEmail || '',
      subject: draft.subject,
      body: draft.body,
      invoiceId: inv?.id
    }).subscribe({
      next: (response) => {
        this.isCreatingDraft.set(false);
        this.notificationService.success('Gmail draft created!');
        // Open Gmail draft in new tab
        window.open(response.webLink, '_blank');
      },
      error: () => {
        this.isCreatingDraft.set(false);
        this.notificationService.error('Failed to create Gmail draft');
      }
    });
  }

  selectGoogleAccount(accountId: string) {
    this.selectedGoogleAccountId.set(accountId);
  }
}
