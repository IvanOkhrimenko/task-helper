import { Component, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TaskService, Task } from '../../core/services/task.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { DashboardService, DashboardEvent, DashboardStats } from '../../core/services/dashboard.service';
import { ReminderService } from '../../core/services/reminder.service';
import { LanguageService } from '../../core/services/language.service';
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
  imports: [CommonModule, RouterLink, TranslateModule, ToastComponent, InvoiceModalComponent],
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
            <a routerLink="/tasks/reminders/new" class="btn btn--secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              {{ 'dashboard.newReminder' | translate }}
            </a>
            <a routerLink="/tasks/new" class="btn btn--primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {{ 'dashboard.newTask' | translate }}
            </a>
          </div>
        </div>
      </header>

      <!-- Stats Cards -->
      <section class="stats">
        <div class="stat-card stat-card--primary" [style.animation-delay]="'0ms'">
          <div class="stat-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
          </div>
          <div class="stat-card__content">
            <span class="stat-card__value">{{ stats()?.activeReminders || 0 }}</span>
            <span class="stat-card__label">{{ 'dashboard.stats.activeReminders' | translate }}</span>
          </div>
        </div>

        <div class="stat-card stat-card--warning" [style.animation-delay]="'50ms'">
          <div class="stat-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div class="stat-card__content">
            <span class="stat-card__value">{{ todayEventsCount() }}</span>
            <span class="stat-card__label">{{ 'dashboard.stats.todaysEvents' | translate }}</span>
          </div>
        </div>

        <div class="stat-card stat-card--danger" [style.animation-delay]="'100ms'">
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
            <span class="stat-card__label">{{ 'dashboard.stats.unpaidInvoices' | translate }}</span>
          </div>
        </div>

        <div class="stat-card stat-card--success" [style.animation-delay]="'150ms'">
          <div class="stat-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <div class="stat-card__content">
            <span class="stat-card__value">{{ formatCurrency(stats()?.monthlyTotal || 0) }}</span>
            <span class="stat-card__label">{{ 'dashboard.stats.thisMonth' | translate }}</span>
          </div>
        </div>
      </section>

      <!-- Agenda Section -->
      <section class="agenda">
        <div class="agenda__header">
          <h2 class="agenda__title">{{ 'dashboard.agenda.title' | translate }}</h2>
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
            <p>{{ 'dashboard.agenda.loadingEvents' | translate }}</p>
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
            <h3>{{ 'dashboard.agenda.allClear' | translate }}</h3>
            <p>{{ getEmptyMessage() }} {{ 'dashboard.agenda.enjoyFreeTime' | translate }}</p>
          </div>
        } @else {
          <div class="timeline">
            @for (group of filteredGroupedEvents(); track group.dateLabel; let groupIdx = $index) {
              <div class="date-group" [style.animation-delay]="groupIdx * 100 + 'ms'">
                <div class="date-group__header">
                  <div class="date-group__line"></div>
                  <span class="date-group__label" [class.date-group__label--today]="group.isToday">
                    @if (group.isToday) {
                      {{ 'dashboard.agenda.today' | translate }}
                    } @else if (group.isTomorrow) {
                      {{ 'dashboard.agenda.tomorrow' | translate }}
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
                              <span class="badge badge--danger">{{ 'dashboard.events.overdue' | translate }}</span>
                            } @else if (event.status === 'today') {
                              <span class="badge badge--warning">{{ 'dashboard.agenda.today' | translate }}</span>
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
                            class="action-btn action-btn--view"
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
    :host {
      display: block;
      font-family: var(--font-body);
    }

    .dashboard {
      min-height: 100%;
      padding: var(--space-xl) var(--space-2xl);
      background: var(--color-bg);
      transition: background-color var(--transition-slow);
    }

    /* Header */
    .header {
      margin-bottom: var(--space-2xl);
    }

    .header__content {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }

    .header__title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text);
      letter-spacing: -0.02em;
      margin-bottom: var(--space-xs);
      transition: color var(--transition-slow);
    }

    .header__subtitle {
      font-size: 0.9375rem;
      color: var(--color-text-secondary);
      transition: color var(--transition-slow);
    }

    .header__actions {
      display: flex;
      gap: var(--space-md);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-lg);
      font-size: 0.875rem;
      font-weight: 600;
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
        color: var(--color-primary-text);

        &:hover {
          background: var(--color-primary-hover);
          transform: translateY(-1px);
        }
      }

      &--secondary {
        background: var(--color-fill-tertiary);
        color: var(--color-text);

        &:hover {
          background: var(--color-fill-secondary);
        }
      }
    }

    /* Stats */
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-lg);
      margin-bottom: var(--space-2xl);
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: var(--space-lg);
      padding: var(--space-xl);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      animation: slideUp 0.4s ease both;
      transition: transform var(--transition-base), box-shadow var(--transition-base), background-color var(--transition-slow), border-color var(--transition-slow);

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      &--primary .stat-card__icon {
        background: var(--color-primary-subtle);
        color: var(--color-primary);
      }

      &--warning .stat-card__icon {
        background: var(--color-warning-subtle);
        color: var(--color-warning);
      }

      &--danger .stat-card__icon {
        background: var(--color-danger-subtle);
        color: var(--color-danger);
      }

      &--success .stat-card__icon {
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
      transition: background-color var(--transition-slow), color var(--transition-slow);

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
      transition: color var(--transition-slow);
    }

    .stat-card__label {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      margin-top: 2px;
      transition: color var(--transition-slow);
    }

    /* Agenda */
    .agenda {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      overflow: hidden;
      transition: background-color var(--transition-slow), border-color var(--transition-slow);
    }

    .agenda__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-lg) var(--space-xl);
      border-bottom: 1px solid var(--color-border);
      transition: border-color var(--transition-slow);
    }

    .agenda__title {
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--color-text);
      transition: color var(--transition-slow);
    }

    .period-tabs {
      display: flex;
      gap: var(--space-xs);
      background: var(--color-fill-quaternary);
      padding: var(--space-xs);
      border-radius: var(--radius-md);
      transition: background-color var(--transition-slow);
    }

    .period-tab {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-md);
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
        background: var(--color-fill-tertiary);
      }

      &--active {
        color: var(--color-primary);
        background: var(--color-surface);
        box-shadow: var(--shadow-xs);
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
      color: var(--color-primary-text);
      background: var(--color-primary);
      border-radius: var(--radius-full);
    }

    /* Loading & Empty State */
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px;
      color: var(--color-text-secondary);
      transition: color var(--transition-slow);
    }

    .loading__spinner {
      width: 36px;
      height: 36px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: var(--space-md);
    }

    .empty-state {
      text-align: center;
      padding: 64px var(--space-2xl);
    }

    .empty-state__icon {
      width: 64px;
      height: 64px;
      margin: 0 auto var(--space-xl);
      color: var(--color-success);
      transition: color var(--transition-slow);

      svg {
        width: 100%;
        height: 100%;
      }
    }

    .empty-state h3 {
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-sm);
      transition: color var(--transition-slow);
    }

    .empty-state p {
      font-size: 0.9375rem;
      color: var(--color-text-secondary);
      transition: color var(--transition-slow);
    }

    /* Timeline */
    .timeline {
      padding: var(--space-xl);
    }

    .date-group {
      animation: slideUp 0.4s ease both;

      &:not(:last-child) {
        margin-bottom: var(--space-xl);
      }
    }

    .date-group__header {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      margin-bottom: var(--space-lg);
    }

    .date-group__line {
      flex: 1;
      height: 1px;
      background: var(--color-border);
      transition: background-color var(--transition-slow);
    }

    .date-group__label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-tertiary);
      padding: var(--space-xs) var(--space-md);
      background: var(--color-fill-quaternary);
      border-radius: var(--radius-sm);
      transition: color var(--transition-slow), background-color var(--transition-slow);

      &--today {
        color: var(--color-primary);
        background: var(--color-primary-subtle);
      }
    }

    .events-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    /* Event Card */
    .event-card {
      display: flex;
      align-items: flex-start;
      gap: var(--space-lg);
      padding: var(--space-lg) var(--space-xl);
      background: var(--color-fill-quaternary);
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
        .event-card__indicator { background: var(--color-primary); }
        .event-card__icon { color: var(--color-primary); background: var(--color-primary-subtle); }
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
        border-color: var(--color-danger-border);
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
      transition: background-color var(--transition-slow), color var(--transition-slow);

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
      gap: var(--space-md);
      margin-bottom: var(--space-xs);
    }

    .event-card__title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0;
      transition: color var(--transition-slow);
    }

    .event-card__badges {
      display: flex;
      gap: var(--space-sm);
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
        color: var(--color-warning);
      }

      &--info {
        background: var(--color-primary-subtle);
        color: var(--color-primary);
      }
    }

    .event-card__subtitle {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin: 0 0 var(--space-sm) 0;
      line-height: 1.4;
      transition: color var(--transition-slow);
    }

    .event-card__meta {
      display: flex;
      align-items: center;
      gap: var(--space-lg);
      font-size: 0.8125rem;
      color: var(--color-text-tertiary);
      transition: color var(--transition-slow);

      svg {
        width: 14px;
        height: 14px;
        margin-right: var(--space-xs);
      }

      span {
        display: flex;
        align-items: center;
      }
    }

    .event-card__amount {
      font-weight: 600;
      color: var(--color-text);
      transition: color var(--transition-slow);
    }

    .event-card__actions {
      display: flex;
      gap: var(--space-sm);
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
        background: var(--color-fill-tertiary);
      }

      &--view:hover {
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

    /* ========== RESPONSIVE ========== */
    @media (max-width: 1024px) {
      .stats {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 767px) {
      .dashboard {
        padding: 0;
      }

      .header {
        padding: var(--space-lg) var(--space-md);
        background: var(--color-surface);
        border-bottom: 1px solid var(--color-border);
        margin-bottom: 0;
      }

      .header__content {
        flex-direction: column;
        gap: var(--space-md);
      }

      .header__title {
        font-size: 1.25rem;
      }

      .header__subtitle {
        font-size: 0.8125rem;
      }

      .header__actions {
        width: 100%;
        gap: var(--space-sm);
      }

      .header__actions .btn {
        flex: 1;
        justify-content: center;
        padding: var(--space-md);
        font-size: 0.8125rem;

        svg {
          width: 16px;
          height: 16px;
        }
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--space-sm);
        padding: var(--space-md);
        margin-bottom: 0;
      }

      .stat-card {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-sm);
        padding: var(--space-md);

        &:hover {
          transform: none;
          box-shadow: none;
        }
      }

      .stat-card__icon {
        width: 36px;
        height: 36px;

        svg {
          width: 18px;
          height: 18px;
        }
      }

      .stat-card__value {
        font-size: 1.25rem;
      }

      .stat-card__label {
        font-size: 0.75rem;
      }

      .agenda {
        border-radius: 0;
        border-left: none;
        border-right: none;
      }

      .agenda__header {
        flex-direction: column;
        align-items: stretch;
        gap: var(--space-md);
        padding: var(--space-md);
      }

      .agenda__title {
        font-size: 1rem;
      }

      .period-tabs {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        -ms-overflow-style: none;

        &::-webkit-scrollbar {
          display: none;
        }
      }

      .period-tab {
        padding: var(--space-sm) var(--space-md);
        white-space: nowrap;
        font-size: 0.75rem;
      }

      .timeline {
        padding: var(--space-md);
      }

      .date-group:not(:last-child) {
        margin-bottom: var(--space-lg);
      }

      .event-card {
        flex-direction: column;
        align-items: stretch;
        gap: var(--space-md);
        padding: var(--space-md);
      }

      .event-card__icon {
        position: absolute;
        top: var(--space-md);
        left: var(--space-md);
        width: 32px;
        height: 32px;

        svg {
          width: 16px;
          height: 16px;
        }
      }

      .event-card__content {
        padding-left: 44px;
      }

      .event-card__header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-sm);
      }

      .event-card__title {
        font-size: 0.875rem;
      }

      .event-card__meta {
        flex-wrap: wrap;
        gap: var(--space-sm) var(--space-md);
        font-size: 0.75rem;
      }

      .event-card__actions {
        opacity: 1;
        transform: none;
        padding-left: 44px;
        justify-content: flex-start;
        border-top: 1px solid var(--color-border);
        padding-top: var(--space-md);
        margin-top: var(--space-sm);
      }

      .action-btn {
        width: 36px;
        height: 36px;
      }

      .empty-state {
        padding: 40px var(--space-md);
      }

      .empty-state__icon {
        width: 48px;
        height: 48px;
      }

      .loading {
        padding: 40px;
      }
    }

    @media (max-width: 374px) {
      .stats {
        grid-template-columns: 1fr;
      }

      .header__actions {
        flex-direction: column;
      }

      .header__actions .btn {
        width: 100%;
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
  private translateService = inject(TranslateService);

  @ViewChild('invoiceModal') invoiceModal!: InvoiceModalComponent;

  events = signal<DashboardEvent[]>([]);
  stats = signal<DashboardStats | null>(null);
  tasks = signal<Task[]>([]);
  isLoading = signal(true);
  selectedPeriod = signal<TimePeriod>('today');
  generatingFor = signal<string | null>(null);
  selectedTask = signal<Task | null>(null);

  user = this.authService.user;

  get periods(): { value: TimePeriod; label: string }[] {
    return [
      { value: 'today', label: this.translateService.instant('dashboard.agenda.today') },
      { value: 'tomorrow', label: this.translateService.instant('dashboard.agenda.tomorrow') },
      { value: 'week', label: this.translateService.instant('dashboard.agenda.thisWeek') },
      { value: 'month', label: this.translateService.instant('dashboard.agenda.thisMonth') },
      { value: 'later', label: this.translateService.instant('dashboard.agenda.later') }
    ];
  }

  greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return this.translateService.instant('dashboard.greeting.morning');
    if (hour < 18) return this.translateService.instant('dashboard.greeting.afternoon');
    return this.translateService.instant('dashboard.greeting.evening');
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

  getEmptyMessage(): string {
    switch (this.selectedPeriod()) {
      case 'today': return this.translateService.instant('dashboard.agenda.noEventsToday');
      case 'tomorrow': return this.translateService.instant('dashboard.agenda.noEventsTomorrow');
      case 'week': return this.translateService.instant('dashboard.agenda.noEventsWeek');
      case 'month': return this.translateService.instant('dashboard.agenda.noEventsMonth');
      case 'later': return this.translateService.instant('dashboard.agenda.noEventsLater');
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

    this.taskService.generateInvoice(data.taskId, {
      hoursWorked: data.hoursWorked,
      hourlyRate: data.hourlyRate,
      fixedAmount: data.fixedAmount,
      month: data.month,
      year: data.year,
      description: data.description,
      language: data.language,
      currency: data.currency,
      invoiceTemplate: data.invoiceTemplate,
      bankAccountId: data.bankAccountId,
      googleAccountId: data.googleAccountId,
      useCustomEmailTemplate: data.useCustomEmailTemplate,
      emailSubject: data.emailSubject,
      emailBody: data.emailBody
    }).subscribe({
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
