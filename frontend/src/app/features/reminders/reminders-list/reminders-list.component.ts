import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReminderService, Reminder, ScheduleType } from '../../../core/services/reminder.service';

@Component({
  selector: 'app-reminders-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="reminders-page">
      <!-- Header -->
      <header class="page-header">
        <div class="page-header__info">
          <h1 class="page-title">Reminders</h1>
          <p class="page-subtitle">Manage your scheduled notifications</p>
        </div>
        <a routerLink="/tasks/reminders/new" class="btn btn--primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Reminder
        </a>
      </header>

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-value">{{ reminders().length }}</span>
          <span class="stat-label">Total</span>
        </div>
        <div class="stat-card stat-card--active">
          <span class="stat-value">{{ activeCount() }}</span>
          <span class="stat-label">Active</span>
        </div>
        <div class="stat-card stat-card--inactive">
          <span class="stat-value">{{ inactiveCount() }}</span>
          <span class="stat-label">Paused</span>
        </div>
        <div class="stat-card stat-card--due">
          <span class="stat-value">{{ dueTodayCount() }}</span>
          <span class="stat-label">Due Today</span>
        </div>
      </div>

      <!-- Content -->
      @if (isLoading()) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading reminders...</p>
        </div>
      } @else if (reminders().length === 0) {
        <div class="empty-state">
          <div class="empty-state__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h3>No reminders yet</h3>
          <p>Create your first reminder to stay on top of important tasks</p>
          <a routerLink="/tasks/reminders/new" class="btn btn--primary">Create Reminder</a>
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
                    <span class="text-muted">No upcoming occurrence</span>
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
                  Edit
                </a>
                <button
                  class="btn btn--ghost btn--sm btn--danger"
                  (click)="deleteReminder(reminder)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

    :host {
      display: block;
      font-family: 'Outfit', sans-serif;
      --color-primary: #2563EB;
      --color-primary-hover: #1d4ed8;
      --color-bg: #FAFBFC;
      --color-surface: #FFFFFF;
      --color-border: #E5E7EB;
      --color-text: #0F172A;
      --color-text-secondary: #64748B;
      --color-text-muted: #94A3B8;
      --color-success: #10B981;
      --color-success-bg: rgba(16, 185, 129, 0.1);
      --color-warning: #F59E0B;
      --color-warning-bg: rgba(245, 158, 11, 0.1);
      --color-danger: #EF4444;
      --color-danger-bg: rgba(239, 68, 68, 0.1);
      --radius-sm: 6px;
      --radius-md: 8px;
      --radius-lg: 12px;
      --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
      --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
      --transition-fast: 0.15s ease;
      --transition-base: 0.2s ease;
    }

    .reminders-page {
      padding: 32px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 32px;
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 4px;
      letter-spacing: -0.02em;
    }

    .page-subtitle {
      font-size: 0.9375rem;
      color: var(--color-text-secondary);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      font-size: 0.9375rem;
      font-weight: 500;
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
      text-decoration: none;
      cursor: pointer;

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
        background: transparent;
        color: var(--color-text-secondary);

        &:hover {
          background: var(--color-bg);
          color: var(--color-text);
        }
      }

      &--sm {
        padding: 6px 12px;
        font-size: 0.8125rem;

        svg {
          width: 14px;
          height: 14px;
        }
      }

      &--danger:hover {
        background: var(--color-danger-bg);
        color: var(--color-danger);
      }
    }

    /* Stats Row */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 20px;
      text-align: center;

      &--active .stat-value { color: var(--color-success); }
      &--inactive .stat-value { color: var(--color-text-muted); }
      &--due .stat-value { color: var(--color-warning); }
    }

    .stat-value {
      display: block;
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--color-text);
      line-height: 1;
      margin-bottom: 6px;
    }

    .stat-label {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
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
      margin-bottom: 16px;
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
    }

    .empty-state__icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      color: var(--color-text-muted);

      svg {
        width: 100%;
        height: 100%;
      }
    }

    .empty-state h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 8px;
    }

    .empty-state p {
      color: var(--color-text-secondary);
      margin-bottom: 24px;
    }

    /* Reminders Grid */
    .reminders-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px;
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
        box-shadow: var(--shadow-md);
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
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-bg);
    }

    .reminder-card__status {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;

      &--active {
        background: var(--color-success);
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
      }

      &--inactive {
        background: var(--color-text-muted);
      }
    }

    .schedule-badge {
      padding: 4px 10px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: 4px;
      background: var(--color-bg);
      color: var(--color-text-secondary);

      &--one_time {
        background: #EEF2FF;
        color: #4F46E5;
      }
      &--daily {
        background: #ECFDF5;
        color: #059669;
      }
      &--weekly {
        background: #FEF3C7;
        color: #D97706;
      }
      &--monthly {
        background: #FCE7F3;
        color: #DB2777;
      }
      &--yearly {
        background: #E0E7FF;
        color: #4338CA;
      }
      &--custom {
        background: #F1F5F9;
        color: #475569;
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
      background: var(--color-border);
      border-radius: 12px;
      transition: all var(--transition-fast);

      &::before {
        content: '';
        position: absolute;
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background: white;
        border-radius: 50%;
        transition: all var(--transition-fast);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
    }

    .toggle-switch input:checked + .toggle-slider {
      background: var(--color-success);
    }

    .toggle-switch input:checked + .toggle-slider::before {
      transform: translateX(20px);
    }

    .reminder-card__body {
      padding: 20px;
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
      gap: 8px;
      font-size: 0.8125rem;
      color: var(--color-text-secondary);

      svg {
        width: 16px;
        height: 16px;
        color: var(--color-text-muted);
      }

      .text-muted {
        color: var(--color-text-muted);
        font-style: italic;
      }
    }

    .reminder-card__footer {
      display: flex;
      gap: 8px;
      padding: 12px 20px;
      background: var(--color-bg);
      border-top: 1px solid var(--color-border);
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
