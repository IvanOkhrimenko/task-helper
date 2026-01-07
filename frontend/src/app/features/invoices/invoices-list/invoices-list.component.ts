import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InvoiceService, InvoiceFilters } from '../../../core/services/invoice.service';
import { Invoice } from '../../../core/services/task.service';
import { ToastComponent } from '../../../shared/components/toast/toast.component';

type StatusFilter = 'ALL' | 'DRAFT' | 'SENT' | 'PAID';

interface TaskOption {
  id: string;
  name: string;
  clientName: string;
}

@Component({
  selector: 'app-invoices-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ToastComponent],
  template: `
    <app-toast />
    <div class="invoices-page">
      <div class="container">
        <!-- Header -->
        <header class="page-header">
          <div class="header-content">
            <div class="header-title">
              <h1>Invoices</h1>
              <p class="header-subtitle">Manage and track all your generated invoices</p>
            </div>
          </div>
        </header>

        @if (isLoading()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading invoices...</p>
          </div>
        } @else {
          <!-- Stats Row -->
          <div class="stats-row">
            <div class="stat-card stat-card--total">
              <div class="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div class="stat-content">
                <span class="stat-value">{{ invoices().length }}</span>
                <span class="stat-label">Total Invoices</span>
              </div>
            </div>

            <div class="stat-card stat-card--paid">
              <div class="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div class="stat-content">
                <span class="stat-value">{{ paidCount() }}</span>
                <span class="stat-label">Paid</span>
              </div>
            </div>

            <div class="stat-card stat-card--sent">
              <div class="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </div>
              <div class="stat-content">
                <span class="stat-value">{{ sentCount() }}</span>
                <span class="stat-label">Sent</span>
              </div>
            </div>

            <div class="stat-card stat-card--draft">
              <div class="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </div>
              <div class="stat-content">
                <span class="stat-value">{{ draftCount() }}</span>
                <span class="stat-label">Draft</span>
              </div>
            </div>
          </div>

          <!-- Filter Tabs -->
          <div class="filter-section">
            <div class="filter-row">
              <div class="filter-tabs">
                <button
                  class="filter-tab"
                  [class.filter-tab--active]="activeFilter() === 'ALL'"
                  (click)="setFilter('ALL')"
                >
                  All
                  <span class="filter-count">{{ invoices().length }}</span>
                </button>
                <button
                  class="filter-tab"
                  [class.filter-tab--active]="activeFilter() === 'DRAFT'"
                  (click)="setFilter('DRAFT')"
                >
                  Draft
                  <span class="filter-count filter-count--draft">{{ draftCount() }}</span>
                </button>
                <button
                  class="filter-tab"
                  [class.filter-tab--active]="activeFilter() === 'SENT'"
                  (click)="setFilter('SENT')"
                >
                  Sent
                  <span class="filter-count filter-count--sent">{{ sentCount() }}</span>
                </button>
                <button
                  class="filter-tab"
                  [class.filter-tab--active]="activeFilter() === 'PAID'"
                  (click)="setFilter('PAID')"
                >
                  Paid
                  <span class="filter-count filter-count--paid">{{ paidCount() }}</span>
                </button>
              </div>

              <div class="filter-actions">
                <label class="archive-toggle" [class.archive-toggle--active]="showArchived()">
                  <input
                    type="checkbox"
                    [checked]="showArchived()"
                    (change)="toggleShowArchived()"
                  />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="21 8 21 21 3 21 3 8"/>
                    <rect x="1" y="3" width="22" height="5"/>
                    <line x1="10" y1="12" x2="14" y2="12"/>
                  </svg>
                  Show Archived
                </label>
                <button
                  class="advanced-toggle"
                  [class.advanced-toggle--active]="showAdvancedFilters()"
                  (click)="toggleAdvancedFilters()"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                  </svg>
                  Filters
                  @if (hasActiveFilters()) {
                    <span class="active-filter-badge">{{ activeFilterCount() }}</span>
                  }
                  <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Advanced Filters Panel -->
            @if (showAdvancedFilters()) {
              <div class="advanced-filters">
                <div class="filter-grid">
                  <!-- Task/Client Filter -->
                  <div class="filter-group">
                    <label class="filter-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      Task / Client
                    </label>
                    <div class="select-wrapper">
                      <select
                        class="filter-select"
                        [ngModel]="selectedTaskId()"
                        (ngModelChange)="onTaskChange($event)"
                      >
                        <option value="">All Tasks</option>
                        @for (task of uniqueTasks(); track task.id) {
                          <option [value]="task.id">{{ task.name }} — {{ task.clientName }}</option>
                        }
                      </select>
                      <svg class="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                  </div>

                  <!-- Date Range Filter -->
                  <div class="filter-group">
                    <label class="filter-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      Date Range
                    </label>
                    <div class="date-range">
                      <div class="date-input-wrapper">
                        <input
                          type="date"
                          class="filter-input"
                          [ngModel]="startDate()"
                          (ngModelChange)="onStartDateChange($event)"
                          placeholder="From"
                        />
                        @if (startDate()) {
                          <button class="clear-date" (click)="clearStartDate()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <line x1="18" y1="6" x2="6" y2="18"/>
                              <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        }
                      </div>
                      <span class="date-separator">to</span>
                      <div class="date-input-wrapper">
                        <input
                          type="date"
                          class="filter-input"
                          [ngModel]="endDate()"
                          (ngModelChange)="onEndDateChange($event)"
                          placeholder="To"
                        />
                        @if (endDate()) {
                          <button class="clear-date" (click)="clearEndDate()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <line x1="18" y1="6" x2="6" y2="18"/>
                              <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Active Filters & Clear -->
                @if (hasActiveFilters()) {
                  <div class="active-filters-row">
                    <div class="active-chips">
                      @if (selectedTaskId()) {
                        <span class="filter-chip">
                          {{ getTaskName(selectedTaskId()) }}
                          <button (click)="clearTaskFilter()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <line x1="18" y1="6" x2="6" y2="18"/>
                              <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </span>
                      }
                      @if (startDate() || endDate()) {
                        <span class="filter-chip">
                          {{ getDateRangeLabel() }}
                          <button (click)="clearDateRange()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <line x1="18" y1="6" x2="6" y2="18"/>
                              <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </span>
                      }
                    </div>
                    <button class="clear-all-btn" (click)="clearAllFilters()">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18"/>
                        <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
                      </svg>
                      Clear All
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Invoices List -->
          @if (filteredInvoices().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <h3>No invoices found</h3>
              <p>
                @if (activeFilter() === 'ALL') {
                  You haven't generated any invoices yet. Go to a task and click "Generate Invoice" to create one.
                } @else {
                  No invoices with status "{{ activeFilter().toLowerCase() }}" found.
                }
              </p>
              <a routerLink="/dashboard" class="btn btn--primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                Go to Dashboard
              </a>
            </div>
          } @else {
            <div class="invoices-grid">
              @for (invoice of filteredInvoices(); track invoice.id; let i = $index) {
                <a [routerLink]="['/invoices', invoice.id]" class="invoice-card" [style.animation-delay]="(i * 0.05) + 's'">
                  <div class="invoice-card__header">
                    <div class="invoice-number">
                      <span class="invoice-number__label">Invoice</span>
                      <span class="invoice-number__value">#{{ invoice.number }}</span>
                    </div>
                    <div class="header-badges">
                      @if (invoice.isArchived) {
                        <span class="archived-badge" title="Archived">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="21 8 21 21 3 21 3 8"/>
                            <rect x="1" y="3" width="22" height="5"/>
                          </svg>
                        </span>
                      }
                      @if (invoice.createdByAI) {
                        <span class="ai-badge" title="Created by AI Assistant">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"/>
                            <path d="M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2"/>
                          </svg>
                          AI
                        </span>
                      }
                      <span class="status-badge" [class]="'status-badge--' + invoice.status.toLowerCase()">
                        <span class="status-badge__dot"></span>
                        {{ getStatusLabel(invoice.status) }}
                      </span>
                    </div>
                  </div>

                  <div class="invoice-card__body">
                    <div class="invoice-detail">
                      <span class="detail-label">Task</span>
                      <span class="detail-value">{{ invoice.task?.name || 'Unknown Task' }}</span>
                    </div>
                    <div class="invoice-detail">
                      <span class="detail-label">Client</span>
                      <span class="detail-value">{{ invoice.task?.client?.name || '—' }}</span>
                    </div>
                    <div class="invoice-detail">
                      <span class="detail-label">Period</span>
                      <span class="detail-value">{{ getMonthName(invoice.invoiceMonth) }} {{ invoice.invoiceYear }}</span>
                    </div>
                  </div>

                  <div class="invoice-card__footer">
                    <div class="invoice-amount">
                      <span class="amount-symbol">{{ getCurrencySymbol(invoice.currency) }}</span>
                      <span class="amount-value">{{ invoice.amount }}</span>
                      <span class="amount-currency">{{ invoice.currency }}</span>
                    </div>
                    <span class="invoice-date">{{ invoice.createdAt | date:'MMM d, yyyy' }}</span>
                  </div>

                  <div class="card-hover-indicator">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </a>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: var(--font-body);
    }

    .invoices-page {
      min-height: 100%;
      background: var(--color-bg);
      padding: var(--space-2xl) 0;
      transition: background-color var(--transition-slow);
    }

    .container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 var(--space-xl);
    }

    /* Header */
    .page-header {
      margin-bottom: var(--space-2xl);
      animation: fadeInDown 0.5s ease backwards;
    }

    @keyframes fadeInDown {
      from {
        opacity: 0;
        transform: translateY(-12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .header-title h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0 0 var(--space-xs);
      letter-spacing: -0.02em;
      transition: color var(--transition-slow);
    }

    .header-subtitle {
      color: var(--color-text-secondary);
      font-size: 0.9375rem;
      margin: 0;
      transition: color var(--transition-slow);
    }

    /* Loading State */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px;
      color: var(--color-text-secondary);
      transition: color var(--transition-slow);

      p {
        margin-top: var(--space-md);
        font-size: 0.9375rem;
      }
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Stats Row */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-lg);
      margin-bottom: var(--space-2xl);
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: var(--space-lg) var(--space-xl);
      box-shadow: var(--shadow-xs);
      border: 1px solid var(--color-border);
      animation: fadeInUp 0.4s ease backwards;
      transition: background-color var(--transition-slow), border-color var(--transition-slow);

      &:nth-child(1) { animation-delay: 0.1s; }
      &:nth-child(2) { animation-delay: 0.15s; }
      &:nth-child(3) { animation-delay: 0.2s; }
      &:nth-child(4) { animation-delay: 0.25s; }
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .stat-icon {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      transition: background-color var(--transition-slow), color var(--transition-slow);

      svg {
        width: 22px;
        height: 22px;
      }
    }

    .stat-card--total .stat-icon {
      background: var(--color-primary-subtle);
      color: var(--color-primary);
    }

    .stat-card--paid .stat-icon {
      background: var(--color-success-subtle);
      color: var(--color-success);
    }

    .stat-card--sent .stat-icon {
      background: var(--color-warning-subtle);
      color: var(--color-warning);
    }

    .stat-card--draft .stat-icon {
      background: var(--color-fill-tertiary);
      color: var(--color-text-secondary);
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text);
      line-height: 1;
      transition: color var(--transition-slow);
    }

    .stat-label {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      margin-top: var(--space-xs);
      transition: color var(--transition-slow);
    }

    /* Filter Section */
    .filter-section {
      margin-bottom: var(--space-xl);
      animation: fadeInUp 0.4s ease backwards;
      animation-delay: 0.3s;
    }

    .filter-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-lg);
      flex-wrap: wrap;
    }

    .filter-actions {
      display: flex;
      align-items: center;
      gap: var(--space-md);
    }

    .archive-toggle {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-lg);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      input {
        display: none;
      }

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover {
        color: var(--color-text);
        border-color: var(--color-text-tertiary);
      }

      &--active {
        color: var(--color-warning);
        border-color: var(--color-warning);
        background: var(--color-warning-subtle);
      }
    }

    .filter-tabs {
      display: inline-flex;
      background: var(--color-fill-quaternary);
      border-radius: var(--radius-md);
      padding: var(--space-xs);
      transition: background-color var(--transition-slow);
    }

    .filter-tab {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-md);
      font-size: 0.8125rem;
      font-weight: 500;
      font-family: inherit;
      color: var(--color-text-secondary);
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover:not(.filter-tab--active) {
        color: var(--color-text);
        background: var(--color-fill-tertiary);
      }

      &--active {
        color: var(--color-primary);
        background: var(--color-surface);
        box-shadow: var(--shadow-xs);
      }
    }

    .filter-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 var(--space-sm);
      font-size: 0.6875rem;
      font-weight: 600;
      border-radius: var(--radius-full);
      background: var(--color-fill-tertiary);
      color: var(--color-text-secondary);
      transition: background-color var(--transition-slow), color var(--transition-slow);
    }

    .filter-tab--active .filter-count {
      background: var(--color-primary-subtle);
      color: var(--color-primary);
    }

    .filter-count--paid { background: var(--color-success-subtle); color: var(--color-success); }
    .filter-count--sent { background: var(--color-warning-subtle); color: var(--color-warning); }
    .filter-count--draft { background: var(--color-fill-tertiary); color: var(--color-text-secondary); }

    .filter-tab--active .filter-count--paid,
    .filter-tab--active .filter-count--sent,
    .filter-tab--active .filter-count--draft {
      background: var(--color-primary-subtle);
      color: var(--color-primary);
    }

    /* Advanced Filters Toggle */
    .advanced-toggle {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-lg);
      font-size: 0.875rem;
      font-weight: 500;
      font-family: inherit;
      color: var(--color-text-secondary);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 16px;
        height: 16px;
      }

      .chevron {
        transition: transform var(--transition-fast);
      }

      &:hover {
        color: var(--color-text);
        border-color: var(--color-text-tertiary);
      }

      &--active {
        color: var(--color-primary);
        border-color: var(--color-primary);
        background: var(--color-primary-subtle);

        .chevron {
          transform: rotate(180deg);
        }
      }
    }

    .active-filter-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 6px;
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--color-primary-text);
      background: var(--color-primary);
      border-radius: var(--radius-full);
    }

    /* Advanced Filters Panel */
    .advanced-filters {
      margin-top: var(--space-lg);
      padding: var(--space-xl);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-xs);
      transition: background-color var(--transition-slow), border-color var(--transition-slow);
    }

    .filter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--space-xl);
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .filter-label {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      transition: color var(--transition-slow);

      svg {
        width: 14px;
        height: 14px;
        opacity: 0.7;
      }
    }

    .select-wrapper {
      position: relative;
    }

    .filter-select {
      width: 100%;
      padding: var(--space-md) var(--space-lg);
      padding-right: var(--space-2xl);
      font-family: var(--font-body);
      font-size: 0.875rem;
      color: var(--color-text);
      background: var(--color-fill-quaternary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      appearance: none;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-primary);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-subtle);
      }
    }

    .select-chevron {
      position: absolute;
      right: var(--space-md);
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: var(--color-text-tertiary);
      pointer-events: none;
      transition: color var(--transition-slow);
    }

    .date-range {
      display: flex;
      align-items: center;
      gap: var(--space-md);
    }

    .date-separator {
      font-size: 0.8125rem;
      color: var(--color-text-tertiary);
      transition: color var(--transition-slow);
    }

    .date-input-wrapper {
      position: relative;
      flex: 1;
    }

    .filter-input {
      width: 100%;
      padding: var(--space-md) var(--space-lg);
      font-family: var(--font-body);
      font-size: 0.875rem;
      color: var(--color-text);
      background: var(--color-fill-quaternary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-primary);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-subtle);
      }
    }

    .clear-date {
      position: absolute;
      right: var(--space-md);
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-tertiary);
      background: var(--color-surface);
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 12px;
        height: 12px;
      }

      &:hover {
        color: var(--color-danger);
        background: var(--color-danger-subtle);
      }
    }

    /* Active Filters Row */
    .active-filters-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: var(--space-lg);
      padding-top: var(--space-lg);
      border-top: 1px solid var(--color-border);
      transition: border-color var(--transition-slow);
    }

    .active-chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
    }

    .filter-chip {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-xs) var(--space-sm) var(--space-xs) var(--space-md);
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-primary);
      background: var(--color-primary-subtle);
      border-radius: var(--radius-full);
      transition: background-color var(--transition-slow), color var(--transition-slow);

      button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        padding: 0;
        color: var(--color-primary);
        background: transparent;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        transition: all var(--transition-fast);

        svg {
          width: 10px;
          height: 10px;
        }

        &:hover {
          background: var(--color-primary);
          color: var(--color-primary-text);
        }
      }
    }

    .clear-all-btn {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-md);
      font-size: 0.8125rem;
      font-weight: 500;
      font-family: inherit;
      color: var(--color-text-secondary);
      background: transparent;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 14px;
        height: 14px;
      }

      &:hover {
        color: var(--color-danger);
        background: var(--color-danger-subtle);
      }
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 80px;
      background: var(--color-surface);
      border-radius: var(--radius-xl);
      border: 2px dashed var(--color-border);
      animation: fadeInUp 0.4s ease backwards;
      animation-delay: 0.35s;
      transition: background-color var(--transition-slow), border-color var(--transition-slow);
    }

    .empty-icon {
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-fill-quaternary);
      border-radius: var(--radius-xl);
      margin-bottom: var(--space-xl);
      transition: background-color var(--transition-slow);

      svg {
        width: 40px;
        height: 40px;
        color: var(--color-text-tertiary);
        transition: color var(--transition-slow);
      }
    }

    .empty-state h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0 0 var(--space-sm);
      transition: color var(--transition-slow);
    }

    .empty-state p {
      color: var(--color-text-secondary);
      font-size: 0.9375rem;
      max-width: 400px;
      margin: 0 0 var(--space-xl);
      line-height: 1.6;
      transition: color var(--transition-slow);
    }

    /* Invoices Grid */
    .invoices-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: var(--space-lg);
    }

    .invoice-card {
      position: relative;
      display: flex;
      flex-direction: column;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: var(--space-xl);
      box-shadow: var(--shadow-xs);
      border: 1px solid var(--color-border);
      text-decoration: none;
      color: inherit;
      transition: all var(--transition-base);
      animation: fadeInUp 0.4s ease backwards;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--color-primary);
        transform: scaleX(0);
        transition: transform var(--transition-base);
      }

      &:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg);
        border-color: var(--color-primary);

        &::before {
          transform: scaleX(1);
        }

        .card-hover-indicator {
          opacity: 1;
          transform: translateX(0);
        }
      }
    }

    .card-hover-indicator {
      position: absolute;
      right: var(--space-lg);
      top: 50%;
      transform: translateX(8px) translateY(-50%);
      opacity: 0;
      transition: all var(--transition-base);
      color: var(--color-primary);

      svg {
        width: 20px;
        height: 20px;
      }
    }

    .invoice-card__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;

      .header-badges {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
      }
    }

    .archived-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: var(--radius-sm);
      background: var(--color-warning-subtle);
      color: var(--color-warning);

      svg {
        width: 14px;
        height: 14px;
      }
    }

    .ai-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      font-size: 0.7rem;
      font-weight: 600;
      border-radius: var(--radius-full);
      background: var(--color-primary);
      color: var(--color-primary-text);

      svg {
        width: 12px;
        height: 12px;
      }
    }

    .invoice-number {
      display: flex;
      flex-direction: column;
    }

    .invoice-number__label {
      font-size: 0.6875rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-tertiary);
      transition: color var(--transition-slow);
    }

    .invoice-number__value {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-primary);
      transition: color var(--transition-slow);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: var(--space-xs) var(--space-md);
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-radius: var(--radius-full);
    }

    .status-badge__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .status-badge--draft {
      color: var(--color-text-secondary);
      background: var(--color-fill-tertiary);
    }

    .status-badge--sent {
      color: var(--color-warning);
      background: var(--color-warning-subtle);
    }

    .status-badge--paid {
      color: var(--color-success);
      background: var(--color-success-subtle);
    }

    .status-badge--cancelled {
      color: var(--color-danger);
      background: var(--color-danger-subtle);
    }

    .invoice-card__body {
      display: grid;
      gap: var(--space-md);
      padding: var(--space-lg) 0;
      border-bottom: 1px solid var(--color-border);
      margin-bottom: var(--space-lg);
      transition: border-color var(--transition-slow);
    }

    .invoice-detail {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .detail-label {
      font-size: 0.8125rem;
      color: var(--color-text-tertiary);
      transition: color var(--transition-slow);
    }

    .detail-value {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
      text-align: right;
      max-width: 60%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      transition: color var(--transition-slow);
    }

    .invoice-card__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .invoice-amount {
      display: flex;
      align-items: baseline;
      gap: 2px;
    }

    .amount-symbol {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      transition: color var(--transition-slow);
    }

    .amount-value {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-primary);
      transition: color var(--transition-slow);
    }

    .amount-currency {
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--color-text-tertiary);
      margin-left: var(--space-xs);
      transition: color var(--transition-slow);
    }

    .invoice-date {
      font-size: 0.8125rem;
      color: var(--color-text-tertiary);
      transition: color var(--transition-slow);
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      padding: var(--space-md) var(--space-xl);
      font-family: var(--font-body);
      font-size: 0.9375rem;
      font-weight: 600;
      text-decoration: none;
      border-radius: var(--radius-md);
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

        &:hover {
          background: var(--color-primary-hover);
        }
      }
    }

    /* Responsive */
    @media (max-width: 900px) {
      .stats-row {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .container {
        padding: 0 var(--space-md);
      }

      .stats-row {
        grid-template-columns: 1fr;
      }

      .filter-row {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-tabs {
        width: 100%;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
      }

      .filter-tab {
        justify-content: center;
        padding: var(--space-sm) var(--space-md);
        font-size: 0.8125rem;
      }

      .invoices-grid {
        grid-template-columns: 1fr;
      }

      .header-title h1 {
        font-size: 1.25rem;
      }
    }
  `]
})
export class InvoicesListComponent implements OnInit {
  private invoiceService = inject(InvoiceService);

  invoices = signal<Invoice[]>([]);
  isLoading = signal(true);
  activeFilter = signal<StatusFilter>('ALL');
  showArchived = signal(false);

  showAdvancedFilters = signal(false);
  selectedTaskId = signal('');
  startDate = signal('');
  endDate = signal('');

  private monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  uniqueTasks = computed(() => {
    const tasksMap = new Map<string, TaskOption>();
    this.invoices().forEach(inv => {
      if (inv.task && inv.taskId) {
        tasksMap.set(inv.taskId, {
          id: inv.taskId,
          name: inv.task.name || 'Unknown',
          clientName: inv.task.client?.name || 'Unknown Client'
        });
      }
    });
    return Array.from(tasksMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  });

  hasActiveFilters = computed(() => {
    return !!(this.selectedTaskId() || this.startDate() || this.endDate());
  });

  activeFilterCount = computed(() => {
    let count = 0;
    if (this.selectedTaskId()) count++;
    if (this.startDate() || this.endDate()) count++;
    return count;
  });

  filteredInvoices = computed(() => {
    const statusFilter = this.activeFilter();
    const taskId = this.selectedTaskId();
    const start = this.startDate();
    const end = this.endDate();
    let result = this.invoices();

    if (statusFilter !== 'ALL') {
      result = result.filter(inv => inv.status === statusFilter);
    }

    if (taskId) {
      result = result.filter(inv => inv.taskId === taskId);
    }

    if (start) {
      const startTime = new Date(start).getTime();
      result = result.filter(inv => new Date(inv.createdAt).getTime() >= startTime);
    }

    if (end) {
      const endTime = new Date(end).getTime() + (24 * 60 * 60 * 1000);
      result = result.filter(inv => new Date(inv.createdAt).getTime() < endTime);
    }

    return result;
  });

  paidCount = computed(() => this.invoices().filter(inv => inv.status === 'PAID').length);
  sentCount = computed(() => this.invoices().filter(inv => inv.status === 'SENT').length);
  draftCount = computed(() => this.invoices().filter(inv => inv.status === 'DRAFT').length);

  ngOnInit() {
    this.loadInvoices();
  }

  loadInvoices() {
    const filters: InvoiceFilters = {
      includeArchived: this.showArchived()
    };

    this.invoiceService.getInvoices(filters).subscribe({
      next: (invoices) => {
        const sorted = invoices.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.invoices.set(sorted);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  toggleShowArchived() {
    this.showArchived.update(v => !v);
    this.isLoading.set(true);
    this.loadInvoices();
  }

  setFilter(filter: StatusFilter) {
    this.activeFilter.set(filter);
  }

  toggleAdvancedFilters() {
    this.showAdvancedFilters.update(v => !v);
  }

  onTaskChange(taskId: string) {
    this.selectedTaskId.set(taskId);
  }

  onStartDateChange(date: string) {
    this.startDate.set(date);
  }

  onEndDateChange(date: string) {
    this.endDate.set(date);
  }

  clearStartDate() {
    this.startDate.set('');
  }

  clearEndDate() {
    this.endDate.set('');
  }

  clearTaskFilter() {
    this.selectedTaskId.set('');
  }

  clearDateRange() {
    this.startDate.set('');
    this.endDate.set('');
  }

  clearAllFilters() {
    this.selectedTaskId.set('');
    this.startDate.set('');
    this.endDate.set('');
  }

  getTaskName(taskId: string): string {
    const task = this.uniqueTasks().find(t => t.id === taskId);
    return task ? task.name : 'Unknown Task';
  }

  getDateRangeLabel(): string {
    const start = this.startDate();
    const end = this.endDate();

    if (start && end) {
      return `${this.formatDateShort(start)} - ${this.formatDateShort(end)}`;
    } else if (start) {
      return `From ${this.formatDateShort(start)}`;
    } else if (end) {
      return `Until ${this.formatDateShort(end)}`;
    }
    return '';
  }

  private formatDateShort(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getMonthName(month?: number): string {
    if (month === undefined || month === null) return '';
    return this.monthNames[month] || '';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'DRAFT': 'Draft',
      'SENT': 'Sent',
      'PAID': 'Paid',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  }

  getCurrencySymbol(currency?: string): string {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'PLN': 'zł',
      'GBP': '£'
    };
    return symbols[currency || 'USD'] || currency + ' ';
  }
}
