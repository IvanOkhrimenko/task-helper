import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BusinessService } from '../business.service';
import { BusinessContextService } from '../business-context.service';
import { Business, BusinessRole, getRoleDisplayName } from '../business.models';

@Component({
  selector: 'app-business-view',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, TranslateModule],
  template: `
    <div class="business-view">
      @if (loading()) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>{{ 'common.loading' | translate }}</p>
        </div>
      }

      @if (!loading() && business()) {
        <!-- Header -->
        <header class="business-header">
          <div class="header-nav">
            <a [routerLink]="['/business']" class="back-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              <span>{{ 'business.backToList' | translate }}</span>
            </a>
          </div>
          <div class="header-content">
            <div class="header-title-group">
              <h1 class="page-title">{{ business()!.name }}</h1>
              <div class="page-meta">
                <span class="role-badge" [class]="getRoleClass(business()!.role)">
                  {{ getRoleDisplay(business()!.role) }}
                </span>
                <span class="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                  </svg>
                  {{ business()!.currency }}
                </span>
                <span class="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  {{ business()!.timezone }}
                </span>
              </div>
            </div>
          </div>
        </header>

        <!-- Tab Navigation -->
        <nav class="tab-navigation">
          <a class="tab-link" routerLink="overview" routerLinkActive="active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="9"/>
              <rect x="14" y="3" width="7" height="5"/>
              <rect x="14" y="12" width="7" height="9"/>
              <rect x="3" y="16" width="7" height="5"/>
            </svg>
            <span>{{ 'business.tabs.overview' | translate }}</span>
          </a>
          <a class="tab-link" routerLink="transactions" routerLinkActive="active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <span>{{ 'business.tabs.transactions' | translate }}</span>
          </a>
          <a class="tab-link" routerLink="analytics" routerLinkActive="active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 20V10M12 20V4M6 20v-6"/>
            </svg>
            <span>{{ 'business.tabs.analytics' | translate }}</span>
          </a>
          <a class="tab-link" routerLink="members" routerLinkActive="active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <span>{{ 'business.tabs.members' | translate }}</span>
          </a>
          <a class="tab-link" routerLink="settings" routerLinkActive="active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            <span>{{ 'business.tabs.settings' | translate }}</span>
          </a>
        </nav>

        <!-- Tab Content -->
        <main class="tab-content">
          <router-outlet></router-outlet>
        </main>
      }

      @if (!loading() && !business()) {
        <div class="error-state">
          <h2>{{ 'business.detail.notFound' | translate }}</h2>
          <a [routerLink]="['/business']" class="action-btn primary">
            {{ 'business.backToList' | translate }}
          </a>
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

    .business-view {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Loading State */
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

    /* Error State */
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem;
      text-align: center;
    }

    .error-state h2 {
      color: var(--text-secondary);
      margin-bottom: 1.5rem;
    }

    /* Header */
    .business-header {
      margin-bottom: 1.5rem;
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
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--terminal-border);
    }

    .page-title {
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 0.75rem 0;
    }

    .page-meta {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--text-tertiary);
    }

    .meta-item svg {
      width: 14px;
      height: 14px;
    }

    /* Role Badge */
    .role-badge {
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

    /* Tab Navigation */
    .tab-navigation {
      display: flex;
      gap: 0.25rem;
      padding: 0.375rem;
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
      margin-bottom: 1.5rem;
      overflow-x: auto;
    }

    .tab-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      background: transparent;
      border: none;
      border-radius: var(--radius-md);
      font-family: var(--font-mono);
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-secondary);
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .tab-link:hover {
      color: var(--text-primary);
      background: var(--terminal-surface-hover);
    }

    .tab-link.active {
      background: var(--accent-cyan-dim);
      color: var(--accent-cyan);
    }

    .tab-link svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    /* Tab Content */
    .tab-content {
      min-height: 400px;
    }

    /* Action Button */
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
      text-decoration: none;
    }

    .action-btn.primary {
      background: linear-gradient(135deg, var(--accent-cyan) 0%, #00a3cc 100%);
      color: var(--terminal-bg);
      border-color: var(--accent-cyan);
    }

    .action-btn.primary:hover {
      box-shadow: 0 0 20px var(--accent-cyan-dim);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .business-view {
        padding: 1rem;
      }

      .page-title {
        font-size: 1.5rem;
      }

      .tab-navigation {
        padding: 0.25rem;
      }

      .tab-link {
        padding: 0.625rem 1rem;
        font-size: 0.75rem;
      }

      .tab-link span {
        display: none;
      }

      .tab-link svg {
        width: 20px;
        height: 20px;
      }
    }
  `]
})
export class BusinessViewComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private businessService = inject(BusinessService);
  private businessContext = inject(BusinessContextService);

  loading = signal(true);
  business = this.businessContext.business;

  ngOnInit() {
    const businessId = this.route.snapshot.paramMap.get('businessId');
    if (businessId) {
      this.loadBusiness(businessId);
    }

    // Listen for route param changes
    this.route.paramMap.subscribe(params => {
      const id = params.get('businessId');
      if (id && id !== this.businessContext.businessId()) {
        this.loadBusiness(id);
      }
    });
  }

  ngOnDestroy() {
    this.businessContext.clear();
  }

  private loadBusiness(businessId: string) {
    this.loading.set(true);
    this.businessContext.setLoading(true);

    this.businessService.getBusiness(businessId).subscribe({
      next: (business) => {
        this.businessContext.setBusiness(business);
        this.loading.set(false);
        this.businessContext.setLoading(false);
      },
      error: (err) => {
        console.error('Failed to load business:', err);
        this.businessContext.setBusiness(null);
        this.loading.set(false);
        this.businessContext.setLoading(false);
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
}
