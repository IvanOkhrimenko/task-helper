import { Component, inject, signal, OnInit, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { InvoiceService, EmailDraft } from '../../../core/services/invoice.service';
import { Invoice } from '../../../core/services/task.service';
import { NotificationService } from '../../../core/services/notification.service';
import { GoogleService } from '../../../core/services/google.service';
import { IntegrationsService } from '../../../core/services/integrations.service';
import { CRMService, CRMStatus } from '../../../core/services/crm.service';
import { CRMIntegrationService, CRMIntegration } from '../../../core/services/crm-integration.service';
import { ToastComponent } from '../../../shared/components/toast/toast.component';
import { ActivityLogService, ActivityLog } from '../../../core/services/activity-log.service';
import { ActivityTimelineComponent } from '../../../shared/components/activity-timeline/activity-timeline.component';

@Component({
  selector: 'app-invoice-preview',
  standalone: true,
  imports: [CommonModule, RouterLink, ToastComponent, FormsModule, TranslateModule, ActivityTimelineComponent],
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
            {{ 'invoices.preview.backToDashboard' | translate }}
          </a>
          <a routerLink="/invoices" class="nav-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            {{ 'invoices.preview.allInvoices' | translate }}
          </a>
        </header>

        @if (isLoading()) {
          <div class="loading">
            <div class="loading__spinner"></div>
            <p>{{ 'invoices.preview.loading' | translate }}</p>
          </div>
        } @else if (invoice()) {
          <!-- Main Content Grid -->
          <div class="invoice-grid">
            <!-- Left Column: Invoice Details -->
            <div class="details-column">
              <!-- Invoice Header Card -->
              <div class="card card--header">
                <div class="invoice-badge">
                  <span class="invoice-badge__label">{{ 'invoices.card.invoice' | translate }}</span>
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
                  {{ 'invoices.preview.billingPeriod' | translate }}
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
                  {{ 'invoices.preview.clientDetails' | translate }}
                </h3>
                <div class="info-grid">
                  @if (invoice()!.task) {
                    <div class="info-item info-item--full">
                      <span class="info-label">{{ 'invoices.card.task' | translate }}</span>
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
                      <span class="info-label">{{ 'invoices.preview.clientName' | translate }}</span>
                      <span class="info-value">{{ invoice()!.task!.client?.name || '—' }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">{{ 'invoices.preview.email' | translate }}</span>
                      <span class="info-value">
                        @if (invoice()!.task!.client?.email) {
                          <a href="mailto:{{ invoice()!.task!.client!.email }}" class="email-link">
                            {{ invoice()!.task!.client!.email }}
                          </a>
                        } @else {
                          —
                        }
                      </span>
                    </div>
                    @if (getClientAddress()) {
                      <div class="info-item info-item--full">
                        <span class="info-label">{{ 'invoices.preview.address' | translate }}</span>
                        <span class="info-value info-value--address">{{ getClientAddress() }}</span>
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
                  {{ 'invoices.preview.financialSummary' | translate }}
                </h3>
                <div class="financial-grid">
                  @if (isFixedAmountInvoice()) {
                    <!-- Fixed Amount Invoice -->
                    <div class="financial-item financial-item--fixed">
                      <span class="financial-label">{{ 'invoices.preview.billingType' | translate }}</span>
                      <span class="financial-value">
                        <span class="billing-type-badge">{{ 'invoices.preview.fixedAmount' | translate }}</span>
                      </span>
                    </div>
                    <div class="financial-item financial-item--total">
                      <span class="financial-label">{{ 'invoices.preview.monthlyAmount' | translate }}</span>
                      <span class="financial-value financial-value--total">
                        {{ getCurrencySymbol() }}{{ invoice()!.amount }}
                        <span class="currency-code">{{ invoice()!.currency }}</span>
                      </span>
                    </div>
                  } @else {
                    <!-- Hourly Invoice -->
                    <div class="financial-item">
                      <span class="financial-label">{{ 'invoices.preview.hoursWorked' | translate }}</span>
                      <span class="financial-value">{{ invoice()!.hoursWorked || 0 }} {{ 'invoices.preview.hrs' | translate }}</span>
                    </div>
                    <div class="financial-item">
                      <span class="financial-label">{{ 'invoices.preview.hourlyRate' | translate }}</span>
                      <span class="financial-value">{{ getCurrencySymbol() }}{{ invoice()!.hourlyRate || 0 }}</span>
                    </div>
                    <div class="financial-item financial-item--total">
                      <span class="financial-label">{{ 'invoices.preview.totalAmount' | translate }}</span>
                      <span class="financial-value financial-value--total">
                        {{ getCurrencySymbol() }}{{ invoice()!.amount }}
                        <span class="currency-code">{{ invoice()!.currency }}</span>
                      </span>
                    </div>
                  }
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
                  {{ 'invoices.preview.additionalInfo' | translate }}
                </h3>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">{{ 'invoices.preview.language' | translate }}</span>
                    <span class="info-value">
                      <span class="language-badge">{{ invoice()!.language === 'PL' ? ('invoices.preview.languagePL' | translate) : ('invoices.preview.languageEN' | translate) }}</span>
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ 'invoices.preview.created' | translate }}</span>
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
                    {{ 'invoices.preview.emailDraft' | translate }}
                  </h3>
                  <div class="email-draft">
                    <div class="email-field">
                      <span class="email-field__label">{{ 'invoices.preview.emailTo' | translate }}</span>
                      <span class="email-field__value">{{ emailDraft()!.to || ('invoices.preview.noEmailSpecified' | translate) }}</span>
                    </div>
                    <div class="email-field">
                      <span class="email-field__label">{{ 'invoices.preview.emailSubject' | translate }}</span>
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
                        {{ 'invoices.preview.copySubject' | translate }}
                      </button>
                      <button class="btn btn--ghost" (click)="copyBody()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                        {{ 'invoices.preview.copyBody' | translate }}
                      </button>
                    </div>
                    @if (googleEnabled() && googleService.accounts().length > 0) {
                      <div class="gmail-draft-section">
                        @if (googleService.accounts().length > 1 && !invoice()?.task?.client?.googleAccountId) {
                          <div class="account-select">
                            <label class="account-select__label">{{ 'invoices.preview.sendFrom' | translate }}</label>
                            <select
                              class="account-select__dropdown"
                              [value]="selectedGoogleAccountId() || ''"
                              (change)="selectGoogleAccount($any($event.target).value)"
                            >
                              <option value="" disabled>{{ 'invoices.preview.selectAccount' | translate }}</option>
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

                        <!-- Attachment Selector -->
                        <div class="attachment-selector">
                          <label class="attachment-selector__label">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                            </svg>
                            {{ 'invoices.preview.attachPdf' | translate }}
                          </label>
                          <div class="attachment-options">
                            <button
                              class="attachment-btn"
                              [class.attachment-btn--active]="selectedAttachment() === 'local'"
                              (click)="selectAttachmentSource('local')"
                            >
                              {{ 'invoices.preview.attachLocal' | translate }}
                            </button>
                            @if (hasCrmPdf()) {
                              <button
                                class="attachment-btn"
                                [class.attachment-btn--active]="selectedAttachment() === 'crm'"
                                (click)="selectAttachmentSource('crm')"
                              >
                                {{ 'invoices.preview.attachCrm' | translate }}
                              </button>
                            }
                            <button
                              class="attachment-btn"
                              [class.attachment-btn--active]="selectedAttachment() === 'none'"
                              (click)="selectAttachmentSource('none')"
                            >
                              {{ 'invoices.preview.attachNone' | translate }}
                            </button>
                          </div>
                        </div>

                        <button
                          class="btn btn--gmail"
                          (click)="createGmailDraft()"
                          [disabled]="isCreatingDraft() || (googleService.accounts().length > 1 && !selectedGoogleAccountId() && !invoice()?.task?.client?.googleAccountId)"
                        >
                          @if (isCreatingDraft()) {
                            <span class="btn__spinner btn__spinner--dark"></span>
                            {{ 'invoices.preview.creating' | translate }}
                          } @else {
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            {{ 'invoices.preview.createGmailDraft' | translate }}
                          }
                        </button>
                      </div>
                    } @else if (googleEnabled()) {
                      <div class="no-google-account">
                        <a routerLink="/profile" class="btn btn--ghost">
                          <svg viewBox="0 0 24 24" fill="currentColor" class="google-icon">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          {{ 'invoices.preview.connectGoogleAccount' | translate }}
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
                  {{ 'invoices.preview.updateStatus' | translate }}
                </h3>
                <div class="status-buttons">
                  <button
                    class="status-btn"
                    [class.status-btn--active]="invoice()!.status === 'DRAFT'"
                    (click)="updateStatus('DRAFT')"
                  >
                    <span class="status-btn__dot status-btn__dot--draft"></span>
                    {{ 'invoices.status.draft' | translate }}
                  </button>
                  <button
                    class="status-btn"
                    [class.status-btn--active]="invoice()!.status === 'SENT'"
                    (click)="updateStatus('SENT')"
                  >
                    <span class="status-btn__dot status-btn__dot--sent"></span>
                    {{ 'invoices.status.sent' | translate }}
                  </button>
                  <button
                    class="status-btn"
                    [class.status-btn--active]="invoice()!.status === 'PAID'"
                    (click)="updateStatus('PAID')"
                  >
                    <span class="status-btn__dot status-btn__dot--paid"></span>
                    {{ 'invoices.status.paid' | translate }}
                  </button>
                </div>
              </div>

              <!-- Archive/Delete Actions -->
              <div class="card card--actions">
                <h3 class="card__title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  {{ 'invoices.preview.actions' | translate }}
                </h3>
                <div class="action-buttons">
                  @if (!invoice()!.isArchived) {
                    <button
                      class="btn btn--warning"
                      (click)="archiveInvoice()"
                      [disabled]="isArchiving()"
                    >
                      @if (isArchiving()) {
                        <span class="btn__spinner btn__spinner--dark"></span>
                        {{ 'invoices.preview.archiving' | translate }}
                      } @else {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="21 8 21 21 3 21 3 8"/>
                          <rect x="1" y="3" width="22" height="5"/>
                          <line x1="10" y1="12" x2="14" y2="12"/>
                        </svg>
                        {{ 'invoices.preview.archiveInvoice' | translate }}
                      }
                    </button>
                  } @else {
                    <button
                      class="btn btn--ghost"
                      (click)="unarchiveInvoice()"
                      [disabled]="isArchiving()"
                    >
                      @if (isArchiving()) {
                        <span class="btn__spinner btn__spinner--dark"></span>
                        {{ 'invoices.preview.restoring' | translate }}
                      } @else {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="1 4 1 10 7 10"/>
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                        </svg>
                        {{ 'invoices.preview.restoreFromArchive' | translate }}
                      }
                    </button>
                  }
                  <button
                    class="btn btn--danger"
                    (click)="deleteInvoice()"
                    [disabled]="isDeleting()"
                  >
                    @if (isDeleting()) {
                      <span class="btn__spinner btn__spinner--dark"></span>
                      {{ 'invoices.preview.deleting' | translate }}
                    } @else {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                      {{ 'invoices.preview.deleteInvoice' | translate }}
                    }
                  </button>
                </div>

                <!-- CRM Sync Section -->
                @if (hasCrmIntegrations()) {
                  <div class="crm-sync-section">
                    <h4 class="crm-sync-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        <path d="M9 12l2 2 4-4"/>
                      </svg>
                      {{ getActiveCrmName() }}
                    </h4>

                    <!-- CRM Integration Selector (when multiple integrations exist) -->
                    @if (crmIntegrations().length > 1) {
                      <div class="crm-integration-selector">
                        <select
                          class="crm-select"
                          [value]="selectedCrmIntegrationId() || ''"
                          (change)="selectCrmIntegration($any($event.target).value || null)"
                        >
                          @for (integration of crmIntegrations(); track integration.id) {
                            <option [value]="integration.id" [selected]="selectedCrmIntegrationId() === integration.id || (!selectedCrmIntegrationId() && $first)">{{ integration.name }}</option>
                          }
                        </select>
                      </div>
                    }

                    <!-- CRM Action Buttons -->
                    <div class="crm-actions">
                      @if (invoice()?.crmSyncedAt || invoice()?.crmInvoiceId) {
                        <!-- Already synced - show status -->
                        <div class="crm-synced-status">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                          <div class="crm-synced-info">
                            <span class="crm-synced-label">{{ 'invoices.preview.syncedToCrm' | translate }}</span>
                            @if (invoice()?.crmSyncedAt) {
                              <span class="crm-synced-date">{{ invoice()!.crmSyncedAt | date:'medium' }}</span>
                            }
                          </div>
                        </div>
                      } @else {
                        <!-- Not synced yet - show sync button -->
                        <button
                          class="btn btn--crm"
                          (click)="syncToCRM()"
                          [disabled]="isSyncingCRM()"
                        >
                          @if (isSyncingCRM()) {
                            <span class="btn__spinner btn__spinner--dark"></span>
                            {{ 'invoices.preview.syncing' | translate }}
                          } @else {
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polyline points="23 4 23 10 17 10"/>
                              <polyline points="1 20 1 14 7 14"/>
                              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                            </svg>
                            {{ 'invoices.preview.syncToCrm' | translate }}
                          }
                        </button>
                      }

                      <!-- Fetch PDF from CRM -->
                      @if (invoice()?.crmPdfPath) {
                        <button
                          class="btn btn--ghost"
                          (click)="downloadCrmPdf()"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          {{ 'invoices.preview.downloadCrmPdf' | translate }}
                        </button>
                      } @else if (invoice()?.crmSyncedAt || invoice()?.crmInvoiceId) {
                        <!-- Only show fetch button if invoice was synced -->
                        <button
                          class="btn btn--ghost"
                          (click)="fetchCrmPdf()"
                          [disabled]="isFetchingCrmPdf()"
                        >
                          @if (isFetchingCrmPdf()) {
                            <span class="btn__spinner btn__spinner--dark"></span>
                            {{ 'invoices.preview.fetching' | translate }}
                          } @else {
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                              <line x1="12" y1="18" x2="12" y2="12"/>
                              <line x1="9" y1="15" x2="15" y2="15"/>
                            </svg>
                            {{ 'invoices.preview.fetchPdfFromCrm' | translate }}
                          }
                        </button>
                      }
                    </div>
                  </div>
                }

                @if (invoice()!.isArchived) {
                  <div class="archived-notice">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {{ 'invoices.preview.invoiceIsArchived' | translate }}
                  </div>
                }
              </div>

              <!-- Activity History -->
              <div class="card card--activity">
                <h3 class="card__title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {{ 'invoices.preview.activityHistory' | translate }}
                </h3>
                <app-activity-timeline [activityLogs]="activityLogs()" />
              </div>
            </div>

            <!-- Right Column: PDF Preview -->
            <div class="preview-column">
              <div class="pdf-card">
                <div class="pdf-header">
                  <div class="pdf-header__left">
                    <h3 class="pdf-title">{{ 'invoices.preview.documentPreview' | translate }}</h3>
                    @if (hasCrmPdf()) {
                      <div class="pdf-tabs">
                        <button
                          class="pdf-tab"
                          [class.pdf-tab--active]="activePdfTab() === 'local'"
                          (click)="switchPdfTab('local')"
                        >
                          {{ 'invoices.preview.attachLocal' | translate }}
                        </button>
                        <button
                          class="pdf-tab"
                          [class.pdf-tab--active]="activePdfTab() === 'crm'"
                          (click)="switchPdfTab('crm')"
                        >
                          {{ 'invoices.preview.attachCrm' | translate }}
                        </button>
                      </div>
                    }
                  </div>
                  <button
                    class="btn btn--primary"
                    (click)="activePdfTab() === 'crm' ? downloadCrmPdf() : downloadPdf()"
                    [disabled]="isDownloading()"
                  >
                    @if (isDownloading()) {
                      <span class="btn__spinner"></span>
                      {{ 'invoices.preview.downloading' | translate }}
                    } @else {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      {{ activePdfTab() === 'crm' ? ('invoices.preview.downloadCrmPdf' | translate) : ('invoices.preview.downloadPdf' | translate) }}
                    }
                  </button>
                </div>
                <div class="pdf-container">
                  @if (activePdfTab() === 'local') {
                    @if (isPdfLoading()) {
                      <div class="pdf-loading">
                        <div class="loading__spinner"></div>
                        <p>{{ 'invoices.preview.loadingPreview' | translate }}</p>
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
                        <p>{{ 'invoices.preview.couldNotLoadPdf' | translate }}</p>
                        <button class="btn btn--ghost" (click)="loadPdfPreview(invoice()!.id)">
                          {{ 'invoices.preview.tryAgain' | translate }}
                        </button>
                      </div>
                    }
                  } @else {
                    @if (isCrmPdfLoading()) {
                      <div class="pdf-loading">
                        <div class="loading__spinner"></div>
                        <p>{{ 'invoices.preview.loadingCrmPdf' | translate }}</p>
                      </div>
                    } @else if (crmPdfUrl()) {
                      <iframe
                        [src]="crmPdfUrl()"
                        class="pdf-viewer"
                        title="CRM Invoice PDF Preview"
                      ></iframe>
                    } @else {
                      <div class="pdf-error">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <p>{{ 'invoices.preview.couldNotLoadCrmPdf' | translate }}</p>
                        <button class="btn btn--ghost" (click)="loadCrmPdfPreview(invoice()!.id)">
                          {{ 'invoices.preview.tryAgain' | translate }}
                        </button>
                      </div>
                    }
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
    :host {
      display: block;
      font-family: var(--font-body);
    }

    .invoice-page {
      min-height: 100vh;
      background: var(--color-bg);
      padding: var(--space-2xl) 0;
      transition: background-color var(--transition-slow);
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
      grid-template-columns: 1fr 380px;
      gap: var(--space-xl);
      align-items: start;

      @media (max-width: 1200px) {
        grid-template-columns: 1fr 320px;
      }

      @media (max-width: 1000px) {
        grid-template-columns: 1fr;
      }
    }

    .details-column {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-lg);

      @media (max-width: 1000px) {
        grid-template-columns: 1fr;
      }
    }

    .details-column > .card--header,
    .details-column > .card--email,
    .details-column > .card--actions,
    .details-column > .card--activity {
      grid-column: 1 / -1;
    }

    /* Cards */
    .card {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: var(--space-xl);
      box-shadow: var(--shadow-card);
      border: 1px solid var(--color-border);
      animation: fadeInUp 0.4s ease backwards;
      transition: background-color var(--transition-slow), border-color var(--transition-slow);

      &:nth-child(1) { animation-delay: 0.05s; }
      &:nth-child(2) { animation-delay: 0.08s; }
      &:nth-child(3) { animation-delay: 0.11s; }
      &:nth-child(4) { animation-delay: 0.14s; }
      &:nth-child(5) { animation-delay: 0.17s; }
      &:nth-child(6) { animation-delay: 0.2s; }
      &:nth-child(7) { animation-delay: 0.23s; }
      &:nth-child(8) { animation-delay: 0.26s; }
      &:nth-child(9) { animation-delay: 0.29s; }
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
      transition: color var(--transition-slow);

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
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
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
      transition: color var(--transition-slow);
    }

    .period-year {
      font-size: 1.125rem;
      color: var(--color-text-secondary);
      transition: color var(--transition-slow);
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
      color: var(--color-text-tertiary);
      margin-bottom: var(--space-xs);
      transition: color var(--transition-slow);
    }

    .info-value {
      font-size: 0.9375rem;
      color: var(--color-text);
      transition: color var(--transition-slow);

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
      background: var(--color-fill-quaternary);
      border-radius: var(--radius-sm);
      color: var(--color-text-secondary);
      transition: background-color var(--transition-slow), color var(--transition-slow);
    }

    .billing-type-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      padding: var(--space-xs) var(--space-md);
      font-size: 0.8125rem;
      font-weight: 600;
      background: linear-gradient(135deg, var(--color-primary-subtle), rgba(99, 102, 241, 0.15));
      color: var(--color-primary);
      border-radius: var(--radius-full);
      border: 1px solid var(--color-primary-subtle);
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
      border-bottom: 1px solid var(--color-border);
      transition: border-color var(--transition-slow);

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
      transition: color var(--transition-slow);
    }

    .financial-value {
      font-family: var(--font-display);
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
      transition: color var(--transition-slow);

      &--total {
        font-size: 1.25rem;
        color: var(--color-primary);
      }
    }

    .currency-code {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-tertiary);
      margin-left: var(--space-xs);
      transition: color var(--transition-slow);
    }

    /* Email Draft */
    .card--email {
      background: var(--color-surface-secondary);
      border: 1px dashed var(--color-border);
      transition: background-color var(--transition-slow), border-color var(--transition-slow);
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
      transition: color var(--transition-slow);
    }

    .email-field__value {
      color: var(--color-text);
      transition: color var(--transition-slow);
    }

    .email-body {
      margin-top: var(--space-md);
      padding: var(--space-md);
      background: var(--color-surface);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      transition: background-color var(--transition-slow), border-color var(--transition-slow);

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
        transition: color var(--transition-slow);
      }
    }

    .email-actions {
      display: flex;
      gap: var(--space-sm);
      margin-top: var(--space-md);
    }

    .gmail-draft-section {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-md);
      margin-top: var(--space-lg);
      padding-top: var(--space-lg);
      border-top: 1px solid var(--color-border-subtle);
    }

    .attachment-selector {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      width: 100%;
      margin-bottom: var(--space-sm);
    }

    .attachment-selector__label {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      white-space: nowrap;

      svg {
        width: 14px;
        height: 14px;
        opacity: 0.7;
      }
    }

    .attachment-options {
      display: flex;
      gap: var(--space-xs);
      background: var(--color-fill-tertiary);
      padding: 3px;
      border-radius: var(--radius-md);
      transition: background-color var(--transition-slow);
    }

    .attachment-btn {
      padding: var(--space-xs) var(--space-md);
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--color-text);
      }

      &--active {
        background: var(--color-surface);
        color: var(--color-primary);
        box-shadow: var(--shadow-sm);
      }
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
      transition: background-color var(--transition-slow), border-color var(--transition-slow), color var(--transition-slow);

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-subtle);
      }

      option {
        background: var(--color-surface);
        color: var(--color-text);
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
      background: var(--color-surface);
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border);
      cursor: pointer;
      transition: all var(--transition-fast), background-color var(--transition-slow), border-color var(--transition-slow);

      &:hover {
        border-color: var(--color-text-tertiary);
        background: var(--color-fill-quaternary);
      }

      &--active {
        background: var(--color-primary);
        color: var(--color-primary-text);
        border-color: var(--color-primary);
      }
    }

    .status-btn__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;

      &--draft { background: var(--color-text-tertiary); }
      &--sent { background: var(--color-warning); }
      &--paid { background: var(--color-success); }
    }

    .status-btn--active .status-btn__dot {
      background: var(--color-primary-text);
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
      border: 1px solid var(--color-border);
      animation: fadeInUp 0.4s ease backwards;
      animation-delay: 0.1s;
      transition: background-color var(--transition-slow), border-color var(--transition-slow);
    }

    .pdf-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-lg) var(--space-xl);
      background: var(--color-surface-secondary);
      border-bottom: 1px solid var(--color-border);
      transition: background-color var(--transition-slow), border-color var(--transition-slow);
    }

    .pdf-header__left {
      display: flex;
      align-items: center;
      gap: var(--space-lg);
    }

    .pdf-title {
      font-family: var(--font-display);
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0;
      transition: color var(--transition-slow);
    }

    .pdf-tabs {
      display: flex;
      gap: var(--space-xs);
      background: var(--color-fill-tertiary);
      padding: 3px;
      border-radius: var(--radius-md);
      transition: background-color var(--transition-slow);
    }

    .pdf-tab {
      padding: var(--space-sm) var(--space-md);
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--color-text);
      }

      &--active {
        background: var(--color-surface);
        color: var(--color-primary);
        box-shadow: var(--shadow-sm);
      }
    }

    .pdf-container {
      height: 600px;
      background: #525659;
      position: relative;

      @media (max-width: 1200px) {
        height: 500px;
      }
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
        color: var(--color-primary-text);

        &:hover:not(:disabled) {
          background: var(--color-primary-hover);
        }
      }

      &--ghost {
        background: transparent;
        color: var(--color-text-secondary);
        border: 1px solid var(--color-border);
        transition: all var(--transition-fast), background-color var(--transition-slow), border-color var(--transition-slow);

        &:hover {
          background: var(--color-fill-quaternary);
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

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    /* Action Buttons */
    .card--actions {
      background: var(--color-surface-secondary);
      border: 1px dashed var(--color-border);
      transition: background-color var(--transition-slow), border-color var(--transition-slow);
    }

    /* Activity Card */
    .card--activity {
      background: var(--color-surface);
      max-height: 400px;
      overflow: hidden;
      display: flex;
      flex-direction: column;

      app-activity-timeline {
        flex: 1;
        overflow-y: auto;
        margin: 0 calc(-1 * var(--space-xl));
        padding: 0 var(--space-xl);
      }
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .archived-notice {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      margin-top: var(--space-md);
      padding: var(--space-md);
      background: var(--color-warning-subtle);
      color: var(--color-warning);
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: var(--radius-md);

      svg {
        width: 16px;
        height: 16px;
      }
    }

    /* CRM Sync Section */
    .crm-sync-section {
      margin-top: var(--space-lg);
      padding-top: var(--space-lg);
      border-top: 1px solid var(--color-border);
      transition: border-color var(--transition-slow);
    }

    .crm-sync-title {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-secondary);
      margin-bottom: var(--space-md);
      transition: color var(--transition-slow);

      svg {
        width: 16px;
        height: 16px;
      }
    }

    .crm-synced {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-md);
      background: var(--color-success-subtle);
      color: var(--color-success);
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: var(--radius-md);

      svg {
        width: 16px;
        height: 16px;
      }
    }

    .crm-synced-status {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      padding: var(--space-md) var(--space-lg);
      background: var(--color-success-subtle);
      color: var(--color-success);
      border-radius: var(--radius-md);
      width: 100%;

      svg {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }
    }

    .crm-synced-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .crm-synced-label {
      font-size: 0.875rem;
      font-weight: 600;
    }

    .crm-synced-date {
      font-size: 0.75rem;
      opacity: 0.8;
    }

    .crm-pdf-actions {
      margin-top: var(--space-md);
    }

    .crm-actions {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .btn--sm {
      padding: var(--space-sm) var(--space-md);
      font-size: 0.8125rem;
    }

    .crm-integration-selector {
      margin-bottom: var(--space-md);
    }

    .crm-select {
      width: 100%;
      padding: var(--space-sm) var(--space-md);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all var(--transition-fast), background-color var(--transition-slow), border-color var(--transition-slow);

      &:hover {
        border-color: var(--color-text-tertiary);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-subtle);
      }

      option {
        background: var(--color-surface);
        color: var(--color-text);
      }
    }

    .btn--crm {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      width: 100%;
      padding: var(--space-md) var(--space-lg);
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      font-weight: 500;
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
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
    @media (max-width: 1000px) {
      .preview-column {
        position: static;
      }

      .pdf-container {
        height: 400px;
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
  private router = inject(Router);
  private invoiceService = inject(InvoiceService);
  private notificationService = inject(NotificationService);
  googleService = inject(GoogleService);
  private integrationsService = inject(IntegrationsService);
  private crmService = inject(CRMService);
  private crmIntegrationService = inject(CRMIntegrationService);
  private sanitizer = inject(DomSanitizer);
  private activityLogService = inject(ActivityLogService);

  invoice = signal<Invoice | null>(null);
  emailDraft = signal<EmailDraft | null>(null);
  activityLogs = signal<ActivityLog[]>([]);
  isLoading = signal(true);
  isDownloading = signal(false);
  isPdfLoading = signal(false);
  isCreatingDraft = signal(false);
  isArchiving = signal(false);
  isDeleting = signal(false);
  isSyncingCRM = signal(false);
  selectedGoogleAccountId = signal<string | null>(null);
  googleEnabled = this.integrationsService.googleEnabled;
  crmStatus = signal<CRMStatus | null>(null);

  // CRM integrations
  crmIntegrations = signal<CRMIntegration[]>([]);
  selectedCrmIntegrationId = signal<string | null>(null);
  hasCrmIntegrations = computed(() => this.crmIntegrations().length > 0);
  isFetchingCrmPdf = signal(false);

  // PDF preview tabs and attachment selection
  activePdfTab = signal<'local' | 'crm'>('local');
  selectedAttachment = signal<'local' | 'crm' | 'none'>('local');
  private crmPdfObjectUrl: string | null = null;
  private rawCrmPdfUrl = signal<string | null>(null);
  isCrmPdfLoading = signal(false);
  crmPdfUrl = computed(() => {
    const url = this.rawCrmPdfUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });
  hasCrmPdf = computed(() => !!this.invoice()?.crmPdfPath);

  // Detect if invoice is fixed amount (no hours/rate, but has amount)
  isFixedAmountInvoice = computed(() => {
    const inv = this.invoice();
    if (!inv) return false;
    const hours = Number(inv.hoursWorked) || 0;
    const rate = Number(inv.hourlyRate) || 0;
    const amount = Number(inv.amount) || 0;
    // It's a fixed amount invoice if hours and rate are 0 but amount exists
    return hours === 0 && rate === 0 && amount > 0;
  });

  // Helper to build client address from structured fields
  getClientAddress(): string {
    const client = this.invoice()?.task?.client;
    if (!client) return '';
    const parts = [
      client.streetAddress,
      [client.postcode, client.city].filter(Boolean).join(' '),
      client.country
    ].filter(Boolean);
    return parts.join(', ');
  }

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
    // Fetch integration status to check if Google is enabled
    this.integrationsService.fetchPublicStatus();
    // Load user's connected Google accounts
    this.googleService.fetchAccounts();
    // Check CRM status
    this.crmService.getStatus().subscribe(status => {
      this.crmStatus.set(status);
    });
    // Load available CRM integrations
    this.crmIntegrationService.getIntegrations().subscribe(integrations => {
      this.crmIntegrations.set(integrations.filter(i => i.isActive));
    });
  }

  ngOnDestroy() {
    if (this.objectUrl) {
      window.URL.revokeObjectURL(this.objectUrl);
    }
    if (this.crmPdfObjectUrl) {
      window.URL.revokeObjectURL(this.crmPdfObjectUrl);
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
        this.loadActivityLogs(id);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.notificationService.error('Failed to load invoice');
      }
    });
  }

  loadActivityLogs(invoiceId: string) {
    this.activityLogService.getInvoiceActivity(invoiceId).subscribe({
      next: (logs) => this.activityLogs.set(logs),
      error: () => console.error('Failed to load activity logs')
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
        this.loadActivityLogs(inv.id);
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

    // Use client's googleAccountId, or selected one, or first available account
    const googleAccountId = inv?.task?.client?.googleAccountId
      || this.selectedGoogleAccountId()
      || (accounts.length === 1 ? accounts[0].id : null);

    if (!googleAccountId || !draft) {
      this.notificationService.error('Please select a Google account to use');
      return;
    }

    this.isCreatingDraft.set(true);

    this.googleService.createDraft({
      googleAccountId,
      to: inv?.task?.client?.billingEmail || inv?.task?.client?.email || '',
      subject: draft.subject,
      body: draft.body,
      invoiceId: inv?.id,
      attachmentSource: this.selectedAttachment()
    }).subscribe({
      next: (response) => {
        this.isCreatingDraft.set(false);
        this.loadActivityLogs(inv!.id);
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

  archiveInvoice() {
    const inv = this.invoice();
    if (!inv) return;

    if (!confirm('Are you sure you want to archive this invoice?')) return;

    this.isArchiving.set(true);
    this.invoiceService.archiveInvoice(inv.id).subscribe({
      next: (updated) => {
        this.invoice.set(updated);
        this.isArchiving.set(false);
        this.loadActivityLogs(inv.id);
        this.notificationService.success('Invoice archived');
      },
      error: () => {
        this.isArchiving.set(false);
        this.notificationService.error('Failed to archive invoice');
      }
    });
  }

  unarchiveInvoice() {
    const inv = this.invoice();
    if (!inv) return;

    this.isArchiving.set(true);
    this.invoiceService.unarchiveInvoice(inv.id).subscribe({
      next: (updated) => {
        this.invoice.set(updated);
        this.isArchiving.set(false);
        this.loadActivityLogs(inv.id);
        this.notificationService.success('Invoice restored from archive');
      },
      error: () => {
        this.isArchiving.set(false);
        this.notificationService.error('Failed to restore invoice');
      }
    });
  }

  deleteInvoice() {
    const inv = this.invoice();
    if (!inv) return;

    if (!confirm('Are you sure you want to permanently delete this invoice? This action cannot be undone.')) return;

    this.isDeleting.set(true);
    this.invoiceService.deleteInvoice(inv.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.notificationService.success('Invoice deleted');
        this.router.navigate(['/invoices']);
      },
      error: () => {
        this.isDeleting.set(false);
        this.notificationService.error('Failed to delete invoice');
      }
    });
  }

  syncToCRM(integrationId?: string) {
    const inv = this.invoice();
    if (!inv) return;

    // Use selected integration, or provided integrationId, or task's default
    const selectedId = integrationId || this.selectedCrmIntegrationId() || undefined;

    this.isSyncingCRM.set(true);
    this.crmService.syncInvoice(inv.id, selectedId).subscribe({
      next: (result) => {
        this.isSyncingCRM.set(false);
        if (result.success) {
          this.notificationService.success(result.message);
          // Update the local invoice with CRM ID and sync date
          this.invoice.update(i => i ? {
            ...i,
            crmInvoiceId: result.crmInvoiceId,
            crmSyncedAt: new Date().toISOString()
          } : null);
          this.loadActivityLogs(inv.id);
        } else {
          this.notificationService.error(result.message || 'Failed to sync to CRM');
          console.error('CRM sync error:', result.error);
        }
      },
      error: (err) => {
        this.isSyncingCRM.set(false);
        this.notificationService.error('Failed to sync to CRM');
        console.error('CRM sync error:', err);
      }
    });
  }

  selectCrmIntegration(integrationId: string | null) {
    this.selectedCrmIntegrationId.set(integrationId);
  }

  getActiveCrmName(): string {
    const integrations = this.crmIntegrations();
    if (integrations.length === 0) return 'CRM';
    if (integrations.length === 1) return integrations[0].name;

    const selectedId = this.selectedCrmIntegrationId();
    if (selectedId) {
      const selected = integrations.find(i => i.id === selectedId);
      if (selected) return selected.name;
    }
    return integrations[0].name;
  }

  fetchCrmPdf() {
    const inv = this.invoice();
    if (!inv) return;

    const selectedId = this.selectedCrmIntegrationId() || undefined;

    this.isFetchingCrmPdf.set(true);
    this.invoiceService.fetchPdfFromCRM(inv.id, selectedId).subscribe({
      next: (result) => {
        this.isFetchingCrmPdf.set(false);
        if (result.success) {
          this.notificationService.success('PDF downloaded from CRM');
          // Update local invoice state to reflect the new PDF
          this.invoice.update(i => i ? { ...i, crmPdfUrl: result.pdfUrl, crmPdfPath: result.pdfPath } : null);
          // Load CRM PDF preview
          this.loadCrmPdfPreview(inv.id);
          this.loadActivityLogs(inv.id);
        } else {
          this.notificationService.error(result.message || 'Failed to fetch PDF from CRM');
        }
      },
      error: (err) => {
        this.isFetchingCrmPdf.set(false);
        this.notificationService.error('Failed to fetch PDF from CRM');
        console.error('CRM fetch PDF error:', err);
      }
    });
  }

  downloadCrmPdf() {
    const inv = this.invoice();
    if (!inv) return;

    this.invoiceService.downloadCrmPdf(inv.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `crm-${inv.number}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.notificationService.success('CRM PDF downloaded!');
      },
      error: () => {
        this.notificationService.error('Failed to download CRM PDF');
      }
    });
  }

  loadCrmPdfPreview(invoiceId: string) {
    this.isCrmPdfLoading.set(true);
    this.invoiceService.downloadCrmPdf(invoiceId).subscribe({
      next: (blob) => {
        if (this.crmPdfObjectUrl) {
          window.URL.revokeObjectURL(this.crmPdfObjectUrl);
        }
        this.crmPdfObjectUrl = window.URL.createObjectURL(blob);
        this.rawCrmPdfUrl.set(this.crmPdfObjectUrl);
        this.isCrmPdfLoading.set(false);
      },
      error: () => {
        this.isCrmPdfLoading.set(false);
      }
    });
  }

  switchPdfTab(tab: 'local' | 'crm') {
    this.activePdfTab.set(tab);
    // Load CRM PDF preview if switching to CRM tab and not loaded yet
    const inv = this.invoice();
    if (tab === 'crm' && inv?.crmPdfPath && !this.rawCrmPdfUrl()) {
      this.loadCrmPdfPreview(inv.id);
    }
  }

  selectAttachmentSource(source: 'local' | 'crm' | 'none') {
    this.selectedAttachment.set(source);
  }
}
