import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BusinessService } from '../business.service';
import { BusinessContextService } from '../business-context.service';
import {
  Business,
  BusinessExpense,
  BusinessIncome,
  BusinessCategory,
  BusinessMembership,
  CategoryType,
  formatCurrency,
  parseDecimal,
  CreateExpenseRequest,
  CreateIncomeRequest,
} from '../business.models';

type TransactionType = 'expense' | 'income';
type Transaction = (BusinessExpense | BusinessIncome) & { type: TransactionType };

@Component({
  selector: 'app-business-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="transactions-container">
      <!-- Toolbar -->
      <div class="transactions-toolbar">
        <h2 class="section-title">{{ 'business.transactions.subtitle' | translate }}</h2>
        <div class="toolbar-actions">
          <button class="action-btn expense" (click)="openCreateModal('expense')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            <span>{{ 'business.transactions.addExpense' | translate }}</span>
          </button>
          <button class="action-btn income" (click)="openCreateModal('income')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            <span>{{ 'business.transactions.addIncome' | translate }}</span>
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="filter-tabs">
          <button
            class="filter-tab"
            [class.active]="activeTab() === 'all'"
            (click)="setActiveTab('all')"
          >
            {{ 'business.transactions.all' | translate }}
          </button>
          <button
            class="filter-tab"
            [class.active]="activeTab() === 'expense'"
            (click)="setActiveTab('expense')"
          >
            {{ 'business.transactions.expenses' | translate }}
          </button>
          <button
            class="filter-tab"
            [class.active]="activeTab() === 'income'"
            (click)="setActiveTab('income')"
          >
            {{ 'business.transactions.income' | translate }}
          </button>
        </div>
        <div class="filter-controls">
          <select class="filter-select" [(ngModel)]="selectedCategory" (change)="loadTransactions()">
            <option value="">{{ 'business.transactions.allCategories' | translate }}</option>
            @for (cat of filteredCategories(); track cat.id) {
              <option [value]="cat.id">{{ cat.name }}</option>
            }
          </select>
          <input
            type="text"
            class="filter-input"
            [placeholder]="'common.search' | translate"
            [(ngModel)]="searchQuery"
            (input)="onSearchChange()"
          >
        </div>
      </div>

      <!-- Summary Bar -->
      <div class="summary-bar">
        <div class="summary-item">
          <span class="summary-label">{{ 'business.transactions.totalExpenses' | translate }}</span>
          <span class="summary-value expense">{{ formatAmount(totalExpenses()) }}</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item">
          <span class="summary-label">{{ 'business.transactions.totalIncome' | translate }}</span>
          <span class="summary-value income">{{ formatAmount(totalIncome()) }}</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item">
          <span class="summary-label">{{ 'business.transactions.net' | translate }}</span>
          <span class="summary-value" [class.positive]="netAmount() >= 0" [class.negative]="netAmount() < 0">
            {{ formatAmount(netAmount()) }}
          </span>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>{{ 'business.transactions.loading' | translate }}</p>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && transactions().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <path d="M12 11v6M9 14h6"/>
            </svg>
          </div>
          <h2 class="empty-title">{{ 'business.transactions.empty.title' | translate }}</h2>
          <p class="empty-text">{{ 'business.transactions.empty.description' | translate }}</p>
          <div class="empty-actions">
            <button class="action-btn expense" (click)="openCreateModal('expense')">{{ 'business.transactions.empty.addFirstExpense' | translate }}</button>
            <button class="action-btn income" (click)="openCreateModal('income')">{{ 'business.transactions.empty.addFirstIncome' | translate }}</button>
          </div>
        </div>
      }

      <!-- Transactions List -->
      @if (!loading() && transactions().length > 0) {
        <div class="transactions-list">
          @for (txn of transactions(); track txn.id) {
            <div class="transaction-row" [class.expense]="txn.type === 'expense'" [class.income]="txn.type === 'income'">
              <div class="txn-indicator"></div>
              <div class="txn-main">
                <div class="txn-header">
                  <span class="txn-category" [style.background-color]="getCategoryColor(txn) + '20'" [style.color]="getCategoryColor(txn)">
                    {{ txn.category?.name || 'Uncategorized' }}
                  </span>
                  <span class="txn-type-badge" [class.expense]="txn.type === 'expense'" [class.income]="txn.type === 'income'">
                    {{ txn.type === 'expense' ? ('business.transactions.expenseLabel' | translate) : ('business.transactions.incomeLabel' | translate) }}
                  </span>
                </div>
                <p class="txn-description">{{ txn.description || ('business.transactions.noDescription' | translate) }}</p>
                <div class="txn-meta">
                  <span class="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="4" width="18" height="18" rx="2"/>
                      <path d="M16 2v4M8 2v4M3 10h18"/>
                    </svg>
                    {{ formatDate(txn.transactionDate) }}
                  </span>
                  @if (getAttributedMember(txn)) {
                    <span class="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      {{ getAttributedMember(txn) }}
                    </span>
                  }
                  @if (txn.counterparty) {
                    <span class="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16"/>
                        <path d="M3 21h18M9 7h1M9 11h1M9 15h1M14 7h1M14 11h1M14 15h1"/>
                      </svg>
                      {{ txn.counterparty }}
                    </span>
                  }
                </div>
              </div>
              <div class="txn-amount" [class.expense]="txn.type === 'expense'" [class.income]="txn.type === 'income'">
                <span class="amount-sign">{{ txn.type === 'expense' ? '-' : '+' }}</span>
                <span class="amount-value">{{ formatAmount(txn.amount) }}</span>
              </div>
              <div class="txn-actions">
                <button class="txn-action-btn" (click)="editTransaction(txn)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button class="txn-action-btn delete" (click)="deleteTransaction(txn)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Pagination -->
        @if (hasMore()) {
          <div class="pagination">
            <button class="load-more-btn" (click)="loadMore()" [disabled]="loadingMore()">
              @if (loadingMore()) {
                <span class="spinner"></span>
              }
              <span>{{ 'common.loadMore' | translate }}</span>
            </button>
          </div>
        }
      }

      <!-- Create/Edit Modal -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-container" [class.expense]="modalType() === 'expense'" [class.income]="modalType() === 'income'" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">
                {{ editingTransaction() ? ('common.edit' | translate) : ('common.new' | translate) }} {{ modalType() === 'expense' ? ('business.transactions.expense' | translate) : ('business.transactions.incomeItem' | translate) }}
              </h2>
              <button class="modal-close" (click)="closeModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form class="modal-form" (submit)="saveTransaction($event)">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">{{ 'business.transactions.modal.amount' | translate }}</label>
                  <div class="amount-input-group">
                    <span class="currency-prefix">{{ currency() }}</span>
                    <input
                      type="number"
                      class="form-input amount"
                      [(ngModel)]="formAmount"
                      name="amount"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                    >
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">{{ 'business.transactions.modal.date' | translate }}</label>
                  <input
                    type="date"
                    class="form-input"
                    [(ngModel)]="formDate"
                    name="date"
                    required
                  >
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">{{ 'business.transactions.modal.category' | translate }}</label>
                <select class="form-select" [(ngModel)]="formCategory" name="category" required>
                  <option value="">{{ 'business.transactions.modal.selectCategory' | translate }}</option>
                  @for (cat of modalCategories(); track cat.id) {
                    <option [value]="cat.id">{{ cat.name }}</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">{{ 'business.transactions.modal.description' | translate }}</label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="formDescription"
                  name="description"
                  [placeholder]="'business.transactions.modal.descriptionPlaceholder' | translate"
                >
              </div>

              <div class="form-group">
                <label class="form-label">
                  {{ modalType() === 'expense' ? ('business.transactions.modal.paidBy' | translate) : ('business.transactions.modal.receivedBy' | translate) }}
                  <span class="optional">({{ 'common.optional' | translate }})</span>
                </label>
                <select class="form-select" [(ngModel)]="formMemberId" name="memberId">
                  <option value="">{{ 'business.transactions.modal.businessAccount' | translate }}</option>
                  @for (member of members(); track member.id) {
                    <option [value]="member.id">{{ member.user.name }} ({{ member.role }})</option>
                  }
                </select>
                <span class="form-hint">
                  {{ modalType() === 'expense'
                    ? ('business.transactions.modal.paidByHint' | translate)
                    : ('business.transactions.modal.receivedByHint' | translate) }}
                </span>
              </div>

              <div class="form-group">
                <label class="form-label">{{ 'business.transactions.modal.counterparty' | translate }} <span class="optional">({{ 'common.optional' | translate }})</span></label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="formCounterparty"
                  name="counterparty"
                  [placeholder]="modalType() === 'expense' ? ('business.transactions.modal.vendorPlaceholder' | translate) : ('business.transactions.modal.customerPlaceholder' | translate)"
                >
              </div>

              <div class="form-group">
                <label class="form-label">{{ 'business.transactions.modal.note' | translate }} <span class="optional">({{ 'common.optional' | translate }})</span></label>
                <textarea
                  class="form-textarea"
                  [(ngModel)]="formNote"
                  name="note"
                  [placeholder]="'business.transactions.modal.notePlaceholder' | translate"
                  rows="2"
                ></textarea>
              </div>

              <div class="modal-actions">
                <button type="button" class="action-btn secondary" (click)="closeModal()">{{ 'common.cancel' | translate }}</button>
                <button type="submit" class="action-btn" [class.expense]="modalType() === 'expense'" [class.income]="modalType() === 'income'" [disabled]="saving()">
                  @if (saving()) {
                    <span class="spinner"></span>
                  }
                  <span>{{ editingTransaction() ? ('common.saveChanges' | translate) : ('common.create' | translate) }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Sora:wght@400;500;600;700&display=swap');

    :host {
      /* Map global theme variables to component variables */
      --terminal-bg: var(--color-bg);
      --terminal-surface: var(--color-surface);
      --terminal-surface-hover: var(--color-surface-secondary);
      --terminal-border: var(--color-border);
      --terminal-border-light: var(--color-border-opaque);

      --text-primary: var(--color-text);
      --text-secondary: var(--color-text-secondary);
      --text-tertiary: var(--color-text-tertiary);

      --accent-cyan: var(--color-primary);
      --accent-cyan-dim: var(--color-primary-subtle);
      --accent-green: var(--color-success);
      --accent-green-dim: var(--color-success-subtle);
      --accent-amber: var(--color-warning);
      --accent-amber-dim: var(--color-warning-subtle);
      --accent-red: var(--color-danger);
      --accent-red-dim: var(--color-danger-subtle);
      --accent-purple: var(--color-purple);
      --accent-purple-dim: rgba(175, 82, 222, 0.15);

      --font-mono: 'JetBrains Mono', monospace;
      --font-display: 'Sora', sans-serif;

      --radius-sm: 4px;
      --radius-md: 8px;
      --radius-lg: 12px;

      display: block;
      min-height: 100%;
      background: var(--terminal-bg);
      color: var(--text-primary);
      font-family: var(--font-display);
    }

    .transactions-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Toolbar */
    .transactions-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--terminal-border);
    }

    .section-title {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .toolbar-actions {
      display: flex;
      gap: 0.75rem;
    }

    /* Header */
    .transactions-header {
      margin-bottom: 2rem;
    }

    .header-nav {
      margin-bottom: 1rem;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-secondary);
      text-decoration: none;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      transition: color 0.2s;
    }

    .back-link:hover {
      color: var(--accent-cyan);
    }

    .back-link svg {
      width: 16px;
      height: 16px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--terminal-border);
    }

    .page-title {
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 700;
      margin: 0;
      color: var(--text-primary);
    }

    .page-subtitle {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      color: var(--text-tertiary);
      margin-top: 0.25rem;
      display: block;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    /* Action Buttons */
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      font-weight: 500;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .action-btn.expense {
      background: var(--accent-red-dim);
      color: var(--accent-red);
      border-color: var(--accent-red);
    }

    .action-btn.expense:hover {
      background: var(--accent-red);
      color: var(--terminal-bg);
    }

    .action-btn.income {
      background: var(--accent-green-dim);
      color: var(--accent-green);
      border-color: var(--accent-green);
    }

    .action-btn.income:hover {
      background: var(--accent-green);
      color: var(--terminal-bg);
    }

    .action-btn.secondary {
      background: transparent;
      color: var(--text-secondary);
      border-color: var(--terminal-border-light);
    }

    .action-btn.secondary:hover {
      background: var(--terminal-surface-hover);
      color: var(--text-primary);
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-btn svg {
      width: 16px;
      height: 16px;
    }

    /* Filters */
    .filters-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      gap: 1rem;
    }

    .filter-tabs {
      display: flex;
      gap: 0.25rem;
      background: var(--terminal-surface);
      padding: 0.25rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--terminal-border);
    }

    .filter-tab {
      padding: 0.5rem 1rem;
      background: transparent;
      border: none;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-secondary);
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: all 0.2s;
    }

    .filter-tab:hover {
      color: var(--text-primary);
    }

    .filter-tab.active {
      background: var(--accent-cyan-dim);
      color: var(--accent-cyan);
    }

    .filter-controls {
      display: flex;
      gap: 0.75rem;
    }

    .filter-select,
    .filter-input {
      padding: 0.5rem 0.75rem;
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-md);
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--text-primary);
      transition: all 0.2s;
    }

    .filter-select:focus,
    .filter-input:focus {
      outline: none;
      border-color: var(--accent-cyan);
    }

    .filter-input {
      width: 200px;
    }

    .filter-input::placeholder {
      color: var(--text-tertiary);
    }

    /* Summary Bar */
    .summary-bar {
      display: flex;
      align-items: center;
      gap: 2rem;
      padding: 1rem 1.5rem;
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
      margin-bottom: 1.5rem;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .summary-label {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      font-weight: 500;
      letter-spacing: 0.1em;
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    .summary-value {
      font-family: var(--font-mono);
      font-size: 1.25rem;
      font-weight: 700;
    }

    .summary-value.expense {
      color: var(--accent-red);
    }

    .summary-value.income {
      color: var(--accent-green);
    }

    .summary-value.positive {
      color: var(--accent-green);
    }

    .summary-value.negative {
      color: var(--accent-red);
    }

    .summary-divider {
      width: 1px;
      height: 40px;
      background: var(--terminal-border-light);
    }

    /* Loading */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem;
      color: var(--text-secondary);
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--terminal-border);
      border-top-color: var(--accent-cyan);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      text-align: center;
    }

    .empty-icon {
      width: 80px;
      height: 80px;
      margin-bottom: 1.5rem;
      color: var(--text-tertiary);
    }

    .empty-icon svg {
      width: 100%;
      height: 100%;
    }

    .empty-title {
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 0.75rem 0;
    }

    .empty-text {
      font-size: 0.95rem;
      color: var(--text-secondary);
      margin: 0 0 2rem 0;
      max-width: 400px;
    }

    .empty-actions {
      display: flex;
      gap: 1rem;
    }

    /* Transactions List */
    .transactions-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .transaction-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
      transition: all 0.2s;
    }

    .transaction-row:hover {
      border-color: var(--terminal-border-light);
      transform: translateX(4px);
    }

    .txn-indicator {
      width: 4px;
      height: 40px;
      border-radius: 2px;
      flex-shrink: 0;
    }

    .transaction-row.expense .txn-indicator {
      background: linear-gradient(180deg, var(--accent-red), var(--accent-amber));
    }

    .transaction-row.income .txn-indicator {
      background: linear-gradient(180deg, var(--accent-green), var(--accent-cyan));
    }

    .txn-main {
      flex: 1;
      min-width: 0;
    }

    .txn-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.375rem;
    }

    .txn-category {
      padding: 0.2rem 0.5rem;
      font-family: var(--font-mono);
      font-size: 0.65rem;
      font-weight: 600;
      border-radius: var(--radius-sm);
    }

    .txn-type-badge {
      padding: 0.15rem 0.375rem;
      font-family: var(--font-mono);
      font-size: 0.55rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      border-radius: 2px;
    }

    .txn-type-badge.expense {
      background: var(--accent-red-dim);
      color: var(--accent-red);
    }

    .txn-type-badge.income {
      background: var(--accent-green-dim);
      color: var(--accent-green);
    }

    .txn-description {
      font-size: 0.95rem;
      color: var(--text-primary);
      margin: 0 0 0.5rem 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .txn-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--text-tertiary);
    }

    .meta-item svg {
      width: 12px;
      height: 12px;
    }

    .txn-amount {
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
      flex-shrink: 0;
    }

    .amount-sign {
      font-family: var(--font-mono);
      font-size: 1rem;
      font-weight: 600;
    }

    .amount-value {
      font-family: var(--font-mono);
      font-size: 1.25rem;
      font-weight: 700;
    }

    .txn-amount.expense {
      color: var(--accent-red);
    }

    .txn-amount.income {
      color: var(--accent-green);
    }

    .txn-actions {
      display: flex;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .txn-action-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-md);
      color: var(--text-tertiary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .txn-action-btn:hover {
      background: var(--terminal-surface-hover);
      border-color: var(--accent-cyan);
      color: var(--accent-cyan);
    }

    .txn-action-btn.delete:hover {
      border-color: var(--accent-red);
      color: var(--accent-red);
    }

    .txn-action-btn svg {
      width: 14px;
      height: 14px;
    }

    /* Pagination */
    .pagination {
      display: flex;
      justify-content: center;
      margin-top: 2rem;
    }

    .load-more-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 2rem;
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-md);
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .load-more-btn:hover:not(:disabled) {
      border-color: var(--accent-cyan);
      color: var(--accent-cyan);
    }

    .load-more-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-container {
      width: 100%;
      max-width: 500px;
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      animation: slideUp 0.3s ease;
    }

    .modal-container.expense {
      border-top: 3px solid var(--accent-red);
    }

    .modal-container.income {
      border-top: 3px solid var(--accent-green);
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--terminal-border);
    }

    .modal-title {
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .modal-close {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--text-tertiary);
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: all 0.2s ease;
    }

    .modal-close:hover {
      background: var(--terminal-surface-hover);
      color: var(--text-primary);
    }

    .modal-close svg {
      width: 18px;
      height: 18px;
    }

    .modal-form {
      padding: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-label {
      display: block;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.02em;
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
    }

    .form-label .optional {
      color: var(--text-tertiary);
    }

    .form-input,
    .form-textarea,
    .form-select {
      width: 100%;
      padding: 0.75rem 1rem;
      background: var(--terminal-bg);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-md);
      font-family: var(--font-display);
      font-size: 0.9rem;
      color: var(--text-primary);
      transition: all 0.2s ease;
    }

    .form-input:focus,
    .form-textarea:focus,
    .form-select:focus {
      outline: none;
      border-color: var(--accent-cyan);
      box-shadow: 0 0 0 3px var(--accent-cyan-dim);
    }

    .form-input::placeholder,
    .form-textarea::placeholder {
      color: var(--text-tertiary);
    }

    .form-textarea {
      resize: vertical;
      min-height: 60px;
    }

    .form-hint {
      display: block;
      font-size: 0.7rem;
      color: var(--text-tertiary);
      margin-top: 0.375rem;
    }

    .amount-input-group {
      display: flex;
      align-items: stretch;
    }

    .currency-prefix {
      display: flex;
      align-items: center;
      padding: 0 0.75rem;
      background: var(--terminal-border);
      border: 1px solid var(--terminal-border);
      border-right: none;
      border-radius: var(--radius-md) 0 0 var(--radius-md);
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--text-tertiary);
    }

    .form-input.amount {
      border-radius: 0 var(--radius-md) var(--radius-md) 0;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 0.5rem;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .transactions-container {
        padding: 1rem;
      }

      .header-content {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .header-actions {
        width: 100%;
      }

      .header-actions .action-btn {
        flex: 1;
        justify-content: center;
      }

      .filters-bar {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-controls {
        flex-direction: column;
      }

      .filter-input {
        width: 100%;
      }

      .summary-bar {
        flex-wrap: wrap;
        gap: 1rem;
      }

      .summary-divider {
        display: none;
      }

      .transaction-row {
        flex-wrap: wrap;
      }

      .txn-amount {
        order: -1;
        width: 100%;
        justify-content: flex-end;
        margin-bottom: 0.5rem;
        padding-left: calc(4px + 1rem);
      }

      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BusinessTransactionsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private businessService = inject(BusinessService);
  private businessContext = inject(BusinessContextService);

  expenses = signal<BusinessExpense[]>([]);
  incomes = signal<BusinessIncome[]>([]);
  categories = signal<BusinessCategory[]>([]);
  members = signal<BusinessMembership[]>([]);

  // Use context
  business = this.businessContext.business;
  businessId = this.businessContext.businessId;
  currency = this.businessContext.currency;

  loading = signal(true);
  loadingMore = signal(false);
  activeTab = signal<'all' | 'expense' | 'income'>('all');

  selectedCategory = '';
  searchQuery = '';
  private searchTimeout: any;

  // Pagination
  expenseOffset = 0;
  incomeOffset = 0;
  limit = 20;
  expenseHasMore = signal(false);
  incomeHasMore = signal(false);

  // Modal
  showModal = signal(false);
  modalType = signal<TransactionType>('expense');
  editingTransaction = signal<Transaction | null>(null);
  saving = signal(false);

  // Form
  formAmount: number | null = null;
  formDate = '';
  formCategory = '';
  formDescription = '';
  formMemberId = '';
  formCounterparty = '';
  formNote = '';

  // Computed
  transactions = computed<Transaction[]>(() => {
    const tab = this.activeTab();
    let result: Transaction[] = [];

    if (tab === 'all' || tab === 'expense') {
      result = result.concat(this.expenses().map(e => ({ ...e, type: 'expense' as const })));
    }
    if (tab === 'all' || tab === 'income') {
      result = result.concat(this.incomes().map(i => ({ ...i, type: 'income' as const })));
    }

    return result.sort((a, b) =>
      new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
    );
  });

  hasMore = computed(() => {
    const tab = this.activeTab();
    if (tab === 'expense') return this.expenseHasMore();
    if (tab === 'income') return this.incomeHasMore();
    return this.expenseHasMore() || this.incomeHasMore();
  });

  filteredCategories = computed(() => {
    const tab = this.activeTab();
    if (tab === 'expense') {
      return this.categories().filter(c => c.type === CategoryType.EXPENSE);
    }
    if (tab === 'income') {
      return this.categories().filter(c => c.type === CategoryType.INCOME);
    }
    return this.categories();
  });

  modalCategories = computed(() => {
    const type = this.modalType();
    return this.categories().filter(c =>
      c.type === (type === 'expense' ? CategoryType.EXPENSE : CategoryType.INCOME)
    );
  });

  totalExpenses = computed(() =>
    this.expenses().reduce((sum, e) => sum + parseDecimal(e.amount), 0)
  );

  totalIncome = computed(() =>
    this.incomes().reduce((sum, i) => sum + parseDecimal(i.amount), 0)
  );

  netAmount = computed(() => this.totalIncome() - this.totalExpenses());

  ngOnInit() {
    const id = this.businessId();
    if (id) {
      this.loadCategories();
      this.loadMembers();
      this.loadTransactions();
    }

    // Check for query params to auto-open modal
    const queryParams = this.route.snapshot.queryParams;
    if (queryParams['action'] === 'add-expense') {
      setTimeout(() => this.openCreateModal('expense'), 100);
    } else if (queryParams['action'] === 'add-income') {
      setTimeout(() => this.openCreateModal('income'), 100);
    }
  }

  loadCategories() {
    this.businessService.getCategories(this.businessId()).subscribe({
      next: (categories) => this.categories.set(categories),
      error: (err) => console.error('Failed to load categories:', err)
    });
  }

  loadMembers() {
    this.businessService.getMembers(this.businessId()).subscribe({
      next: (members) => this.members.set(members),
      error: (err) => console.error('Failed to load members:', err)
    });
  }

  loadTransactions() {
    this.loading.set(true);
    this.expenseOffset = 0;
    this.incomeOffset = 0;

    const options: any = { limit: this.limit };
    if (this.selectedCategory) options.categoryId = this.selectedCategory;
    if (this.searchQuery) options.search = this.searchQuery;

    const tab = this.activeTab();

    if (tab === 'all' || tab === 'expense') {
      this.businessService.getExpenses(this.businessId(), options).subscribe({
        next: (res) => {
          this.expenses.set(res.expenses);
          this.expenseHasMore.set(res.hasMore);
          this.checkLoading();
        },
        error: () => this.checkLoading()
      });
    } else {
      this.expenses.set([]);
    }

    if (tab === 'all' || tab === 'income') {
      this.businessService.getIncomes(this.businessId(), options).subscribe({
        next: (res) => {
          this.incomes.set(res.incomes);
          this.incomeHasMore.set(res.hasMore);
          this.checkLoading();
        },
        error: () => this.checkLoading()
      });
    } else {
      this.incomes.set([]);
    }
  }

  private checkLoading() {
    this.loading.set(false);
  }

  loadMore() {
    this.loadingMore.set(true);
    const tab = this.activeTab();
    const options: any = { limit: this.limit };
    if (this.selectedCategory) options.categoryId = this.selectedCategory;
    if (this.searchQuery) options.search = this.searchQuery;

    if ((tab === 'all' || tab === 'expense') && this.expenseHasMore()) {
      this.expenseOffset += this.limit;
      options.offset = this.expenseOffset;

      this.businessService.getExpenses(this.businessId(), options).subscribe({
        next: (res) => {
          this.expenses.update(list => [...list, ...res.expenses]);
          this.expenseHasMore.set(res.hasMore);
          this.loadingMore.set(false);
        },
        error: () => this.loadingMore.set(false)
      });
    }

    if ((tab === 'all' || tab === 'income') && this.incomeHasMore()) {
      this.incomeOffset += this.limit;
      options.offset = this.incomeOffset;

      this.businessService.getIncomes(this.businessId(), options).subscribe({
        next: (res) => {
          this.incomes.update(list => [...list, ...res.incomes]);
          this.incomeHasMore.set(res.hasMore);
          this.loadingMore.set(false);
        },
        error: () => this.loadingMore.set(false)
      });
    }
  }

  setActiveTab(tab: 'all' | 'expense' | 'income') {
    this.activeTab.set(tab);
    this.selectedCategory = '';
    this.loadTransactions();
  }

  onSearchChange() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.loadTransactions(), 300);
  }

  formatAmount(value: string | number): string {
    return formatCurrency(value, this.currency());
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getCategoryColor(txn: Transaction): string {
    return txn.category?.color || (txn.type === 'expense' ? '#f85149' : '#3fb950');
  }

  getAttributedMember(txn: Transaction): string | null {
    if (txn.type === 'expense') {
      const expense = txn as BusinessExpense;
      return expense.paidByMember?.user?.name || null;
    } else {
      const income = txn as BusinessIncome;
      return income.receivedByMember?.user?.name || null;
    }
  }

  openCreateModal(type: TransactionType) {
    this.modalType.set(type);
    this.editingTransaction.set(null);
    this.resetForm();
    this.formDate = new Date().toISOString().split('T')[0];
    this.showModal.set(true);
  }

  editTransaction(txn: Transaction) {
    this.modalType.set(txn.type);
    this.editingTransaction.set(txn);
    this.formAmount = parseDecimal(txn.amount);
    this.formDate = txn.transactionDate.split('T')[0];
    this.formCategory = txn.categoryId;
    this.formDescription = txn.description || '';
    this.formCounterparty = txn.counterparty || '';
    this.formNote = txn.note || '';

    if (txn.type === 'expense') {
      this.formMemberId = (txn as BusinessExpense).paidByMemberId || '';
    } else {
      this.formMemberId = (txn as BusinessIncome).receivedByMemberId || '';
    }

    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingTransaction.set(null);
    this.resetForm();
  }

  resetForm() {
    this.formAmount = null;
    this.formDate = '';
    this.formCategory = '';
    this.formDescription = '';
    this.formMemberId = '';
    this.formCounterparty = '';
    this.formNote = '';
  }

  saveTransaction(event: Event) {
    event.preventDefault();
    if (!this.formAmount || !this.formCategory || !this.formDate) return;

    this.saving.set(true);
    const type = this.modalType();
    const editing = this.editingTransaction();

    if (type === 'expense') {
      const data: CreateExpenseRequest = {
        categoryId: this.formCategory,
        amount: this.formAmount,
        transactionDate: this.formDate,
        description: this.formDescription || undefined,
        paidByMemberId: this.formMemberId || null,
        counterparty: this.formCounterparty || undefined,
        note: this.formNote || undefined,
      };

      const obs = editing
        ? this.businessService.updateExpense(this.businessId(), editing.id, data)
        : this.businessService.createExpense(this.businessId(), data);

      obs.subscribe({
        next: (expense) => {
          if (editing) {
            this.expenses.update(list =>
              list.map(e => e.id === expense.id ? expense : e)
            );
          } else {
            this.expenses.update(list => [expense, ...list]);
          }
          this.closeModal();
          this.saving.set(false);
        },
        error: (err) => {
          console.error('Failed to save expense:', err);
          this.saving.set(false);
        }
      });
    } else {
      const data: CreateIncomeRequest = {
        categoryId: this.formCategory,
        amount: this.formAmount,
        transactionDate: this.formDate,
        description: this.formDescription || undefined,
        receivedByMemberId: this.formMemberId || null,
        counterparty: this.formCounterparty || undefined,
        note: this.formNote || undefined,
      };

      const obs = editing
        ? this.businessService.updateIncome(this.businessId(), editing.id, data)
        : this.businessService.createIncome(this.businessId(), data);

      obs.subscribe({
        next: (income) => {
          if (editing) {
            this.incomes.update(list =>
              list.map(i => i.id === income.id ? income : i)
            );
          } else {
            this.incomes.update(list => [income, ...list]);
          }
          this.closeModal();
          this.saving.set(false);
        },
        error: (err) => {
          console.error('Failed to save income:', err);
          this.saving.set(false);
        }
      });
    }
  }

  deleteTransaction(txn: Transaction) {
    if (!confirm(`Are you sure you want to delete this ${txn.type}?`)) return;

    if (txn.type === 'expense') {
      this.businessService.deleteExpense(this.businessId(), txn.id).subscribe({
        next: () => {
          this.expenses.update(list => list.filter(e => e.id !== txn.id));
        },
        error: (err) => console.error('Failed to delete expense:', err)
      });
    } else {
      this.businessService.deleteIncome(this.businessId(), txn.id).subscribe({
        next: () => {
          this.incomes.update(list => list.filter(i => i.id !== txn.id));
        },
        error: (err) => console.error('Failed to delete income:', err)
      });
    }
  }
}
