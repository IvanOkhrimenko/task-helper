import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BusinessService } from '../business.service';
import { BusinessContextService } from '../business-context.service';
import { formatCurrency, parseDecimal } from '../business.models';

interface RecentTransaction {
  id: string;
  type: 'expense' | 'income';
  amount: string;
  description: string;
  category: string;
  date: string;
  paidBy?: { name: string };
  receivedBy?: { name: string };
}

interface QuickStats {
  totalMembers: number;
  totalExpenses: number;
  totalIncomes: number;
  netBalance: string;
  monthlyExpenses: string;
  monthlyIncome: string;
}

@Component({
  selector: 'app-business-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="overview-container">
      <!-- Quick Stats -->
      <section class="stats-section">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon members">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats().totalMembers }}</span>
              <span class="stat-label">{{ 'business.overview.teamMembers' | translate }}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon expenses">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 19l-7-7 7-7M19 12H5"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value expense">{{ stats().totalExpenses }}</span>
              <span class="stat-label">{{ 'business.overview.totalExpenses' | translate }}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon income">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5l7 7-7 7M5 12h14"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value income">{{ stats().totalIncomes }}</span>
              <span class="stat-label">{{ 'business.overview.totalIncome' | translate }}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon balance" [class.positive]="isNetPositive()" [class.negative]="!isNetPositive()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value" [class.positive]="isNetPositive()" [class.negative]="!isNetPositive()">
                {{ formatAmount(stats().netBalance) }}
              </span>
              <span class="stat-label">{{ 'business.overview.netBalance' | translate }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Quick Actions & Recent Transactions -->
      <div class="content-grid">
        <!-- Quick Actions -->
        <section class="quick-actions-section">
          <h2 class="section-title">{{ 'business.overview.quickActions' | translate }}</h2>
          <div class="quick-actions">
            <button class="quick-action-btn expense" (click)="goToAddExpense()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v8M8 12h8"/>
              </svg>
              <span>{{ 'business.overview.addExpense' | translate }}</span>
            </button>
            <button class="quick-action-btn income" (click)="goToAddIncome()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v8M8 12h8"/>
              </svg>
              <span>{{ 'business.overview.addIncome' | translate }}</span>
            </button>
            <button class="quick-action-btn members" (click)="goToMembers()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <path d="M20 8v6M23 11h-6"/>
              </svg>
              <span>{{ 'business.overview.inviteMember' | translate }}</span>
            </button>
            <button class="quick-action-btn analytics" (click)="goToAnalytics()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 20V10M12 20V4M6 20v-6"/>
              </svg>
              <span>{{ 'business.overview.viewAnalytics' | translate }}</span>
            </button>
          </div>
        </section>

        <!-- Recent Transactions -->
        <section class="recent-section">
          <div class="section-header">
            <h2 class="section-title">{{ 'business.overview.recentTransactions' | translate }}</h2>
            <a [routerLink]="['../transactions']" class="view-all-link">
              {{ 'business.overview.viewAll' | translate }}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>

          @if (loadingTransactions()) {
            <div class="loading-state small">
              <div class="loading-spinner"></div>
            </div>
          }

          @if (!loadingTransactions() && recentTransactions().length === 0) {
            <div class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <p>{{ 'business.overview.noTransactions' | translate }}</p>
            </div>
          }

          @if (!loadingTransactions() && recentTransactions().length > 0) {
            <div class="transactions-list">
              @for (transaction of recentTransactions(); track transaction.id) {
                <div class="transaction-item" [class]="transaction.type">
                  <div class="transaction-icon" [class]="transaction.type">
                    @if (transaction.type === 'expense') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 19l-7-7 7-7"/>
                      </svg>
                    } @else {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5l7 7-7 7"/>
                      </svg>
                    }
                  </div>
                  <div class="transaction-info">
                    <span class="transaction-description">{{ transaction.description || transaction.category }}</span>
                    <span class="transaction-meta">
                      {{ transaction.type === 'expense' ? transaction.paidBy?.name : transaction.receivedBy?.name }}
                      · {{ formatDate(transaction.date) }}
                    </span>
                  </div>
                  <span class="transaction-amount" [class]="transaction.type">
                    {{ transaction.type === 'expense' ? '-' : '+' }}{{ formatAmount(transaction.amount) }}
                  </span>
                </div>
              }
            </div>
          }
        </section>
      </div>

      <!-- Monthly Summary -->
      <section class="monthly-section">
        <h2 class="section-title">{{ 'business.overview.thisMonth' | translate }}</h2>
        <div class="monthly-stats">
          <div class="monthly-stat">
            <span class="monthly-label">{{ 'business.overview.expenses' | translate }}</span>
            <span class="monthly-value expense">{{ formatAmount(stats().monthlyExpenses) }}</span>
          </div>
          <div class="monthly-divider"></div>
          <div class="monthly-stat">
            <span class="monthly-label">{{ 'business.overview.income' | translate }}</span>
            <span class="monthly-value income">{{ formatAmount(stats().monthlyIncome) }}</span>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host {
      --accent-cyan: var(--color-primary);
      --accent-cyan-dim: var(--color-primary-subtle);
      --accent-green: var(--color-success);
      --accent-green-dim: var(--color-success-subtle);
      --accent-amber: var(--color-warning);
      --accent-amber-dim: var(--color-warning-subtle);
      --accent-red: var(--color-danger);
      --accent-red-dim: var(--color-danger-subtle);
      --accent-purple: var(--color-purple);

      --terminal-bg: var(--color-bg);
      --terminal-surface: var(--color-surface);
      --terminal-surface-hover: var(--color-surface-secondary);
      --terminal-border: var(--color-border);

      --text-primary: var(--color-text);
      --text-secondary: var(--color-text-secondary);
      --text-tertiary: var(--color-text-tertiary);

      --font-mono: 'JetBrains Mono', monospace;
      --font-display: 'Sora', sans-serif;

      --radius-sm: 4px;
      --radius-md: 8px;
      --radius-lg: 12px;

      display: block;
    }

    .overview-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    /* Stats Section */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
    }

    .stat-icon svg {
      width: 24px;
      height: 24px;
    }

    .stat-icon.members {
      background: var(--accent-cyan-dim);
      color: var(--accent-cyan);
    }

    .stat-icon.expenses {
      background: var(--accent-red-dim);
      color: var(--accent-red);
    }

    .stat-icon.income {
      background: var(--accent-green-dim);
      color: var(--accent-green);
    }

    .stat-icon.balance {
      background: var(--terminal-surface-hover);
      color: var(--text-secondary);
    }

    .stat-icon.balance.positive {
      background: var(--accent-green-dim);
      color: var(--accent-green);
    }

    .stat-icon.balance.negative {
      background: var(--accent-red-dim);
      color: var(--accent-red);
    }

    .stat-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .stat-value {
      font-family: var(--font-mono);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .stat-value.expense {
      color: var(--accent-red);
    }

    .stat-value.income {
      color: var(--accent-green);
    }

    .stat-value.positive {
      color: var(--accent-green);
    }

    .stat-value.negative {
      color: var(--accent-red);
    }

    .stat-label {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      font-weight: 500;
      letter-spacing: 0.05em;
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    /* Content Grid */
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 1.5rem;
    }

    .section-title {
      font-family: var(--font-display);
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 1rem 0;
    }

    /* Quick Actions */
    .quick-actions-section {
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
    }

    .quick-actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .quick-action-btn {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      background: transparent;
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-md);
      font-family: var(--font-mono);
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
    }

    .quick-action-btn:hover {
      background: var(--terminal-surface-hover);
      border-color: var(--accent-cyan);
      color: var(--accent-cyan);
    }

    .quick-action-btn.expense:hover {
      border-color: var(--accent-red);
      color: var(--accent-red);
    }

    .quick-action-btn.income:hover {
      border-color: var(--accent-green);
      color: var(--accent-green);
    }

    .quick-action-btn.members:hover {
      border-color: var(--accent-purple);
      color: var(--accent-purple);
    }

    .quick-action-btn svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    /* Recent Transactions */
    .recent-section {
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .section-header .section-title {
      margin: 0;
    }

    .view-all-link {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--accent-cyan);
      text-decoration: none;
      transition: opacity 0.2s;
    }

    .view-all-link:hover {
      opacity: 0.8;
    }

    .view-all-link svg {
      width: 14px;
      height: 14px;
    }

    .transactions-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .transaction-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.875rem;
      background: var(--terminal-bg);
      border-radius: var(--radius-md);
      transition: background 0.2s;
    }

    .transaction-item:hover {
      background: var(--terminal-surface-hover);
    }

    .transaction-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      flex-shrink: 0;
    }

    .transaction-icon svg {
      width: 16px;
      height: 16px;
    }

    .transaction-icon.expense {
      background: var(--accent-red-dim);
      color: var(--accent-red);
    }

    .transaction-icon.income {
      background: var(--accent-green-dim);
      color: var(--accent-green);
    }

    .transaction-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .transaction-description {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .transaction-meta {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--text-tertiary);
    }

    .transaction-amount {
      font-family: var(--font-mono);
      font-size: 0.9rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .transaction-amount.expense {
      color: var(--accent-red);
    }

    .transaction-amount.income {
      color: var(--accent-green);
    }

    /* Monthly Section */
    .monthly-section {
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
    }

    .monthly-stats {
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .monthly-stat {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .monthly-label {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      font-weight: 500;
      letter-spacing: 0.05em;
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    .monthly-value {
      font-family: var(--font-mono);
      font-size: 1.25rem;
      font-weight: 600;
    }

    .monthly-value.expense {
      color: var(--accent-red);
    }

    .monthly-value.income {
      color: var(--accent-green);
    }

    .monthly-divider {
      width: 1px;
      height: 40px;
      background: var(--terminal-border);
    }

    /* Loading & Empty States */
    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .loading-state.small {
      padding: 1rem;
    }

    .loading-spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--terminal-border);
      border-top-color: var(--accent-cyan);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
      color: var(--text-tertiary);
    }

    .empty-state svg {
      width: 40px;
      height: 40px;
      margin-bottom: 0.75rem;
    }

    .empty-state p {
      font-size: 0.85rem;
      margin: 0;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .content-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }

      .monthly-stats {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }

      .monthly-divider {
        width: 100%;
        height: 1px;
      }
    }
  `]
})
export class BusinessOverviewComponent implements OnInit {
  private router = inject(Router);
  private businessService = inject(BusinessService);
  private businessContext = inject(BusinessContextService);

  loadingTransactions = signal(true);
  recentTransactions = signal<RecentTransaction[]>([]);

  stats = signal<QuickStats>({
    totalMembers: 0,
    totalExpenses: 0,
    totalIncomes: 0,
    netBalance: '0',
    monthlyExpenses: '0',
    monthlyIncome: '0'
  });

  business = this.businessContext.business;
  businessId = this.businessContext.businessId;
  currency = this.businessContext.currency;

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    const id = this.businessId();
    if (!id) return;

    // Load business counts from context
    const business = this.business();
    if (business) {
      this.stats.update(s => ({
        ...s,
        totalMembers: business._count?.memberships || 0,
        totalExpenses: business._count?.expenses || 0,
        totalIncomes: business._count?.incomes || 0
      }));
    }

    // Load recent transactions
    this.loadRecentTransactions(id);

    // Load ledger for net balance
    this.businessService.getLedger(id).subscribe({
      next: (ledger) => {
        this.stats.update(s => ({
          ...s,
          netBalance: ledger.netBalance || '0'
        }));
      },
      error: (err) => console.error('Failed to load ledger:', err)
    });

    // Load analytics for monthly data
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    this.businessService.getKPIs(id, {
      startDate: startOfMonth.toISOString(),
      endDate: now.toISOString()
    }).subscribe({
      next: (response) => {
        this.stats.update(s => ({
          ...s,
          monthlyExpenses: response.kpis.totalExpenses || '0',
          monthlyIncome: response.kpis.totalRevenue || '0'
        }));
      },
      error: (err) => console.error('Failed to load KPIs:', err)
    });
  }

  private loadRecentTransactions(businessId: string) {
    this.loadingTransactions.set(true);
    const transactions: RecentTransaction[] = [];

    // Load recent expenses
    this.businessService.getExpenses(businessId, { limit: 5 }).subscribe({
      next: (response) => {
        const expenses = response.expenses.map((e: any) => ({
          id: e.id,
          type: 'expense' as const,
          amount: e.amount,
          description: e.description,
          category: e.category?.name || 'Uncategorized',
          date: e.transactionDate,
          paidBy: e.paidByMember?.user
        }));
        transactions.push(...expenses);
        this.mergeAndSortTransactions(transactions);
      },
      error: () => this.loadingTransactions.set(false)
    });

    // Load recent incomes
    this.businessService.getIncomes(businessId, { limit: 5 }).subscribe({
      next: (response) => {
        const incomes = response.incomes.map((i: any) => ({
          id: i.id,
          type: 'income' as const,
          amount: i.amount,
          description: i.description,
          category: i.category?.name || 'Uncategorized',
          date: i.transactionDate,
          receivedBy: i.receivedByMember?.user
        }));
        transactions.push(...incomes);
        this.mergeAndSortTransactions(transactions);
      },
      error: () => this.loadingTransactions.set(false)
    });
  }

  private mergeAndSortTransactions(transactions: RecentTransaction[]) {
    const sorted = transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
    this.recentTransactions.set(sorted);
    this.loadingTransactions.set(false);
  }

  isNetPositive(): boolean {
    return parseDecimal(this.stats().netBalance) >= 0;
  }

  formatAmount(value: string | number): string {
    return formatCurrency(value, this.currency());
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  goToAddExpense() {
    this.router.navigate(['/business', this.businessId(), 'transactions'], {
      queryParams: { action: 'add-expense' }
    });
  }

  goToAddIncome() {
    this.router.navigate(['/business', this.businessId(), 'transactions'], {
      queryParams: { action: 'add-income' }
    });
  }

  goToMembers() {
    this.router.navigate(['/business', this.businessId(), 'members']);
  }

  goToAnalytics() {
    this.router.navigate(['/business', this.businessId(), 'analytics']);
  }
}
