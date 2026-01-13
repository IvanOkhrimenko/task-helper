import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BusinessService } from '../business.service';
import { BusinessContextService } from '../business-context.service';
import {
  Business,
  BusinessAnalytics,
  BusinessKPIs,
  CategoryBreakdown,
  TimeSeriesDataPoint,
  MemberBalance,
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

    /* Responsive */
    @media (max-width: 1200px) {
      .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .balances-grid {
        grid-template-columns: 1fr;
      }

      .balance-summary {
        flex-direction: row;
      }

      .summary-card {
        flex: 1;
      }
    }

    @media (max-width: 768px) {
      .analytics-container {
        padding: 1rem;
      }

      .header-content {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .kpi-grid {
        grid-template-columns: 1fr;
      }

      .charts-grid {
        grid-template-columns: 1fr;
      }

      .balance-summary {
        flex-direction: column;
      }

      .category-row {
        grid-template-columns: 80px 1fr 80px;
        gap: 0.5rem;
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

  // Use context
  business = this.businessContext.business;
  businessId = this.businessContext.businessId;
  currency = this.businessContext.currency;

  ngOnInit() {
    const id = this.businessId();
    if (id) {
      this.loadAnalytics();
      this.loadLedger();
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
}
