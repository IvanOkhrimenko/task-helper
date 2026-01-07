import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TaxService, TaxDashboard, YearlySummary, MonthlyTaxResult, TaxForm, ZUSType } from '../../core/services/tax.service';
import { ExpenseService, Expense, ExpenseCategory } from '../../core/services/expense.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-taxes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="taxes-dashboard">
      <!-- Subtle grid background pattern -->
      <div class="bg-pattern"></div>

      <!-- Header -->
      <header class="header">
        <div class="header__left">
          <h1 class="header__title">B2B Taxes</h1>
          <p class="header__subtitle">Tax calculation {{ selectedYear() }}</p>
        </div>
        <div class="header__right">
          <div class="year-selector">
            <button
              class="year-btn"
              (click)="changeYear(-1)"
              [disabled]="selectedYear() <= 2020"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span class="year-display">{{ selectedYear() }}</span>
            <button
              class="year-btn"
              (click)="changeYear(1)"
              [disabled]="selectedYear() >= currentYear"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
          <a routerLink="/settings/taxes" class="settings-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            Settings
          </a>
        </div>
      </header>

      @if (isLoading()) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading tax data...</p>
        </div>
      } @else {
        <!-- Tax Form Badge -->
        @if (dashboard()?.settings?.taxForm) {
          <div class="tax-form-badge" [class]="'tax-form-badge--' + dashboard()?.settings?.taxForm?.toLowerCase()">
            <div class="tax-form-badge__icon">
              @switch (dashboard()?.settings?.taxForm) {
                @case ('LINIOWY') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                }
                @case ('SKALA') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                }
                @case ('RYCZALT') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18"/>
                    <path d="M9 21V9"/>
                  </svg>
                }
              }
            </div>
            <div class="tax-form-badge__content">
              <span class="tax-form-badge__label">Tax form</span>
              <span class="tax-form-badge__value">{{ getTaxFormLabel(dashboard()?.settings?.taxForm) }}</span>
              @if (dashboard()?.settings?.taxForm === 'RYCZALT' && dashboard()?.settings?.ryczaltRate) {
                <span class="tax-form-badge__rate">Rate: {{ dashboard()?.settings?.ryczaltRate }}%</span>
              }
            </div>
            <div class="tax-form-badge__zus">
              <span class="tax-form-badge__zus-label">ZUS</span>
              <span class="tax-form-badge__zus-value">{{ getZUSLabel(dashboard()?.settings?.zusType) }}</span>
            </div>
          </div>
        }

        <!-- Summary Cards -->
        <div class="summary-grid">
          <div class="summary-card summary-card--income" [style.animation-delay]="'0ms'">
            <div class="summary-card__header">
              <span class="summary-card__label">YTD Income</span>
              <div class="summary-card__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                  <polyline points="17 6 23 6 23 12"/>
                </svg>
              </div>
            </div>
            <div class="summary-card__value">
              <span class="summary-card__amount">{{ formatPLN(dashboard()?.yearToDate?.grossIncomePLN || 0) }}</span>
            </div>
            <div class="summary-card__footer">
              <span class="summary-card__meta">{{ dashboard()?.yearToDate?.invoiceCount || 0 }} invoices</span>
            </div>
          </div>

          <div class="summary-card summary-card--tax" [style.animation-delay]="'50ms'">
            <div class="summary-card__header">
              <span class="summary-card__label">Tax ({{ currentMonthName() }})</span>
              <div class="summary-card__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
              </div>
            </div>
            <div class="summary-card__value">
              <span class="summary-card__amount">{{ formatPLN(selectedMonthData()?.totalTaxDue || 0) }}</span>
            </div>
            <div class="summary-card__footer">
              <span class="summary-card__meta">Due by 20th</span>
            </div>
          </div>

          <div class="summary-card summary-card--zus" [style.animation-delay]="'100ms'">
            <div class="summary-card__header">
              <span class="summary-card__label">ZUS ({{ currentMonthName() }})</span>
              <div class="summary-card__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <path d="M20 8v6M23 11h-6"/>
                </svg>
              </div>
            </div>
            <div class="summary-card__value">
              <span class="summary-card__amount">{{ formatPLN(selectedMonthData()?.zus || 0) }}</span>
            </div>
            <div class="summary-card__footer">
              <span class="summary-card__meta">+ {{ formatPLN(selectedMonthData()?.healthInsurance || 0) }} health ins.</span>
            </div>
          </div>

          <div class="summary-card summary-card--net" [style.animation-delay]="'150ms'">
            <div class="summary-card__header">
              <span class="summary-card__label">Net ({{ currentMonthName() }})</span>
              <div class="summary-card__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9"/>
                  <line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
              </div>
            </div>
            <div class="summary-card__value">
              <span class="summary-card__amount summary-card__amount--positive">{{ formatPLN(selectedMonthData()?.netIncome || 0) }}</span>
            </div>
            <div class="summary-card__footer">
              <span class="summary-card__meta">Effective rate: {{ (selectedMonthData()?.effectiveTaxRate || 0).toFixed(1) }}%</span>
            </div>
          </div>
        </div>

        <!-- Main Content Grid -->
        <div class="content-grid">
          <!-- Monthly Breakdown -->
          <section class="breakdown-section">
            <div class="breakdown-header">
              <h2 class="section-title">Monthly Breakdown</h2>
              <div class="month-tabs">
                @for (month of months; track month.value) {
                  <button
                    class="month-tab"
                    [class.month-tab--active]="selectedMonth() === month.value"
                    [class.month-tab--has-data]="hasDataForMonth(month.value)"
                    (click)="selectMonth(month.value)"
                  >
                    {{ month.short }}
                  </button>
                }
              </div>
            </div>

            <div class="breakdown-card">
              @if (selectedMonthData()) {
                <div class="breakdown-content">
                  <!-- Income Section -->
                  <div class="breakdown-group">
                    <div class="breakdown-row breakdown-row--highlight">
                      <span class="breakdown-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        Invoice Income
                      </span>
                      <span class="breakdown-value breakdown-value--income">{{ formatPLN(selectedMonthData()?.grossIncomePLN || 0) }}</span>
                    </div>
                    <div class="breakdown-row breakdown-row--sub">
                      <span class="breakdown-label">Invoice count</span>
                      <span class="breakdown-value">{{ selectedMonthData()?.invoiceCount || 0 }}</span>
                    </div>
                  </div>

                  <!-- Expenses Section -->
                  <div class="breakdown-group">
                    <div class="breakdown-row">
                      <span class="breakdown-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        Total Expenses
                      </span>
                      <span class="breakdown-value breakdown-value--expense">-{{ formatPLN(selectedMonthData()?.totalExpenses || 0) }}</span>
                    </div>
                    <div class="breakdown-row breakdown-row--sub">
                      <span class="breakdown-label">Deductible expenses</span>
                      <span class="breakdown-value">{{ formatPLN(selectedMonthData()?.deductibleExpenses || 0) }}</span>
                    </div>
                  </div>

                  <div class="breakdown-divider"></div>

                  <!-- Tax Base -->
                  <div class="breakdown-group">
                    <div class="breakdown-row breakdown-row--total">
                      <span class="breakdown-label">Tax base</span>
                      <span class="breakdown-value">{{ formatPLN(selectedMonthData()?.taxBase || 0) }}</span>
                    </div>
                  </div>

                  <div class="breakdown-divider"></div>

                  <!-- Tax Breakdown -->
                  <div class="breakdown-group">
                    <div class="breakdown-row">
                      <span class="breakdown-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                          <line x1="1" y1="10" x2="23" y2="10"/>
                        </svg>
                        PIT
                      </span>
                      <span class="breakdown-value breakdown-value--tax">{{ formatPLN(selectedMonthData()?.pit || 0) }}</span>
                    </div>
                    <div class="breakdown-row">
                      <span class="breakdown-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                        </svg>
                        ZUS
                      </span>
                      <span class="breakdown-value breakdown-value--tax">{{ formatPLN(selectedMonthData()?.zus || 0) }}</span>
                    </div>
                    <div class="breakdown-row">
                      <span class="breakdown-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                        </svg>
                        Health insurance
                      </span>
                      <span class="breakdown-value breakdown-value--tax">{{ formatPLN(selectedMonthData()?.healthInsurance || 0) }}</span>
                    </div>
                  </div>

                  <div class="breakdown-divider breakdown-divider--thick"></div>

                  <!-- Totals -->
                  <div class="breakdown-group">
                    <div class="breakdown-row breakdown-row--total">
                      <span class="breakdown-label">Total tax due</span>
                      <span class="breakdown-value breakdown-value--total-tax">{{ formatPLN(selectedMonthData()?.totalTaxDue || 0) }}</span>
                    </div>
                    <div class="breakdown-row breakdown-row--total breakdown-row--net">
                      <span class="breakdown-label">Net income</span>
                      <span class="breakdown-value breakdown-value--net">{{ formatPLN(selectedMonthData()?.netIncome || 0) }}</span>
                    </div>
                  </div>

                  <!-- Effective Rate -->
                  <div class="effective-rate">
                    <div class="effective-rate__bar">
                      <div
                        class="effective-rate__fill"
                        [style.width.%]="selectedMonthData()?.effectiveTaxRate || 0"
                      ></div>
                    </div>
                    <span class="effective-rate__label">
                      Effective tax rate: {{ (selectedMonthData()?.effectiveTaxRate || 0).toFixed(1) }}%
                    </span>
                  </div>
                </div>
              } @else {
                <div class="breakdown-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <p>No data for {{ getMonthName(selectedMonth()) }}</p>
                  <span>Sent invoices will appear automatically</span>
                </div>
              }
            </div>
          </section>

          <!-- Recent Expenses -->
          <section class="expenses-section">
            <div class="expenses-header">
              <h2 class="section-title">Recent Expenses</h2>
              <a routerLink="/expenses" class="view-all-link">
                View all
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </a>
            </div>

            <div class="expenses-list">
              @if (recentExpenses().length === 0) {
                <div class="expenses-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <p>No expenses recorded</p>
                </div>
              } @else {
                @for (expense of recentExpenses(); track expense.id; let i = $index) {
                  <div class="expense-item" [style.animation-delay]="i * 50 + 'ms'">
                    <div class="expense-item__icon" [style.background]="getCategoryColor(expense.category)">
                      <span [innerHTML]="getCategoryIcon(expense.category)"></span>
                    </div>
                    <div class="expense-item__content">
                      <span class="expense-item__name">{{ expense.name }}</span>
                      <span class="expense-item__category">{{ getCategoryLabel(expense.category) }}</span>
                    </div>
                    <div class="expense-item__right">
                      <span class="expense-item__amount">-{{ formatPLN(expense.amountPLN) }}</span>
                      <span class="expense-item__date">{{ formatDate(expense.expenseDate) }}</span>
                    </div>
                  </div>
                }
              }
            </div>

            <button class="add-expense-btn" routerLink="/expenses/new">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add expense
            </button>
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

    :host {
      --tax-font-mono: 'IBM Plex Mono', 'SF Mono', monospace;
      --tax-font-sans: 'Plus Jakarta Sans', var(--font-body);

      /* Financial color palette */
      --tax-navy-50: #f8fafc;
      --tax-navy-100: #f1f5f9;
      --tax-navy-200: #e2e8f0;
      --tax-navy-300: #cbd5e1;
      --tax-navy-400: #94a3b8;
      --tax-navy-500: #64748b;
      --tax-navy-600: #475569;
      --tax-navy-700: #334155;
      --tax-navy-800: #1e293b;
      --tax-navy-900: #0f172a;

      /* Accent colors */
      --tax-liniowy: #3b82f6;
      --tax-liniowy-soft: rgba(59, 130, 246, 0.1);
      --tax-skala: #8b5cf6;
      --tax-skala-soft: rgba(139, 92, 246, 0.1);
      --tax-ryczalt: #10b981;
      --tax-ryczalt-soft: rgba(16, 185, 129, 0.1);

      --tax-income: #059669;
      --tax-expense: #dc2626;
      --tax-neutral: var(--tax-navy-600);

      display: block;
      font-family: var(--tax-font-sans);
    }

    .taxes-dashboard {
      position: relative;
      min-height: 100%;
      padding: var(--space-xl) var(--space-2xl);
      background: var(--color-bg);
      transition: background-color var(--transition-slow);
    }

    /* Subtle grid background */
    .bg-pattern {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(to right, var(--color-border) 1px, transparent 1px),
        linear-gradient(to bottom, var(--color-border) 1px, transparent 1px);
      background-size: 48px 48px;
      opacity: 0.3;
      pointer-events: none;
      mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
    }

    /* Header */
    .header {
      position: relative;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: var(--space-xl);
      padding-bottom: var(--space-lg);
      border-bottom: 1px solid var(--color-border);
    }

    .header__title {
      font-family: var(--tax-font-sans);
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--color-text);
      letter-spacing: -0.03em;
      margin-bottom: var(--space-xs);
    }

    .header__subtitle {
      font-size: 0.9375rem;
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

    .settings-btn {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-lg);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;
      transition: all var(--transition-fast);

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: var(--color-fill-tertiary);
        color: var(--color-text);
        border-color: var(--color-border-hover);
      }
    }

    /* Loading State */
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

    /* Tax Form Badge */
    .tax-form-badge {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--space-xl);
      padding: var(--space-lg) var(--space-xl);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      margin-bottom: var(--space-xl);
      overflow: hidden;
      animation: slideUp 0.4s ease both;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
      }

      &--liniowy {
        &::before { background: var(--tax-liniowy); }
        .tax-form-badge__icon { background: var(--tax-liniowy-soft); color: var(--tax-liniowy); }
      }

      &--skala {
        &::before { background: linear-gradient(180deg, var(--tax-skala), #a855f7); }
        .tax-form-badge__icon { background: var(--tax-skala-soft); color: var(--tax-skala); }
      }

      &--ryczalt {
        &::before { background: var(--tax-ryczalt); }
        .tax-form-badge__icon { background: var(--tax-ryczalt-soft); color: var(--tax-ryczalt); }
      }
    }

    .tax-form-badge__icon {
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
    }

    .tax-form-badge__content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .tax-form-badge__label {
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-tertiary);
    }

    .tax-form-badge__value {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
    }

    .tax-form-badge__rate {
      font-family: var(--tax-font-mono);
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
    }

    .tax-form-badge__zus {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      padding-left: var(--space-xl);
      border-left: 1px solid var(--color-border);
    }

    .tax-form-badge__zus-label {
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-tertiary);
    }

    .tax-form-badge__zus-value {
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--color-text);
    }

    /* Summary Grid */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-lg);
      margin-bottom: var(--space-2xl);
    }

    .summary-card {
      position: relative;
      padding: var(--space-xl);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      overflow: hidden;
      animation: slideUp 0.4s ease both;
      transition: all var(--transition-base);

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        opacity: 0;
        transition: opacity var(--transition-fast);
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);

        &::before {
          opacity: 1;
        }
      }

      &--income::before { background: var(--tax-income); }
      &--tax::before { background: var(--tax-liniowy); }
      &--zus::before { background: var(--tax-skala); }
      &--net::before { background: var(--tax-ryczalt); }
    }

    .summary-card__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: var(--space-md);
    }

    .summary-card__label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
    }

    .summary-card__icon {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-fill-quaternary);
      border-radius: var(--radius-md);
      color: var(--color-text-tertiary);

      svg {
        width: 18px;
        height: 18px;
      }
    }

    .summary-card__value {
      margin-bottom: var(--space-md);
    }

    .summary-card__amount {
      font-family: var(--tax-font-mono);
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text);
      letter-spacing: -0.02em;

      &--positive {
        color: var(--tax-income);
      }
    }

    .summary-card__footer {
      padding-top: var(--space-md);
      border-top: 1px solid var(--color-border);
    }

    .summary-card__meta {
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
    }

    /* Content Grid */
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: var(--space-xl);
    }

    .section-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
      letter-spacing: -0.01em;
    }

    /* Breakdown Section */
    .breakdown-section {
      animation: slideUp 0.4s ease 0.2s both;
    }

    .breakdown-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-lg);
    }

    .month-tabs {
      display: flex;
      gap: 2px;
      background: var(--color-fill-quaternary);
      padding: 3px;
      border-radius: var(--radius-md);
    }

    .month-tab {
      padding: var(--space-xs) var(--space-sm);
      font-family: var(--tax-font-mono);
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--color-text-tertiary);
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--color-text-secondary);
        background: var(--color-fill-tertiary);
      }

      &--active {
        color: var(--color-primary);
        background: var(--color-surface);
        box-shadow: var(--shadow-xs);
      }

      &--has-data:not(.month-tab--active) {
        color: var(--color-text-secondary);

        &::after {
          content: '';
          display: block;
          width: 4px;
          height: 4px;
          background: var(--color-primary);
          border-radius: 50%;
          margin: 2px auto 0;
        }
      }
    }

    .breakdown-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      overflow: hidden;
    }

    .breakdown-content {
      padding: var(--space-xl);
    }

    .breakdown-group {
      margin-bottom: var(--space-lg);

      &:last-child {
        margin-bottom: 0;
      }
    }

    .breakdown-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-sm) 0;

      &--highlight {
        padding: var(--space-md);
        margin: calc(var(--space-sm) * -1);
        background: var(--color-fill-quaternary);
        border-radius: var(--radius-md);
      }

      &--sub {
        padding-left: var(--space-xl);

        .breakdown-label {
          font-size: 0.8125rem;
          color: var(--color-text-tertiary);
        }

        .breakdown-value {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
        }
      }

      &--total {
        .breakdown-label {
          font-weight: 600;
          color: var(--color-text);
        }

        .breakdown-value {
          font-weight: 600;
        }
      }

      &--net {
        padding-top: var(--space-md);
      }
    }

    .breakdown-label {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: 0.875rem;
      color: var(--color-text-secondary);

      svg {
        width: 16px;
        height: 16px;
        color: var(--color-text-tertiary);
      }
    }

    .breakdown-value {
      font-family: var(--tax-font-mono);
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--color-text);

      &--income {
        color: var(--tax-income);
      }

      &--expense {
        color: var(--tax-expense);
      }

      &--tax {
        color: var(--tax-navy-600);
      }

      &--total-tax {
        font-size: 1.125rem;
        color: var(--tax-expense);
      }

      &--net {
        font-size: 1.25rem;
        color: var(--tax-income);
      }
    }

    .breakdown-divider {
      height: 1px;
      background: var(--color-border);
      margin: var(--space-md) 0;

      &--thick {
        height: 2px;
        background: linear-gradient(90deg, var(--color-border), var(--color-border-hover), var(--color-border));
      }
    }

    .effective-rate {
      margin-top: var(--space-xl);
      padding: var(--space-lg);
      background: var(--color-fill-quaternary);
      border-radius: var(--radius-md);
    }

    .effective-rate__bar {
      height: 6px;
      background: var(--color-border);
      border-radius: var(--radius-full);
      overflow: hidden;
      margin-bottom: var(--space-sm);
    }

    .effective-rate__fill {
      height: 100%;
      background: linear-gradient(90deg, var(--tax-ryczalt), var(--tax-liniowy));
      border-radius: var(--radius-full);
      transition: width 0.5s ease;
    }

    .effective-rate__label {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
    }

    .breakdown-empty {
      padding: 48px var(--space-xl);
      text-align: center;
      color: var(--color-text-tertiary);

      svg {
        width: 48px;
        height: 48px;
        margin-bottom: var(--space-md);
        opacity: 0.5;
      }

      p {
        font-size: 0.9375rem;
        font-weight: 500;
        color: var(--color-text-secondary);
        margin-bottom: var(--space-xs);
      }

      span {
        font-size: 0.8125rem;
      }
    }

    /* Expenses Section */
    .expenses-section {
      animation: slideUp 0.4s ease 0.3s both;
    }

    .expenses-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-lg);
    }

    .view-all-link {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-primary);
      text-decoration: none;
      transition: color var(--transition-fast);

      svg {
        width: 14px;
        height: 14px;
        transition: transform var(--transition-fast);
      }

      &:hover {
        color: var(--color-primary-hover);

        svg {
          transform: translateX(2px);
        }
      }
    }

    .expenses-list {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      overflow: hidden;
      margin-bottom: var(--space-lg);
    }

    .expense-item {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      padding: var(--space-md) var(--space-lg);
      border-bottom: 1px solid var(--color-border);
      animation: slideUp 0.3s ease both;
      transition: background var(--transition-fast);

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: var(--color-fill-quaternary);
      }
    }

    .expense-item__icon {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      color: white;
      flex-shrink: 0;

      :host ::ng-deep svg {
        width: 18px;
        height: 18px;
      }
    }

    .expense-item__content {
      flex: 1;
      min-width: 0;
    }

    .expense-item__name {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .expense-item__category {
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
    }

    .expense-item__right {
      text-align: right;
    }

    .expense-item__amount {
      display: block;
      font-family: var(--tax-font-mono);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--tax-expense);
    }

    .expense-item__date {
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
    }

    .expenses-empty {
      padding: 40px var(--space-xl);
      text-align: center;
      color: var(--color-text-tertiary);

      svg {
        width: 40px;
        height: 40px;
        margin-bottom: var(--space-md);
        opacity: 0.5;
      }

      p {
        font-size: 0.875rem;
      }
    }

    .add-expense-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      width: 100%;
      padding: var(--space-md) var(--space-lg);
      background: var(--color-surface);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: var(--color-fill-quaternary);
        border-color: var(--color-primary);
        color: var(--color-primary);
      }
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
    @media (max-width: 1280px) {
      .content-grid {
        grid-template-columns: 1fr;
      }

      .expenses-section {
        order: -1;
      }
    }

    @media (max-width: 1024px) {
      .summary-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .taxes-dashboard {
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

      .summary-grid {
        grid-template-columns: 1fr;
      }

      .tax-form-badge {
        flex-direction: column;
        align-items: flex-start;
      }

      .tax-form-badge__zus {
        padding-left: 0;
        border-left: none;
        padding-top: var(--space-md);
        border-top: 1px solid var(--color-border);
        width: 100%;
        align-items: flex-start;
      }

      .month-tabs {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
    }
  `]
})
export class TaxesComponent implements OnInit {
  private taxService = inject(TaxService);
  private expenseService = inject(ExpenseService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  dashboard = signal<TaxDashboard | null>(null);
  yearlySummary = signal<YearlySummary | null>(null);
  recentExpenses = signal<Expense[]>([]);
  isLoading = signal(true);

  // For tax purposes in January, show previous year/December by default
  // (because you're typically dealing with last year's taxes)
  private now = new Date();
  private isEarlyYear = this.now.getMonth() === 0; // January

  selectedYear = signal(this.isEarlyYear ? this.now.getFullYear() - 1 : this.now.getFullYear());
  selectedMonth = signal(this.isEarlyYear ? 12 : this.now.getMonth() + 1);

  currentYear = new Date().getFullYear();

  months = [
    { value: 1, short: 'Jan', name: 'January' },
    { value: 2, short: 'Feb', name: 'February' },
    { value: 3, short: 'Mar', name: 'March' },
    { value: 4, short: 'Apr', name: 'April' },
    { value: 5, short: 'May', name: 'May' },
    { value: 6, short: 'Jun', name: 'June' },
    { value: 7, short: 'Jul', name: 'July' },
    { value: 8, short: 'Aug', name: 'August' },
    { value: 9, short: 'Sep', name: 'September' },
    { value: 10, short: 'Oct', name: 'October' },
    { value: 11, short: 'Nov', name: 'November' },
    { value: 12, short: 'Dec', name: 'December' }
  ];

  currentMonthName = computed(() => {
    return this.getMonthName(this.selectedMonth());
  });

  selectedMonthData = computed(() => {
    const summary = this.yearlySummary();
    if (!summary?.months) return null;
    return summary.months.find(m => m.month === this.selectedMonth()) || null;
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);

    // Load dashboard data
    this.taxService.getDashboard().subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load tax dashboard:', err);
        this.isLoading.set(false);
        this.notificationService.error('Nie udało się załadować danych podatkowych');
      }
    });

    // Load yearly summary
    this.taxService.getYearlySummary(this.selectedYear()).subscribe({
      next: (data) => this.yearlySummary.set(data),
      error: (err) => console.error('Failed to load yearly summary:', err)
    });

    // Load recent expenses
    this.expenseService.getExpenses({ year: this.selectedYear() }).subscribe({
      next: (expenses) => this.recentExpenses.set(expenses.slice(0, 5)),
      error: (err) => console.error('Failed to load expenses:', err)
    });
  }

  changeYear(delta: number) {
    this.selectedYear.update(y => y + delta);
    this.loadData();
  }

  selectMonth(month: number) {
    this.selectedMonth.set(month);
  }

  hasDataForMonth(month: number): boolean {
    const summary = this.yearlySummary();
    if (!summary?.months) return false;
    return summary.months.some(m => m.month === month && m.grossIncomePLN > 0);
  }

  formatPLN(amount: number): string {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 2
    }).format(amount);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short'
    });
  }

  getMonthName(month: number): string {
    const m = this.months.find(m => m.value === month);
    return m?.name || '';
  }

  getTaxFormLabel(form: TaxForm | undefined): string {
    if (!form) return '';
    const labels: Record<TaxForm, string> = {
      LINIOWY: 'Flat tax 19%',
      SKALA: 'Progressive 12%/32%',
      RYCZALT: 'Lump sum tax'
    };
    return labels[form] || form;
  }

  getZUSLabel(type: ZUSType | undefined): string {
    if (!type) return '';
    const labels: Record<ZUSType, string> = {
      STANDARD: 'Full ZUS',
      MALY_ZUS_PLUS: 'Small ZUS Plus',
      PREFERENCYJNY: 'Preferential',
      CUSTOM: 'Custom amount'
    };
    return labels[type] || type;
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
      'clipboard': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>',
      'code': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      'monitor': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
      'car': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 16H9m10 0h3v-3.15a1 1 0 00-.84-.99L16 11l-2.7-3.6a1 1 0 00-.8-.4H5.24a2 2 0 00-1.8 1.1l-.8 1.63A6 6 0 002 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>',
      'coffee': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
      'briefcase': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>',
      'book': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
      'megaphone': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 11-5.8-1.6"/></svg>',
      'shield': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
      'home': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
      'phone': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>',
      'credit-card': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
      'file-text': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      'more-horizontal': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
      'circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>'
    };
    return icons[iconName] || icons['circle'];
  }
}
