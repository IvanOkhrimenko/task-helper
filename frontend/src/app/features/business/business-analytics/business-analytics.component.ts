import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { BusinessService } from '../business.service';
import { BusinessContextService } from '../business-context.service';
import {
  Business,
  BusinessAnalytics,
  BusinessKPIs,
  CategoryBreakdown,
  TimeSeriesDataPoint,
  MemberBalance,
  BusinessExpense,
  BusinessIncome,
  formatCurrency,
  parseDecimal,
} from '../business.models';

@Component({
  selector: 'app-business-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="analytics-container">
      <!-- Period Filter -->
      <div class="analytics-toolbar">
        <h2 class="section-title">{{ 'business.analytics.subtitle' | translate }}</h2>
        <select class="period-select" [(ngModel)]="selectedPeriod" (change)="loadAnalytics()">
          <option value="week">{{ 'business.analytics.period.week' | translate }}</option>
          <option value="month">{{ 'business.analytics.period.month' | translate }}</option>
          <option value="quarter">{{ 'business.analytics.period.quarter' | translate }}</option>
          <option value="year">{{ 'business.analytics.period.year' | translate }}</option>
        </select>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>{{ 'business.analytics.loading' | translate }}</p>
        </div>
      }

      @if (!loading() && analytics()) {
        <!-- KPI Cards -->
        <section class="kpi-section">
          <div class="kpi-grid">
            <div class="kpi-card revenue">
              <div class="kpi-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
              </div>
              <div class="kpi-content">
                <span class="kpi-label">{{ 'business.analytics.totalRevenue' | translate }}</span>
                <span class="kpi-value">{{ formatAmount(analytics()!.kpis.totalRevenue) }}</span>
              </div>
              <div class="kpi-trend up">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 6l-9.5 9.5-5-5L1 18"/>
                </svg>
              </div>
            </div>

            <div class="kpi-card expenses">
              <div class="kpi-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2z"/>
                  <path d="M1 10h22"/>
                </svg>
              </div>
              <div class="kpi-content">
                <span class="kpi-label">{{ 'business.analytics.totalExpenses' | translate }}</span>
                <span class="kpi-value">{{ formatAmount(analytics()!.kpis.totalExpenses) }}</span>
              </div>
              <div class="kpi-trend down">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 18l-9.5-9.5-5 5L1 6"/>
                </svg>
              </div>
            </div>

            <div class="kpi-card profit" [class.negative]="isNegative(analytics()!.kpis.netProfit)">
              <div class="kpi-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 20V10M12 20V4M6 20v-6"/>
                </svg>
              </div>
              <div class="kpi-content">
                <span class="kpi-label">{{ 'business.analytics.netProfit' | translate }}</span>
                <span class="kpi-value">{{ formatAmount(analytics()!.kpis.netProfit) }}</span>
              </div>
              <div class="kpi-badge" [class.positive]="!isNegative(analytics()!.kpis.netProfit)" [class.negative]="isNegative(analytics()!.kpis.netProfit)">
                {{ getProfitMargin() }}% {{ 'business.analytics.margin' | translate }}
              </div>
            </div>

            <div class="kpi-card transactions">
              <div class="kpi-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="1"/>
                </svg>
              </div>
              <div class="kpi-content">
                <span class="kpi-label">{{ 'business.analytics.transactions' | translate }}</span>
                <span class="kpi-value">{{ analytics()!.kpis.transactionCount }}</span>
              </div>
              <div class="kpi-breakdown">
                <span class="breakdown-item income">{{ analytics()!.kpis.incomeCount }} {{ 'business.analytics.in' | translate }}</span>
                <span class="breakdown-divider">/</span>
                <span class="breakdown-item expense">{{ analytics()!.kpis.expenseCount }} {{ 'business.analytics.out' | translate }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Period Breakdown Table -->
        <section class="table-section">
          <div class="table-header">
            <div>
              <h2 class="section-title">{{ 'business.analytics.periodBreakdown' | translate }}</h2>
              <span class="section-subtitle">{{ 'business.analytics.detailedFinancialData' | translate }}</span>
            </div>
            <div class="table-controls">
              <select class="groupby-select" [(ngModel)]="tableGroupBy" (change)="onTableGroupByChange(tableGroupBy())">
                <option value="week">{{ 'business.analytics.groupBy.week' | translate }}</option>
                <option value="month">{{ 'business.analytics.groupBy.month' | translate }}</option>
                <option value="year">{{ 'business.analytics.groupBy.year' | translate }}</option>
              </select>
              <button class="export-button" (click)="exportTableData()" [disabled]="tableLoading() || tableData().length === 0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                {{ 'business.analytics.export' | translate }}
              </button>
            </div>
          </div>

          <div class="table-card">
            @if (tableLoading()) {
              <div class="table-loading">{{ 'common.loading' | translate }}</div>
            } @else if (tableData().length === 0) {
              <div class="table-empty">{{ 'business.analytics.noData' | translate }}</div>
            } @else {
              <div class="table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th class="sortable" (click)="sortBy('period')">
                        <span class="th-content">
                          {{ 'business.analytics.period' | translate }}
                          @if (sortColumn() === 'period') {
                            <span class="sort-indicator">{{ sortDirection() === 'asc' ? '↑' : '↓' }}</span>
                          }
                        </span>
                      </th>
                      <th class="sortable numeric" (click)="sortBy('revenue')">
                        <span class="th-content">
                          {{ 'business.analytics.revenue' | translate }}
                          @if (sortColumn() === 'revenue') {
                            <span class="sort-indicator">{{ sortDirection() === 'asc' ? '↑' : '↓' }}</span>
                          }
                        </span>
                      </th>
                      <th class="sortable numeric" (click)="sortBy('expenses')">
                        <span class="th-content">
                          {{ 'business.analytics.expenses' | translate }}
                          @if (sortColumn() === 'expenses') {
                            <span class="sort-indicator">{{ sortDirection() === 'asc' ? '↑' : '↓' }}</span>
                          }
                        </span>
                      </th>
                      <th class="sortable numeric" (click)="sortBy('netProfit')">
                        <span class="th-content">
                          {{ 'business.analytics.netProfit' | translate }}
                          @if (sortColumn() === 'netProfit') {
                            <span class="sort-indicator">{{ sortDirection() === 'asc' ? '↑' : '↓' }}</span>
                          }
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (point of sortedTableData(); track point.date) {
                      <!-- Main summary row -->
                      <tr class="summary-row" [class.expanded]="isRowExpanded(point.date)" (click)="toggleRowExpansion(point.date)">
                        <td class="period-cell">
                          <div class="period-cell-content">
                            <span class="expand-icon">{{ isRowExpanded(point.date) ? '▼' : '▶' }}</span>
                            <span>{{ formatPeriodLabel(point.date, tableGroupBy()) }}</span>
                          </div>
                        </td>
                        <td class="numeric revenue-cell">{{ formatAmount(point.revenue) }}</td>
                        <td class="numeric expenses-cell">{{ formatAmount(point.expenses) }}</td>
                        <td class="numeric profit-cell" [class.negative]="isNegative(parseDecimal(point.revenue) - parseDecimal(point.expenses))">
                          {{ formatAmount((parseDecimal(point.revenue) - parseDecimal(point.expenses)).toFixed(2)) }}
                        </td>
                      </tr>

                      <!-- Expanded detail row -->
                      @if (isRowExpanded(point.date)) {
                        <tr class="detail-row">
                          <td colspan="4" class="detail-cell">
                            @if (expandedLoading()) {
                              <div class="detail-loading">
                                <div class="loading-spinner"></div>
                                <span>{{ 'common.loading' | translate }}</span>
                              </div>
                            } @else {
                              <div class="detail-content">
                                <!-- Expenses -->
                                @if (getExpandedData(point.date)?.expenses && getExpandedData(point.date)!.expenses.length > 0) {
                                  <div class="transactions-section expenses-section">
                                    <h4>{{ 'business.transactions.expenses' | translate | uppercase }} ({{ getExpandedData(point.date)!.expenses.length }})</h4>
                                    <div class="transactions-list">
                                      @for (exp of getExpandedData(point.date)!.expenses; track exp.id) {
                                        <div class="transaction-item">
                                          <span class="txn-date">{{ formatTransactionDate(exp.transactionDate) }}</span>
                                          <span class="category-dot" [style.background]="exp.category.color || '#8b949e'"></span>
                                          <span class="txn-description">{{ exp.description || ('business.transactions.noDescription' | translate) }}</span>
                                          <span class="txn-category">{{ exp.category.name }}</span>
                                          @if (exp.paidByMember) {
                                            <span class="txn-member">{{ exp.paidByMember.user.name }}</span>
                                          }
                                          <span class="txn-amount expense">{{ formatAmount(exp.amount) }}</span>
                                        </div>
                                      }
                                    </div>
                                  </div>
                                }

                                <!-- Incomes -->
                                @if (getExpandedData(point.date)?.incomes && getExpandedData(point.date)!.incomes.length > 0) {
                                  <div class="transactions-section incomes-section">
                                    <h4>{{ 'business.transactions.income' | translate | uppercase }} ({{ getExpandedData(point.date)!.incomes.length }})</h4>
                                    <div class="transactions-list">
                                      @for (inc of getExpandedData(point.date)!.incomes; track inc.id) {
                                        <div class="transaction-item">
                                          <span class="txn-date">{{ formatTransactionDate(inc.transactionDate) }}</span>
                                          <span class="category-dot" [style.background]="inc.category.color || '#3fb950'"></span>
                                          <span class="txn-description">{{ inc.description || ('business.transactions.noDescription' | translate) }}</span>
                                          <span class="txn-category">{{ inc.category.name }}</span>
                                          @if (inc.receivedByMember) {
                                            <span class="txn-member">{{ inc.receivedByMember.user.name }}</span>
                                          }
                                          <span class="txn-amount income">{{ formatAmount(inc.amount) }}</span>
                                        </div>
                                      }
                                    </div>
                                  </div>
                                }

                                @if ((!getExpandedData(point.date)?.expenses || getExpandedData(point.date)!.expenses.length === 0) &&
                                     (!getExpandedData(point.date)?.incomes || getExpandedData(point.date)!.incomes.length === 0)) {
                                  <div class="detail-empty">{{ 'business.analytics.noData' | translate }}</div>
                                }
                              </div>
                            }
                          </td>
                        </tr>
                      }
                    }
                  </tbody>
                  <tfoot>
                    <tr class="totals-row">
                      <td class="total-label">{{ 'business.analytics.total' | translate }}</td>
                      <td class="numeric revenue-cell">{{ formatAmount(tableTotals().revenue) }}</td>
                      <td class="numeric expenses-cell">{{ formatAmount(tableTotals().expenses) }}</td>
                      <td class="numeric profit-cell" [class.negative]="isNegative(tableTotals().netProfit)">
                        {{ formatAmount(tableTotals().netProfit) }}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            }
          </div>
        </section>

        <!-- Charts Section -->
        <section class="charts-section">
          <div class="charts-grid">
            <!-- Category Breakdown - Expenses -->
            <div class="chart-card">
              <div class="chart-header">
                <h3 class="chart-title">{{ 'business.analytics.expenseCategories' | translate }}</h3>
                <span class="chart-subtitle">{{ 'business.analytics.distributionByCategory' | translate }}</span>
              </div>
              <div class="chart-body">
                @if (analytics()!.expensesByCategory.length === 0) {
                  <div class="chart-empty">{{ 'business.analytics.noExpenseData' | translate }}</div>
                } @else {
                  <div class="category-chart">
                    @for (cat of analytics()!.expensesByCategory; track cat.categoryId) {
                      <div class="category-row">
                        <div class="category-info">
                          <div class="category-dot" [style.background-color]="cat.categoryColor || '#8b949e'"></div>
                          <span class="category-name">{{ cat.categoryName }}</span>
                        </div>
                        <div class="category-bar-container">
                          <div class="category-bar expense" [style.width.%]="cat.percentage"></div>
                        </div>
                        <div class="category-stats">
                          <span class="category-amount">{{ formatAmount(cat.total) }}</span>
                          <span class="category-percent">{{ cat.percentage.toFixed(1) }}%</span>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Category Breakdown - Income -->
            <div class="chart-card">
              <div class="chart-header">
                <h3 class="chart-title">{{ 'business.analytics.incomeSources' | translate }}</h3>
                <span class="chart-subtitle">{{ 'business.analytics.revenueBreakdown' | translate }}</span>
              </div>
              <div class="chart-body">
                @if (analytics()!.incomesByCategory.length === 0) {
                  <div class="chart-empty">{{ 'business.analytics.noIncomeData' | translate }}</div>
                } @else {
                  <div class="category-chart">
                    @for (cat of analytics()!.incomesByCategory; track cat.categoryId) {
                      <div class="category-row">
                        <div class="category-info">
                          <div class="category-dot" [style.background-color]="cat.categoryColor || '#3fb950'"></div>
                          <span class="category-name">{{ cat.categoryName }}</span>
                        </div>
                        <div class="category-bar-container">
                          <div class="category-bar income" [style.width.%]="cat.percentage"></div>
                        </div>
                        <div class="category-stats">
                          <span class="category-amount">{{ formatAmount(cat.total) }}</span>
                          <span class="category-percent">{{ cat.percentage.toFixed(1) }}%</span>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        </section>

        <!-- Member Balances Section -->
        <section class="balances-section">
          <div class="section-header">
            <h2 class="section-title">{{ 'business.analytics.memberBalances' | translate }}</h2>
            <span class="section-subtitle">{{ 'business.analytics.outstandingDebts' | translate }}</span>
          </div>

          <div class="balances-grid">
            <!-- Summary Cards -->
            <div class="balance-summary">
              <div class="summary-card owed-to">
                <span class="summary-label">{{ 'business.analytics.owedToMembers' | translate }}</span>
                <span class="summary-value">{{ formatAmount(ledgerSummary()?.totalOwedToMembers || '0') }}</span>
                <span class="summary-desc">{{ 'business.analytics.businessOwesToMembers' | translate }}</span>
              </div>
              <div class="summary-card owed-by">
                <span class="summary-label">{{ 'business.analytics.owedByMembers' | translate }}</span>
                <span class="summary-value">{{ formatAmount(ledgerSummary()?.totalOwedByMembers || '0') }}</span>
                <span class="summary-desc">{{ 'business.analytics.membersOweToBusiness' | translate }}</span>
              </div>
              <div class="summary-card net" [class.positive]="!isNegative(ledgerSummary()?.netBalance || '0')" [class.negative]="isNegative(ledgerSummary()?.netBalance || '0')">
                <span class="summary-label">{{ 'business.analytics.netBalance' | translate }}</span>
                <span class="summary-value">{{ formatAmount(ledgerSummary()?.netBalance || '0') }}</span>
                <span class="summary-desc">{{ 'business.analytics.overallPosition' | translate }}</span>
              </div>
            </div>

            <!-- Member List -->
            <div class="members-balances-card">
              <div class="members-list">
                @if ((analytics()!.memberBalances || []).length === 0) {
                  <div class="empty-members">{{ 'business.analytics.noMemberBalanceData' | translate }}</div>
                } @else {
                  @for (member of analytics()!.memberBalances; track member.memberId) {
                    <div class="member-balance-row">
                      <div class="member-info">
                        <div class="member-avatar">{{ getInitials(member.userName) }}</div>
                        <div class="member-details">
                          <span class="member-name">{{ member.userName }}</span>
                          <span class="member-role">{{ member.role }}</span>
                        </div>
                      </div>
                      <div class="member-balance" [class.positive]="!isNegative(member.balance)" [class.negative]="isNegative(member.balance)">
                        <span class="balance-amount">{{ formatAmount(member.balance) }}</span>
                        <span class="balance-status">
                          @if (isNegative(member.balance)) {
                            {{ 'business.analytics.owesBusiness' | translate }}
                          } @else if (parseDecimal(member.balance) > 0) {
                            {{ 'business.analytics.owedByBusiness' | translate }}
                          } @else {
                            {{ 'business.analytics.settled' | translate }}
                          }
                        </span>
                      </div>
                    </div>
                  }
                }
              </div>
            </div>
          </div>
        </section>

        <!-- Time Series (Simplified) -->
        <section class="timeseries-section">
          <div class="section-header">
            <h2 class="section-title">{{ 'business.analytics.trendOverview' | translate }}</h2>
            <span class="section-subtitle">{{ 'business.analytics.revenueVsExpenses' | translate }}</span>
          </div>

          <div class="timeseries-card">
            @if ((analytics()!.timeSeries || []).length === 0) {
              <div class="chart-empty">{{ 'business.analytics.noTimeSeriesData' | translate }}</div>
            } @else {
              <div class="timeseries-bars">
                @for (point of analytics()!.timeSeries; track point.date) {
                  <div class="timeseries-column">
                    <div class="column-bars">
                      <div class="bar revenue" [style.height.%]="getBarHeight(point.revenue, 'revenue')"></div>
                      <div class="bar expense" [style.height.%]="getBarHeight(point.expenses, 'expense')"></div>
                    </div>
                    <span class="column-label">{{ formatDateLabel(point.date) }}</span>
                  </div>
                }
              </div>
              <div class="timeseries-legend">
                <span class="legend-item revenue"><span class="legend-dot"></span> {{ 'business.analytics.revenue' | translate }}</span>
                <span class="legend-item expense"><span class="legend-dot"></span> {{ 'business.analytics.expenses' | translate }}</span>
              </div>
            }
          </div>
        </section>
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

    .analytics-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    @media (min-width: 1024px) {
      .analytics-container {
        padding: 0;
      }
    }

    @media (max-width: 1024px) {
      .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }
    }

    /* Toolbar */
    .analytics-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .section-title {
      font-family: var(--font-display);
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
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
      background: linear-gradient(135deg, var(--text-primary) 0%, var(--accent-cyan) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .page-subtitle {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      color: var(--text-tertiary);
      margin-top: 0.25rem;
      display: block;
    }

    .period-select {
      padding: 0.625rem 1rem;
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-md);
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .period-select:hover {
      border-color: var(--accent-cyan);
    }

    .period-select:focus {
      outline: none;
      border-color: var(--accent-cyan);
      box-shadow: 0 0 0 3px var(--accent-cyan-dim);
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

    /* KPI Section */
    .kpi-section {
      margin-bottom: 2rem;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
    }

    .kpi-card {
      position: relative;
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      overflow: hidden;
    }

    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
    }

    .kpi-card.revenue::before {
      background: linear-gradient(90deg, var(--accent-green), var(--accent-cyan));
    }

    .kpi-card.expenses::before {
      background: linear-gradient(90deg, var(--accent-red), var(--accent-amber));
    }

    .kpi-card.profit::before {
      background: linear-gradient(90deg, var(--accent-purple), var(--accent-cyan));
    }

    .kpi-card.profit.negative::before {
      background: linear-gradient(90deg, var(--accent-red), var(--accent-amber));
    }

    .kpi-card.transactions::before {
      background: linear-gradient(90deg, var(--accent-amber), var(--accent-green));
    }

    .kpi-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--terminal-surface-hover);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
    }

    .kpi-icon svg {
      width: 20px;
      height: 20px;
    }

    .kpi-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .kpi-label {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      font-weight: 500;
      letter-spacing: 0.05em;
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    .kpi-value {
      font-family: var(--font-mono);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .kpi-trend {
      position: absolute;
      top: 1rem;
      right: 1rem;
      width: 24px;
      height: 24px;
    }

    .kpi-trend.up {
      color: var(--accent-green);
    }

    .kpi-trend.down {
      color: var(--accent-red);
    }

    .kpi-trend svg {
      width: 100%;
      height: 100%;
    }

    .kpi-badge {
      display: inline-flex;
      align-self: flex-start;
      padding: 0.25rem 0.5rem;
      font-family: var(--font-mono);
      font-size: 0.65rem;
      font-weight: 600;
      border-radius: var(--radius-sm);
    }

    .kpi-badge.positive {
      background: var(--accent-green-dim);
      color: var(--accent-green);
    }

    .kpi-badge.negative {
      background: var(--accent-red-dim);
      color: var(--accent-red);
    }

    .kpi-breakdown {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-family: var(--font-mono);
      font-size: 0.75rem;
    }

    .breakdown-item.income {
      color: var(--accent-green);
    }

    .breakdown-item.expense {
      color: var(--accent-red);
    }

    .breakdown-divider {
      color: var(--text-tertiary);
    }

    /* Charts Section */
    .charts-section {
      margin-bottom: 2rem;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
    }

    .chart-card {
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .chart-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--terminal-border);
    }

    .chart-title {
      font-family: var(--font-display);
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .chart-subtitle {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-tertiary);
      display: block;
      margin-top: 0.25rem;
    }

    .chart-body {
      padding: 1.5rem;
    }

    .chart-empty {
      text-align: center;
      padding: 2rem;
      color: var(--text-tertiary);
      font-family: var(--font-mono);
      font-size: 0.85rem;
    }

    .category-chart {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .category-row {
      display: grid;
      grid-template-columns: 120px 1fr 100px;
      align-items: center;
      gap: 1rem;
    }

    .category-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .category-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .category-name {
      font-size: 0.85rem;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .category-bar-container {
      height: 8px;
      background: var(--terminal-border);
      border-radius: 4px;
      overflow: hidden;
    }

    .category-bar {
      height: 100%;
      border-radius: 4px;
      transition: width 0.5s ease;
    }

    .category-bar.expense {
      background: linear-gradient(90deg, var(--accent-red), var(--accent-amber));
    }

    .category-bar.income {
      background: linear-gradient(90deg, var(--accent-green), var(--accent-cyan));
    }

    .category-stats {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.125rem;
    }

    .category-amount {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .category-percent {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--text-tertiary);
    }

    /* Balances Section */
    .balances-section {
      margin-bottom: 2rem;
    }

    .section-header {
      margin-bottom: 1.5rem;
    }

    .section-title {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .section-subtitle {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-tertiary);
      display: block;
      margin-top: 0.25rem;
    }

    .balances-grid {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 1.5rem;
    }

    .balance-summary {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .summary-card {
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .summary-card.owed-to {
      border-left: 3px solid var(--accent-amber);
    }

    .summary-card.owed-by {
      border-left: 3px solid var(--accent-purple);
    }

    .summary-card.net.positive {
      border-left: 3px solid var(--accent-green);
    }

    .summary-card.net.negative {
      border-left: 3px solid var(--accent-red);
    }

    .summary-label {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      font-weight: 500;
      letter-spacing: 0.05em;
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    .summary-value {
      font-family: var(--font-mono);
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .summary-desc {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .members-balances-card {
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .members-list {
      max-height: 320px;
      overflow-y: auto;
    }

    .empty-members {
      padding: 2rem;
      text-align: center;
      color: var(--text-tertiary);
      font-family: var(--font-mono);
      font-size: 0.85rem;
    }

    .member-balance-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--terminal-border);
      transition: background 0.2s;
    }

    .member-balance-row:last-child {
      border-bottom: none;
    }

    .member-balance-row:hover {
      background: var(--terminal-surface-hover);
    }

    .member-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .member-avatar {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--accent-cyan-dim), var(--accent-purple-dim));
      border: 1px solid var(--terminal-border);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono);
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--accent-cyan);
    }

    .member-details {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .member-name {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .member-role {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    .member-balance {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.125rem;
    }

    .balance-amount {
      font-family: var(--font-mono);
      font-size: 1rem;
      font-weight: 600;
    }

    .member-balance.positive .balance-amount {
      color: var(--accent-green);
    }

    .member-balance.negative .balance-amount {
      color: var(--accent-red);
    }

    .balance-status {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    /* Time Series */
    .timeseries-section {
      margin-bottom: 2rem;
    }

    .timeseries-card {
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
    }

    .timeseries-bars {
      display: flex;
      gap: 0.5rem;
      height: 200px;
      padding-bottom: 2rem;
      align-items: flex-end;
    }

    .timeseries-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
    }

    .column-bars {
      flex: 1;
      width: 100%;
      display: flex;
      gap: 4px;
      align-items: flex-end;
      justify-content: center;
    }

    .bar {
      width: 12px;
      border-radius: 2px 2px 0 0;
      transition: height 0.5s ease;
    }

    .bar.revenue {
      background: linear-gradient(180deg, var(--accent-green), var(--accent-cyan));
    }

    .bar.expense {
      background: linear-gradient(180deg, var(--accent-red), var(--accent-amber));
    }

    .column-label {
      margin-top: 0.75rem;
      font-family: var(--font-mono);
      font-size: 0.65rem;
      color: var(--text-tertiary);
    }

    .timeseries-legend {
      display: flex;
      justify-content: center;
      gap: 2rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--terminal-border);
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }

    .legend-item.revenue .legend-dot {
      background: linear-gradient(180deg, var(--accent-green), var(--accent-cyan));
    }

    .legend-item.expense .legend-dot {
      background: linear-gradient(180deg, var(--accent-red), var(--accent-amber));
    }

    /* Table Section */
    .table-section {
      margin-bottom: 2rem;
    }

    .section-subtitle {
      display: block;
      margin-top: 0.25rem;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .table-header > div:first-child {
      flex: 1;
      min-width: 200px;
    }

    .table-controls {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }

    @media (max-width: 640px) {
      .analytics-container {
        padding: 0 0.75rem;
      }

      .page-title {
        font-size: 1.35rem;
      }

      .kpi-grid {
        gap: 0.75rem;
        margin-bottom: 1.25rem;
      }

      .kpi-card {
        padding: 0.875rem;
      }

      .kpi-label {
        font-size: 0.7rem;
      }

      .kpi-value {
        font-size: 1.35rem;
      }

      .kpi-icon {
        width: 32px;
        height: 32px;
      }

      .chart-card {
        padding: 1rem;
      }

      .chart-title {
        font-size: 0.95rem;
      }

      .balance-card {
        padding: 0.875rem;
      }

      .section-title {
        font-size: 1rem;
      }

      .table-section {
        margin: 0 -0.75rem;
        padding: 0 0.75rem;
      }

      .table-controls {
        width: 100%;
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
      }

      .table-controls .groupby-select,
      .table-controls .export-button {
        width: 100%;
        padding: 0.625rem 1rem;
        font-size: 0.9rem;
      }

      .data-table {
        min-width: 600px;
        font-size: 0.85rem;
      }

      .data-table thead th,
      .data-table tbody td,
      .data-table tfoot td {
        padding: 0.625rem 0.75rem;
        font-size: 0.8rem;
        white-space: nowrap;
      }

      .expand-icon {
        font-size: 0.65rem;
        width: 14px;
      }

      .period-cell-content {
        gap: 0.375rem;
      }

      .detail-content {
        padding: 0.875rem;
      }

      .transactions-section h4 {
        font-size: 0.7rem;
        margin-bottom: 0.75rem;
      }

      .transaction-item {
        grid-template-columns: 55px 10px 1fr 100px 90px;
        gap: 0.5rem;
        padding: 0.625rem;
        font-size: 0.75rem;
      }

      .txn-member {
        display: none;
      }
    }

    .groupby-select {
      padding: 0.625rem 1rem;
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-md);
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .groupby-select:hover {
      border-color: var(--accent-cyan);
    }

    .groupby-select:focus {
      outline: none;
      border-color: var(--accent-cyan);
      box-shadow: 0 0 0 3px var(--accent-cyan-dim);
    }

    .export-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-md);
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .export-button:hover:not(:disabled) {
      background: var(--terminal-surface-hover);
      border-color: var(--accent-cyan);
      color: var(--accent-cyan);
    }

    .export-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .export-button svg {
      width: 16px;
      height: 16px;
    }

    .table-card {
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .table-loading,
    .table-empty {
      padding: 3rem;
      text-align: center;
      color: var(--text-tertiary);
      font-family: var(--font-mono);
      font-size: 0.85rem;
    }

    .table-wrapper {
      max-height: 600px;
      overflow-y: auto;
      position: relative;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-family: var(--font-mono);
      font-size: 0.85rem;
    }

    .data-table thead {
      position: sticky;
      top: 0;
      z-index: 10;
      background: var(--terminal-surface);
    }

    .data-table thead th {
      padding: 1rem 1.25rem;
      text-align: left;
      font-weight: 600;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--text-tertiary);
      border-bottom: 2px solid var(--terminal-border);
      background: var(--terminal-surface);
    }

    .data-table thead th.numeric {
      text-align: right;
    }

    .data-table thead th.sortable {
      cursor: pointer;
      user-select: none;
      transition: color 0.2s;
    }

    .data-table thead th.sortable:hover {
      color: var(--accent-cyan);
    }

    .th-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: flex-start;
    }

    th.numeric .th-content {
      justify-content: flex-end;
    }

    .sort-indicator {
      font-size: 0.9rem;
      color: var(--accent-cyan);
    }

    .data-table tbody tr {
      border-bottom: 1px solid var(--terminal-border);
      transition: background 0.2s;
    }

    .data-table tbody tr.summary-row {
      cursor: pointer;
      user-select: none;
    }

    .data-table tbody tr.summary-row:hover {
      background: var(--terminal-surface-hover);
    }

    .data-table tbody tr.summary-row.expanded {
      background: var(--terminal-surface-hover);
    }

    .data-table tbody tr:last-child {
      border-bottom: none;
    }

    .data-table tbody tr.detail-row {
      background: var(--terminal-bg);
      border-bottom: 1px solid var(--terminal-border);
    }

    .data-table tbody tr.detail-row:hover {
      background: var(--terminal-bg);
    }

    .data-table tbody td {
      padding: 1rem 1.25rem;
      color: var(--text-secondary);
    }

    .data-table tbody td.numeric {
      text-align: right;
      font-weight: 500;
    }

    .data-table tbody td.period-cell {
      color: var(--text-primary);
      font-weight: 500;
    }

    .period-cell-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .expand-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      flex-shrink: 0;
      color: var(--accent-cyan);
      font-size: 0.7rem;
      transition: transform 0.2s ease;
    }

    tr.summary-row:hover .expand-icon {
      color: var(--accent-cyan);
      transform: scale(1.1);
    }

    .data-table tfoot td.period-cell {
      font-weight: 700;
    }

    .data-table tbody td.revenue-cell {
      color: var(--accent-green);
    }

    .data-table tbody td.expenses-cell {
      color: var(--accent-red);
    }

    .data-table tbody td.profit-cell {
      color: var(--accent-cyan);
      font-weight: 600;
    }

    .data-table tbody td.profit-cell.negative {
      color: var(--accent-red);
    }

    .data-table tfoot {
      position: sticky;
      bottom: 0;
      z-index: 10;
      background: var(--terminal-surface);
    }

    .data-table tfoot .totals-row {
      border-top: 2px solid var(--terminal-border);
      background: var(--terminal-surface);
    }

    .data-table tfoot td {
      background: var(--terminal-surface);
    }

    .data-table tfoot td {
      padding: 1rem 1.25rem;
      font-weight: 700;
      font-size: 0.9rem;
    }

    .data-table tfoot td.numeric {
      text-align: right;
    }

    .data-table tfoot .total-label {
      color: var(--text-primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: 0.75rem;
    }

    .data-table tfoot .revenue-cell {
      color: var(--accent-green);
    }

    .data-table tfoot .expenses-cell {
      color: var(--accent-red);
    }

    .data-table tfoot .profit-cell {
      color: var(--accent-cyan);
    }

    .data-table tfoot .profit-cell.negative {
      color: var(--accent-red);
    }

    /* Expandable Detail Styles */
    .detail-cell {
      padding: 0 !important;
    }

    .detail-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 2rem;
      color: var(--text-secondary);
      font-family: var(--font-mono);
      font-size: 0.85rem;
    }

    .detail-loading .loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--terminal-border);
      border-top-color: var(--accent-cyan);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .detail-content {
      padding: 1.5rem;
      background: var(--terminal-surface);
      border-top: 1px solid var(--terminal-border-light);
    }

    .detail-empty {
      text-align: center;
      padding: 2rem;
      color: var(--text-tertiary);
      font-family: var(--font-mono);
      font-size: 0.85rem;
    }

    .transactions-section {
      margin-bottom: 1.5rem;
    }

    .transactions-section:last-child {
      margin-bottom: 0;
    }

    .transactions-section h4 {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: var(--text-tertiary);
      margin: 0 0 1rem 0;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--terminal-border-light);
    }

    .transactions-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .transaction-item {
      display: grid;
      grid-template-columns: 70px 12px 1fr 120px 100px 100px;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--terminal-bg);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-md);
      transition: all 0.2s;
      font-family: var(--font-mono);
      font-size: 0.8rem;
    }

    .transaction-item:hover {
      border-color: var(--accent-cyan);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .txn-date {
      color: var(--text-tertiary);
      font-size: 0.75rem;
      white-space: nowrap;
    }

    .category-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .txn-description {
      color: var(--text-primary);
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .txn-category {
      color: var(--text-secondary);
      font-size: 0.75rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .txn-member {
      color: var(--text-tertiary);
      font-size: 0.75rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .txn-amount {
      text-align: right;
      font-weight: 600;
      white-space: nowrap;
    }

    .txn-amount.expense {
      color: var(--accent-red);
    }

    .txn-amount.income {
      color: var(--accent-green);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .analytics-container {
        padding: 0 0.875rem;
      }

      .header-content {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
        padding-bottom: 1rem;
      }

      .page-title {
        font-size: 1.5rem;
      }

      .kpi-grid {
        grid-template-columns: 1fr;
        gap: 0.875rem;
        margin-bottom: 1.5rem;
      }

      .kpi-card {
        padding: 1rem;
      }

      .kpi-value {
        font-size: 1.5rem;
      }

      .charts-grid {
        grid-template-columns: 1fr;
        gap: 1.25rem;
      }

      .chart-card {
        padding: 1.25rem;
      }

      .balances-grid {
        grid-template-columns: 1fr;
        gap: 0.875rem;
      }

      .balance-card {
        padding: 1rem;
      }

      .table-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .table-header > div:first-child {
        min-width: unset;
      }

      .table-section .section-title {
        font-size: 1.1rem;
      }

      .table-section .section-subtitle {
        font-size: 0.75rem;
        margin-top: 0.125rem;
      }

      .table-card {
        border-radius: var(--radius-lg);
        overflow: hidden;
      }

      .table-wrapper {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .balance-summary {
        flex-direction: column;
      }

      .category-row {
        grid-template-columns: 80px 1fr 80px;
        gap: 0.5rem;
      }

      .table-header {
        flex-direction: column;
        gap: 1rem;
      }

      .table-controls {
        width: 100%;
        flex-direction: column;
      }

      .groupby-select,
      .export-button {
        width: 100%;
        justify-content: center;
      }

      .table-wrapper {
        overflow-x: auto;
      }

      .data-table {
        min-width: 600px;
      }

      .data-table thead th,
      .data-table tbody td,
      .data-table tfoot td {
        padding: 0.75rem 1rem;
        font-size: 0.8rem;
      }

      .transaction-item {
        grid-template-columns: 60px 10px 1fr 80px;
        gap: 0.5rem;
        padding: 0.625rem;
        font-size: 0.75rem;
      }

      .txn-member {
        display: none;
      }

      .txn-category {
        display: none;
      }

      .detail-content {
        padding: 1rem;
      }

      .transactions-section h4 {
        font-size: 0.65rem;
      }
    }

    @media (max-width: 640px) {
      .data-table {
        min-width: 600px;
        font-size: 0.85rem;
      }

      .data-table thead th,
      .data-table tbody td,
      .data-table tfoot td {
        padding: 0.625rem 0.75rem;
        font-size: 0.8rem;
        white-space: nowrap;
      }

      .expand-icon {
        font-size: 0.65rem;
        width: 14px;
      }

      .period-cell-content {
        gap: 0.375rem;
      }

      .detail-content {
        padding: 0.875rem;
      }

      .transactions-section h4 {
        font-size: 0.7rem;
        margin-bottom: 0.75rem;
      }

      .transaction-item {
        grid-template-columns: 55px 10px 1fr 100px 90px;
        gap: 0.5rem;
        padding: 0.625rem;
        font-size: 0.75rem;
      }

      .txn-member {
        display: none;
      }
    }

    @media (max-width: 480px) {
      .analytics-container {
        padding: 0 0.5rem;
      }

      .header-content {
        padding-bottom: 0.875rem;
      }

      .page-title {
        font-size: 1.25rem;
      }

      .kpi-grid {
        gap: 0.625rem;
        margin-bottom: 1rem;
      }

      .kpi-card {
        padding: 0.75rem;
      }

      .kpi-label {
        font-size: 0.65rem;
      }

      .kpi-value {
        font-size: 1.25rem;
      }

      .kpi-icon {
        width: 28px;
        height: 28px;
      }

      .chart-card,
      .balance-card {
        padding: 0.75rem;
      }

      .chart-title,
      .section-title {
        font-size: 0.9rem;
      }

      .charts-grid,
      .balances-grid {
        gap: 1rem;
      }

      .table-section {
        margin: 0 -0.5rem;
        padding: 0 0.5rem;
      }

      .table-section .section-title {
        font-size: 1rem;
      }

      .table-section .section-subtitle {
        font-size: 0.7rem;
      }

      .table-controls {
        gap: 0.5rem;
      }

      .table-controls .groupby-select,
      .table-controls .export-button {
        padding: 0.5rem 0.875rem;
        font-size: 0.85rem;
      }

      .export-button svg {
        width: 16px;
        height: 16px;
      }

      .data-table {
        min-width: 520px;
        font-size: 0.8rem;
      }

      .data-table thead th,
      .data-table tbody td,
      .data-table tfoot td {
        padding: 0.5rem 0.625rem;
        font-size: 0.75rem;
      }

      .detail-content {
        padding: 0.625rem;
      }

      .transactions-section h4 {
        font-size: 0.65rem;
        margin-bottom: 0.625rem;
      }

      .transaction-item {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        padding: 0.5rem;
      }

      .txn-date {
        font-size: 0.7rem;
        color: var(--text-tertiary);
        order: 1;
      }

      .txn-description {
        font-size: 0.85rem;
        font-weight: 500;
        order: 2;
        display: flex;
        align-items: center;
        gap: 0.375rem;
      }

      .category-dot {
        order: 2;
        margin-right: 0.25rem;
      }

      .txn-category {
        font-size: 0.7rem;
        order: 3;
      }

      .txn-amount {
        font-size: 0.9rem;
        font-weight: 600;
        order: 2;
        margin-left: auto;
      }

      .txn-member {
        display: none;
      }
    }
  `]
})
export class BusinessAnalyticsComponent implements OnInit {
  private businessService = inject(BusinessService);
  private businessContext = inject(BusinessContextService);

  analytics = signal<BusinessAnalytics | null>(null);
  ledgerSummary = signal<any>(null);
  loading = signal(true);
  selectedPeriod = 'month';

  // Table state
  tableGroupBy = signal<'week' | 'month' | 'year'>('month');
  tableData = signal<TimeSeriesDataPoint[]>([]);
  tableLoading = signal(false);
  sortColumn = signal<'period' | 'revenue' | 'expenses' | 'netProfit'>('period');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Expandable row state
  expandedPeriods = signal<Set<string>>(new Set());
  expandedTransactions = signal<Map<string, { expenses: BusinessExpense[]; incomes: BusinessIncome[] }>>(new Map());
  expandedLoading = signal(false);

  // Use context
  business = this.businessContext.business;
  businessId = this.businessContext.businessId;
  currency = this.businessContext.currency;

  // Computed signals for table
  sortedTableData = computed(() => {
    const data = [...this.tableData()];
    const column = this.sortColumn();
    const direction = this.sortDirection();

    data.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (column) {
        case 'period':
          aVal = new Date(a.date).getTime();
          bVal = new Date(b.date).getTime();
          break;
        case 'revenue':
          aVal = parseDecimal(a.revenue);
          bVal = parseDecimal(b.revenue);
          break;
        case 'expenses':
          aVal = parseDecimal(a.expenses);
          bVal = parseDecimal(b.expenses);
          break;
        case 'netProfit':
          aVal = parseDecimal(a.revenue) - parseDecimal(a.expenses);
          bVal = parseDecimal(b.revenue) - parseDecimal(b.expenses);
          break;
      }

      return direction === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return data;
  });

  tableTotals = computed(() => {
    const data = this.tableData();
    let totalRevenue = 0;
    let totalExpenses = 0;

    data.forEach(point => {
      totalRevenue += parseDecimal(point.revenue);
      totalExpenses += parseDecimal(point.expenses);
    });

    return {
      revenue: totalRevenue.toFixed(2),
      expenses: totalExpenses.toFixed(2),
      netProfit: (totalRevenue - totalExpenses).toFixed(2)
    };
  });

  ngOnInit() {
    const id = this.businessId();
    if (id) {
      this.loadAnalytics();
      this.loadLedger();
      this.loadTableData();
    }
  }

  loadAnalytics() {
    this.loading.set(true);
    this.businessService.getAnalytics(this.businessId(), {
      period: this.selectedPeriod as any
    }).subscribe({
      next: (analytics) => {
        this.analytics.set(analytics);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load analytics:', err);
        this.loading.set(false);
      }
    });
  }

  loadLedger() {
    this.businessService.getLedger(this.businessId()).subscribe({
      next: (ledger) => this.ledgerSummary.set(ledger),
      error: (err) => console.error('Failed to load ledger:', err)
    });
  }

  formatAmount(value: string | number): string {
    return formatCurrency(value, this.currency());
  }

  parseDecimal(value: string | number): number {
    return parseDecimal(value);
  }

  isNegative(value: string | number): boolean {
    return parseDecimal(value) < 0;
  }

  getProfitMargin(): string {
    const analytics = this.analytics();
    if (!analytics) return '0';
    const revenue = parseDecimal(analytics.kpis.totalRevenue);
    const profit = parseDecimal(analytics.kpis.netProfit);
    if (revenue === 0) return '0';
    return ((profit / revenue) * 100).toFixed(1);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getBarHeight(value: string | number, type: 'revenue' | 'expense'): number {
    const analytics = this.analytics();
    if (!analytics || !analytics.timeSeries.length) return 0;

    const maxValue = Math.max(
      ...analytics.timeSeries.map(p => Math.max(
        parseDecimal(p.revenue),
        parseDecimal(p.expenses)
      ))
    );

    if (maxValue === 0) return 0;
    return (parseDecimal(value) / maxValue) * 100;
  }

  formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Table methods
  loadTableData() {
    this.tableLoading.set(true);
    const groupBy = this.tableGroupBy();

    // If year grouping, fetch monthly data and aggregate on frontend
    const apiGroupBy = groupBy === 'year' ? 'month' : groupBy;

    this.businessService.getAnalytics(this.businessId(), {
      period: this.selectedPeriod as any,
      groupBy: apiGroupBy as any
    }).subscribe({
      next: (analytics) => {
        let data = analytics.timeSeries || [];

        // If year grouping, aggregate months into years
        if (groupBy === 'year') {
          data = this.aggregateByYear(data);
        }

        this.tableData.set(data);
        this.tableLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load table data:', err);
        this.tableLoading.set(false);
      }
    });
  }

  aggregateByYear(data: TimeSeriesDataPoint[]): TimeSeriesDataPoint[] {
    const yearMap = new Map<string, { revenue: number; expenses: number }>();

    data.forEach(point => {
      const year = new Date(point.date).getFullYear().toString();
      const existing = yearMap.get(year) || { revenue: 0, expenses: 0 };

      existing.revenue += parseDecimal(point.revenue);
      existing.expenses += parseDecimal(point.expenses);

      yearMap.set(year, existing);
    });

    return Array.from(yearMap.entries()).map(([year, values]) => ({
      date: `${year}-01-01`,
      revenue: values.revenue.toFixed(2),
      expenses: values.expenses.toFixed(2),
      netProfit: (values.revenue - values.expenses).toFixed(2)
    }));
  }

  onTableGroupByChange(groupBy: 'week' | 'month' | 'year') {
    this.tableGroupBy.set(groupBy);
    // Reset expansion state when changing grouping
    this.expandedPeriods.set(new Set());
    this.expandedTransactions.set(new Map());
    this.loadTableData();
  }

  // Expandable row methods
  toggleRowExpansion(date: string) {
    const periods = this.expandedPeriods();
    const newPeriods = new Set(periods);

    if (newPeriods.has(date)) {
      // Collapse if already expanded
      newPeriods.delete(date);
    } else {
      // Expand and load data if not cached
      newPeriods.add(date);

      const cached = this.expandedTransactions().get(date);
      if (!cached) {
        this.loadTransactionsForPeriod(date);
      }
    }

    this.expandedPeriods.set(newPeriods);
  }

  isRowExpanded(date: string): boolean {
    return this.expandedPeriods().has(date);
  }

  getPeriodDateRange(date: string, groupBy: 'week' | 'month' | 'year'): { startDate: string; endDate: string } {
    const d = new Date(date);

    if (groupBy === 'week') {
      // Week: date is Sunday, add 6 days
      const start = new Date(d);
      const end = new Date(d);
      end.setDate(end.getDate() + 6);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      };
    } else if (groupBy === 'month') {
      // Month: first day to last day
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      };
    } else {
      // Year: Jan 1 to Dec 31
      return {
        startDate: `${d.getFullYear()}-01-01`,
        endDate: `${d.getFullYear()}-12-31`
      };
    }
  }

  loadTransactionsForPeriod(date: string) {
    const { startDate, endDate } = this.getPeriodDateRange(date, this.tableGroupBy());
    this.expandedLoading.set(true);

    forkJoin({
      expenses: this.businessService.getExpenses(this.businessId(), {
        startDate,
        endDate,
        limit: 1000,
        sortBy: 'transactionDate',
        sortOrder: 'desc'
      }),
      incomes: this.businessService.getIncomes(this.businessId(), {
        startDate,
        endDate,
        limit: 1000,
        sortBy: 'transactionDate',
        sortOrder: 'desc'
      })
    }).subscribe({
      next: (result) => {
        const current = this.expandedTransactions();
        const newMap = new Map(current);
        newMap.set(date, {
          expenses: result.expenses.expenses,
          incomes: result.incomes.incomes
        });
        this.expandedTransactions.set(newMap);
        this.expandedLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load transactions:', err);
        this.expandedLoading.set(false);
      }
    });
  }

  getExpandedData(date: string): { expenses: BusinessExpense[]; incomes: BusinessIncome[] } | undefined {
    return this.expandedTransactions().get(date);
  }

  formatTransactionDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  sortBy(column: 'period' | 'revenue' | 'expenses' | 'netProfit') {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('desc');
    }
  }

  formatPeriodLabel(dateStr: string, groupBy: 'week' | 'month' | 'year'): string {
    const date = new Date(dateStr);

    switch (groupBy) {
      case 'week': {
        const weekEnd = new Date(date);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const startStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `${startStr} - ${endStr}`;
      }
      case 'month':
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      case 'year':
        return date.getFullYear().toString();
      default:
        return dateStr;
    }
  }

  exportTableData() {
    const data = this.sortedTableData();
    const totals = this.tableTotals();
    const groupBy = this.tableGroupBy();

    // Build CSV
    let csv = 'Period,Revenue,Expenses,Net Profit\n';

    data.forEach(point => {
      const period = this.formatPeriodLabel(point.date, groupBy);
      const revenue = this.formatAmount(point.revenue);
      const expenses = this.formatAmount(point.expenses);
      const netProfit = this.formatAmount(
        (parseDecimal(point.revenue) - parseDecimal(point.expenses)).toFixed(2)
      );

      csv += `"${period}",${revenue},${expenses},${netProfit}\n`;
    });

    // Add totals row
    csv += `TOTAL,${this.formatAmount(totals.revenue)},${this.formatAmount(totals.expenses)},${this.formatAmount(totals.netProfit)}\n`;

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const filename = `analytics-${groupBy}-${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
