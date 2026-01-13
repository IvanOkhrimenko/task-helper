import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ReminderService, Reminder, ScheduleType } from '../../../core/services/reminder.service';

@Component({
  selector: 'app-reminders-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="reminders-page">
      <!-- Header -->
      <header class="page-header">
        <div class="page-header__info">
          <h1 class="page-title">{{ 'reminders.list.title' | translate }}</h1>
          <p class="page-subtitle">{{ 'reminders.list.subtitle' | translate }}</p>
        </div>
        <a routerLink="/tasks/reminders/new" class="btn btn--primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {{ 'reminders.list.newReminder' | translate }}
        </a>
      </header>

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-value">{{ reminders().length }}</span>
          <span class="stat-label">{{ 'reminders.list.stats.total' | translate }}</span>
        </div>
        <div class="stat-card stat-card--active">
          <span class="stat-value">{{ activeCount() }}</span>
          <span class="stat-label">{{ 'reminders.list.stats.active' | translate }}</span>
        </div>
        <div class="stat-card stat-card--inactive">
          <span class="stat-value">{{ inactiveCount() }}</span>
          <span class="stat-label">{{ 'reminders.list.stats.paused' | translate }}</span>
        </div>
        <div class="stat-card stat-card--due">
          <span class="stat-value">{{ dueTodayCount() }}</span>
          <span class="stat-label">{{ 'reminders.list.stats.dueToday' | translate }}</span>
        </div>
      </div>

      <!-- Content -->
      @if (isLoading()) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>{{ 'reminders.list.loading' | translate }}</p>
        </div>
      } @else if (reminders().length === 0) {
        <div class="empty-state">
          <div class="empty-state__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h3>{{ 'reminders.list.empty.title' | translate }}</h3>
          <p>{{ 'reminders.list.empty.description' | translate }}</p>
          <a routerLink="/tasks/reminders/new" class="btn btn--primary">{{ 'reminders.list.empty.createBtn' | translate }}</a>
        </div>
      } @else {
        <div class="reminders-grid">
          @for (reminder of sortedReminders(); track reminder.id; let i = $index) {
            <div
              class="reminder-card"
              [class.reminder-card--inactive]="!reminder.isActive"
              [style.animation-delay]="i * 40 + 'ms'"
            >
              <div class="reminder-card__header">
                <div class="reminder-card__status">
                  <span
                    class="status-indicator"
                    [class.status-indicator--active]="reminder.isActive"
                    [class.status-indicator--inactive]="!reminder.isActive"
                  ></span>
                  <span class="schedule-badge" [class]="'schedule-badge--' + reminder.scheduleType.toLowerCase()">
                    {{ getScheduleLabel(reminder.scheduleType) }}
                  </span>
                </div>
                <div class="reminder-card__actions">
                  <label class="toggle-switch" (click)="$event.stopPropagation()">
                    <input
                      type="checkbox"
                      [checked]="reminder.isActive"
                      (change)="toggleReminder(reminder)"
                    >
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div class="reminder-card__body">
                <a [routerLink]="['/tasks/reminders', reminder.id]" class="reminder-card__name-link">
                  <h3 class="reminder-card__name">{{ reminder.name }}</h3>
                </a>

                @if (reminder.reminderMessage) {
                  <p class="reminder-card__message">{{ reminder.reminderMessage }}</p>
                }

                <div class="reminder-card__schedule">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  @if (reminder.nextOccurrence) {
                    <span>{{ formatNextOccurrence(reminder.nextOccurrence) }}</span>
                  } @else {
                    <span class="text-muted">{{ 'reminders.list.noUpcoming' | translate }}</span>
                  }
                </div>
              </div>

              <div class="reminder-card__footer">
                <a
                  [routerLink]="['/tasks/reminders', reminder.id, 'edit']"
                  class="btn btn--ghost btn--sm"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  {{ 'common.edit' | translate }}
                </a>
                <button
                  class="btn btn--ghost btn--sm btn--danger"
                  (click)="deleteReminder(reminder)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  </svg>
                  {{ 'common.delete' | translate }}
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: var(--font-body);
    }

    .reminders-page {
      padding: var(--space-2xl);
      max-width: 1200px;
      margin: 0 auto;
      transition: background-color var(--transition-slow);
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: var(--space-2xl);
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-xs);
      letter-spacing: -0.02em;
      transition: color var(--transition-slow);
    }

    .page-subtitle {
      font-size: 0.9375rem;
      color: var(--color-text-secondary);
      transition: color var(--transition-slow);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-md) var(--space-lg);
      font-size: 0.9375rem;
      font-weight: 500;
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
      text-decoration: none;
      cursor: pointer;
      border: none;

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

      &--ghost {
        background: transparent;
        color: var(--color-text-secondary);

        &:hover {
          background: var(--color-fill-quaternary);
          color: var(--color-text);
        }
      }

      &--sm {
        padding: var(--space-sm) var(--space-md);
        font-size: 0.8125rem;

        svg {
          width: 14px;
          height: 14px;
        }
      }

      &--danger:hover {
        background: var(--color-danger-subtle);
        color: var(--color-danger);
      }
    }

    /* Stats Row */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-lg);
      margin-bottom: var(--space-2xl);
    }

    .stat-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-xl);
      text-align: center;
      transition: background-color var(--transition-slow), border-color var(--transition-slow);

      &--active .stat-value { color: var(--color-success); }
      &--inactive .stat-value { color: var(--color-text-tertiary); }
      &--due .stat-value { color: var(--color-warning); }
    }

    .stat-value {
      display: block;
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--color-text);
      line-height: 1;
      margin-bottom: var(--space-sm);
      transition: color var(--transition-slow);
    }

    .stat-label {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      transition: color var(--transition-slow);
    }

    /* Loading State */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      color: var(--color-text-secondary);
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: var(--space-lg);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 80px 20px;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      border: 2px dashed var(--color-border);
      transition: background-color var(--transition-slow), border-color var(--transition-slow);
    }

    .empty-state__icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      color: var(--color-text-tertiary);

      svg {
        width: 100%;
        height: 100%;
      }
    }

    .empty-state h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-sm);
      transition: color var(--transition-slow);
    }

    .empty-state p {
      color: var(--color-text-secondary);
      margin-bottom: var(--space-xl);
      transition: color var(--transition-slow);
    }

    /* Reminders Grid */
    .reminders-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: var(--space-xl);
    }

    .reminder-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-card);
      animation: slideUp 0.4s ease both;
      transition: all var(--transition-base);

      &:hover {
        box-shadow: var(--shadow-lg);
        transform: translateY(-2px);
      }

      &--inactive {
        opacity: 0.7;

        .reminder-card__name {
          color: var(--color-text-secondary);
        }
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

    .reminder-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-lg) var(--space-xl);
      border-bottom: 1px solid var(--color-border);
      background: var(--color-fill-quaternary);
      transition: background-color var(--transition-slow), border-color var(--transition-slow);
    }

    .reminder-card__status {
      display: flex;
      align-items: center;
      gap: var(--space-md);
    }

    .status-indicator {
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

    .schedule-badge {
      padding: var(--space-xs) var(--space-md);
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: var(--radius-xs);
      background: var(--color-fill-quaternary);
      color: var(--color-text-secondary);

      &--one_time {
        background: var(--color-info-subtle);
        color: var(--color-info);
      }
      &--daily {
        background: var(--color-success-subtle);
        color: var(--color-success);
      }
      &--weekly {
        background: var(--color-warning-subtle);
        color: var(--color-warning);
      }
      &--monthly {
        background: var(--color-pink);
        background: rgba(255, 45, 85, 0.1);
        color: var(--color-pink);
      }
      &--yearly {
        background: var(--color-indigo);
        background: rgba(88, 86, 214, 0.1);
        color: var(--color-indigo);
      }
      &--custom {
        background: var(--color-fill-tertiary);
        color: var(--color-text-secondary);
      }
    }

    /* Toggle Switch */
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
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
      background: var(--color-fill-primary);
      border-radius: 12px;
      transition: all var(--transition-fast);

      &::before {
        content: '';
        position: absolute;
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background: var(--color-surface);
        border-radius: 50%;
        transition: all var(--transition-fast);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }
    }

    .toggle-switch input:checked + .toggle-slider {
      background: var(--color-success);
    }

    .toggle-switch input:checked + .toggle-slider::before {
      transform: translateX(20px);
    }

    .reminder-card__body {
      padding: var(--space-xl);
    }

    .reminder-card__name-link {
      text-decoration: none;
      display: block;
    }

    .reminder-card__name {
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 8px;
      transition: color var(--transition-fast);

      &:hover {
        color: var(--color-primary);
      }
    }

    .reminder-card__message {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin-bottom: 16px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .reminder-card__schedule {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      transition: color var(--transition-slow);

      svg {
        width: 16px;
        height: 16px;
        color: var(--color-text-tertiary);
      }

      .text-muted {
        color: var(--color-text-tertiary);
        font-style: italic;
      }
    }

    .reminder-card__footer {
      display: flex;
      gap: var(--space-sm);
      padding: var(--space-md) var(--space-xl);
      background: var(--color-fill-quaternary);
      border-top: 1px solid var(--color-border);
      transition: background-color var(--transition-slow), border-color var(--transition-slow);
    }

    @media (max-width: 768px) {
      .reminders-page {
        padding: 20px;
      }

      .stats-row {
        grid-template-columns: repeat(2, 1fr);
      }

      .reminders-grid {
        grid-template-columns: 1fr;
      }

      .page-header {
        flex-direction: column;
        gap: 16px;
      }
    }
  `]
})
export class RemindersListComponent implements OnInit {
  private reminderService = inject(ReminderService);

  reminders = signal<Reminder[]>([]);
  isLoading = signal(true);

  sortedReminders = computed(() => {
    return [...this.reminders()].sort((a, b) => {
      if (!a.nextOccurrence) return 1;
      if (!b.nextOccurrence) return -1;
      return new Date(a.nextOccurrence).getTime() - new Date(b.nextOccurrence).getTime();
    });
  });

  activeCount = computed(() => this.reminders().filter(r => r.isActive).length);
  inactiveCount = computed(() => this.reminders().filter(r => !r.isActive).length);
  dueTodayCount = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.reminders().filter(r => {
      if (!r.nextOccurrence || !r.isActive) return false;
      const occurrence = new Date(r.nextOccurrence);
      return occurrence >= today && occurrence < tomorrow;
    }).length;
  });

  ngOnInit(): void {
    this.loadReminders();
  }

  loadReminders(): void {
    this.reminderService.getReminders().subscribe({
      next: (reminders) => {
        this.reminders.set(reminders);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  getScheduleLabel(type: ScheduleType): string {
    const labels: Record<ScheduleType, string> = {
      'ONE_TIME': 'One-time',
      'DAILY': 'Daily',
      'WEEKLY': 'Weekly',
      'MONTHLY': 'Monthly',
      'YEARLY': 'Yearly',
      'CUSTOM': 'Custom'
    };
    return labels[type] || type;
  }

  formatNextOccurrence(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (days === 1) {
      return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
  }

  toggleReminder(reminder: Reminder): void {
    this.reminderService.toggleReminder(reminder.id).subscribe({
      next: (updated) => {
        this.reminders.update(list =>
          list.map(r => r.id === updated.id ? updated : r)
        );
      }
    });
  }

  deleteReminder(reminder: Reminder): void {
    if (!confirm(`Delete reminder "${reminder.name}"?`)) return;

    this.reminderService.deleteReminder(reminder.id).subscribe({
      next: () => {
        this.reminders.update(list => list.filter(r => r.id !== reminder.id));
      }
    });
  }
}
