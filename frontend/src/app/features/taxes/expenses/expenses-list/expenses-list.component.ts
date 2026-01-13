import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ExpenseService, Expense, ExpenseCategory, ExpenseType, ExpenseFilters, ExpensesSummary } from '../../../../core/services/expense.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-expenses-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="expenses-page">
      <!-- Header -->
      <header class="header">
        <div class="header__left">
          <a routerLink="/taxes" class="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </a>
          <div>
            <h1 class="header__title">{{ 'taxes.expenses.title' | translate }}</h1>
            <p class="header__subtitle">{{ 'taxes.expenses.subtitle' | translate }}</p>
          </div>
        </div>
        <div class="header__right">
          <div class="year-selector">
            <button class="year-btn" (click)="changeYear(-1)" [disabled]="selectedYear() <= 2020">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span class="year-display">{{ selectedYear() }}</span>
            <button class="year-btn" (click)="changeYear(1)" [disabled]="selectedYear() >= currentYear">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
          <button class="add-btn" (click)="openAddModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {{ 'taxes.expenses.addExpense' | translate }}
          </button>
        </div>
      </header>

      @if (isLoading()) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>{{ 'taxes.expenses.loading' | translate }}</p>
        </div>
      } @else {
        <!-- Summary Cards -->
        <div class="summary-grid">
          <div class="summary-card" [style.animation-delay]="'0ms'">
            <div class="summary-card__icon summary-card__icon--total">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div class="summary-card__content">
              <span class="summary-card__label">{{ 'taxes.expenses.summary.total' | translate }}</span>
              <span class="summary-card__value">{{ formatPLN(summary()?.total || 0) }}</span>
            </div>
          </div>

          <div class="summary-card" [style.animation-delay]="'50ms'">
            <div class="summary-card__icon summary-card__icon--deductible">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div class="summary-card__content">
              <span class="summary-card__label">{{ 'taxes.expenses.summary.deductible' | translate }}</span>
              <span class="summary-card__value">{{ formatPLN(summary()?.totalDeductible || 0) }}</span>
            </div>
          </div>

          <div class="summary-card" [style.animation-delay]="'100ms'">
            <div class="summary-card__icon summary-card__icon--count">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div class="summary-card__content">
              <span class="summary-card__label">{{ 'taxes.expenses.summary.count' | translate }}</span>
              <span class="summary-card__value summary-card__value--count">{{ summary()?.count || 0 }}</span>
            </div>
          </div>
        </div>

        <!-- Expense Type Tabs -->
        <div class="type-tabs">
          <button
            class="type-tab"
            [class.type-tab--active]="selectedExpenseType() === 'ALL'"
            (click)="selectExpenseType('ALL')"
          >
            {{ 'taxes.expenses.tabs.all' | translate }}
            <span class="type-tab__count">{{ summary()?.count || 0 }}</span>
          </button>
          <button
            class="type-tab type-tab--business"
            [class.type-tab--active]="selectedExpenseType() === 'BUSINESS'"
            (click)="selectExpenseType('BUSINESS')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
            </svg>
            {{ 'taxes.expenses.tabs.business' | translate }}
            <span class="type-tab__count">{{ summary()?.businessCount || 0 }}</span>
          </button>
          <button
            class="type-tab type-tab--personal"
            [class.type-tab--active]="selectedExpenseType() === 'PERSONAL'"
            (click)="selectExpenseType('PERSONAL')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            {{ 'taxes.expenses.tabs.personal' | translate }}
            <span class="type-tab__count">{{ summary()?.personalCount || 0 }}</span>
          </button>
        </div>

        <!-- Filters -->
        <div class="filters-bar">
          <div class="filters-left">
            <div class="month-filter">
              <button
                class="month-chip"
                [class.month-chip--active]="selectedMonth() === null"
                (click)="selectMonth(null)"
              >
                {{ 'taxes.expenses.filters.all' | translate }}
              </button>
              @for (month of months; track month.value) {
                <button
                  class="month-chip"
                  [class.month-chip--active]="selectedMonth() === month.value"
                  [class.month-chip--has-data]="hasExpensesInMonth(month.value)"
                  (click)="selectMonth(month.value)"
                >
                  {{ month.short }}
                </button>
              }
            </div>
          </div>
          <div class="filters-right">
            <div class="category-filter">
              <select
                [value]="selectedCategory()"
                (change)="selectCategory($any($event.target).value)"
                class="category-select"
              >
                <option value="ALL">{{ 'taxes.expenses.filters.allCategories' | translate }}</option>
                @for (cat of categories; track cat) {
                  <option [value]="cat">{{ getCategoryLabel(cat) }}</option>
                }
              </select>
              <svg class="category-select__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Expenses List -->
        @if (filteredExpenses().length === 0) {
          <div class="empty-state">
            <div class="empty-state__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
            <h3>{{ 'taxes.expenses.empty.title' | translate }}</h3>
            <p>{{ getEmptyMessage() }}</p>
            <button class="empty-state__btn" (click)="openAddModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {{ 'taxes.expenses.empty.addFirst' | translate }}
            </button>
          </div>
        } @else {
          <div class="expenses-table">
            <div class="table-header">
              <div class="table-cell table-cell--date">{{ 'taxes.expenses.table.date' | translate }}</div>
              <div class="table-cell table-cell--name">{{ 'taxes.expenses.table.name' | translate }}</div>
              <div class="table-cell table-cell--category">{{ 'taxes.expenses.table.category' | translate }}</div>
              <div class="table-cell table-cell--amount">{{ 'taxes.expenses.table.amount' | translate }}</div>
              <div class="table-cell table-cell--deductible">{{ 'taxes.expenses.table.deductible' | translate }}</div>
              <div class="table-cell table-cell--actions"></div>
            </div>

            <div class="table-body">
              @for (expense of filteredExpenses(); track expense.id; let i = $index) {
                <div
                  class="table-row"
                  [class.table-row--expanded]="expandedId() === expense.id"
                  [style.animation-delay]="i * 30 + 'ms'"
                  (click)="toggleExpand(expense.id)"
                >
                  <div class="table-cell table-cell--date">
                    <span class="date-day">{{ formatDay(expense.expenseDate) }}</span>
                    <span class="date-month">{{ formatMonthShort(expense.expenseDate) }}</span>
                  </div>
                  <div class="table-cell table-cell--name">
                    <div class="expense-name">
                      <span class="expense-name__text">{{ expense.name }}</span>
                      @if (expense.documentNumber) {
                        <span class="expense-name__doc">{{ expense.documentNumber }}</span>
                      }
                    </div>
                  </div>
                  <div class="table-cell table-cell--category">
                    <span
                      class="category-badge"
                      [style.background]="getCategoryColor(expense.category) + '20'"
                      [style.color]="getCategoryColor(expense.category)"
                    >
                      <span class="category-badge__icon" [innerHTML]="getCategoryIcon(expense.category)"></span>
                      {{ getCategoryLabel(expense.category) }}
                    </span>
                  </div>
                  <div class="table-cell table-cell--amount">
                    <span class="amount">{{ formatPLN(expense.amountPLN) }}</span>
                    @if (expense.currency !== 'PLN') {
                      <span class="amount-original">{{ expense.originalAmount }} {{ expense.originalCurrency }}</span>
                    }
                  </div>
                  <div class="table-cell table-cell--deductible">
                    @if (expense.isDeductible) {
                      <span class="deductible-badge deductible-badge--yes">
                        {{ expense.deductiblePercent }}%
                      </span>
                    } @else {
                      <span class="deductible-badge deductible-badge--no">{{ 'taxes.expenses.table.no' | translate }}</span>
                    }
                  </div>
                  <div class="table-cell table-cell--actions" (click)="$event.stopPropagation()">
                    <button class="action-btn" [title]="'taxes.expenses.actions.edit' | translate" (click)="editExpense(expense)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button class="action-btn action-btn--danger" [title]="'taxes.expenses.actions.delete' | translate" (click)="deleteExpense(expense)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                  </div>

                  <!-- Expanded Details -->
                  @if (expandedId() === expense.id) {
                    <div class="row-details" (click)="$event.stopPropagation()">
                      <div class="details-grid">
                        @if (expense.description) {
                          <div class="detail-item detail-item--full">
                            <span class="detail-label">{{ 'taxes.expenses.details.description' | translate }}</span>
                            <span class="detail-value">{{ expense.description }}</span>
                          </div>
                        }
                        <div class="detail-item">
                          <span class="detail-label">{{ 'taxes.expenses.details.netAmount' | translate }}</span>
                          <span class="detail-value">{{ formatPLN(expense.netAmount) }}</span>
                        </div>
                        @if (expense.vatRate) {
                          <div class="detail-item">
                            <span class="detail-label">{{ 'taxes.expenses.details.vat' | translate }} ({{ expense.vatRate }}%)</span>
                            <span class="detail-value">{{ formatPLN(expense.vatAmount || 0) }}</span>
                          </div>
                        }
                        @if (expense.currency !== 'PLN' && expense.exchangeRate) {
                          <div class="detail-item">
                            <span class="detail-label">{{ 'taxes.expenses.details.exchangeRate' | translate }}</span>
                            <span class="detail-value">1 {{ expense.originalCurrency }} = {{ expense.exchangeRate?.toFixed(4) }} PLN</span>
                          </div>
                        }
                        <div class="detail-item">
                          <span class="detail-label">{{ 'taxes.expenses.details.dateAdded' | translate }}</span>
                          <span class="detail-value">{{ formatFullDate(expense.createdAt) }}</span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      }
    </div>

    <!-- Add/Edit Modal would be here - using separate component -->
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

    :host {
      --tax-font-mono: 'IBM Plex Mono', 'SF Mono', monospace;
      --tax-font-sans: 'Plus Jakarta Sans', var(--font-body);

      --expense-total: #dc2626;
      --expense-deductible: #059669;
      --expense-count: #3b82f6;

      display: block;
      font-family: var(--tax-font-sans);
    }

    .expenses-page {
      min-height: 100%;
      padding: var(--space-xl) var(--space-2xl);
      background: var(--color-bg);
    }

    /* Header */
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: var(--space-xl);
      padding-bottom: var(--space-lg);
      border-bottom: 1px solid var(--color-border);
    }

    .header__left {
      display: flex;
      align-items: flex-start;
      gap: var(--space-md);
    }

    .back-link {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: var(--color-fill-quaternary);
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      transition: all var(--transition-fast);

      svg {
        width: 20px;
        height: 20px;
      }

      &:hover {
        background: var(--color-fill-tertiary);
        color: var(--color-text);
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
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }

    .header__right {
      display: flex;
      align-items: center;
      gap: var(--space-lg);
    }

    .year-selector {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-xs);
    }

    .year-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover:not(:disabled) {
        background: var(--color-fill-tertiary);
        color: var(--color-text);
      }

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
    }

    .year-display {
      font-family: var(--tax-font-mono);
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-text);
      min-width: 48px;
      text-align: center;
    }

    .add-btn {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-lg);
      background: var(--color-primary);
      color: var(--color-primary-text);
      border: none;
      border-radius: var(--radius-lg);
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: var(--color-primary-hover);
        transform: translateY(-1px);
      }
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

    /* Summary Grid */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-lg);
      margin-bottom: var(--space-xl);
    }

    /* Type Tabs */
    .type-tabs {
      display: flex;
      gap: var(--space-sm);
      margin-bottom: var(--space-lg);
      padding: 4px;
      background: var(--color-fill-quaternary);
      border-radius: var(--radius-lg);
      width: fit-content;
    }

    .type-tab {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      padding: var(--space-sm) var(--space-lg);
      background: transparent;
      border: none;
      border-radius: var(--radius-md);
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover:not(.type-tab--active) {
        color: var(--color-text);
        background: var(--color-fill-tertiary);
      }

      &--active {
        background: var(--color-surface);
        color: var(--color-text);
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }

      &--business.type-tab--active {
        color: var(--color-primary);
      }

      &--personal.type-tab--active {
        color: #8b5cf6;
      }
    }

    .type-tab__count {
      font-family: var(--tax-font-mono);
      font-size: 0.75rem;
      padding: 2px 6px;
      background: var(--color-fill-tertiary);
      border-radius: var(--radius-sm);
      color: var(--color-text-tertiary);

      .type-tab--active & {
        background: var(--color-fill-secondary);
        color: var(--color-text-secondary);
      }
    }

    .summary-card {
      display: flex;
      align-items: center;
      gap: var(--space-lg);
      padding: var(--space-lg) var(--space-xl);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      animation: slideUp 0.4s ease both;
    }

    .summary-card__icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-lg);
      flex-shrink: 0;

      svg {
        width: 24px;
        height: 24px;
      }

      &--total {
        background: rgba(220, 38, 38, 0.1);
        color: var(--expense-total);
      }

      &--deductible {
        background: rgba(5, 150, 105, 0.1);
        color: var(--expense-deductible);
      }

      &--count {
        background: rgba(59, 130, 246, 0.1);
        color: var(--expense-count);
      }
    }

    .summary-card__content {
      display: flex;
      flex-direction: column;
    }

    .summary-card__label {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      margin-bottom: 2px;
    }

    .summary-card__value {
      font-family: var(--tax-font-mono);
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);

      &--count {
        font-size: 1.5rem;
      }
    }

    /* Filters */
    .filters-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-lg);
      padding: var(--space-md);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
    }

    .month-filter {
      display: flex;
      gap: 4px;
    }

    .month-chip {
      padding: var(--space-xs) var(--space-sm);
      font-family: var(--tax-font-mono);
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-tertiary);
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--color-text-secondary);
        background: var(--color-fill-quaternary);
      }

      &--active {
        color: var(--color-primary);
        background: var(--color-primary-subtle);
      }

      &--has-data:not(.month-chip--active) {
        color: var(--color-text-secondary);
      }
    }

    .category-filter {
      position: relative;
    }

    .category-select {
      padding: var(--space-sm) var(--space-xl) var(--space-sm) var(--space-md);
      background: var(--color-fill-quaternary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-family: inherit;
      font-size: 0.8125rem;
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
      }
    }

    .category-select__icon {
      position: absolute;
      right: var(--space-sm);
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: var(--color-text-tertiary);
      pointer-events: none;
    }

    /* Expenses Table */
    .expenses-table {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      overflow: hidden;
    }

    .table-header {
      display: grid;
      grid-template-columns: 80px 1fr 160px 140px 80px 80px;
      gap: var(--space-md);
      padding: var(--space-md) var(--space-lg);
      background: var(--color-fill-quaternary);
      border-bottom: 1px solid var(--color-border);
    }

    .table-cell {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-tertiary);

      &--amount, &--deductible, &--actions {
        text-align: right;
      }
    }

    .table-body {
      max-height: 600px;
      overflow-y: auto;
    }

    .table-row {
      display: grid;
      grid-template-columns: 80px 1fr 160px 140px 80px 80px;
      gap: var(--space-md);
      padding: var(--space-md) var(--space-lg);
      border-bottom: 1px solid var(--color-border);
      cursor: pointer;
      transition: background var(--transition-fast);
      animation: slideUp 0.3s ease both;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: var(--color-fill-quaternary);

        .action-btn {
          opacity: 1;
        }
      }

      &--expanded {
        background: var(--color-fill-quaternary);
      }

      .table-cell {
        display: flex;
        align-items: center;
        font-size: 0.875rem;
        font-weight: 400;
        text-transform: none;
        letter-spacing: normal;
        color: var(--color-text);

        &--date {
          flex-direction: column;
          align-items: flex-start;
          gap: 0;
        }

        &--amount, &--deductible, &--actions {
          justify-content: flex-end;
        }
      }
    }

    .date-day {
      font-family: var(--tax-font-mono);
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
      line-height: 1.2;
    }

    .date-month {
      font-size: 0.6875rem;
      color: var(--color-text-tertiary);
      text-transform: uppercase;
    }

    .expense-name {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .expense-name__text {
      font-weight: 500;
      color: var(--color-text);
    }

    .expense-name__doc {
      font-family: var(--tax-font-mono);
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
    }

    .category-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 500;
    }

    .category-badge__icon {
      display: flex;
      width: 14px;
      height: 14px;

      :host ::ng-deep svg {
        width: 100%;
        height: 100%;
      }
    }

    .amount {
      font-family: var(--tax-font-mono);
      font-weight: 500;
    }

    .amount-original {
      font-family: var(--tax-font-mono);
      font-size: 0.6875rem;
      color: var(--color-text-tertiary);
      margin-left: var(--space-xs);
    }

    .deductible-badge {
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      font-family: var(--tax-font-mono);
      font-size: 0.75rem;
      font-weight: 500;

      &--yes {
        background: rgba(5, 150, 105, 0.1);
        color: var(--expense-deductible);
      }

      &--no {
        background: var(--color-fill-tertiary);
        color: var(--color-text-tertiary);
      }
    }

    .action-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      color: var(--color-text-tertiary);
      cursor: pointer;
      opacity: 0;
      transition: all var(--transition-fast);

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover {
        background: var(--color-fill-tertiary);
        color: var(--color-text);
      }

      &--danger:hover {
        background: rgba(220, 38, 38, 0.1);
        color: var(--expense-total);
      }
    }

    /* Row Details */
    .row-details {
      grid-column: 1 / -1;
      padding: var(--space-lg);
      padding-top: 0;
      margin-top: var(--space-md);
      border-top: 1px dashed var(--color-border);
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-md) var(--space-xl);
    }

    .detail-item {
      &--full {
        grid-column: 1 / -1;
      }
    }

    .detail-label {
      display: block;
      font-size: 0.6875rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-tertiary);
      margin-bottom: var(--space-xs);
    }

    .detail-value {
      font-size: 0.875rem;
      color: var(--color-text);
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 80px var(--space-xl);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
    }

    .empty-state__icon {
      width: 64px;
      height: 64px;
      margin: 0 auto var(--space-xl);
      color: var(--color-text-tertiary);
      opacity: 0.5;

      svg {
        width: 100%;
        height: 100%;
      }
    }

    .empty-state h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-sm);
    }

    .empty-state p {
      font-size: 0.9375rem;
      color: var(--color-text-secondary);
      margin-bottom: var(--space-xl);
    }

    .empty-state__btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-md) var(--space-xl);
      background: var(--color-primary);
      color: var(--color-primary-text);
      border: none;
      border-radius: var(--radius-lg);
      font-family: inherit;
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: var(--color-primary-hover);
        transform: translateY(-1px);
      }
    }

    /* Animations */
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .summary-grid {
        grid-template-columns: 1fr;
      }

      .table-header,
      .table-row {
        grid-template-columns: 60px 1fr 100px 80px;
      }

      .table-cell--category,
      .table-cell--actions {
        display: none !important;
      }
    }

    @media (max-width: 768px) {
      .expenses-page {
        padding: var(--space-lg);
      }

      .header {
        flex-direction: column;
        gap: var(--space-lg);
      }

      .header__right {
        width: 100%;
        justify-content: space-between;
      }

      .filters-bar {
        flex-direction: column;
        gap: var(--space-md);
        align-items: stretch;
      }

      .month-filter {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .table-header {
        display: none;
      }

      .table-row {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-sm);
        padding: var(--space-lg);
      }

      .table-cell--date {
        flex-direction: row;
        gap: var(--space-xs);
      }

      .date-day {
        font-size: 0.875rem;
      }

      .table-cell--name {
        flex: 1;
        min-width: 120px;
      }

      .table-cell--amount {
        margin-left: auto;
      }

      .details-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
  `]
})
export class ExpensesListComponent implements OnInit {
  private expenseService = inject(ExpenseService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  expenses = signal<Expense[]>([]);
  summary = signal<ExpensesSummary | null>(null);
  isLoading = signal(true);
  selectedYear = signal(new Date().getFullYear());
  selectedMonth = signal<number | null>(null);
  selectedCategory = signal<ExpenseCategory | 'ALL'>('ALL');
  selectedExpenseType = signal<ExpenseType | 'ALL'>('ALL');
  expandedId = signal<string | null>(null);

  currentYear = new Date().getFullYear();

  months = [
    { value: 1, short: 'Jan' },
    { value: 2, short: 'Feb' },
    { value: 3, short: 'Mar' },
    { value: 4, short: 'Apr' },
    { value: 5, short: 'May' },
    { value: 6, short: 'Jun' },
    { value: 7, short: 'Jul' },
    { value: 8, short: 'Aug' },
    { value: 9, short: 'Sep' },
    { value: 10, short: 'Oct' },
    { value: 11, short: 'Nov' },
    { value: 12, short: 'Dec' }
  ];

  categories: ExpenseCategory[] = this.expenseService.getAllCategories();

  filteredExpenses = computed(() => {
    let result = this.expenses();

    const expenseType = this.selectedExpenseType();
    if (expenseType !== 'ALL') {
      result = result.filter(e => e.expenseType === expenseType);
    }

    const month = this.selectedMonth();
    if (month !== null) {
      result = result.filter(e => e.expenseMonth === month);
    }

    const category = this.selectedCategory();
    if (category !== 'ALL') {
      result = result.filter(e => e.category === category);
    }

    // Sort by date descending
    return result.sort((a, b) =>
      new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
    );
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);

    const year = this.selectedYear();

    // Load expenses
    this.expenseService.getExpenses({ year }).subscribe({
      next: (expenses) => {
        this.expenses.set(expenses);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load expenses:', err);
        this.isLoading.set(false);
        this.notificationService.error('Failed to load expenses');
      }
    });

    // Load summary
    this.expenseService.getSummary(year).subscribe({
      next: (summary) => this.summary.set(summary),
      error: (err) => console.error('Failed to load summary:', err)
    });
  }

  changeYear(delta: number) {
    this.selectedYear.update(y => y + delta);
    this.loadData();
  }

  selectMonth(month: number | null) {
    this.selectedMonth.set(month);
  }

  selectCategory(category: ExpenseCategory | 'ALL') {
    this.selectedCategory.set(category);
  }

  selectExpenseType(type: ExpenseType | 'ALL') {
    this.selectedExpenseType.set(type);
  }

  hasExpensesInMonth(month: number): boolean {
    return this.expenses().some(e => e.expenseMonth === month);
  }

  toggleExpand(id: string) {
    this.expandedId.update(current => current === id ? null : id);
  }

  openAddModal() {
    this.router.navigate(['/expenses/new']);
  }

  editExpense(expense: Expense) {
    this.router.navigate(['/expenses', expense.id, 'edit']);
  }

  deleteExpense(expense: Expense) {
    if (confirm(`Are you sure you want to delete "${expense.name}"?`)) {
      this.expenseService.deleteExpense(expense.id).subscribe({
        next: () => {
          this.notificationService.success('Expense deleted');
          this.loadData();
        },
        error: () => {
          this.notificationService.error('Failed to delete expense');
        }
      });
    }
  }

  getEmptyMessage(): string {
    const month = this.selectedMonth();
    const category = this.selectedCategory();
    const type = this.selectedExpenseType();

    if (type !== 'ALL' && month !== null) {
      return `No ${type.toLowerCase()} expenses for selected month`;
    } else if (type !== 'ALL') {
      return `No ${type.toLowerCase()} expenses yet`;
    } else if (month !== null && category !== 'ALL') {
      return `No expenses in "${this.getCategoryLabel(category)}" for selected month`;
    } else if (month !== null) {
      return 'No expenses for selected month';
    } else if (category !== 'ALL') {
      return `No expenses in "${this.getCategoryLabel(category)}"`;
    }
    return 'Add your first expense to start tracking costs';
  }

  formatPLN(amount: number): string {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 2
    }).format(amount);
  }

  formatDay(dateStr: string): string {
    return new Date(dateStr).getDate().toString();
  }

  formatMonthShort(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pl-PL', { month: 'short' });
  }

  formatFullDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  getCategoryLabel(category: ExpenseCategory): string {
    return this.expenseService.getCategoryLabel(category);
  }

  getCategoryColor(category: ExpenseCategory): string {
    return this.expenseService.getCategoryColor(category);
  }

  getCategoryIcon(category: ExpenseCategory): string {
    const iconName = this.expenseService.getCategoryIcon(category);
    const icons: Record<string, string> = {
      'clipboard': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
      'code': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      'monitor': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
      'car': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 16H9m10 0h3v-3.15a1 1 0 00-.84-.99L16 11l-2.7-3.6a1 1 0 00-.8-.4H5.24a2 2 0 00-1.8 1.1l-.8 1.63A6 6 0 002 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>',
      'coffee': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/></svg>',
      'briefcase': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>',
      'book': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
      'megaphone': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l18-5v12L3 13v-2z"/></svg>',
      'shield': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
      'home': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>',
      'phone': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>',
      'credit-card': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
      'file-text': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      'more-horizontal': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
      'circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>'
    };
    return icons[iconName] || icons['circle'];
  }
}
