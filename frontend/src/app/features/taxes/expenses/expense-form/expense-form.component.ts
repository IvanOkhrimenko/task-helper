import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ExpenseService, Expense, ExpenseCategory, ExpenseType, CreateExpenseDto } from '../../../../core/services/expense.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="expense-form-page">
      <header class="header">
        <a routerLink="/expenses" class="back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          {{ 'taxes.expenses.form.backToExpenses' | translate }}
        </a>
        <div class="header__content">
          <h1 class="header__title">{{ isEditMode() ? ('taxes.expenses.form.editTitle' | translate) : ('taxes.expenses.form.newTitle' | translate) }}</h1>
          <p class="header__subtitle">{{ isEditMode() ? ('taxes.expenses.form.editSubtitle' | translate) : ('taxes.expenses.form.newSubtitle' | translate) }}</p>
        </div>
      </header>

      @if (isLoading()) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>{{ 'taxes.expenses.form.loading' | translate }}</p>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-container">
          <!-- Expense Type Toggle -->
          <section class="form-section">
            <div class="expense-type-toggle">
              <button
                type="button"
                class="type-toggle-btn"
                [class.type-toggle-btn--active]="form.get('expenseType')?.value === 'BUSINESS'"
                (click)="setExpenseType('BUSINESS')"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="7" width="20" height="14" rx="2"/>
                  <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                </svg>
                {{ 'taxes.expenses.form.type.business' | translate }}
              </button>
              <button
                type="button"
                class="type-toggle-btn type-toggle-btn--personal"
                [class.type-toggle-btn--active]="form.get('expenseType')?.value === 'PERSONAL'"
                (click)="setExpenseType('PERSONAL')"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                {{ 'taxes.expenses.form.type.personal' | translate }}
              </button>
            </div>
            @if (form.get('expenseType')?.value === 'PERSONAL') {
              <p class="type-hint">{{ 'taxes.expenses.form.type.personalHint' | translate }}</p>
            }
          </section>

          <!-- Basic Info Section -->
          <section class="form-section">
            <h2 class="section-title">{{ 'taxes.expenses.form.basicInfo.title' | translate }}</h2>

            <div class="form-row">
              <div class="form-group form-group--large">
                <label class="form-label">{{ 'taxes.expenses.form.basicInfo.name' | translate }} *</label>
                <input
                  type="text"
                  formControlName="name"
                  class="form-input"
                  [placeholder]="'taxes.expenses.form.basicInfo.namePlaceholder' | translate"
                />
                @if (form.get('name')?.touched && form.get('name')?.errors?.['required']) {
                  <span class="form-error">{{ 'taxes.expenses.form.basicInfo.nameRequired' | translate }}</span>
                }
              </div>

              <div class="form-group">
                <label class="form-label">{{ 'taxes.expenses.form.basicInfo.category' | translate }} *</label>
                <div class="select-wrapper">
                  <select formControlName="category" class="form-select">
                    @for (cat of categories; track cat.value) {
                      <option [value]="cat.value">{{ cat.label }}</option>
                    }
                  </select>
                  <svg class="select-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">{{ 'taxes.expenses.form.basicInfo.description' | translate }}</label>
              <textarea
                formControlName="description"
                class="form-textarea"
                rows="3"
                [placeholder]="'taxes.expenses.form.basicInfo.descriptionPlaceholder' | translate"
              ></textarea>
            </div>
          </section>

          <!-- Amount Section -->
          <section class="form-section">
            <h2 class="section-title">{{ 'taxes.expenses.form.amount.title' | translate }}</h2>

            <div class="form-row form-row--three">
              <div class="form-group">
                <label class="form-label">{{ 'taxes.expenses.form.amount.grossAmount' | translate }} *</label>
                <div class="input-wrapper">
                  <input
                    type="number"
                    formControlName="amount"
                    class="form-input form-input--mono"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                @if (form.get('amount')?.touched && form.get('amount')?.errors?.['required']) {
                  <span class="form-error">{{ 'taxes.expenses.form.amount.amountRequired' | translate }}</span>
                }
              </div>

              <div class="form-group">
                <label class="form-label">{{ 'taxes.expenses.form.amount.currency' | translate }}</label>
                <div class="select-wrapper">
                  <select formControlName="currency" class="form-select">
                    <option value="PLN">PLN</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="UAH">UAH</option>
                  </select>
                  <svg class="select-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">{{ 'taxes.expenses.form.amount.vatRate' | translate }}</label>
                <div class="select-wrapper">
                  <select formControlName="vatRate" class="form-select">
                    <option [ngValue]="null">{{ 'taxes.expenses.form.amount.noVat' | translate }}</option>
                    <option [ngValue]="23">23%</option>
                    <option [ngValue]="8">8%</option>
                    <option [ngValue]="5">5%</option>
                    <option [ngValue]="0">0%</option>
                  </select>
                  <svg class="select-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>
            </div>

            @if (form.get('currency')?.value !== 'PLN') {
              <div class="info-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <p>{{ 'taxes.expenses.form.amount.currencyInfo' | translate }}</p>
              </div>
            }
          </section>

          <!-- Date & Document Section -->
          <section class="form-section">
            <h2 class="section-title">{{ 'taxes.expenses.form.dateDocument.title' | translate }}</h2>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ 'taxes.expenses.form.dateDocument.expenseDate' | translate }} *</label>
                <input
                  type="date"
                  formControlName="expenseDate"
                  class="form-input"
                />
                @if (form.get('expenseDate')?.touched && form.get('expenseDate')?.errors?.['required']) {
                  <span class="form-error">{{ 'taxes.expenses.form.dateDocument.dateRequired' | translate }}</span>
                }
              </div>

              <div class="form-group">
                <label class="form-label">{{ 'taxes.expenses.form.dateDocument.documentNumber' | translate }}</label>
                <input
                  type="text"
                  formControlName="documentNumber"
                  class="form-input"
                  [placeholder]="'taxes.expenses.form.dateDocument.documentPlaceholder' | translate"
                />
              </div>
            </div>
          </section>

          <!-- Tax Deduction Section (only for business expenses) -->
          @if (form.get('expenseType')?.value === 'BUSINESS') {
          <section class="form-section">
            <h2 class="section-title">{{ 'taxes.expenses.form.taxDeduction.title' | translate }}</h2>

            <div class="toggle-group">
              <label class="toggle">
                <input
                  type="checkbox"
                  formControlName="isDeductible"
                  class="toggle__input"
                />
                <span class="toggle__switch"></span>
                <span class="toggle__label">{{ 'taxes.expenses.form.taxDeduction.isDeductible' | translate }}</span>
              </label>
              <p class="toggle__description">
                {{ 'taxes.expenses.form.taxDeduction.isDeductibleHint' | translate }}
              </p>
            </div>

            @if (form.get('isDeductible')?.value) {
              <div class="form-group" style="margin-top: var(--space-lg);">
                <label class="form-label">{{ 'taxes.expenses.form.taxDeduction.percentage' | translate }}</label>
                <div class="deduction-chips">
                  @for (percent of deductionPercents; track percent) {
                    <button
                      type="button"
                      class="deduction-chip"
                      [class.deduction-chip--selected]="form.get('deductiblePercent')?.value === percent"
                      (click)="setDeductionPercent(percent)"
                    >
                      {{ percent }}%
                    </button>
                  }
                </div>
                <p class="form-hint">
                  {{ 'taxes.expenses.form.taxDeduction.percentageHint' | translate }}
                </p>
              </div>
            }
          </section>
          }

          <!-- Actions -->
          <div class="form-actions">
            <button type="button" class="btn btn--secondary" routerLink="/expenses">
              {{ 'taxes.expenses.form.cancel' | translate }}
            </button>
            <button
              type="submit"
              class="btn btn--primary"
              [disabled]="isSaving() || form.invalid"
            >
              @if (isSaving()) {
                <span class="btn__spinner"></span>
                {{ 'taxes.expenses.form.saving' | translate }}
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                {{ isEditMode() ? ('taxes.expenses.form.saveChanges' | translate) : ('taxes.expenses.form.addExpense' | translate) }}
              }
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

    :host {
      --tax-font-mono: 'IBM Plex Mono', 'SF Mono', monospace;
      --tax-font-sans: 'Plus Jakarta Sans', var(--font-body);

      display: block;
      font-family: var(--tax-font-sans);
    }

    .expense-form-page {
      min-height: 100%;
      padding: var(--space-xl) var(--space-2xl);
      background: var(--color-bg);
      max-width: 720px;
      margin: 0 auto;
    }

    /* Header */
    .header {
      margin-bottom: var(--space-2xl);
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      text-decoration: none;
      margin-bottom: var(--space-lg);
      transition: color var(--transition-fast);

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover {
        color: var(--color-primary);
      }
    }

    .header__title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text);
      letter-spacing: -0.02em;
      margin-bottom: var(--space-xs);
    }

    .header__subtitle {
      font-size: 0.9375rem;
      color: var(--color-text-secondary);
    }

    /* Loading */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px var(--space-xl);
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

    /* Expense Type Toggle */
    .expense-type-toggle {
      display: flex;
      gap: var(--space-md);
    }

    .type-toggle-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-lg) var(--space-xl);
      background: var(--color-fill-quaternary);
      border: 2px solid transparent;
      border-radius: var(--radius-lg);
      font-family: inherit;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 28px;
        height: 28px;
      }

      &:hover:not(.type-toggle-btn--active) {
        background: var(--color-fill-tertiary);
        color: var(--color-text);
      }

      &--active {
        background: var(--color-primary-subtle);
        border-color: var(--color-primary);
        color: var(--color-primary);
      }

      &--personal.type-toggle-btn--active {
        background: rgba(139, 92, 246, 0.1);
        border-color: #8b5cf6;
        color: #8b5cf6;
      }
    }

    .type-hint {
      margin-top: var(--space-md);
      padding: var(--space-sm) var(--space-md);
      background: rgba(139, 92, 246, 0.1);
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      color: #8b5cf6;
      text-align: center;
    }

    /* Form */
    .form-container {
      display: flex;
      flex-direction: column;
      gap: var(--space-xl);
    }

    .form-section {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      padding: var(--space-xl);
      animation: slideUp 0.4s ease both;
    }

    .section-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-xl);
      padding-bottom: var(--space-md);
      border-bottom: 1px solid var(--color-border);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-lg);
      margin-bottom: var(--space-lg);

      &:last-child {
        margin-bottom: 0;
      }

      &--three {
        grid-template-columns: 1fr 1fr 1fr;
      }
    }

    .form-group {
      &--large {
        grid-column: span 1;
      }
    }

    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
      margin-bottom: var(--space-sm);
    }

    .form-input,
    .form-textarea {
      width: 100%;
      padding: var(--space-md) var(--space-lg);
      background: var(--color-fill-quaternary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-family: inherit;
      font-size: 0.9375rem;
      color: var(--color-text);
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-border-hover);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-subtle);
      }

      &::placeholder {
        color: var(--color-text-tertiary);
      }

      &--mono {
        font-family: var(--tax-font-mono);
      }
    }

    .form-textarea {
      resize: vertical;
      min-height: 80px;
    }

    .form-error {
      display: block;
      font-size: 0.75rem;
      color: #dc2626;
      margin-top: var(--space-xs);
    }

    .form-hint {
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
      margin-top: var(--space-sm);
    }

    .select-wrapper {
      position: relative;
    }

    .form-select {
      width: 100%;
      padding: var(--space-md) var(--space-lg);
      padding-right: 48px;
      background: var(--color-fill-quaternary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-family: inherit;
      font-size: 0.9375rem;
      color: var(--color-text);
      appearance: none;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-border-hover);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-subtle);
      }
    }

    .select-icon {
      position: absolute;
      right: var(--space-md);
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 20px;
      color: var(--color-text-tertiary);
      pointer-events: none;
    }

    .input-wrapper {
      position: relative;
    }

    /* Toggle */
    .toggle-group {
      padding: var(--space-lg);
      background: var(--color-fill-quaternary);
      border-radius: var(--radius-lg);
    }

    .toggle {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      cursor: pointer;
    }

    .toggle__input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .toggle__switch {
      position: relative;
      width: 44px;
      height: 24px;
      background: var(--color-border);
      border-radius: var(--radius-full);
      transition: background var(--transition-fast);
      flex-shrink: 0;

      &::after {
        content: '';
        position: absolute;
        left: 2px;
        top: 2px;
        width: 20px;
        height: 20px;
        background: white;
        border-radius: var(--radius-full);
        box-shadow: var(--shadow-sm);
        transition: transform var(--transition-fast);
      }
    }

    .toggle__input:checked + .toggle__switch {
      background: var(--color-primary);

      &::after {
        transform: translateX(20px);
      }
    }

    .toggle__label {
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--color-text);
    }

    .toggle__description {
      font-size: 0.8125rem;
      color: var(--color-text-tertiary);
      margin-top: var(--space-sm);
      padding-left: 56px;
    }

    /* Deduction Chips */
    .deduction-chips {
      display: flex;
      gap: var(--space-sm);
      flex-wrap: wrap;
    }

    .deduction-chip {
      padding: var(--space-sm) var(--space-md);
      background: var(--color-fill-quaternary);
      border: 2px solid transparent;
      border-radius: var(--radius-md);
      font-family: var(--tax-font-mono);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-fill-tertiary);
        color: var(--color-text);
      }

      &--selected {
        background: var(--color-primary-subtle);
        border-color: var(--color-primary);
        color: var(--color-primary);
      }
    }

    /* Info Box */
    .info-box {
      display: flex;
      align-items: flex-start;
      gap: var(--space-md);
      padding: var(--space-md) var(--space-lg);
      background: var(--color-primary-subtle);
      border-radius: var(--radius-md);
      margin-top: var(--space-lg);

      svg {
        width: 20px;
        height: 20px;
        color: var(--color-primary);
        flex-shrink: 0;
        margin-top: 2px;
      }

      p {
        font-size: 0.8125rem;
        color: var(--color-text-secondary);
        margin: 0;
        line-height: 1.5;
      }
    }

    /* Actions */
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-md);
      padding-top: var(--space-lg);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      padding: var(--space-md) var(--space-xl);
      font-family: inherit;
      font-size: 0.9375rem;
      font-weight: 600;
      border-radius: var(--radius-lg);
      border: none;
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 18px;
        height: 18px;
      }

      &--primary {
        background: var(--color-primary);
        color: var(--color-primary-text);

        &:hover:not(:disabled) {
          background: var(--color-primary-hover);
          transform: translateY(-1px);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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

    .btn__spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* Animations */
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .expense-form-page {
        padding: var(--space-lg);
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .form-row--three {
        grid-template-columns: 1fr 1fr;
      }

      .form-actions {
        flex-direction: column;
      }

      .btn {
        width: 100%;
      }
    }
  `]
})
export class ExpenseFormComponent implements OnInit {
  private expenseService = inject(ExpenseService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  isLoading = signal(false);
  isSaving = signal(false);
  expenseId = signal<string | null>(null);

  isEditMode = computed(() => this.expenseId() !== null);

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    category: ['SOFTWARE_SUBSCRIPTIONS' as ExpenseCategory, Validators.required],
    expenseType: ['BUSINESS' as ExpenseType],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    currency: ['PLN'],
    expenseDate: [this.formatDateForInput(new Date()), Validators.required],
    vatRate: [23 as number | null],
    documentNumber: [''],
    isDeductible: [true],
    deductiblePercent: [100]
  });

  categories = [
    { value: 'OFFICE_SUPPLIES', label: 'Office supplies' },
    { value: 'SOFTWARE_SUBSCRIPTIONS', label: 'Software' },
    { value: 'HARDWARE_EQUIPMENT', label: 'Hardware' },
    { value: 'TRAVEL_TRANSPORT', label: 'Travel' },
    { value: 'MEALS_ENTERTAINMENT', label: 'Meals' },
    { value: 'PROFESSIONAL_SERVICES', label: 'Services' },
    { value: 'EDUCATION_TRAINING', label: 'Training' },
    { value: 'MARKETING_ADVERTISING', label: 'Marketing' },
    { value: 'INSURANCE', label: 'Insurance' },
    { value: 'RENT_UTILITIES', label: 'Rent & utilities' },
    { value: 'TELECOMMUNICATIONS', label: 'Telecom' },
    { value: 'BANKING_FEES', label: 'Bank fees' },
    { value: 'TAXES_FEES', label: 'Taxes' },
    { value: 'OTHER', label: 'Other' }
  ];

  deductionPercents = [25, 50, 75, 100];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.expenseId.set(id);
      this.loadExpense(id);
    }
  }

  loadExpense(id: string) {
    this.isLoading.set(true);

    this.expenseService.getExpense(id).subscribe({
      next: (expense) => {
        this.form.patchValue({
          name: expense.name,
          description: expense.description || '',
          category: expense.category,
          expenseType: expense.expenseType || 'BUSINESS',
          amount: Number(expense.amount),
          currency: expense.currency,
          expenseDate: this.formatDateForInput(new Date(expense.expenseDate)),
          vatRate: expense.vatRate ? Number(expense.vatRate) : null,
          documentNumber: expense.documentNumber || '',
          isDeductible: expense.isDeductible,
          deductiblePercent: Number(expense.deductiblePercent)
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load expense:', err);
        this.isLoading.set(false);
        this.notificationService.error('Failed to load expense');
        this.router.navigate(['/expenses']);
      }
    });
  }

  setDeductionPercent(percent: number) {
    this.form.patchValue({ deductiblePercent: percent });
  }

  setExpenseType(type: ExpenseType) {
    this.form.patchValue({ expenseType: type });
    // Personal expenses are not deductible
    if (type === 'PERSONAL') {
      this.form.patchValue({ isDeductible: false, deductiblePercent: 0 });
    }
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.isSaving.set(true);

    const formValue = this.form.value;
    const expenseData: CreateExpenseDto = {
      name: formValue.name!,
      description: formValue.description || undefined,
      category: formValue.category as ExpenseCategory,
      expenseType: formValue.expenseType as ExpenseType,
      amount: formValue.amount!,
      currency: formValue.currency!,
      expenseDate: formValue.expenseDate!,
      vatRate: formValue.vatRate || undefined,
      documentNumber: formValue.documentNumber || undefined,
      isDeductible: formValue.expenseType === 'PERSONAL' ? false : (formValue.isDeductible ?? true),
      deductiblePercent: formValue.expenseType === 'PERSONAL' ? 0 : (formValue.isDeductible ? formValue.deductiblePercent! : 0)
    };

    const request$ = this.isEditMode()
      ? this.expenseService.updateExpense(this.expenseId()!, expenseData)
      : this.expenseService.createExpense(expenseData);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notificationService.success(
          this.isEditMode() ? 'Expense updated' : 'Expense added'
        );
        this.router.navigate(['/expenses']);
      },
      error: (err) => {
        console.error('Failed to save expense:', err);
        this.isSaving.set(false);
        this.notificationService.error('Failed to save expense');
      }
    });
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
