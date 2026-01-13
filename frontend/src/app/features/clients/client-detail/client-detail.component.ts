import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ClientService, Client } from '../../../core/services/client.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="client-detail-page">
      @if (isLoading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>{{ 'clients.detail.loading' | translate }}</p>
        </div>
      } @else if (client()) {
        <!-- Header -->
        <header class="page-header">
          <a routerLink="/clients" class="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            {{ 'clients.detail.backToClients' | translate }}
          </a>

          <div class="header-main">
            <div class="client-header-info">
              <div class="client-avatar" [style.background]="getAvatarColor(client()!.name)">
                {{ getInitials(client()!.name) }}
              </div>
              <div class="client-title">
                <h1 class="client-name">{{ client()!.name }}</h1>
                <div class="client-badges">
                  @if (client()!.isArchived) {
                    <span class="badge badge-archived">{{ 'clients.archived' | translate }}</span>
                  }
                  @if (!client()!.isActive) {
                    <span class="badge badge-inactive">{{ 'clients.inactive' | translate }}</span>
                  }
                  @if (client()!.crmIntegration) {
                    <span class="badge badge-crm">CRM: {{ client()!.crmIntegration!.name }}</span>
                  }
                </div>
              </div>
            </div>

            <div class="header-actions">
              <a [routerLink]="['/clients', client()!.id, 'edit']" class="btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                {{ 'clients.detail.editClient' | translate }}
              </a>
              <button class="btn-secondary" (click)="toggleArchive()">
                @if (client()!.isArchived) {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="1 4 1 10 7 10"/>
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                  </svg>
                  {{ 'clients.actions.unarchive' | translate }}
                } @else {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="21 8 21 21 3 21 3 8"/>
                    <rect x="1" y="3" width="22" height="5"/>
                  </svg>
                  {{ 'clients.actions.archive' | translate }}
                }
              </button>
            </div>
          </div>
        </header>

        <!-- Content Grid -->
        <div class="content-grid">
          <!-- Left Column -->
          <div class="main-column">
            <!-- Contact Info -->
            <section class="detail-card">
              <h2 class="card-title">{{ 'clients.detail.contactInfo' | translate }}</h2>
              <div class="info-grid">
                @if (client()!.email) {
                  <div class="info-item">
                    <span class="info-label">{{ 'clients.form.email' | translate }}</span>
                    <span class="info-value">{{ client()!.email }}</span>
                  </div>
                }
                @if (client()!.billingEmail) {
                  <div class="info-item">
                    <span class="info-label">{{ 'clients.form.billingEmail' | translate }}</span>
                    <span class="info-value">{{ client()!.billingEmail }}</span>
                  </div>
                }
                @if (client()!.nip) {
                  <div class="info-item">
                    <span class="info-label">{{ 'clients.form.taxId' | translate }}</span>
                    <span class="info-value">{{ client()!.nip }}</span>
                  </div>
                }
                @if (getFullAddress()) {
                  <div class="info-item full-width">
                    <span class="info-label">{{ 'clients.form.address' | translate }}</span>
                    <span class="info-value">{{ getFullAddress() }}</span>
                  </div>
                }
                @if (client()!.bankAccount) {
                  <div class="info-item full-width">
                    <span class="info-label">{{ 'clients.form.bankAccount' | translate }}</span>
                    <span class="info-value monospace">{{ client()!.bankAccount }}</span>
                  </div>
                }
              </div>
            </section>

            <!-- Invoice Defaults -->
            <section class="detail-card">
              <h2 class="card-title">{{ 'clients.detail.invoiceDefaults' | translate }}</h2>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">{{ 'clients.detail.currency' | translate }}</span>
                  <span class="info-value">{{ client()!.currency }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ 'clients.detail.language' | translate }}</span>
                  <span class="info-value">{{ client()!.defaultLanguage }}</span>
                </div>
                @if (client()!.hourlyRate) {
                  <div class="info-item">
                    <span class="info-label">{{ 'clients.detail.hourlyRate' | translate }}</span>
                    <span class="info-value">{{ client()!.currency }} {{ client()!.hourlyRate }}</span>
                  </div>
                }
                @if (client()!.hoursWorked) {
                  <div class="info-item">
                    <span class="info-label">{{ 'clients.detail.defaultHours' | translate }}</span>
                    <span class="info-value">{{ client()!.hoursWorked }}</span>
                  </div>
                }
                <div class="info-item">
                  <span class="info-label">{{ 'clients.detail.invoiceTemplate' | translate }}</span>
                  <span class="info-value">{{ client()!.invoiceTemplate }}</span>
                </div>
                @if (client()!.defaultServiceName) {
                  <div class="info-item full-width">
                    <span class="info-label">{{ 'clients.detail.defaultService' | translate }}</span>
                    <span class="info-value">{{ client()!.defaultServiceName }}</span>
                  </div>
                }
                @if (client()!.description) {
                  <div class="info-item full-width">
                    <span class="info-label">{{ 'clients.detail.description' | translate }}</span>
                    <span class="info-value">{{ client()!.description }}</span>
                  </div>
                }
              </div>
            </section>

            <!-- Integrations -->
            @if (client()!.crmIntegration || client()!.googleAccount || client()!.bankAccountRef) {
              <section class="detail-card">
                <h2 class="card-title">{{ 'clients.detail.integrations' | translate }}</h2>
                <div class="integrations-list">
                  @if (client()!.crmIntegration) {
                    <div class="integration-item">
                      <div class="integration-icon crm">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                          <path d="M2 17l10 5 10-5"/>
                          <path d="M2 12l10 5 10-5"/>
                        </svg>
                      </div>
                      <div class="integration-info">
                        <span class="integration-name">{{ client()!.crmIntegration!.name }}</span>
                        <span class="integration-detail">{{ 'clients.detail.crmClientId' | translate }}: {{ client()!.crmClientId }}</span>
                      </div>
                      <span class="integration-status" [class.active]="client()!.crmIntegration!.isActive">
                        {{ client()!.crmIntegration!.isActive ? ('clients.active' | translate) : ('clients.inactive' | translate) }}
                      </span>
                    </div>
                  }
                  @if (client()!.googleAccount) {
                    <div class="integration-item">
                      <div class="integration-icon google">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="5" width="18" height="14" rx="2"/>
                          <polyline points="3 7 12 13 21 7"/>
                        </svg>
                      </div>
                      <div class="integration-info">
                        <span class="integration-name">Gmail</span>
                        <span class="integration-detail">{{ client()!.googleAccount!.email }}</span>
                      </div>
                    </div>
                  }
                  @if (client()!.bankAccountRef) {
                    <div class="integration-item">
                      <div class="integration-icon bank">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="2" y="6" width="20" height="12" rx="2"/>
                          <line x1="2" y1="10" x2="22" y2="10"/>
                        </svg>
                      </div>
                      <div class="integration-info">
                        <span class="integration-name">{{ client()!.bankAccountRef!.name }}</span>
                        <span class="integration-detail">{{ client()!.bankAccountRef!.currency }} - {{ client()!.bankAccountRef!.bankName }}</span>
                      </div>
                    </div>
                  }
                </div>
              </section>
            }
          </div>

          <!-- Right Column -->
          <div class="side-column">
            <!-- Tasks -->
            <section class="detail-card">
              <div class="card-header-row">
                <h2 class="card-title">{{ 'clients.detail.tasks' | translate }}</h2>
                <a [routerLink]="['/tasks/new']" [queryParams]="{clientId: client()!.id}" class="card-action">
                  + {{ 'clients.detail.addTask' | translate }}
                </a>
              </div>
              @if (client()!.tasks && client()!.tasks!.length > 0) {
                <ul class="tasks-list">
                  @for (task of client()!.tasks; track task.id) {
                    <li class="task-item">
                      <a [routerLink]="['/tasks', task.id]" class="task-link">
                        <span class="task-name">{{ task.name }}</span>
                        <span class="task-dates">
                          Day {{ task.warningDate }} - {{ task.deadlineDate }}
                        </span>
                      </a>
                      <span class="task-status" [class.active]="task.isActive">
                        {{ task.isActive ? ('clients.active' | translate) : ('clients.inactive' | translate) }}
                      </span>
                    </li>
                  }
                </ul>
              } @else {
                <p class="empty-message">{{ 'clients.detail.noTasks' | translate }}</p>
              }
            </section>

            <!-- Recent Invoices -->
            <section class="detail-card">
              <div class="card-header-row">
                <h2 class="card-title">{{ 'clients.detail.recentInvoices' | translate }}</h2>
                <a routerLink="/invoices" class="card-action">{{ 'clients.detail.viewAll' | translate }}</a>
              </div>
              @if (client()!.invoices && client()!.invoices!.length > 0) {
                <ul class="invoices-list">
                  @for (invoice of client()!.invoices; track invoice.id) {
                    <li class="invoice-item">
                      <a [routerLink]="['/invoices', invoice.id]" class="invoice-link">
                        <span class="invoice-number">{{ invoice.number }}</span>
                        <span class="invoice-amount">{{ invoice.currency }} {{ invoice.amount }}</span>
                      </a>
                      <span class="invoice-status" [class]="invoice.status.toLowerCase()">
                        {{ invoice.status }}
                      </span>
                    </li>
                  }
                </ul>
              } @else {
                <p class="empty-message">{{ 'clients.detail.noInvoices' | translate }}</p>
              }
            </section>

            <!-- Quick Stats -->
            <section class="detail-card stats-card">
              <div class="quick-stat">
                <span class="stat-number">{{ client()!._count?.tasks || 0 }}</span>
                <span class="stat-text">{{ 'clients.detail.totalTasks' | translate }}</span>
              </div>
              <div class="quick-stat">
                <span class="stat-number">{{ client()!._count?.invoices || 0 }}</span>
                <span class="stat-text">{{ 'clients.detail.totalInvoices' | translate }}</span>
              </div>
            </section>
          </div>
        </div>
      } @else {
        <div class="error-state">
          <h2>{{ 'clients.detail.notFound' | translate }}</h2>
          <a routerLink="/clients" class="btn-primary">{{ 'clients.detail.backToClients' | translate }}</a>
        </div>
      }
    </div>
  `,
  styles: [`
    .client-detail-page {
      padding: var(--space-lg);
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Loading & Error States */
    .loading-state, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      gap: var(--space-md);
      color: var(--color-text-secondary);
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Header */
    .page-header {
      margin-bottom: var(--space-xl);
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      color: var(--color-primary);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: var(--space-md);
      transition: opacity var(--transition-base);

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover { opacity: 0.7; }
    }

    .header-main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-lg);
    }

    .client-header-info {
      display: flex;
      align-items: center;
      gap: var(--space-md);
    }

    .client-avatar {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 600;
      color: white;
    }

    .client-name {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--color-text);
      margin: 0;
      letter-spacing: -0.02em;
    }

    .client-badges {
      display: flex;
      gap: var(--space-xs);
      margin-top: var(--space-xs);
    }

    .badge {
      padding: var(--space-2xs) var(--space-xs);
      font-size: 0.6875rem;
      font-weight: 600;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .badge-archived {
      background: var(--color-fill-secondary);
      color: var(--color-text-tertiary);
    }

    .badge-inactive {
      background: rgba(255, 149, 0, 0.15);
      color: var(--color-warning);
    }

    .badge-crm {
      background: rgba(0, 122, 255, 0.15);
      color: var(--color-primary);
    }

    .header-actions {
      display: flex;
      gap: var(--space-sm);
    }

    .btn-primary, .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      padding: var(--space-sm) var(--space-md);
      border-radius: 12px;
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all var(--transition-base);

      svg {
        width: 18px;
        height: 18px;
      }
    }

    .btn-primary {
      background: var(--color-primary);
      color: var(--color-primary-text);
      border: none;

      &:hover {
        background: var(--color-primary-hover);
      }
    }

    .btn-secondary {
      background: var(--color-surface);
      color: var(--color-text);
      border: 1px solid var(--color-border);

      &:hover {
        background: var(--color-fill-tertiary);
      }
    }

    /* Content Grid */
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: var(--space-lg);
    }

    .detail-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 16px;
      padding: var(--space-lg);
      margin-bottom: var(--space-md);
    }

    .card-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0 0 var(--space-md);
    }

    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-md);

      .card-title { margin: 0; }
    }

    .card-action {
      font-size: 0.875rem;
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 500;

      &:hover { text-decoration: underline; }
    }

    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-md);
    }

    .info-item {
      &.full-width {
        grid-column: 1 / -1;
      }
    }

    .info-label {
      display: block;
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: var(--space-2xs);
    }

    .info-value {
      display: block;
      font-size: 0.9375rem;
      color: var(--color-text);

      &.monospace {
        font-family: 'SF Mono', monospace;
        font-size: 0.875rem;
      }
    }

    /* Integrations */
    .integrations-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .integration-item {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      padding: var(--space-sm);
      background: var(--color-fill-quaternary);
      border-radius: 12px;
    }

    .integration-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        width: 20px;
        height: 20px;
        color: white;
      }

      &.crm { background: var(--color-primary); }
      &.google { background: #EA4335; }
      &.bank { background: var(--color-success); }
    }

    .integration-info {
      flex: 1;
    }

    .integration-name {
      display: block;
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--color-text);
    }

    .integration-detail {
      display: block;
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
    }

    .integration-status {
      font-size: 0.75rem;
      font-weight: 600;
      padding: var(--space-2xs) var(--space-xs);
      border-radius: 6px;
      background: var(--color-fill-tertiary);
      color: var(--color-text-tertiary);

      &.active {
        background: rgba(52, 199, 89, 0.15);
        color: var(--color-success);
      }
    }

    /* Tasks List */
    .tasks-list, .invoices-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .task-item, .invoice-item {
      display: flex;
      align-items: center;
      padding: var(--space-sm) 0;
      border-bottom: 1px solid var(--color-border);

      &:last-child { border-bottom: none; }
    }

    .task-link, .invoice-link {
      flex: 1;
      text-decoration: none;
      display: flex;
      flex-direction: column;
      gap: var(--space-2xs);
    }

    .task-name, .invoice-number {
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--color-text);
    }

    .task-dates, .invoice-amount {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
    }

    .task-status, .invoice-status {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: var(--space-2xs) var(--space-xs);
      border-radius: 6px;
      text-transform: uppercase;
      background: var(--color-fill-tertiary);
      color: var(--color-text-tertiary);

      &.active { background: rgba(52, 199, 89, 0.15); color: var(--color-success); }
      &.draft { background: rgba(255, 149, 0, 0.15); color: var(--color-warning); }
      &.sent { background: rgba(0, 122, 255, 0.15); color: var(--color-primary); }
      &.paid { background: rgba(52, 199, 89, 0.15); color: var(--color-success); }
      &.cancelled { background: rgba(255, 59, 48, 0.15); color: var(--color-danger); }
    }

    .empty-message {
      font-size: 0.875rem;
      color: var(--color-text-tertiary);
      text-align: center;
      padding: var(--space-md);
    }

    /* Stats Card */
    .stats-card {
      display: flex;
      gap: var(--space-lg);
    }

    .quick-stat {
      flex: 1;
      text-align: center;
    }

    .stat-number {
      display: block;
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-text);
      letter-spacing: -0.02em;
    }

    .stat-text {
      display: block;
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      margin-top: var(--space-2xs);
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .client-detail-page {
        padding: var(--space-md);
      }

      .header-main {
        flex-direction: column;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ClientDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clientService = inject(ClientService);
  private notificationService = inject(NotificationService);

  client = signal<Client | null>(null);
  isLoading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadClient(id);
    }
  }

  loadClient(id: string): void {
    this.isLoading.set(true);
    this.clientService.getClient(id).subscribe({
      next: (client) => {
        this.client.set(client);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load client:', err);
        this.notificationService.error('Failed to load client');
        this.isLoading.set(false);
      }
    });
  }

  toggleArchive(): void {
    const c = this.client();
    if (!c) return;

    const action = c.isArchived
      ? this.clientService.unarchiveClient(c.id)
      : this.clientService.archiveClient(c.id);

    action.subscribe({
      next: (updated) => {
        this.client.set({ ...c, ...updated });
        this.notificationService.success(
          c.isArchived ? 'Client unarchived' : 'Client archived'
        );
      },
      error: (err) => {
        console.error('Failed to toggle archive:', err);
        this.notificationService.error('Failed to update client');
      }
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#007AFF', '#34C759', '#FF9500', '#FF3B30',
      '#5856D6', '#AF52DE', '#FF2D55', '#00C7BE'
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  }

  getFullAddress(): string | null {
    const c = this.client();
    if (!c) return null;

    const parts = [
      c.streetAddress,
      c.postcode,
      c.city,
      c.country
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : null;
  }
}
