import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ReminderService, Reminder, ScheduleType } from '../../../core/services/reminder.service';

@Component({
  selector: 'app-reminder-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="detail-page">
      @if (isLoading()) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading reminder...</p>
        </div>
      } @else if (reminder()) {
        <header class="page-header">
          <a routerLink="/tasks/reminders" class="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Reminders
          </a>
          <div class="page-header__content">
            <div class="page-header__info">
              <div class="page-header__status">
                <span
                  class="status-indicator"
                  [class.status-indicator--active]="reminder()!.isActive"
                  [class.status-indicator--inactive]="!reminder()!.isActive"
                ></span>
                <span class="schedule-badge" [class]="'schedule-badge--' + reminder()!.scheduleType.toLowerCase()">
                  {{ getScheduleLabel(reminder()!.scheduleType) }}
                </span>
              </div>
              <h1 class="page-title">{{ reminder()!.name }}</h1>
              @if (reminder()!.reminderMessage) {
                <p class="page-subtitle">{{ reminder()!.reminderMessage }}</p>
              }
            </div>
            <div class="page-header__actions">
              <button class="btn btn--ghost" (click)="toggleActive()">
                @if (reminder()!.isActive) {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="6" y="4" width="4" height="16"/>
                    <rect x="14" y="4" width="4" height="16"/>
                  </svg>
                  Pause
                } @else {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Activate
                }
              </button>
              <a [routerLink]="['/tasks/reminders', reminder()!.id, 'edit']" class="btn btn--primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </a>
            </div>
          </div>
        </header>

        <div class="detail-grid">
          <!-- Schedule Card -->
          <div class="detail-card">
            <h2 class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              Schedule
            </h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Type</span>
                <span class="info-value">{{ getScheduleLabel(reminder()!.scheduleType) }}</span>
              </div>
              @if (reminder()!.nextOccurrence) {
                <div class="info-item">
                  <span class="info-label">Next Occurrence</span>
                  <span class="info-value info-value--highlight">{{ formatDate(reminder()!.nextOccurrence!) }}</span>
                </div>
              }
              @if (reminder()!.lastTriggered) {
                <div class="info-item">
                  <span class="info-label">Last Triggered</span>
                  <span class="info-value">{{ formatDate(reminder()!.lastTriggered!) }}</span>
                </div>
              }
              @if (reminder()!.scheduleConfig) {
                <div class="info-item">
                  <span class="info-label">Configuration</span>
                  <span class="info-value">{{ formatScheduleConfig(reminder()!) }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Notification Settings Card -->
          <div class="detail-card">
            <h2 class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              Notification
            </h2>
            <div class="info-grid">
              @if (reminder()!.reminderTitle) {
                <div class="info-item">
                  <span class="info-label">Title</span>
                  <span class="info-value">{{ reminder()!.reminderTitle }}</span>
                </div>
              }
              @if (reminder()!.reminderWarning) {
                <div class="info-item">
                  <span class="info-label">Warning</span>
                  <span class="info-value">{{ reminder()!.reminderWarning }} minutes before</span>
                </div>
              }
              @if (reminder()!.reminderDeadline) {
                <div class="info-item">
                  <span class="info-label">Overdue After</span>
                  <span class="info-value">{{ reminder()!.reminderDeadline }} minutes</span>
                </div>
              }
            </div>
          </div>

          <!-- Quick Actions Card -->
          <div class="detail-card">
            <h2 class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Quick Actions
            </h2>
            <div class="actions-list">
              <button class="action-btn" (click)="snooze(15)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Snooze 15 min
              </button>
              <button class="action-btn" (click)="snooze(60)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Snooze 1 hour
              </button>
              <button class="action-btn action-btn--danger" (click)="deleteReminder()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
                Delete Reminder
              </button>
            </div>
          </div>

          <!-- Recent Notifications Card -->
          @if (reminder()!.notifications && reminder()!.notifications!.length > 0) {
            <div class="detail-card detail-card--full">
              <h2 class="card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 17H2a3 3 0 003-3V9a7 7 0 0114 0v5a3 3 0 003 3zm-8.27 4a2 2 0 01-3.46 0"/>
                </svg>
                Recent Notifications
              </h2>
              <div class="notifications-list">
                @for (notif of reminder()!.notifications!.slice(0, 5); track notif.id) {
                  <div class="notification-item">
                    <div class="notification-status" [class]="'notification-status--' + notif.status.toLowerCase()"></div>
                    <div class="notification-content">
                      <span class="notification-title">{{ notif.title }}</span>
                      <span class="notification-time">{{ formatDate(notif.createdAt) }}</span>
                    </div>
                    <span class="notification-badge" [class]="'notification-badge--' + notif.status.toLowerCase()">
                      {{ notif.status }}
                    </span>
                  </div>
                }
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
      --color-primary: #10B981;
      --color-primary-hover: #059669;
      --color-bg: #FAFBFC;
      --color-surface: #FFFFFF;
      --color-border: #E5E7EB;
      --color-text: #0F172A;
      --color-text-secondary: #64748B;
      --color-text-muted: #94A3B8;
      --color-success: #10B981;
      --color-warning: #F59E0B;
      --color-danger: #EF4444;
      --radius-md: 8px;
      --radius-lg: 12px;
      --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
      --transition-fast: 0.15s ease;
    }

    .detail-page {
      padding: 32px;
      max-width: 1000px;
      margin: 0 auto;
    }

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

    .page-header {
      margin-bottom: 32px;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      text-decoration: none;
      margin-bottom: 16px;
      transition: color var(--transition-fast);

      svg { width: 16px; height: 16px; }

      &:hover { color: var(--color-primary); }
    }

    .page-header__content {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
    }

    .page-header__status {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }

    .status-indicator {
      width: 10px;
      height: 10px;
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

      &--one_time { background: #EEF2FF; color: #4F46E5; }
      &--daily { background: #ECFDF5; color: #059669; }
      &--weekly { background: #FEF3C7; color: #D97706; }
      &--monthly { background: #FCE7F3; color: #DB2777; }
      &--yearly { background: #E0E7FF; color: #4338CA; }
      &--custom { background: #F1F5F9; color: #475569; }
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

    .page-header__actions {
      display: flex;
      gap: 10px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      font-size: 0.9375rem;
      font-weight: 500;
      border-radius: var(--radius-md);
      text-decoration: none;
      cursor: pointer;
      transition: all var(--transition-fast);

      svg { width: 18px; height: 18px; }

      &--primary {
        background: var(--color-primary);
        color: white;
        &:hover { background: var(--color-primary-hover); }
      }

      &--ghost {
        background: transparent;
        color: var(--color-text-secondary);
        border: 1px solid var(--color-border);
        &:hover { background: var(--color-bg); color: var(--color-text); }
      }
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .detail-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 24px;
      box-shadow: var(--shadow-card);

      &--full {
        grid-column: 1 / -1;
      }
    }

    .card-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 20px;

      svg {
        width: 20px;
        height: 20px;
        color: var(--color-text-muted);
      }
    }

    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .info-value {
      font-size: 0.9375rem;
      color: var(--color-text);

      &--highlight {
        color: var(--color-primary);
        font-weight: 500;
      }
    }

    .actions-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 18px;
        height: 18px;
        color: var(--color-text-muted);
      }

      &:hover {
        background: var(--color-surface);
        border-color: var(--color-primary);
      }

      &--danger {
        &:hover {
          background: rgba(239, 68, 68, 0.05);
          border-color: var(--color-danger);
          color: var(--color-danger);

          svg { color: var(--color-danger); }
        }
      }
    }

    .notifications-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .notification-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--color-bg);
      border-radius: var(--radius-md);
    }

    .notification-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;

      &--sent { background: var(--color-success); }
      &--pending { background: var(--color-warning); }
      &--failed { background: var(--color-danger); }
      &--read { background: var(--color-text-muted); }
    }

    .notification-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .notification-title {
      font-size: 0.875rem;
      color: var(--color-text);
    }

    .notification-time {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .notification-badge {
      padding: 4px 8px;
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      border-radius: 4px;

      &--sent { background: rgba(16, 185, 129, 0.1); color: var(--color-success); }
      &--pending { background: rgba(245, 158, 11, 0.1); color: var(--color-warning); }
      &--failed { background: rgba(239, 68, 68, 0.1); color: var(--color-danger); }
      &--read { background: var(--color-bg); color: var(--color-text-muted); }
    }

    @media (max-width: 768px) {
      .detail-page { padding: 20px; }
      .detail-grid { grid-template-columns: 1fr; }
      .page-header__content { flex-direction: column; }
      .page-header__actions { width: 100%; }
      .btn { flex: 1; justify-content: center; }
    }
  `]
})
export class ReminderDetailComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private reminderService = inject(ReminderService);

  reminder = signal<Reminder | null>(null);
  isLoading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadReminder(id);
    }
  }

  loadReminder(id: string): void {
    this.reminderService.getReminder(id).subscribe({
      next: (reminder) => {
        this.reminder.set(reminder);
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

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  formatScheduleConfig(reminder: Reminder): string {
    const config = reminder.scheduleConfig;
    if (!config) return '-';

    const parts: string[] = [];

    if (config.time) {
      parts.push(`at ${config.time}`);
    }

    if (config.daysOfWeek && config.daysOfWeek.length > 0) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayNames = config.daysOfWeek.map(d => days[d]).join(', ');
      parts.push(`on ${dayNames}`);
    }

    if (config.dayOfMonth) {
      parts.push(`on day ${config.dayOfMonth}`);
    }

    if (config.month !== undefined) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      parts.push(`in ${months[config.month]}`);
    }

    if (config.intervalMinutes) {
      parts.push(`every ${config.intervalMinutes} minutes`);
    }

    return parts.join(' ') || '-';
  }

  toggleActive(): void {
    const r = this.reminder();
    if (!r) return;

    this.reminderService.toggleReminder(r.id).subscribe({
      next: (updated) => {
        this.reminder.set(updated);
      }
    });
  }

  snooze(minutes: number): void {
    const r = this.reminder();
    if (!r) return;

    this.reminderService.snoozeReminder(r.id, minutes).subscribe({
      next: (updated) => {
        this.reminder.set(updated);
      }
    });
  }

  deleteReminder(): void {
    const r = this.reminder();
    if (!r) return;

    if (!confirm(`Delete reminder "${r.name}"?`)) return;

    this.reminderService.deleteReminder(r.id).subscribe({
      next: () => {
        this.router.navigate(['/tasks/reminders']);
      }
    });
  }
}
