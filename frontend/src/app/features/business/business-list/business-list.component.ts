import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BusinessService } from '../business.service';
import { Business, BusinessRole, getRoleDisplayName, formatCurrency } from '../business.models';

@Component({
  selector: 'app-business-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  template: `
    <div class="terminal-container">
      <!-- Header Section -->
      <header class="terminal-header">
        <div class="header-left">
          <div class="terminal-badge">
            <span class="badge-dot"></span>
            <span class="badge-text">{{ 'business.badge.live' | translate }}</span>
          </div>
          <h1 class="terminal-title">{{ 'business.title' | translate }}</h1>
          <span class="terminal-subtitle">// {{ 'business.subtitle' | translate }}</span>
        </div>
        <div class="header-right">
          <button class="action-btn primary" (click)="openCreateModal()">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            <span>{{ 'business.newBusiness' | translate }}</span>
          </button>
        </div>
      </header>

      <!-- Stats Bar -->
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-value">{{ businesses().length }}</span>
          <span class="stat-label">{{ 'business.stats.workspaces' | translate }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ totalTransactions() }}</span>
          <span class="stat-label">{{ 'business.stats.transactions' | translate }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ ownerCount() }}</span>
          <span class="stat-label">{{ 'business.stats.owned' | translate }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item accent">
          <span class="stat-value">{{ memberCount() }}</span>
          <span class="stat-label">{{ 'business.stats.memberOf' | translate }}</span>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-container">
          <div class="loading-grid">
            @for (i of [1,2,3]; track i) {
              <div class="skeleton-card">
                <div class="skeleton-header"></div>
                <div class="skeleton-body">
                  <div class="skeleton-line"></div>
                  <div class="skeleton-line short"></div>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && businesses().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <h2 class="empty-title">{{ 'business.empty.title' | translate }}</h2>
          <p class="empty-text">{{ 'business.empty.description' | translate }}</p>
          <button class="action-btn primary large" (click)="openCreateModal()">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            <span>{{ 'business.empty.createFirst' | translate }}</span>
          </button>
        </div>
      }

      <!-- Business Grid -->
      @if (!loading() && businesses().length > 0) {
        <div class="business-grid">
          @for (business of businesses(); track business.id) {
            <article class="business-card" [class.archived]="business.isArchived">
              <!-- Card Header -->
              <div class="card-header">
                <div class="card-title-row">
                  <h2 class="card-title">{{ business.name }}</h2>
                  <span class="role-badge" [class]="getRoleClass(business.role)">
                    {{ getRoleDisplay(business.role) }}
                  </span>
                </div>
                <div class="card-meta">
                  <span class="meta-item">
                    <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                    {{ business.timezone }}
                  </span>
                  <span class="meta-item">
                    <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                    </svg>
                    {{ business.currency }}
                  </span>
                </div>
              </div>

              <!-- Card Stats -->
              <div class="card-stats">
                <div class="card-stat">
                  <span class="card-stat-value">{{ business._count?.memberships || 0 }}</span>
                  <span class="card-stat-label">{{ 'business.card.members' | translate }}</span>
                </div>
                <div class="card-stat">
                  <span class="card-stat-value expense">{{ business._count?.expenses || 0 }}</span>
                  <span class="card-stat-label">{{ 'business.card.expenses' | translate }}</span>
                </div>
                <div class="card-stat">
                  <span class="card-stat-value income">{{ business._count?.incomes || 0 }}</span>
                  <span class="card-stat-label">{{ 'business.card.income' | translate }}</span>
                </div>
              </div>

              <!-- Card Actions -->
              <div class="card-actions">
                <button class="card-action" (click)="viewAnalytics(business)" [disabled]="!canViewAnalytics(business)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 20V10M12 20V4M6 20v-6"/>
                  </svg>
                  <span>{{ 'business.card.analytics' | translate }}</span>
                </button>
                <button class="card-action" (click)="viewTransactions(business)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                  <span>{{ 'business.card.transactions' | translate }}</span>
                </button>
                <button class="card-action" (click)="manageMembers(business)" [disabled]="!canManageMembers(business)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                  <span>{{ 'business.card.membersAction' | translate }}</span>
                </button>
                <button class="card-action menu" (click)="toggleMenu(business.id, $event)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="1"/>
                    <circle cx="12" cy="5" r="1"/>
                    <circle cx="12" cy="19" r="1"/>
                  </svg>
                </button>
              </div>

              <!-- Hover Gradient -->
              <div class="card-gradient"></div>
            </article>
          }
        </div>
      }

      <!-- Create Modal -->
      @if (showCreateModal()) {
        <div class="modal-overlay" (click)="closeCreateModal()">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">{{ 'business.modal.createTitle' | translate }}</h2>
              <button class="modal-close" (click)="closeCreateModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form class="modal-form" (submit)="createBusiness($event)">
              <div class="form-group">
                <label class="form-label">{{ 'business.modal.nameLabel' | translate }}</label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="newBusinessName"
                  name="name"
                  [placeholder]="'business.modal.namePlaceholder' | translate"
                  required
                  #nameInput
                >
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'business.modal.descriptionLabel' | translate }} <span class="optional">({{ 'common.optional' | translate }})</span></label>
                <textarea
                  class="form-textarea"
                  [(ngModel)]="newBusinessDescription"
                  name="description"
                  [placeholder]="'business.modal.descriptionPlaceholder' | translate"
                  rows="3"
                ></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">{{ 'business.modal.currencyLabel' | translate }}</label>
                  <select class="form-select" [(ngModel)]="newBusinessCurrency" name="currency">
                    <option value="USD">USD - {{ 'business.currencies.usd' | translate }}</option>
                    <option value="EUR">EUR - {{ 'business.currencies.eur' | translate }}</option>
                    <option value="GBP">GBP - {{ 'business.currencies.gbp' | translate }}</option>
                    <option value="PLN">PLN - {{ 'business.currencies.pln' | translate }}</option>
                    <option value="UAH">UAH - {{ 'business.currencies.uah' | translate }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">{{ 'business.modal.timezoneLabel' | translate }}</label>
                  <select class="form-select" [(ngModel)]="newBusinessTimezone" name="timezone">
                    @for (tz of availableTimezones; track tz.value) {
                      <option [value]="tz.value">{{ tz.label }}</option>
                    }
                  </select>
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="action-btn secondary" (click)="closeCreateModal()">{{ 'common.cancel' | translate }}</button>
                <button type="submit" class="action-btn primary" [disabled]="creating()">
                  @if (creating()) {
                    <span class="spinner"></span>
                  }
                  <span>{{ 'business.modal.createButton' | translate }}</span>
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

    .terminal-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Header */
    .terminal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--terminal-border);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .terminal-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.75rem;
      background: var(--accent-green-dim);
      border: 1px solid var(--accent-green);
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      color: var(--accent-green);
    }

    .badge-dot {
      width: 6px;
      height: 6px;
      background: var(--accent-green);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .terminal-title {
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .terminal-subtitle {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      color: var(--text-tertiary);
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
      letter-spacing: 0.02em;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .action-btn.primary {
      background: linear-gradient(135deg, var(--accent-cyan) 0%, #00a3cc 100%);
      color: var(--terminal-bg);
      border-color: var(--accent-cyan);
    }

    .action-btn.primary:hover {
      background: linear-gradient(135deg, #00e5ff 0%, var(--accent-cyan) 100%);
      box-shadow: 0 0 20px var(--accent-cyan-dim);
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

    .action-btn.large {
      padding: 0.875rem 1.75rem;
      font-size: 0.875rem;
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-icon {
      width: 16px;
      height: 16px;
    }

    /* Stats Bar */
    .stats-bar {
      display: flex;
      align-items: center;
      gap: 2rem;
      padding: 1.25rem 1.5rem;
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
      margin-bottom: 2rem;
    }

    .stat-item {
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

    .stat-label {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      font-weight: 500;
      letter-spacing: 0.1em;
      color: var(--text-tertiary);
    }

    .stat-item.accent .stat-value {
      color: var(--accent-cyan);
    }

    .stat-divider {
      width: 1px;
      height: 40px;
      background: var(--terminal-border-light);
    }

    /* Loading */
    .loading-container {
      padding: 1rem 0;
    }

    .loading-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 1.5rem;
    }

    .skeleton-card {
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      animation: shimmer 1.5s infinite;
    }

    .skeleton-header {
      height: 24px;
      width: 60%;
      background: var(--terminal-border);
      border-radius: var(--radius-sm);
      margin-bottom: 1rem;
    }

    .skeleton-line {
      height: 14px;
      background: var(--terminal-border);
      border-radius: var(--radius-sm);
      margin-bottom: 0.75rem;
    }

    .skeleton-line.short {
      width: 40%;
    }

    @keyframes shimmer {
      0% { opacity: 1; }
      50% { opacity: 0.6; }
      100% { opacity: 1; }
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

    /* Business Grid */
    .business-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 1.5rem;
    }

    /* Business Card */
    .business-card {
      position: relative;
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .business-card:hover {
      border-color: var(--accent-cyan);
      transform: translateY(-2px);
    }

    .business-card:hover .card-gradient {
      opacity: 1;
    }

    .business-card.archived {
      opacity: 0.6;
    }

    .card-gradient {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--accent-cyan), var(--accent-purple), var(--accent-cyan));
      background-size: 200% 100%;
      animation: gradientFlow 3s linear infinite;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    @keyframes gradientFlow {
      0% { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }

    .card-header {
      margin-bottom: 1.25rem;
    }

    .card-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }

    .card-title {
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .role-badge {
      flex-shrink: 0;
      padding: 0.25rem 0.625rem;
      font-family: var(--font-mono);
      font-size: 0.65rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      border-radius: var(--radius-sm);
      text-transform: uppercase;
    }

    .role-badge.owner {
      background: var(--accent-amber-dim);
      color: var(--accent-amber);
      border: 1px solid var(--accent-amber);
    }

    .role-badge.co-owner {
      background: var(--accent-purple-dim);
      color: var(--accent-purple);
      border: 1px solid var(--accent-purple);
    }

    .role-badge.admin {
      background: var(--accent-cyan-dim);
      color: var(--accent-cyan);
      border: 1px solid var(--accent-cyan);
    }

    .role-badge.accountant {
      background: var(--accent-green-dim);
      color: var(--accent-green);
      border: 1px solid var(--accent-green);
    }

    .role-badge.employee {
      background: rgba(139, 148, 158, 0.15);
      color: var(--text-secondary);
      border: 1px solid var(--text-tertiary);
    }

    .card-meta {
      display: flex;
      gap: 1rem;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .meta-icon {
      width: 14px;
      height: 14px;
    }

    /* Card Stats */
    .card-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      padding: 1rem 0;
      border-top: 1px solid var(--terminal-border);
      border-bottom: 1px solid var(--terminal-border);
      margin-bottom: 1rem;
    }

    .card-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }

    .card-stat-value {
      font-family: var(--font-mono);
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .card-stat-value.expense {
      color: var(--accent-red);
    }

    .card-stat-value.income {
      color: var(--accent-green);
    }

    .card-stat-label {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      letter-spacing: 0.05em;
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    /* Card Actions */
    .card-actions {
      display: flex;
      gap: 0.5rem;
    }

    .card-action {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.375rem;
      padding: 0.625rem 0.5rem;
      background: transparent;
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-md);
      font-family: var(--font-mono);
      font-size: 0.65rem;
      letter-spacing: 0.02em;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .card-action:hover:not(:disabled) {
      background: var(--terminal-surface-hover);
      border-color: var(--accent-cyan);
      color: var(--accent-cyan);
    }

    .card-action:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .card-action.menu {
      flex: 0 0 auto;
      padding: 0.625rem;
    }

    .card-action svg {
      width: 18px;
      height: 18px;
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
      min-height: 80px;
    }

    .form-select {
      cursor: pointer;
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

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .business-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 767px) {
      .terminal-container {
        padding: var(--space-md);
        min-height: auto;
      }

      .terminal-header {
        flex-direction: column;
        align-items: stretch;
        gap: var(--space-md);
        padding-bottom: var(--space-md);
      }

      .header-left {
        flex-wrap: wrap;
        gap: var(--space-sm);
      }

      .terminal-title {
        font-size: 1.125rem;
      }

      .terminal-subtitle {
        display: none;
      }

      .header-actions {
        width: 100%;
      }

      .btn-new {
        width: 100%;
        justify-content: center;
        padding: var(--space-md);
      }

      .stats-bar {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--space-sm);
        padding: var(--space-md);
      }

      .stat-divider {
        display: none;
      }

      .stat-item {
        flex-direction: column;
        align-items: flex-start;
        padding: var(--space-sm);
        background: var(--terminal-surface-hover);
        border-radius: var(--radius-sm);
      }

      .stat-value {
        font-size: 1.25rem;
      }

      .stat-label {
        font-size: 0.6875rem;
      }

      .business-grid {
        grid-template-columns: 1fr;
        gap: var(--space-md);
        padding: var(--space-md);
      }

      .loading-grid {
        grid-template-columns: 1fr;
      }

      .business-card {
        padding: var(--space-md);
      }

      .card-header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-sm);
      }

      .card-actions {
        width: 100%;
        flex-wrap: wrap;
      }

      .card-action {
        flex: 1 1 calc(33% - 0.5rem);
        min-width: 0;
        padding: var(--space-sm);
      }

      .card-action.menu {
        flex: 0 0 auto;
      }

      /* Modal Mobile */
      .modal-overlay {
        align-items: flex-end;
        padding: 0;
      }

      .modal-container {
        max-width: 100%;
        max-height: 90vh;
        border-radius: var(--radius-xl) var(--radius-xl) 0 0;
        animation: slideUpSheet 0.3s ease;
      }

      @keyframes slideUpSheet {
        from {
          transform: translateY(100%);
        }
        to {
          transform: translateY(0);
        }
      }

      .modal-header {
        padding: var(--space-lg) var(--space-md);
      }

      .modal-body {
        padding: var(--space-md);
        max-height: 60vh;
        overflow-y: auto;
      }

      .modal-footer {
        padding: var(--space-md);
        flex-direction: column;
        gap: var(--space-sm);
      }

      .modal-footer button {
        width: 100%;
        justify-content: center;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .form-group input,
      .form-group select,
      .form-group textarea {
        font-size: 16px; /* Prevent zoom on iOS */
      }

      .empty-state {
        padding: var(--space-xl) var(--space-md);
      }

      .empty-icon {
        width: 48px;
        height: 48px;
      }

      .empty-title {
        font-size: 1rem;
      }

      .empty-description {
        font-size: 0.8125rem;
      }
    }

    @media (max-width: 374px) {
      .card-actions {
        flex-direction: column;
      }

      .card-action {
        flex: 1;
        width: 100%;
      }

      .stats-bar {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BusinessListComponent implements OnInit {
  private businessService = inject(BusinessService);
  private router = inject(Router);

  businesses = signal<Business[]>([]);
  loading = signal(true);
  showCreateModal = signal(false);
  creating = signal(false);

  // Form state
  newBusinessName = '';
  newBusinessDescription = '';
  newBusinessCurrency = 'USD';
  newBusinessTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Timezone options with browser timezone included
  availableTimezones = this.buildTimezoneOptions();

  private buildTimezoneOptions(): { value: string; label: string }[] {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const defaultTimezones = [
      { value: 'UTC', label: 'UTC' },
      { value: 'America/New_York', label: 'America/New_York (Eastern)' },
      { value: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific)' },
      { value: 'Europe/London', label: 'Europe/London' },
      { value: 'Europe/Warsaw', label: 'Europe/Warsaw' },
      { value: 'Europe/Kyiv', label: 'Europe/Kyiv' },
    ];

    const hasBrowserTz = defaultTimezones.some(tz => tz.value === browserTz);
    if (!hasBrowserTz) {
      return [{ value: browserTz, label: `${browserTz} (${this.getTimezoneDisplayName()})` }, ...defaultTimezones];
    }
    return defaultTimezones;
  }

  private getTimezoneDisplayName(): string {
    try {
      const formatter = new Intl.DateTimeFormat('en', { timeZoneName: 'short' });
      const parts = formatter.formatToParts(new Date());
      const tzPart = parts.find(p => p.type === 'timeZoneName');
      return tzPart?.value || 'Local';
    } catch {
      return 'Local';
    }
  }

  // Computed stats
  totalTransactions = computed(() =>
    this.businesses().reduce((sum, b) =>
      sum + (b._count?.expenses || 0) + (b._count?.incomes || 0), 0)
  );

  ownerCount = computed(() =>
    this.businesses().filter(b =>
      b.role === BusinessRole.OWNER || b.role === BusinessRole.CO_OWNER
    ).length
  );

  memberCount = computed(() =>
    this.businesses().filter(b =>
      b.role !== BusinessRole.OWNER && b.role !== BusinessRole.CO_OWNER
    ).length
  );

  ngOnInit() {
    this.loadBusinesses();
  }

  loadBusinesses() {
    this.loading.set(true);
    this.businessService.getMyBusinesses().subscribe({
      next: (businesses) => {
        this.businesses.set(businesses);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load businesses:', err);
        this.loading.set(false);
      }
    });
  }

  getRoleDisplay(role?: BusinessRole): string {
    return role ? getRoleDisplayName(role) : '';
  }

  getRoleClass(role?: BusinessRole): string {
    if (!role) return '';
    const classes: Record<BusinessRole, string> = {
      [BusinessRole.OWNER]: 'owner',
      [BusinessRole.CO_OWNER]: 'co-owner',
      [BusinessRole.ADMIN]: 'admin',
      [BusinessRole.ACCOUNTANT]: 'accountant',
      [BusinessRole.EMPLOYEE]: 'employee',
    };
    return classes[role];
  }

  canViewAnalytics(business: Business): boolean {
    return business.permissions?.canViewFullAnalytics ||
           business.permissions?.canViewOwnAnalytics || false;
  }

  canManageMembers(business: Business): boolean {
    return business.permissions?.canInviteMembers ||
           business.permissions?.canRemoveMembers || false;
  }

  viewAnalytics(business: Business) {
    this.router.navigate(['/business', business.id, 'analytics']);
  }

  viewTransactions(business: Business) {
    this.router.navigate(['/business', business.id, 'transactions']);
  }

  manageMembers(business: Business) {
    this.router.navigate(['/business', business.id, 'members']);
  }

  toggleMenu(businessId: string, event: Event) {
    event.stopPropagation();
    // TODO: Implement dropdown menu
  }

  openCreateModal() {
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
    this.newBusinessName = '';
    this.newBusinessDescription = '';
    this.newBusinessCurrency = 'USD';
    this.newBusinessTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  createBusiness(event: Event) {
    event.preventDefault();
    if (!this.newBusinessName.trim() || this.creating()) return;

    this.creating.set(true);
    this.businessService.createBusiness({
      name: this.newBusinessName.trim(),
      description: this.newBusinessDescription.trim() || undefined,
      currency: this.newBusinessCurrency,
      timezone: this.newBusinessTimezone,
    }).subscribe({
      next: (business) => {
        this.businesses.update(list => [business, ...list]);
        this.closeCreateModal();
        this.creating.set(false);
      },
      error: (err) => {
        console.error('Failed to create business:', err);
        this.creating.set(false);
      }
    });
  }
}
