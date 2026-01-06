import { Component, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { TaskService, Task } from '../../core/services/task.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { DashboardService, DashboardEvent, DashboardStats } from '../../core/services/dashboard.service';
import { ReminderService } from '../../core/services/reminder.service';
import { ToastComponent } from '../../shared/components/toast/toast.component';
import { InvoiceModalComponent, InvoiceGenerationData } from '../../shared/components/invoice-modal/invoice-modal.component';

type TimePeriod = 'today' | 'tomorrow' | 'week' | 'month' | 'later';

interface GroupedEvents {
  date: Date;
  dateLabel: string;
  isToday: boolean;
  isTomorrow: boolean;
  events: DashboardEvent[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ToastComponent, InvoiceModalComponent],
  template: `
    <app-toast />
    <app-invoice-modal
      #invoiceModal
      [task]="selectedTask()"
      (onGenerate)="handleInvoiceGenerate($event)"
      (onClose)="selectedTask.set(null)"
    />

    <div class="dashboard">
      <!-- Header -->
      <header class="header">
        <div class="header__content">
          <div class="header__greeting">
            <h1 class="header__title">{{ greeting() }}, {{ userName() }}</h1>
            <p class="header__subtitle">{{ todayFormatted() }}</p>
          </div>
          <div class="header__actions">
            <a routerLink="/tasks/reminders/new" class="btn btn--ghost">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              New Reminder
            </a>
            <a routerLink="/tasks/new" class="btn btn--primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Task
            </a>
          </div>
        </div>
      </header>

      <!-- Stats Cards -->
      <section class="stats">
        <div class="stat-card stat-card--reminders" [style.animation-delay]="'0ms'">
          <div class="stat-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
          </div>
          <div class="stat-card__content">
            <span class="stat-card__value">{{ stats()?.activeReminders || 0 }}</span>
            <span class="stat-card__label">Active Reminders</span>
          </div>
        </div>

        <div class="stat-card stat-card--today" [style.animation-delay]="'50ms'">
          <div class="stat-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div class="stat-card__content">
            <span class="stat-card__value">{{ todayEventsCount() }}</span>
            <span class="stat-card__label">Today's Events</span>
          </div>
        </div>

        <div class="stat-card stat-card--invoices" [style.animation-delay]="'100ms'">
          <div class="stat-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div class="stat-card__content">
            <span class="stat-card__value">{{ stats()?.unpaidInvoices || 0 }}</span>
            <span class="stat-card__label">Unpaid Invoices</span>
          </div>
        </div>

        <div class="stat-card stat-card--total" [style.animation-delay]="'150ms'">
          <div class="stat-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <div class="stat-card__content">
            <span class="stat-card__value">{{ formatCurrency(stats()?.monthlyTotal || 0) }}</span>
            <span class="stat-card__label">This Month</span>
          </div>
        </div>
      </section>

      <!-- Agenda Section -->
      <section class="agenda">
        <div class="agenda__header">
          <h2 class="agenda__title">Agenda</h2>
          <div class="period-tabs">
            @for (period of periods; track period.value) {
              <button
                class="period-tab"
                [class.period-tab--active]="selectedPeriod() === period.value"
                (click)="selectedPeriod.set(period.value)"
              >
                {{ period.label }}
                @if (getEventCountForPeriod(period.value) > 0) {
                  <span class="period-tab__badge">{{ getEventCountForPeriod(period.value) }}</span>
                }
              </button>
            }
          </div>
        </div>

        @if (isLoading()) {
          <div class="loading">
            <div class="loading__spinner"></div>
            <p>Loading events...</p>
          </div>
        } @else if (filteredGroupedEvents().length === 0) {
          <div class="empty-state">
            <div class="empty-state__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <path d="M9 16l2 2 4-4"/>
              </svg>
            </div>
            <h3>All clear!</h3>
            <p>No events {{ getPeriodDescription() }}. Enjoy your free time!</p>
          </div>
        } @else {
          <div class="timeline">
            @for (group of filteredGroupedEvents(); track group.dateLabel; let groupIdx = $index) {
              <div class="date-group" [style.animation-delay]="groupIdx * 100 + 'ms'">
                <div class="date-group__header">
                  <div class="date-group__line"></div>
                  <span class="date-group__label" [class.date-group__label--today]="group.isToday">
                    @if (group.isToday) {
                      Today
                    } @else if (group.isTomorrow) {
                      Tomorrow
                    } @else {
                      {{ group.dateLabel }}
                    }
                  </span>
                </div>

                <div class="events-list">
                  @for (event of group.events; track event.id; let eventIdx = $index) {
                    <div
                      class="event-card"
                      [class]="'event-card--' + event.type"
                      [class.event-card--overdue]="event.status === 'overdue'"
                      [style.animation-delay]="(groupIdx * 100 + eventIdx * 50) + 'ms'"
                    >
                      <div class="event-card__indicator"></div>

                      <div class="event-card__icon">
                        @switch (event.type) {
                          @case ('reminder') {
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                              <path d="M13.73 21a2 2 0 01-3.46 0"/>
                            </svg>
                          }
                          @case ('invoice_warning') {
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <circle cx="12" cy="12" r="10"/>
                              <path d="M12 6v6l4 2"/>
                            </svg>
                          }
                          @case ('invoice_deadline') {
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                              <line x1="12" y1="9" x2="12" y2="13"/>
                              <line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                          }
                          @case ('invoice_due') {
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                              <line x1="12" y1="18" x2="12" y2="12"/>
                              <line x1="9" y1="15" x2="15" y2="15"/>
                            </svg>
                          }
                        }
                      </div>

                      <div class="event-card__content">
                        <div class="event-card__header">
                          <h4 class="event-card__title">{{ event.title }}</h4>
                          <div class="event-card__badges">
                            @if (event.status === 'overdue') {
                              <span class="badge badge--danger">Overdue</span>
                            } @else if (event.status === 'today') {
                              <span class="badge badge--warning">Today</span>
                            }
                            @if (event.type === 'reminder' && event.reminderScheduleType && event.reminderScheduleType !== 'ONE_TIME') {
                              <span class="badge badge--info">{{ getScheduleLabel(event.reminderScheduleType) }}</span>
                            }
                          </div>
                        </div>
                        @if (event.subtitle) {
                          <p class="event-card__subtitle">{{ event.subtitle }}</p>
                        }
                        <div class="event-card__meta">
                          <span class="event-card__time">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <circle cx="12" cy="12" r="10"/>
                              <path d="M12 6v6l4 2"/>
                            </svg>
                            {{ formatEventTime(event.date) }}
                          </span>
                          @if (event.metadata?.clientName) {
                            <span class="event-card__client">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                              </svg>
                              {{ event.metadata?.clientName }}
                            </span>
                          }
                          @if (event.metadata?.amount) {
                            <span class="event-card__amount">
                              {{ getCurrencySymbol(event.metadata?.currency || 'USD') }}{{ event.metadata?.amount?.toFixed(2) }}
                            </span>
                          }
                        </div>
                      </div>

                      <div class="event-card__actions">
                        @if (event.type === 'reminder' && event.taskId) {
                          <button
                            class="action-btn action-btn--complete"
                            title="View reminder"
                            (click)="navigateToReminder(event.taskId)"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                          </button>
                        }
                        @if ((event.type === 'invoice_warning' || event.type === 'invoice_deadline' || event.type === 'invoice_due') && event.taskId) {
                          <button
                            class="action-btn action-btn--invoice"
                            title="Generate invoice"
                            (click)="openInvoiceForTask(event.taskId)"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                              <line x1="12" y1="18" x2="12" y2="12"/>
                              <line x1="9" y1="15" x2="15" y2="15"/>
                            </svg>
                          </button>
                        }
                        @if (event.taskId) {
                          <button
                            class="action-btn"
                            title="Go to task"
                            (click)="navigateToTask(event)"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                              <polyline points="15 3 21 3 21 9"/>
                              <line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

    :host {
      display: block;
      font-family: 'Outfit', sans-serif;
      --color-primary: #2563EB;
      --color-primary-hover: #1d4ed8;
      --color-primary-subtle: rgba(37, 99, 235, 0.08);
      --color-bg: #FAFBFC;
      --color-surface: #FFFFFF;
      --color-border: #E5E7EB;
      --color-border-subtle: #F3F4F6;
      --color-text: #0F172A;
      --color-text-secondary: #64748B;
      --color-text-muted: #94A3B8;

      --color-reminder: #2563EB;
      --color-reminder-subtle: rgba(37, 99, 235, 0.08);
      --color-warning: #F59E0B;
      --color-warning-subtle: rgba(245, 158, 11, 0.08);
      --color-danger: #EF4444;
      --color-danger-subtle: rgba(239, 68, 68, 0.08);
      --color-success: #10B981;
      --color-success-subtle: rgba(16, 185, 129, 0.08);

      --radius-sm: 6px;
      --radius-md: 8px;
      --radius-lg: 12px;
      --radius-xl: 16px;
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
      --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
      --transition-fast: 0.15s ease;
      --transition-base: 0.2s ease;
    }

    .dashboard {
      min-height: 100%;
      padding: 24px 32px;
      background: var(--color-bg);
    }

    /* Header */
    .header {
      margin-bottom: 28px;
    }

    .header__content {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }

    .header__title {
      font-size: 1.625rem;
      font-weight: 600;
      color: var(--color-text);
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }

    .header__subtitle {
      font-size: 0.9375rem;
      color: var(--color-text-secondary);
    }

    .header__actions {
      display: flex;
      gap: 12px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      font-size: 0.9375rem;
      font-weight: 500;
      font-family: inherit;
      border-radius: var(--radius-md);
      border: none;
      cursor: pointer;
      text-decoration: none;
      transition: all var(--transition-fast);

      svg {
        width: 18px;
        height: 18px;
      }

      &--primary {
        background: var(--color-primary);
        color: white;

        &:hover {
          background: var(--color-primary-hover);
          transform: translateY(-1px);
        }
      }

      &--ghost {
        background: var(--color-surface);
        color: var(--color-text-secondary);
        border: 1px solid var(--color-border);

        &:hover {
          background: var(--color-bg);
          color: var(--color-text);
          border-color: var(--color-text-muted);
        }
      }
    }

    /* Stats */
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      animation: slideUp 0.4s ease both;
      transition: transform var(--transition-base), box-shadow var(--transition-base);

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      &--reminders .stat-card__icon {
        background: var(--color-reminder-subtle);
        color: var(--color-reminder);
      }

      &--today .stat-card__icon {
        background: var(--color-warning-subtle);
        color: var(--color-warning);
      }

      &--invoices .stat-card__icon {
        background: var(--color-danger-subtle);
        color: var(--color-danger);
      }

      &--total .stat-card__icon {
        background: var(--color-success-subtle);
        color: var(--color-success);
      }
    }

    .stat-card__icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      flex-shrink: 0;

      svg {
        width: 24px;
        height: 24px;
      }
    }

    .stat-card__content {
      display: flex;
      flex-direction: column;
    }

    .stat-card__value {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text);
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .stat-card__label {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      margin-top: 2px;
    }

    /* Agenda */
    .agenda {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      overflow: hidden;
    }

    .agenda__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--color-border);
    }

    .agenda__title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
    }

    .period-tabs {
      display: flex;
      gap: 4px;
      background: var(--color-bg);
      padding: 4px;
      border-radius: var(--radius-md);
    }

    .period-tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      font-size: 0.8125rem;
      font-weight: 500;
      font-family: inherit;
      color: var(--color-text-secondary);
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--color-text);
        background: rgba(0, 0, 0, 0.04);
      }

      &--active {
        color: var(--color-primary);
        background: var(--color-surface);
        box-shadow: var(--shadow-sm);
      }
    }

    .period-tab__badge {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      font-size: 0.6875rem;
      font-weight: 600;
      color: white;
      background: var(--color-primary);
      border-radius: 9px;
    }

    /* Loading & Empty State */
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px;
      color: var(--color-text-secondary);
    }

    .loading__spinner {
      width: 36px;
      height: 36px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 12px;
    }

    .empty-state {
      text-align: center;
      padding: 64px 32px;
    }

    .empty-state__icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      color: var(--color-success);

      svg {
        width: 100%;
        height: 100%;
      }
    }

    .empty-state h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 6px;
    }

    .empty-state p {
      font-size: 0.9375rem;
      color: var(--color-text-secondary);
    }

    /* Timeline */
    .timeline {
      padding: 24px;
    }

    .date-group {
      animation: slideUp 0.4s ease both;

      &:not(:last-child) {
        margin-bottom: 24px;
      }
    }

    .date-group__header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .date-group__line {
      flex: 1;
      height: 1px;
      background: var(--color-border);
    }

    .date-group__label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
      padding: 4px 10px;
      background: var(--color-bg);
      border-radius: var(--radius-sm);

      &--today {
        color: var(--color-primary);
        background: var(--color-primary-subtle);
      }
    }

    .events-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Event Card */
    .event-card {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px 20px;
      background: var(--color-bg);
      border-radius: var(--radius-lg);
      border: 1px solid transparent;
      position: relative;
      overflow: hidden;
      animation: slideUp 0.3s ease both;
      transition: all var(--transition-base);

      &:hover {
        background: var(--color-surface);
        border-color: var(--color-border);
        box-shadow: var(--shadow-sm);
      }

      &--reminder {
        .event-card__indicator { background: var(--color-reminder); }
        .event-card__icon { color: var(--color-reminder); background: var(--color-reminder-subtle); }
      }

      &--invoice_warning {
        .event-card__indicator { background: var(--color-warning); }
        .event-card__icon { color: var(--color-warning); background: var(--color-warning-subtle); }
      }

      &--invoice_deadline {
        .event-card__indicator { background: var(--color-danger); }
        .event-card__icon { color: var(--color-danger); background: var(--color-danger-subtle); }
      }

      &--invoice_due {
        .event-card__indicator { background: var(--color-success); }
        .event-card__icon { color: var(--color-success); background: var(--color-success-subtle); }
      }

      &--overdue {
        background: var(--color-danger-subtle);
        border-color: rgba(239, 68, 68, 0.2);
      }
    }

    .event-card__indicator {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      border-radius: 4px 0 0 4px;
    }

    .event-card__icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      flex-shrink: 0;

      svg {
        width: 20px;
        height: 20px;
      }
    }

    .event-card__content {
      flex: 1;
      min-width: 0;
    }

    .event-card__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 4px;
    }

    .event-card__title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0;
    }

    .event-card__badges {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-radius: var(--radius-sm);

      &--danger {
        background: var(--color-danger-subtle);
        color: var(--color-danger);
      }

      &--warning {
        background: var(--color-warning-subtle);
        color: #B45309;
      }

      &--info {
        background: var(--color-primary-subtle);
        color: var(--color-primary);
      }
    }

    .event-card__subtitle {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin: 0 0 8px 0;
      line-height: 1.4;
    }

    .event-card__meta {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 0.8125rem;
      color: var(--color-text-muted);

      svg {
        width: 14px;
        height: 14px;
        margin-right: 4px;
      }

      span {
        display: flex;
        align-items: center;
      }
    }

    .event-card__amount {
      font-weight: 600;
      color: var(--color-text);
    }

    .event-card__actions {
      display: flex;
      gap: 8px;
      opacity: 0;
      transform: translateX(8px);
      transition: all var(--transition-fast);
    }

    .event-card:hover .event-card__actions {
      opacity: 1;
      transform: translateX(0);
    }

    .action-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover {
        color: var(--color-text);
        background: var(--color-bg);
      }

      &--complete:hover {
        color: var(--color-success);
        background: var(--color-success-subtle);
      }

      &--invoice:hover {
        color: var(--color-primary);
        background: var(--color-primary-subtle);
      }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 1024px) {
      .stats {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .dashboard {
        padding: 20px;
      }

      .header__content {
        flex-direction: column;
        gap: 16px;
      }

      .header__actions {
        width: 100%;
      }

      .header__actions .btn {
        flex: 1;
        justify-content: center;
      }

      .stats {
        grid-template-columns: 1fr;
      }

      .agenda__header {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .period-tabs {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .event-card__actions {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private taskService = inject(TaskService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private dashboardService = inject(DashboardService);
  private reminderService = inject(ReminderService);
  private router = inject(Router);

  @ViewChild('invoiceModal') invoiceModal!: InvoiceModalComponent;

  events = signal<DashboardEvent[]>([]);
  stats = signal<DashboardStats | null>(null);
  tasks = signal<Task[]>([]);
  isLoading = signal(true);
  selectedPeriod = signal<TimePeriod>('today');
  generatingFor = signal<string | null>(null);
  selectedTask = signal<Task | null>(null);

  user = this.authService.user;

  periods: { value: TimePeriod; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'later', label: 'Later' }
  ];

  greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  });

  userName = computed(() => {
    const name = this.user()?.name;
    return name ? name.split(' ')[0] : 'User';
  });

  todayFormatted = computed(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  });

  todayEventsCount = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.events().filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= today && eventDate < tomorrow;
    }).length;
  });

  filteredEvents = computed(() => {
    const allEvents = this.events();
    const period = this.selectedPeriod();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return allEvents.filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);

      switch (period) {
        case 'today':
          return eventDate.getTime() === today.getTime();
        case 'tomorrow':
          return eventDate.getTime() === tomorrow.getTime();
        case 'week':
          return eventDate >= today && eventDate <= endOfWeek;
        case 'month':
          return eventDate >= today && eventDate <= endOfMonth;
        case 'later':
          return eventDate > endOfMonth;
        default:
          return true;
      }
    });
  });

  filteredGroupedEvents = computed(() => {
    const events = this.filteredEvents();
    const groups: GroupedEvents[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    events.forEach(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      const dateKey = eventDate.toISOString().split('T')[0];

      let group = groups.find(g => g.dateLabel === this.formatDateLabel(eventDate));
      if (!group) {
        group = {
          date: eventDate,
          dateLabel: this.formatDateLabel(eventDate),
          isToday: eventDate.getTime() === today.getTime(),
          isTomorrow: eventDate.getTime() === tomorrow.getTime(),
          events: []
        };
        groups.push(group);
      }
      group.events.push(event);
    });

    // Sort groups by date
    groups.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Sort events within each group by time
    groups.forEach(g => {
      g.events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    return groups;
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);

    // Load events
    this.dashboardService.getEvents().subscribe({
      next: (events) => {
        this.events.set(events);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.notificationService.error('Failed to load events');
      }
    });

    // Load stats
    this.dashboardService.getStats().subscribe({
      next: (stats) => this.stats.set(stats)
    });

    // Load tasks for invoice modal
    this.taskService.getTasks().subscribe({
      next: (tasks) => this.tasks.set(tasks)
    });
  }

  getEventCountForPeriod(period: TimePeriod): number {
    const allEvents = this.events();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return allEvents.filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);

      switch (period) {
        case 'today':
          return eventDate.getTime() === today.getTime();
        case 'tomorrow':
          return eventDate.getTime() === tomorrow.getTime();
        case 'week':
          return eventDate >= today && eventDate <= endOfWeek;
        case 'month':
          return eventDate >= today && eventDate <= endOfMonth;
        case 'later':
          return eventDate > endOfMonth;
        default:
          return true;
      }
    }).length;
  }

  formatDateLabel(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  formatEventTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  formatCurrency(amount: number): string {
    if (amount >= 1000) {
      return '$' + (amount / 1000).toFixed(1) + 'k';
    }
    return '$' + amount.toFixed(0);
  }

  getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      PLN: 'zł',
      GBP: '£'
    };
    return symbols[currency] || '$';
  }

  getScheduleLabel(type: string): string {
    const labels: Record<string, string> = {
      DAILY: 'Daily',
      WEEKLY: 'Weekly',
      MONTHLY: 'Monthly',
      YEARLY: 'Yearly',
      CUSTOM: 'Custom'
    };
    return labels[type] || type;
  }

  getPeriodDescription(): string {
    switch (this.selectedPeriod()) {
      case 'today': return 'for today';
      case 'tomorrow': return 'for tomorrow';
      case 'week': return 'this week';
      case 'month': return 'this month';
      case 'later': return 'scheduled for later';
      default: return '';
    }
  }

  navigateToReminder(taskId: string) {
    this.router.navigate(['/tasks/reminders', taskId]);
  }

  navigateToTask(event: DashboardEvent) {
    if (event.type === 'reminder') {
      this.router.navigate(['/tasks/reminders', event.taskId]);
    } else {
      this.router.navigate(['/tasks', event.taskId]);
    }
  }

  openInvoiceForTask(taskId: string) {
    const task = this.tasks().find(t => t.id === taskId);
    if (task) {
      this.selectedTask.set(task);
      setTimeout(() => {
        this.invoiceModal.open(task);
      }, 0);
    } else {
      // Load the task if not in cache
      this.taskService.getTask(taskId).subscribe({
        next: (task) => {
          this.selectedTask.set(task);
          setTimeout(() => {
            this.invoiceModal.open(task);
          }, 0);
        },
        error: () => {
          this.notificationService.error('Failed to load task');
        }
      });
    }
  }

  handleInvoiceGenerate(data: InvoiceGenerationData) {
    this.generatingFor.set(data.taskId);
    this.invoiceModal.setGenerating(true);

    this.taskService.generateInvoice(
      data.taskId,
      data.hoursWorked,
      data.hourlyRate,
      data.month,
      data.year,
      data.description,
      data.language
    ).subscribe({
      next: (invoice) => {
        this.generatingFor.set(null);
        this.invoiceModal.setGenerating(false);
        this.invoiceModal.close();
        this.notificationService.success('Invoice generated successfully!');
        this.router.navigate(['/invoices', invoice.id]);
      },
      error: () => {
        this.generatingFor.set(null);
        this.invoiceModal.setGenerating(false);
        this.notificationService.error('Failed to generate invoice');
      }
    });
  }
}
