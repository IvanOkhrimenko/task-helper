import { Component, inject, signal, computed, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task } from '../../../core/services/task.service';

export interface InvoiceGenerationData {
  taskId: string;
  hoursWorked: number;
  hourlyRate: number;
  month: number;
  year: number;
  description: string;
  language: string;
}

@Component({
  selector: 'app-invoice-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h2 class="modal__title">Generate Invoice</h2>
            <button class="modal__close" (click)="close()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="modal__body">
            <div class="task-info">
              <span class="task-info__label">Task</span>
              <span class="task-info__value">{{ task()?.name }}</span>
            </div>

            <div class="task-info">
              <span class="task-info__label">Client</span>
              <span class="task-info__value">{{ task()?.clientName || 'Not specified' }}</span>
            </div>

            <div class="form-section">
              <h3 class="section-title">Invoice Period</h3>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Month</label>
                  <select
                    class="form-select"
                    [(ngModel)]="selectedMonth"
                  >
                    @for (m of months; track m.value) {
                      <option [value]="m.value">{{ m.label }}</option>
                    }
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Year</label>
                  <select
                    class="form-select"
                    [(ngModel)]="selectedYear"
                  >
                    @for (y of years; track y) {
                      <option [value]="y">{{ y }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Invoice Language</label>
                <select
                  class="form-select"
                  [(ngModel)]="selectedLanguage"
                >
                  <option value="PL">Polski (PL/EN bilingual)</option>
                  <option value="EN">English</option>
                </select>
              </div>
            </div>

            <div class="form-section">
              <h3 class="section-title">Hours & Rate</h3>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Hours Worked *</label>
                  <input
                    type="number"
                    class="form-input"
                    [(ngModel)]="hoursWorked"
                    min="0"
                    step="0.5"
                    placeholder="e.g., 160"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Hourly Rate ({{ task()?.currency || 'USD' }}) *</label>
                  <div class="input-prefix">
                    <span class="prefix">{{ currencySymbol() }}</span>
                    <input
                      type="number"
                      class="form-input"
                      [(ngModel)]="hourlyRate"
                      min="0"
                      step="0.01"
                      placeholder="e.g., 75.00"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Work Description</label>
              <textarea
                class="form-input form-textarea"
                [(ngModel)]="description"
                rows="3"
                [placeholder]="defaultDescription()"
              ></textarea>
            </div>

            <div class="total-preview">
              <div class="total-row">
                <span>{{ hoursWorked || 0 }} hours × {{ currencySymbol() }}{{ hourlyRate || 0 }}</span>
                <strong class="total-amount">{{ currencySymbol() }}{{ calculatedTotal() }} {{ task()?.currency || 'USD' }}</strong>
              </div>
            </div>
          </div>

          <div class="modal__footer">
            <button class="btn btn--secondary" (click)="close()">Cancel</button>
            <button
              class="btn btn--primary"
              (click)="generate()"
              [disabled]="!isValid() || isGenerating()"
            >
              @if (isGenerating()) {
                <span class="btn__spinner"></span>
                Generating...
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                Generate Invoice
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: var(--space-lg);
      animation: fadeIn 0.2s ease;
    }

    .modal {
      background: var(--color-surface);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: scaleIn 0.2s ease;
    }

    .modal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-lg) var(--space-xl);
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .modal__title {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);
    }

    .modal__close {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      color: var(--color-text-secondary);
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-bg-subtle);
        color: var(--color-text);
      }

      svg {
        width: 20px;
        height: 20px;
      }
    }

    .modal__body {
      padding: var(--space-xl);
      overflow-y: auto;
      flex: 1;
    }

    .task-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-sm) 0;
      border-bottom: 1px solid var(--color-border-subtle);

      &:last-of-type {
        margin-bottom: var(--space-lg);
      }
    }

    .task-info__label {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }

    .task-info__value {
      font-weight: 500;
      color: var(--color-text);
    }

    .form-section {
      margin-bottom: var(--space-lg);
    }

    .section-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-md);
      padding-bottom: var(--space-sm);
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-md);
    }

    .form-group {
      margin-bottom: var(--space-md);
    }

    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
      margin-bottom: var(--space-sm);
    }

    .form-input,
    .form-select {
      width: 100%;
      padding: var(--space-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 0.9375rem;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

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

    .form-textarea {
      resize: vertical;
      min-height: 80px;
    }

    .input-prefix {
      position: relative;

      .prefix {
        position: absolute;
        left: var(--space-md);
        top: 50%;
        transform: translateY(-50%);
        color: var(--color-text-muted);
        font-weight: 500;
        pointer-events: none;
      }

      .form-input {
        padding-left: 32px;
      }
    }

    .rate-hint {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .total-preview {
      background: var(--color-primary-subtle);
      border-radius: var(--radius-md);
      padding: var(--space-lg);
      margin-top: var(--space-lg);
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;

      span {
        color: var(--color-text-secondary);
      }
    }

    .total-amount {
      font-family: var(--font-display);
      font-size: 1.5rem;
      color: var(--color-primary);
    }

    .modal__footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-md);
      padding: var(--space-lg) var(--space-xl);
      background: var(--color-bg-subtle);
      border-top: 1px solid var(--color-border-subtle);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      padding: var(--space-md) var(--space-xl);
      font-size: 0.9375rem;
      font-weight: 500;
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);

      svg {
        width: 18px;
        height: 18px;
      }

      &--primary {
        background: var(--color-primary);
        color: white;

        &:hover:not(:disabled) {
          background: var(--color-primary-hover);
        }
      }

      &--secondary {
        background: var(--color-surface);
        color: var(--color-text);
        border: 1px solid var(--color-border);

        &:hover {
          background: var(--color-bg-subtle);
        }
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .btn__spinner {
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

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `]
})
export class InvoiceModalComponent {
  task = input<Task | null>(null);
  isOpen = signal(false);
  isGenerating = signal(false);

  onGenerate = output<InvoiceGenerationData>();
  onClose = output<void>();

  // Form values
  hoursWorked: number | null = null;
  hourlyRate: number | null = null;
  selectedMonth: number;
  selectedYear: number;
  selectedLanguage: string = 'PL';
  description = '';

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

  years: number[] = [];

  constructor() {
    const now = new Date();
    // Default to previous month
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    this.selectedMonth = prevMonth.getMonth();
    this.selectedYear = prevMonth.getFullYear();

    // Generate year options (current year and 2 years back)
    const currentYear = now.getFullYear();
    this.years = [currentYear - 2, currentYear - 1, currentYear];
  }

  defaultDescription = computed(() => {
    const monthName = this.months[this.selectedMonth]?.label || '';
    return `Professional services for ${monthName} ${this.selectedYear}`;
  });

  currencySymbol = computed(() => {
    const currency = this.task()?.currency || 'USD';
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'PLN': 'zł',
      'GBP': '£'
    };
    return symbols[currency] || currency + ' ';
  });

  calculatedTotal(): string {
    const hours = this.hoursWorked || 0;
    const rate = this.hourlyRate || 0;
    return (hours * rate).toFixed(2);
  }

  isValid(): boolean {
    return this.hoursWorked !== null && this.hoursWorked > 0 &&
           this.hourlyRate !== null && this.hourlyRate > 0;
  }

  open(task: Task) {
    // Reset form with task defaults
    this.hoursWorked = task.hoursWorked || null;
    this.hourlyRate = task.hourlyRate || null;
    this.selectedLanguage = task.defaultLanguage || 'PL';
    this.description = '';

    // Set to previous month
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    this.selectedMonth = prevMonth.getMonth();
    this.selectedYear = prevMonth.getFullYear();

    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
    this.onClose.emit();
  }

  generate() {
    if (!this.isValid() || !this.task()) return;

    const data: InvoiceGenerationData = {
      taskId: this.task()!.id,
      hoursWorked: this.hoursWorked!,
      hourlyRate: this.hourlyRate!,
      month: this.selectedMonth,
      year: this.selectedYear,
      description: this.description || this.defaultDescription(),
      language: this.selectedLanguage
    };

    this.onGenerate.emit(data);
  }

  setGenerating(value: boolean) {
    this.isGenerating.set(value);
  }
}
