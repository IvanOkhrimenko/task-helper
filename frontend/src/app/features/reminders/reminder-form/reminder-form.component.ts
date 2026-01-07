import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ReminderService, Reminder, ScheduleType, ScheduleConfig, CreateReminderDto } from '../../../core/services/reminder.service';

@Component({
  selector: 'app-reminder-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="form-page">
      <header class="page-header">
        <a routerLink="/tasks/reminders" class="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Reminders
        </a>
        <h1 class="page-title">{{ isEditing() ? 'Edit Reminder' : 'New Reminder' }}</h1>
      </header>

      <form class="form-card" (ngSubmit)="save()">
        <!-- Basic Info -->
        <section class="form-section">
          <h2 class="section-title">Basic Information</h2>

          <div class="form-group">
            <label for="name" class="form-label">Reminder Name *</label>
            <input
              type="text"
              id="name"
              [(ngModel)]="name"
              name="name"
              class="form-input"
              placeholder="e.g., Team meeting, Pay bills"
              required
            >
          </div>

          <div class="form-group">
            <label for="title" class="form-label">Notification Title</label>
            <input
              type="text"
              id="title"
              [(ngModel)]="reminderTitle"
              name="reminderTitle"
              class="form-input"
              placeholder="Title shown in notification (optional)"
            >
          </div>

          <div class="form-group">
            <label for="message" class="form-label">Message</label>
            <textarea
              id="message"
              [(ngModel)]="reminderMessage"
              name="reminderMessage"
              class="form-input form-textarea"
              placeholder="Additional details for this reminder"
              rows="3"
            ></textarea>
          </div>
        </section>

        <!-- Schedule -->
        <section class="form-section">
          <h2 class="section-title">Schedule</h2>

          <div class="form-group">
            <label class="form-label">Schedule Type *</label>
            <div class="schedule-type-grid">
              @for (type of scheduleTypes; track type.value) {
                <button
                  type="button"
                  class="schedule-type-btn"
                  [class.schedule-type-btn--active]="scheduleType === type.value"
                  (click)="scheduleType = type.value"
                >
                  <span class="schedule-type-btn__icon" [innerHTML]="type.icon"></span>
                  <span class="schedule-type-btn__label">{{ type.label }}</span>
                </button>
              }
            </div>
          </div>

          <!-- One-time specific -->
          @if (scheduleType === 'ONE_TIME') {
            <div class="form-row">
              <div class="form-group">
                <label for="dateTime" class="form-label">Date & Time *</label>
                <input
                  type="datetime-local"
                  id="dateTime"
                  [(ngModel)]="reminderDateTime"
                  name="reminderDateTime"
                  class="form-input"
                  required
                >
              </div>
            </div>
          }

          <!-- Recurring types -->
          @if (scheduleType !== 'ONE_TIME') {
            <div class="form-group">
              <label for="time" class="form-label">Time *</label>
              <input
                type="time"
                id="time"
                [(ngModel)]="scheduleTime"
                name="scheduleTime"
                class="form-input form-input--time"
                required
              >
            </div>

            @if (scheduleType === 'WEEKLY') {
              <div class="form-group">
                <label class="form-label">Days of Week *</label>
                <div class="days-selector">
                  @for (day of weekDays; track day.value) {
                    <button
                      type="button"
                      class="day-btn"
                      [class.day-btn--active]="selectedDays.includes(day.value)"
                      (click)="toggleDay(day.value)"
                    >
                      {{ day.short }}
                    </button>
                  }
                </div>
              </div>
            }

            @if (scheduleType === 'MONTHLY') {
              <div class="form-group">
                <label for="dayOfMonth" class="form-label">Day of Month *</label>
                <select
                  id="dayOfMonth"
                  [(ngModel)]="dayOfMonth"
                  name="dayOfMonth"
                  class="form-input form-select"
                  required
                >
                  @for (day of daysOfMonth; track day) {
                    <option [value]="day">{{ day }}</option>
                  }
                </select>
              </div>
            }

            @if (scheduleType === 'YEARLY') {
              <div class="form-row">
                <div class="form-group">
                  <label for="month" class="form-label">Month *</label>
                  <select
                    id="month"
                    [(ngModel)]="selectedMonth"
                    name="selectedMonth"
                    class="form-input form-select"
                    required
                  >
                    @for (month of months; track month.value) {
                      <option [value]="month.value">{{ month.label }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label for="yearDayOfMonth" class="form-label">Day *</label>
                  <select
                    id="yearDayOfMonth"
                    [(ngModel)]="dayOfMonth"
                    name="dayOfMonth"
                    class="form-input form-select"
                    required
                  >
                    @for (day of daysOfMonth; track day) {
                      <option [value]="day">{{ day }}</option>
                    }
                  </select>
                </div>
              </div>
            }

            @if (scheduleType === 'CUSTOM') {
              <div class="form-group">
                <label for="interval" class="form-label">Repeat every (minutes) *</label>
                <input
                  type="number"
                  id="interval"
                  [(ngModel)]="intervalMinutes"
                  name="intervalMinutes"
                  class="form-input"
                  min="1"
                  placeholder="60"
                  required
                >
              </div>
            }
          }
        </section>

        <!-- Advanced Options -->
        <section class="form-section">
          <h2 class="section-title">Advanced Options</h2>

          <div class="form-row">
            <div class="form-group">
              <label for="warning" class="form-label">Warning (minutes before)</label>
              <input
                type="number"
                id="warning"
                [(ngModel)]="reminderWarning"
                name="reminderWarning"
                class="form-input"
                min="0"
                placeholder="15"
              >
            </div>
            <div class="form-group">
              <label for="deadline" class="form-label">Overdue after (minutes)</label>
              <input
                type="number"
                id="deadline"
                [(ngModel)]="reminderDeadline"
                name="reminderDeadline"
                class="form-input"
                min="0"
                placeholder="30"
              >
            </div>
          </div>

          <div class="form-group">
            <label for="notificationEmail" class="form-label">Notification Email (optional)</label>
            <div class="email-input-wrapper">
              <svg class="email-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M22 7l-10 6L2 7"/>
              </svg>
              <input
                type="email"
                id="notificationEmail"
                [(ngModel)]="notificationEmail"
                name="notificationEmail"
                class="form-input form-input--with-icon"
                placeholder="Leave empty to use your account email"
              >
            </div>
            <p class="form-hint">Send email notifications to this address instead of your account email</p>
          </div>

          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" [(ngModel)]="isActive" name="isActive">
              <span class="toggle-switch">
                <span class="toggle-slider"></span>
              </span>
              <span class="toggle-text">Active</span>
            </label>
            <p class="form-hint">Inactive reminders won't trigger notifications</p>
          </div>
        </section>

        <!-- Actions -->
        <div class="form-actions">
          <a routerLink="/tasks/reminders" class="btn btn--secondary">Cancel</a>
          <button type="submit" class="btn btn--primary" [disabled]="isSaving()">
            @if (isSaving()) {
              <span class="btn-spinner"></span>
              Saving...
            } @else {
              {{ isEditing() ? 'Update' : 'Create' }} Reminder
            }
          </button>
        </div>
      </form>
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
      --radius-sm: 6px;
      --radius-md: 8px;
      --radius-lg: 12px;
      --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
      --transition-fast: 0.15s ease;
    }

    .form-page {
      padding: 32px;
      max-width: 720px;
      margin: 0 auto;
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
      margin-bottom: 12px;
      transition: color var(--transition-fast);

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover {
        color: var(--color-primary);
      }
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text);
      letter-spacing: -0.02em;
    }

    .form-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 0;
      box-shadow: var(--shadow-card);
    }

    .form-section {
      padding: 24px 28px;
      border-bottom: 1px solid var(--color-border);

      &:last-of-type {
        border-bottom: none;
      }
    }

    .section-title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 20px;
    }

    .form-group {
      margin-bottom: 20px;

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
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text);
      margin-bottom: 6px;
    }

    .form-input {
      width: 100%;
      padding: 10px 14px;
      font-size: 0.9375rem;
      font-family: inherit;
      color: var(--color-text);
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
      }

      &::placeholder {
        color: var(--color-text-muted);
      }
    }

    .form-input--time {
      max-width: 160px;
    }

    .form-textarea {
      resize: vertical;
      min-height: 80px;
    }

    .form-select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      background-size: 16px;
      padding-right: 40px;
    }

    .form-hint {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin-top: 6px;
    }

    /* Email Input with Icon */
    .email-input-wrapper {
      position: relative;
    }

    .email-input-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      color: var(--color-text-muted);
      pointer-events: none;
    }

    .form-input--with-icon {
      padding-left: 42px;
    }

    /* Schedule Type Grid */
    .schedule-type-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .schedule-type-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px 12px;
      background: var(--color-bg);
      border: 2px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-primary);
      }

      &--active {
        border-color: var(--color-primary);
        background: rgba(16, 185, 129, 0.05);

        .schedule-type-btn__icon {
          color: var(--color-primary);
        }
      }
    }

    .schedule-type-btn__icon {
      width: 24px;
      height: 24px;
      color: var(--color-text-secondary);

      :host ::ng-deep svg {
        width: 100%;
        height: 100%;
      }
    }

    .schedule-type-btn__label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text);
    }

    /* Days Selector */
    .days-selector {
      display: flex;
      gap: 8px;
    }

    .day-btn {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-secondary);
      background: var(--color-bg);
      border: 2px solid var(--color-border);
      border-radius: 50%;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-primary);
      }

      &--active {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: white;
      }
    }

    /* Toggle */
    .toggle-label {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;

      input {
        position: absolute;
        opacity: 0;
      }
    }

    .toggle-switch {
      position: relative;
      width: 44px;
      height: 24px;
      background: var(--color-border);
      border-radius: 12px;
      transition: background var(--transition-fast);
    }

    .toggle-slider {
      position: absolute;
      width: 18px;
      height: 18px;
      left: 3px;
      top: 3px;
      background: white;
      border-radius: 50%;
      transition: transform var(--transition-fast);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .toggle-label input:checked + .toggle-switch {
      background: #10B981;
    }

    .toggle-label input:checked + .toggle-switch .toggle-slider {
      transform: translateX(20px);
    }

    .toggle-text {
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--color-text);
    }

    /* Actions */
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 28px;
      background: var(--color-bg);
      border-top: 1px solid var(--color-border);
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      font-size: 0.9375rem;
      font-weight: 500;
      border-radius: var(--radius-md);
      text-decoration: none;
      cursor: pointer;
      transition: all var(--transition-fast);

      &--primary {
        background: var(--color-primary);
        color: white;

        &:hover:not(:disabled) {
          background: var(--color-primary-hover);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      &--secondary {
        background: var(--color-surface);
        color: var(--color-text);
        border: 1px solid var(--color-border);

        &:hover {
          background: var(--color-bg);
        }
      }
    }

    .btn-spinner {
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

    @media (max-width: 600px) {
      .form-page {
        padding: 20px;
      }

      .schedule-type-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .days-selector {
        flex-wrap: wrap;
      }
    }
  `]
})
export class ReminderFormComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private reminderService = inject(ReminderService);

  isEditing = signal(false);
  isSaving = signal(false);
  reminderId = '';

  // Form fields
  name = '';
  reminderTitle = '';
  reminderMessage = '';
  notificationEmail = '';
  scheduleType: ScheduleType = 'ONE_TIME';
  reminderDateTime = '';
  scheduleTime = '09:00';
  selectedDays: number[] = [1]; // Monday
  dayOfMonth = 1;
  selectedMonth = 0;
  intervalMinutes = 60;
  reminderWarning: number | null = null;
  reminderDeadline: number | null = null;
  isActive = true;

  scheduleTypes = [
    { value: 'ONE_TIME' as ScheduleType, label: 'One-time', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l2 2"/></svg>' },
    { value: 'DAILY' as ScheduleType, label: 'Daily', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>' },
    { value: 'WEEKLY' as ScheduleType, label: 'Weekly', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
    { value: 'MONTHLY' as ScheduleType, label: 'Monthly', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>' },
    { value: 'YEARLY' as ScheduleType, label: 'Yearly', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>' },
    { value: 'CUSTOM' as ScheduleType, label: 'Custom', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/></svg>' }
  ];

  weekDays = [
    { value: 0, short: 'Su', label: 'Sunday' },
    { value: 1, short: 'Mo', label: 'Monday' },
    { value: 2, short: 'Tu', label: 'Tuesday' },
    { value: 3, short: 'We', label: 'Wednesday' },
    { value: 4, short: 'Th', label: 'Thursday' },
    { value: 5, short: 'Fr', label: 'Friday' },
    { value: 6, short: 'Sa', label: 'Saturday' }
  ];

  daysOfMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  months = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' }
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.reminderId = id;
      this.isEditing.set(true);
      this.loadReminder(id);
    }
  }

  loadReminder(id: string): void {
    this.reminderService.getReminder(id).subscribe({
      next: (reminder) => {
        this.name = reminder.name;
        this.reminderTitle = reminder.reminderTitle || '';
        this.reminderMessage = reminder.reminderMessage || '';
        this.notificationEmail = reminder.notificationEmail || '';
        this.scheduleType = reminder.scheduleType;
        this.isActive = reminder.isActive;
        this.reminderWarning = reminder.reminderWarning;
        this.reminderDeadline = reminder.reminderDeadline;

        if (reminder.reminderDateTime) {
          const dt = new Date(reminder.reminderDateTime);
          this.reminderDateTime = dt.toISOString().slice(0, 16);
        }

        if (reminder.scheduleConfig) {
          const config = reminder.scheduleConfig;
          if (config.time) this.scheduleTime = config.time;
          if (config.daysOfWeek) this.selectedDays = config.daysOfWeek;
          if (config.dayOfMonth) this.dayOfMonth = config.dayOfMonth;
          if (config.month !== undefined) this.selectedMonth = config.month;
          if (config.intervalMinutes) this.intervalMinutes = config.intervalMinutes;
        }
      }
    });
  }

  toggleDay(day: number): void {
    const index = this.selectedDays.indexOf(day);
    if (index === -1) {
      this.selectedDays = [...this.selectedDays, day];
    } else if (this.selectedDays.length > 1) {
      this.selectedDays = this.selectedDays.filter(d => d !== day);
    }
  }

  save(): void {
    if (!this.name || !this.scheduleType) return;

    this.isSaving.set(true);

    const scheduleConfig: ScheduleConfig = {};

    if (this.scheduleType !== 'ONE_TIME') {
      scheduleConfig.time = this.scheduleTime;
    }

    if (this.scheduleType === 'WEEKLY') {
      scheduleConfig.daysOfWeek = this.selectedDays;
    }

    if (this.scheduleType === 'MONTHLY' || this.scheduleType === 'YEARLY') {
      scheduleConfig.dayOfMonth = this.dayOfMonth;
    }

    if (this.scheduleType === 'YEARLY') {
      scheduleConfig.month = this.selectedMonth;
    }

    if (this.scheduleType === 'CUSTOM') {
      scheduleConfig.intervalMinutes = this.intervalMinutes;
    }

    const data: CreateReminderDto = {
      name: this.name,
      scheduleType: this.scheduleType,
      scheduleConfig: Object.keys(scheduleConfig).length > 0 ? scheduleConfig : undefined,
      reminderDateTime: this.scheduleType === 'ONE_TIME' && this.reminderDateTime
        ? new Date(this.reminderDateTime).toISOString()
        : undefined,
      reminderTitle: this.reminderTitle || undefined,
      reminderMessage: this.reminderMessage || undefined,
      notificationEmail: this.notificationEmail || undefined,
      reminderWarning: this.reminderWarning || undefined,
      reminderDeadline: this.reminderDeadline || undefined,
      isActive: this.isActive
    };

    const request = this.isEditing()
      ? this.reminderService.updateReminder(this.reminderId, data)
      : this.reminderService.createReminder(data);

    request.subscribe({
      next: () => {
        this.router.navigate(['/tasks/reminders']);
      },
      error: () => {
        this.isSaving.set(false);
      }
    });
  }
}
