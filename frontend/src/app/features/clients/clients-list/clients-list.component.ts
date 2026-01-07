import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClientService, Client } from '../../../core/services/client.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="clients-page">
      <!-- Header -->
      <header class="page-header">
        <div class="header-content">
          <div class="header-text">
            <h1 class="page-title">Clients</h1>
            <p class="page-subtitle">Manage your client relationships</p>
          </div>
          <a routerLink="/clients/new" class="btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Client
          </a>
        </div>
      </header>

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value">{{ stats().total }}</div>
          <div class="stat-label">Total Clients</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats().active }}</div>
          <div class="stat-label">Active</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats().totalInvoices }}</div>
          <div class="stat-label">Invoices</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats().withCRM }}</div>
          <div class="stat-label">CRM Linked</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <label class="toggle-filter">
          <input
            type="checkbox"
            [checked]="showArchived()"
            (change)="toggleArchived()"
          />
          <span class="toggle-label">Show archived</span>
        </label>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="loading-grid">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="skeleton-card">
              <div class="skeleton-avatar"></div>
              <div class="skeleton-lines">
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Empty State -->
      @if (!isLoading() && clients().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h3 class="empty-title">No clients yet</h3>
          <p class="empty-description">Add your first client to start generating invoices</p>
          <a routerLink="/clients/new" class="btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Your First Client
          </a>
        </div>
      }

      <!-- Clients Grid -->
      @if (!isLoading() && clients().length > 0) {
        <div class="clients-grid">
          @for (client of clients(); track client.id) {
            <div class="client-card" [class.archived]="client.isArchived" [class.inactive]="!client.isActive">
              <a [routerLink]="['/clients', client.id]" class="card-link">
                <div class="card-header">
                  <div class="client-avatar" [style.background]="getAvatarColor(client.name)">
                    {{ getInitials(client.name) }}
                  </div>
                  <div class="client-info">
                    <h3 class="client-name">{{ client.name }}</h3>
                    @if (client.email) {
                      <p class="client-email">{{ client.email }}</p>
                    }
                  </div>
                  @if (client.crmIntegration) {
                    <span class="crm-badge" [class.active]="client.crmIntegration.isActive">
                      CRM
                    </span>
                  }
                </div>

                <div class="card-stats">
                  <div class="card-stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span>{{ client._count?.tasks || 0 }} tasks</span>
                  </div>
                  <div class="card-stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    <span>{{ client._count?.invoices || 0 }} invoices</span>
                  </div>
                </div>

                @if (client.currency || client.hourlyRate) {
                  <div class="card-meta">
                    @if (client.hourlyRate) {
                      <span class="meta-item">{{ client.currency || 'USD' }} {{ client.hourlyRate }}/hr</span>
                    }
                    @if (client.city) {
                      <span class="meta-item">{{ client.city }}</span>
                    }
                  </div>
                }
              </a>

              <div class="card-actions">
                <a [routerLink]="['/clients', client.id]" class="action-btn" title="View Details">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </a>
                <a [routerLink]="['/clients', client.id, 'edit']" class="action-btn" title="Edit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </a>
                <button
                  class="action-btn"
                  [title]="client.isArchived ? 'Unarchive' : 'Archive'"
                  (click)="toggleArchive(client, $event)"
                >
                  @if (client.isArchived) {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="1 4 1 10 7 10"/>
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                    </svg>
                  } @else {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="21 8 21 21 3 21 3 8"/>
                      <rect x="1" y="3" width="22" height="5"/>
                      <line x1="10" y1="12" x2="14" y2="12"/>
                    </svg>
                  }
                </button>
              </div>

              @if (client.isArchived) {
                <div class="archived-badge">Archived</div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .clients-page {
      padding: var(--space-lg);
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Header */
    .page-header {
      margin-bottom: var(--space-xl);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-md);
    }

    .page-title {
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-text);
      margin: 0;
      letter-spacing: -0.02em;
    }

    .page-subtitle {
      font-size: 0.9375rem;
      color: var(--color-text-secondary);
      margin: var(--space-xs) 0 0;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      padding: var(--space-sm) var(--space-md);
      background: var(--color-primary);
      color: var(--color-primary-text);
      border: none;
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

      &:hover {
        background: var(--color-primary-hover);
        transform: translateY(-1px);
      }
    }

    /* Stats Row */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-md);
      margin-bottom: var(--space-lg);
    }

    .stat-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 16px;
      padding: var(--space-md);
      text-align: center;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--color-text);
      letter-spacing: -0.02em;
    }

    .stat-label {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      margin-top: var(--space-2xs);
    }

    /* Filters */
    .filters-bar {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      margin-bottom: var(--space-lg);
    }

    .toggle-filter {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--color-text-secondary);

      input[type="checkbox"] {
        width: 18px;
        height: 18px;
        accent-color: var(--color-primary);
        cursor: pointer;
      }
    }

    /* Loading Grid */
    .loading-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: var(--space-md);
    }

    .skeleton-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 16px;
      padding: var(--space-lg);
      display: flex;
      gap: var(--space-md);
    }

    .skeleton-avatar {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(90deg, var(--color-fill-tertiary) 25%, var(--color-fill-quaternary) 50%, var(--color-fill-tertiary) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    .skeleton-lines {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .skeleton-line {
      height: 14px;
      background: linear-gradient(90deg, var(--color-fill-tertiary) 25%, var(--color-fill-quaternary) 50%, var(--color-fill-tertiary) 75%);
      background-size: 200% 100%;
      border-radius: 4px;
      animation: shimmer 1.5s infinite;

      &.short { width: 60%; }
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-3xl) var(--space-lg);
      text-align: center;
    }

    .empty-icon {
      width: 80px;
      height: 80px;
      border-radius: 20px;
      background: var(--color-fill-tertiary);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--space-lg);

      svg {
        width: 40px;
        height: 40px;
        color: var(--color-text-tertiary);
      }
    }

    .empty-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0 0 var(--space-xs);
    }

    .empty-description {
      font-size: 0.9375rem;
      color: var(--color-text-secondary);
      margin: 0 0 var(--space-lg);
      max-width: 300px;
    }

    /* Clients Grid */
    .clients-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: var(--space-md);
    }

    .client-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 16px;
      overflow: hidden;
      transition: all var(--transition-base);
      position: relative;

      &:hover {
        border-color: var(--color-primary);
        box-shadow: 0 4px 20px rgba(0, 122, 255, 0.1);
      }

      &.archived {
        opacity: 0.7;
      }

      &.inactive {
        .client-avatar {
          filter: grayscale(0.5);
        }
      }
    }

    .card-link {
      display: block;
      padding: var(--space-lg);
      text-decoration: none;
      color: inherit;
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      gap: var(--space-md);
      margin-bottom: var(--space-md);
    }

    .client-avatar {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.125rem;
      font-weight: 600;
      color: white;
      flex-shrink: 0;
    }

    .client-info {
      flex: 1;
      min-width: 0;
    }

    .client-name {
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .client-email {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      margin: var(--space-2xs) 0 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .crm-badge {
      padding: var(--space-2xs) var(--space-xs);
      background: var(--color-fill-tertiary);
      color: var(--color-text-secondary);
      font-size: 0.6875rem;
      font-weight: 600;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;

      &.active {
        background: rgba(52, 199, 89, 0.15);
        color: var(--color-success);
      }
    }

    .card-stats {
      display: flex;
      gap: var(--space-md);
      padding: var(--space-sm) 0;
      border-top: 1px solid var(--color-border);
      border-bottom: 1px solid var(--color-border);
    }

    .card-stat {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      font-size: 0.8125rem;
      color: var(--color-text-secondary);

      svg {
        width: 16px;
        height: 16px;
        opacity: 0.6;
      }
    }

    .card-meta {
      display: flex;
      gap: var(--space-md);
      margin-top: var(--space-sm);
    }

    .meta-item {
      font-size: 0.8125rem;
      color: var(--color-text-tertiary);
    }

    .card-actions {
      display: flex;
      gap: var(--space-xs);
      padding: var(--space-sm) var(--space-lg);
      background: var(--color-fill-quaternary);
      border-top: 1px solid var(--color-border);
    }

    .action-btn {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: none;
      background: var(--color-surface);
      color: var(--color-text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all var(--transition-base);
      text-decoration: none;

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: var(--color-primary);
        color: var(--color-primary-text);
      }
    }

    .archived-badge {
      position: absolute;
      top: var(--space-sm);
      right: var(--space-sm);
      padding: var(--space-2xs) var(--space-xs);
      background: var(--color-fill-secondary);
      color: var(--color-text-tertiary);
      font-size: 0.6875rem;
      font-weight: 600;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .clients-page {
        padding: var(--space-md);
      }

      .header-content {
        flex-direction: column;
        gap: var(--space-md);
      }

      .stats-row {
        grid-template-columns: repeat(2, 1fr);
      }

      .clients-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ClientsListComponent implements OnInit {
  private clientService = inject(ClientService);
  private notificationService = inject(NotificationService);

  clients = signal<Client[]>([]);
  isLoading = signal(true);
  showArchived = signal(false);

  stats = computed(() => {
    const all = this.clients();
    return {
      total: all.length,
      active: all.filter(c => c.isActive && !c.isArchived).length,
      totalInvoices: all.reduce((sum, c) => sum + (c._count?.invoices || 0), 0),
      withCRM: all.filter(c => c.crmIntegration).length
    };
  });

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.isLoading.set(true);
    this.clientService.getClients(this.showArchived()).subscribe({
      next: (clients) => {
        this.clients.set(clients);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load clients:', err);
        this.notificationService.error('Failed to load clients');
        this.isLoading.set(false);
      }
    });
  }

  toggleArchived(): void {
    this.showArchived.update(v => !v);
    this.loadClients();
  }

  toggleArchive(client: Client, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const action = client.isArchived
      ? this.clientService.unarchiveClient(client.id)
      : this.clientService.archiveClient(client.id);

    action.subscribe({
      next: () => {
        this.loadClients();
        this.notificationService.success(
          client.isArchived ? 'Client unarchived' : 'Client archived'
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
      '#5856D6', '#AF52DE', '#FF2D55', '#00C7BE',
      '#32ADE6', '#64D2FF'
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  }
}
