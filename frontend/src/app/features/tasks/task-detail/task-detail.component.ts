import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TaskService, Task, Invoice } from '../../../core/services/task.service';
import { InvoiceService } from '../../../core/services/invoice.service';
import { ActivityLogService, ActivityLog } from '../../../core/services/activity-log.service';
import { ActivityTimelineComponent } from '../../../shared/components/activity-timeline/activity-timeline.component';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ActivityTimelineComponent],
  template: `
    <div class="page">
      <div class="page__container">
        <!-- Back Navigation -->
        <nav class="breadcrumb">
          <a routerLink="/dashboard" class="breadcrumb__link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Dashboard
          </a>
          <span class="breadcrumb__separator">/</span>
          <span class="breadcrumb__current">{{ task()?.name || 'Task' }}</span>
        </nav>

        @if (loading()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading task details...</p>
          </div>
        } @else if (task()) {
          <!-- Task Header Card -->
          <header class="task-header" style="animation-delay: 0.1s">
            <div class="task-header__main">
              <div class="task-header__badge">
                <span class="type-badge">Invoice Task</span>
                @if (task()!.isActive) {
                  <span class="status-dot status-dot--active"></span>
                } @else {
                  <span class="status-dot status-dot--inactive"></span>
                }
              </div>
              <h1 class="task-header__title">{{ task()!.name }}</h1>
              <div class="task-header__meta">
                @if (task()!.client?.name) {
                  <span class="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <a [routerLink]="['/clients', task()!.client!.id]" class="meta-link">{{ task()!.client!.name }}</a>
                  </span>
                }
                @if (task()!.client?.email) {
                  <span class="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                    {{ task()!.client!.email }}
                  </span>
                }
              </div>
            </div>

            <div class="task-header__details">
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">Warning Day</span>
                  <span class="detail-value">
                    <span class="day-badge day-badge--warning">{{ task()!.warningDate }}</span>
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Deadline Day</span>
                  <span class="detail-value">
                    <span class="day-badge day-badge--deadline">{{ task()!.deadlineDate }}</span>
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Total Invoices</span>
                  <span class="detail-value">{{ invoices().length }}</span>
                </div>
                @if (task()!.client?.hourlyRate) {
                  <div class="detail-item">
                    <span class="detail-label">Hourly Rate</span>
                    <span class="detail-value detail-value--highlight">{{ task()!.client!.currency || 'USD' }} {{ task()!.client!.hourlyRate }}</span>
                  </div>
                }
              </div>

              @if (clientAddress()) {
                <div class="address-block">
                  <span class="detail-label">Client Address</span>
                  <p class="address-text">{{ clientAddress() }}</p>
                </div>
              }
            </div>

            <div class="task-header__actions">
              <a [routerLink]="['/tasks/invoices', task()!.id, 'edit']" class="btn btn--secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                </svg>
                Edit Task
              </a>
            </div>
          </header>

          <!-- Invoice History Section -->
          <section class="invoice-section" style="animation-delay: 0.2s">
            <div class="section-header">
              <h2 class="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                Invoice History
              </h2>
              <span class="invoice-count">{{ invoices().length }} invoice{{ invoices().length !== 1 ? 's' : '' }}</span>
            </div>

            @if (invoices().length === 0) {
              <div class="empty-state">
                <div class="empty-state__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                </div>
                <h3 class="empty-state__title">No invoices yet</h3>
                <p class="empty-state__text">Generate your first invoice from the dashboard to see it here.</p>
                <a routerLink="/dashboard" class="btn btn--primary">
                  Go to Dashboard
                </a>
              </div>
            } @else {
              <div class="timeline">
                <div class="timeline__line"></div>

                @for (invoice of invoices(); track invoice.id; let i = $index) {
                  <article class="invoice-card" [style.animation-delay]="(0.3 + i * 0.1) + 's'">
                    <div class="timeline__dot" [class]="'timeline__dot--' + invoice.status.toLowerCase()"></div>

                    <div class="invoice-card__content">
                      <div class="invoice-card__header">
                        <div class="invoice-card__title-row">
                          <span class="invoice-number">#{{ invoice.number }}</span>
                          <span class="invoice-period">{{ getMonthName(invoice.invoiceMonth) }} {{ invoice.invoiceYear }}</span>
                        </div>
                        <span class="status-badge" [class]="'status-badge--' + invoice.status.toLowerCase()">
                          {{ invoice.status }}
                        </span>
                      </div>

                      <div class="invoice-card__body">
                        <div class="invoice-stats">
                          <div class="stat">
                            <span class="stat__label">Amount</span>
                            <span class="stat__value stat__value--primary">\${{ invoice.amount }}</span>
                          </div>
                          <div class="stat">
                            <span class="stat__label">Hours</span>
                            <span class="stat__value">{{ invoice.hoursWorked || 0 }}h</span>
                          </div>
                          <div class="stat">
                            <span class="stat__label">Rate</span>
                            <span class="stat__value">\${{ invoice.hourlyRate || 0 }}/h</span>
                          </div>
                          <div class="stat">
                            <span class="stat__label">Created</span>
                            <span class="stat__value">{{ formatDate(invoice.createdAt) }}</span>
                          </div>
                        </div>

                        <div class="invoice-card__controls">
                          <div class="control-group">
                            <label class="control-label">Status</label>
                            <select
                              class="status-select"
                              [value]="invoice.status"
                              (change)="onStatusChange(invoice.id, $event)"
                              [disabled]="updatingStatus() === invoice.id"
                            >
                              <option value="DRAFT">Draft</option>
                              <option value="SENT">Sent</option>
                              <option value="PAID">Paid</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                          </div>

                          <div class="control-group control-group--actions">
                            <button
                              class="action-btn action-btn--download"
                              (click)="downloadPdf(invoice)"
                              [disabled]="!invoice.pdfPath"
                              title="Download PDF"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                              PDF
                            </button>
                            <button
                              class="action-btn action-btn--email"
                              (click)="copyEmailDraft(invoice)"
                              title="Copy email draft"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                              </svg>
                              Email
                            </button>
                          </div>
                        </div>

                        <!-- Comments Section -->
                        <div class="comments-section">
                          <button
                            class="comments-toggle"
                            (click)="toggleComments(invoice.id)"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            {{ invoice.comments ? 'View' : 'Add' }} Comments
                            <svg
                              class="chevron"
                              [class.chevron--open]="expandedComments().has(invoice.id)"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                            >
                              <polyline points="6 9 12 15 18 9"/>
                            </svg>
                          </button>

                          @if (expandedComments().has(invoice.id)) {
                            <div class="comments-content">
                              <textarea
                                class="comments-textarea"
                                [value]="invoice.comments || ''"
                                (input)="onCommentsInput(invoice.id, $event)"
                                placeholder="Add notes about this invoice..."
                                rows="3"
                              ></textarea>
                              <button
                                class="save-comments-btn"
                                (click)="saveComments(invoice.id)"
                                [disabled]="savingComments() === invoice.id"
                              >
                                @if (savingComments() === invoice.id) {
                                  <span class="spinner"></span>
                                  Saving...
                                } @else {
                                  Save
                                }
                              </button>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  </article>
                }
              </div>
            }
          </section>

          <!-- Activity History Section -->
          <section class="activity-section" style="animation-delay: 0.3s">
            <div class="section-header">
              <h2 class="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
                Activity History
              </h2>
              <span class="invoice-count">{{ activityLogs().length }} entries</span>
            </div>

            <app-activity-timeline [activityLogs]="activityLogs()"></app-activity-timeline>
          </section>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: var(--font-body);
    }

    .page {
      min-height: 100vh;
      background: var(--color-bg);
      padding: var(--space-xl);
      transition: background-color var(--transition-slow);
    }

    .page__container {
      max-width: 900px;
      margin: 0 auto;
    }

    /* Breadcrumb Navigation */
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      margin-bottom: var(--space-xl);
      font-family: var(--font-display);
      font-size: 0.875rem;
    }

    .breadcrumb__link {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      color: var(--color-text-secondary);
      text-decoration: none;
      transition: color var(--transition-fast);

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover {
        color: var(--color-primary);
      }
    }

    .breadcrumb__separator {
      color: var(--color-text-tertiary);
    }

    .breadcrumb__current {
      color: var(--color-text);
      font-weight: 500;
    }

    /* Loading State */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-3xl);
      color: var(--color-text-secondary);
      font-family: var(--font-display);
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: var(--space-lg);
    }

    /* Task Header Card */
    .task-header {
      background: var(--color-surface);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-card);
      padding: var(--space-2xl);
      margin-bottom: var(--space-2xl);
      animation: slideUp 0.5s ease backwards;
      position: relative;
      overflow: hidden;
      transition: background-color var(--transition-slow), box-shadow var(--transition-slow);

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, var(--color-primary), var(--color-primary-hover));
      }
    }

    .task-header__badge {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      margin-bottom: var(--space-md);
    }

    .type-badge {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-primary);
      background: var(--color-primary-subtle);
      padding: var(--space-xs) var(--space-md);
      border-radius: var(--radius-sm);
      letter-spacing: 0.02em;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;

      &--active {
        background: var(--color-success);
        box-shadow: 0 0 0 3px var(--color-success-subtle);
      }

      &--inactive {
        background: var(--color-text-tertiary);
      }
    }

    .task-header__title {
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0 0 var(--space-md);
      line-height: 1.2;
    }

    .task-header__meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-lg);
      margin-bottom: var(--space-xl);
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      font-family: var(--font-display);
      font-size: 0.9375rem;
      color: var(--color-text-secondary);

      svg {
        width: 16px;
        height: 16px;
        opacity: 0.7;
      }
    }

    .meta-link {
      color: var(--color-primary);
      text-decoration: none;
      transition: opacity var(--transition-fast);

      &:hover {
        opacity: 0.8;
        text-decoration: underline;
      }
    }

    .task-header__details {
      padding-top: var(--space-xl);
      border-top: 1px solid var(--color-fill-quaternary);
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: var(--space-lg);
      margin-bottom: var(--space-lg);
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .detail-label {
      font-family: var(--font-display);
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .detail-value {
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);

      &--highlight {
        color: var(--color-primary);
        font-family: var(--font-mono);
      }
    }

    .day-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: 0.875rem;
      font-weight: 600;

      &--warning {
        background: var(--color-warning-subtle);
        color: var(--color-warning);
      }

      &--deadline {
        background: var(--color-danger-subtle);
        color: var(--color-danger);
      }
    }

    .address-block {
      padding-top: var(--space-lg);
      border-top: 1px solid var(--color-fill-quaternary);
    }

    .address-text {
      margin: var(--space-sm) 0 0;
      font-family: var(--font-display);
      font-size: 0.9375rem;
      color: var(--color-text-secondary);
      line-height: 1.5;
      white-space: pre-line;
    }

    .task-header__actions {
      display: flex;
      justify-content: flex-end;
      padding-top: var(--space-xl);
      margin-top: var(--space-lg);
      border-top: 1px solid var(--color-fill-quaternary);
    }

    /* Invoice Section */
    .invoice-section,
    .activity-section {
      animation: slideUp 0.5s ease backwards;
      margin-bottom: var(--space-2xl);
    }

    .activity-section {
      margin-bottom: 0;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-xl);
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0;

      svg {
        width: 24px;
        height: 24px;
        color: var(--color-primary);
      }
    }

    .invoice-count {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      color: var(--color-text-tertiary);
      background: var(--color-fill-quaternary);
      padding: var(--space-xs) var(--space-md);
      border-radius: var(--radius-sm);
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--color-surface);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-card);
      padding: var(--space-3xl);
      text-align: center;
      transition: background-color var(--transition-slow), box-shadow var(--transition-slow);
    }

    .empty-state__icon {
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-fill-quaternary);
      border-radius: var(--radius-lg);
      margin-bottom: var(--space-xl);

      svg {
        width: 32px;
        height: 32px;
        color: var(--color-text-tertiary);
      }
    }

    .empty-state__title {
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0 0 var(--space-sm);
    }

    .empty-state__text {
      font-family: var(--font-display);
      font-size: 0.9375rem;
      color: var(--color-text-secondary);
      margin: 0 0 var(--space-xl);
      max-width: 300px;
    }

    /* Timeline */
    .timeline {
      position: relative;
      padding-left: 40px;
    }

    .timeline__line {
      position: absolute;
      left: 15px;
      top: 24px;
      bottom: 24px;
      width: 2px;
      background: linear-gradient(180deg, var(--color-primary) 0%, var(--color-border) 100%);
      border-radius: 1px;
    }

    .timeline__dot {
      position: absolute;
      left: -33px;
      top: 28px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 3px solid var(--color-surface);
      box-shadow: var(--shadow-sm);
      z-index: 1;

      &--draft {
        background: var(--color-text-tertiary);
      }

      &--sent {
        background: var(--color-primary);
      }

      &--paid {
        background: var(--color-success);
      }

      &--cancelled {
        background: var(--color-danger);
      }
    }

    /* Invoice Card */
    .invoice-card {
      position: relative;
      margin-bottom: var(--space-xl);
      animation: slideUp 0.5s ease backwards;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .invoice-card__content {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      overflow: hidden;
      transition: background-color var(--transition-slow), box-shadow var(--transition-base), transform var(--transition-base);

      &:hover {
        box-shadow: var(--shadow-lg);
        transform: translateY(-2px);
      }
    }

    .invoice-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-lg) var(--space-xl);
      background: var(--color-fill-quaternary);
      border-bottom: 1px solid var(--color-border);
    }

    .invoice-card__title-row {
      display: flex;
      align-items: baseline;
      gap: var(--space-md);
    }

    .invoice-number {
      font-family: var(--font-mono);
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-text);
    }

    .invoice-period {
      font-family: var(--font-display);
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }

    /* Status Badge */
    .status-badge {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: var(--space-xs) var(--space-md);
      border-radius: var(--radius-sm);

      &--draft {
        background: var(--color-border);
        color: var(--color-text-secondary);
      }

      &--sent {
        background: var(--color-primary-subtle);
        color: var(--color-primary);
      }

      &--paid {
        background: var(--color-success-subtle);
        color: var(--color-success);
      }

      &--cancelled {
        background: var(--color-danger-subtle);
        color: var(--color-danger);
      }
    }

    .invoice-card__body {
      padding: var(--space-xl);
    }

    /* Invoice Stats */
    .invoice-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-lg);
      margin-bottom: var(--space-xl);
      padding-bottom: var(--space-xl);
      border-bottom: 1px solid var(--color-fill-quaternary);
    }

    .stat {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .stat__label {
      font-family: var(--font-display);
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat__value {
      font-family: var(--font-display);
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);

      &--primary {
        color: var(--color-primary);
        font-family: var(--font-mono);
        font-size: 1.125rem;
      }
    }

    /* Controls */
    .invoice-card__controls {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--space-lg);
      flex-wrap: wrap;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);

      &--actions {
        flex-direction: row;
        align-items: center;
      }
    }

    .control-label {
      font-family: var(--font-display);
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .status-select {
      font-family: var(--font-display);
      font-size: 0.875rem;
      padding: var(--space-sm) var(--space-md);
      padding-right: var(--space-2xl);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      transition: border-color var(--transition-fast);

      &:hover {
        border-color: var(--color-text-tertiary);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-subtle);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    /* Action Buttons */
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      font-family: var(--font-display);
      font-size: 0.8125rem;
      font-weight: 500;
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 14px;
        height: 14px;
      }

      &:hover:not(:disabled) {
        border-color: var(--color-text-tertiary);
        color: var(--color-text);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &--download:hover:not(:disabled) {
        border-color: var(--color-primary);
        color: var(--color-primary);
        background: var(--color-primary-subtle);
      }

      &--email:hover:not(:disabled) {
        border-color: var(--color-success);
        color: var(--color-success);
        background: var(--color-success-subtle);
      }
    }

    /* Comments Section */
    .comments-section {
      margin-top: var(--space-lg);
      padding-top: var(--space-lg);
      border-top: 1px solid var(--color-fill-quaternary);
    }

    .comments-toggle {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-family: var(--font-display);
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      transition: color var(--transition-fast);

      svg {
        width: 16px;
        height: 16px;
      }

      .chevron {
        margin-left: auto;
        transition: transform var(--transition-fast);

        &--open {
          transform: rotate(180deg);
        }
      }

      &:hover {
        color: var(--color-primary);
      }
    }

    .comments-content {
      margin-top: var(--space-md);
      animation: slideDown 0.2s ease;
    }

    .comments-textarea {
      width: 100%;
      font-family: var(--font-display);
      font-size: 0.875rem;
      padding: var(--space-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg);
      color: var(--color-text);
      resize: vertical;
      min-height: 80px;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

      &::placeholder {
        color: var(--color-text-tertiary);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-subtle);
      }
    }

    .save-comments-btn {
      margin-top: var(--space-sm);
      font-family: var(--font-display);
      font-size: 0.8125rem;
      font-weight: 500;
      padding: var(--space-sm) var(--space-lg);
      border-radius: var(--radius-sm);
      background: var(--color-primary);
      color: var(--color-primary-text);
      border: none;
      cursor: pointer;
      transition: background-color var(--transition-fast), color var(--transition-fast);
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);

      &:hover:not(:disabled) {
        background: var(--color-primary-hover);
      }

      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
    }

    .spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: var(--color-primary-text);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      font-family: var(--font-display);
      font-size: 0.9375rem;
      font-weight: 500;
      padding: var(--space-md) var(--space-xl);
      border-radius: var(--radius-md);
      text-decoration: none;
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 18px;
        height: 18px;
      }

      &--primary {
        background: var(--color-primary);
        color: var(--color-primary-text);
        border: none;

        &:hover {
          background: var(--color-primary-hover);
        }
      }

      &--secondary {
        background: var(--color-surface);
        color: var(--color-text);
        border: 1px solid var(--color-border);

        &:hover {
          background: var(--color-fill-quaternary);
          border-color: var(--color-text-tertiary);
        }
      }
    }

    /* Animations */
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
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
    @media (max-width: 640px) {
      .page {
        padding: var(--space-md);
      }

      .task-header {
        padding: var(--space-lg);
      }

      .task-header__title {
        font-size: 1.5rem;
      }

      .detail-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .invoice-stats {
        grid-template-columns: repeat(2, 1fr);
      }

      .invoice-card__controls {
        flex-direction: column;
        align-items: stretch;
      }

      .control-group--actions {
        justify-content: flex-start;
      }

      .timeline {
        padding-left: 32px;
      }

      .timeline__line {
        left: 11px;
      }

      .timeline__dot {
        left: -25px;
      }
    }
  `]
})
export class TaskDetailComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private taskService = inject(TaskService);
  private invoiceService = inject(InvoiceService);
  private activityLogService = inject(ActivityLogService);

  loading = signal(true);
  task = signal<Task | null>(null);
  invoices = signal<Invoice[]>([]);
  activityLogs = signal<ActivityLog[]>([]);
  expandedComments = signal<Set<string>>(new Set());
  updatingStatus = signal<string | null>(null);
  savingComments = signal<string | null>(null);
  commentDrafts = new Map<string, string>();

  clientAddress = computed(() => {
    const client = this.task()?.client;
    if (!client) return '';
    const parts = [
      client.streetAddress,
      [client.postcode, client.city].filter(Boolean).join(' '),
      client.country
    ].filter(Boolean);
    return parts.join('\n');
  });

  ngOnInit() {
    const taskId = this.route.snapshot.paramMap.get('id');
    if (taskId) {
      this.loadTask(taskId);
    }
  }

  private loadTask(id: string) {
    this.loading.set(true);
    this.taskService.getTask(id).subscribe({
      next: (task) => {
        this.task.set(task);
        this.invoices.set(task.invoices || []);
        this.loading.set(false);
        this.loadActivityLogs(id);
      },
      error: () => {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  private loadActivityLogs(taskId: string) {
    this.activityLogService.getTaskActivity(taskId).subscribe({
      next: (logs) => this.activityLogs.set(logs),
      error: (err) => console.error('Failed to load activity logs:', err)
    });
  }

  getMonthName(month: number | undefined): string {
    if (month === undefined || month === null) return 'N/A';
    return MONTH_NAMES[month] || 'N/A';
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  onStatusChange(invoiceId: string, event: Event) {
    const select = event.target as HTMLSelectElement;
    const newStatus = select.value as Invoice['status'];

    this.updatingStatus.set(invoiceId);
    this.invoiceService.updateStatus(invoiceId, newStatus).subscribe({
      next: (updated) => {
        this.invoices.update(list =>
          list.map(inv => inv.id === invoiceId ? { ...inv, status: updated.status } : inv)
        );
        this.updatingStatus.set(null);
        const taskId = this.task()?.id;
        if (taskId) this.loadActivityLogs(taskId);
      },
      error: () => {
        this.updatingStatus.set(null);
      }
    });
  }

  toggleComments(invoiceId: string) {
    this.expandedComments.update(set => {
      const newSet = new Set(set);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  }

  onCommentsInput(invoiceId: string, event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.commentDrafts.set(invoiceId, textarea.value);
  }

  saveComments(invoiceId: string) {
    const comments = this.commentDrafts.get(invoiceId);
    if (comments === undefined) return;

    this.savingComments.set(invoiceId);
    this.invoiceService.updateComments(invoiceId, comments).subscribe({
      next: (updated) => {
        this.invoices.update(list =>
          list.map(inv => inv.id === invoiceId ? { ...inv, comments: updated.comments } : inv)
        );
        this.savingComments.set(null);
        const taskId = this.task()?.id;
        if (taskId) this.loadActivityLogs(taskId);
      },
      error: () => {
        this.savingComments.set(null);
      }
    });
  }

  downloadPdf(invoice: Invoice) {
    if (!invoice.pdfPath) return;

    this.invoiceService.downloadPdf(invoice.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${this.getMonthName(invoice.invoiceMonth)}-${invoice.invoiceYear}-${invoice.number}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    });
  }

  copyEmailDraft(invoice: Invoice) {
    this.invoiceService.getEmailDraft(invoice.id).subscribe({
      next: (draft) => {
        const emailContent = `To: ${draft.to}\nSubject: ${draft.subject}\n\n${draft.body}`;
        navigator.clipboard.writeText(emailContent).then(() => {
          // Could add toast notification here
          console.log('Email draft copied to clipboard');
        });
      }
    });
  }
}
