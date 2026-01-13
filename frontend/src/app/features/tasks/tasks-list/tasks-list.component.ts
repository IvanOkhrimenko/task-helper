import { Component, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TaskService, Task } from '../../../core/services/task.service';
import { NotificationService } from '../../../core/services/notification.service';
import { InvoiceModalComponent, InvoiceGenerationData } from '../../../shared/components/invoice-modal/invoice-modal.component';

@Component({
  selector: 'app-tasks-list',
  standalone: true,
  imports: [CommonModule, RouterLink, InvoiceModalComponent, TranslateModule],
  template: `
    <app-invoice-modal
      #invoiceModal
      [task]="selectedTask()"
      (onGenerate)="handleInvoiceGenerate($event)"
      (onClose)="selectedTask.set(null)"
    />

    <div class="tasks-page">
      <!-- Header -->
      <header class="page-header">
        <div class="page-header__info">
          <h1 class="page-title">{{ 'tasks.title' | translate }}</h1>
          <p class="page-subtitle">{{ 'tasks.subtitle' | translate }}</p>
        </div>
        <div class="header-actions">
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
            {{ 'tasks.showArchived' | translate }}
          </label>
          <a routerLink="/tasks/invoices/new" class="btn btn--primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {{ 'tasks.newTask' | translate }}
          </a>
        </div>
      </header>

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-value">{{ tasks().length }}</span>
          <span class="stat-label">{{ 'tasks.stats.totalTasks' | translate }}</span>
        </div>
        <div class="stat-card stat-card--active">
          <span class="stat-value">{{ activeCount() }}</span>
          <span class="stat-label">{{ 'tasks.stats.active' | translate }}</span>
        </div>
        <div class="stat-card stat-card--clients">
          <span class="stat-value">{{ uniqueClientsCount() }}</span>
          <span class="stat-label">{{ 'tasks.stats.clients' | translate }}</span>
        </div>
        <div class="stat-card stat-card--revenue">
          <span class="stat-value">{{ formatCurrency(totalRevenue()) }}</span>
          <span class="stat-label">{{ 'tasks.stats.thisMonth' | translate }}</span>
        </div>
      </div>

      <!-- Content -->
      @if (isLoading()) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>{{ 'tasks.loading' | translate }}</p>
        </div>
      } @else if (tasks().length === 0) {
        <div class="empty-state">
          <div class="empty-state__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h3>{{ 'tasks.empty.title' | translate }}</h3>
          <p>{{ 'tasks.empty.description' | translate }}</p>
          <a routerLink="/tasks/invoices/new" class="btn btn--primary">{{ 'tasks.empty.createTask' | translate }}</a>
        </div>
      } @else {
        <div class="tasks-grid">
          @for (task of sortedTasks(); track task.id; let i = $index) {
            <div
              class="task-card"
              [class.task-card--inactive]="!task.isActive"
              [style.animation-delay]="i * 40 + 'ms'"
            >
              <div class="task-card__header">
                <div class="task-card__client">
                  <div class="client-avatar">
                    {{ getClientInitials(task.client?.name) }}
                  </div>
                  <div class="client-info">
                    @if (task.client) {
                      <a [routerLink]="['/clients', task.client.id]" class="client-name client-name--link">{{ task.client.name }}</a>
                    } @else {
                      <span class="client-name">{{ 'tasks.card.noClient' | translate }}</span>
                    }
                    @if (task.client?.currency && task.client?.hourlyRate) {
                      <span class="client-rate">{{ getCurrencySymbol(task.client!.currency) }}{{ task.client!.hourlyRate }}/hr</span>
                    }
                  </div>
                </div>
                <div class="task-card__status">
                  @if (task.client?.crmIntegration) {
                    <span class="crm-badge" [title]="('tasks.card.crm' | translate) + ': ' + task.client!.crmIntegration!.name">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                        <path d="M2 12l10 5 10-5"/>
                      </svg>
                    </span>
                  }
                  @if (task.isArchived) {
                    <span class="archived-badge" [title]="'tasks.card.archived' | translate">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="21 8 21 21 3 21 3 8"/>
                        <rect x="1" y="3" width="22" height="5"/>
                      </svg>
                    </span>
                  }
                  <span class="status-badge" [class.status-badge--active]="task.isActive" [class.status-badge--inactive]="!task.isActive">
                    {{ task.isActive ? ('tasks.card.active' | translate) : ('tasks.card.inactive' | translate) }}
                  </span>
                </div>
              </div>

              <div class="task-card__body">
                <a [routerLink]="['/tasks/invoices', task.id]" class="task-card__name-link">
                  <h3 class="task-card__name">{{ task.name }}</h3>
                </a>

                @if (task.client?.description) {
                  <p class="task-card__description">{{ task.client!.description }}</p>
                }

                <div class="task-card__meta">
                  @if (task.deadlineDate) {
                    <div class="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <span>{{ 'tasks.card.deadline' | translate }}: {{ task.deadlineDate }}{{ 'tasks.card.dayOfMonth' | translate }}</span>
                    </div>
                  }
                  @if (task.warningDate) {
                    <div class="meta-item meta-item--warning">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <span>{{ 'tasks.card.warning' | translate }}: {{ task.warningDate }}{{ 'tasks.card.dayOfMonth' | translate }}</span>
                    </div>
                  }
                </div>
              </div>

              <div class="task-card__footer">
                <button class="btn btn--primary btn--sm" (click)="openInvoiceModal(task)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                  {{ 'tasks.card.generateInvoice' | translate }}
                </button>
                <a [routerLink]="['/tasks/invoices', task.id, 'edit']" class="btn btn--ghost btn--sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  {{ 'tasks.card.edit' | translate }}
                </a>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: var(--font-body);
    }

    .tasks-page {
      padding: var(--space-2xl);
      max-width: 1200px;
      margin: 0 auto;
      background: var(--color-bg);
      min-height: 100%;
      transition: background-color var(--transition-slow);
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: var(--space-2xl);
    }

    .header-actions {
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

    .crm-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: var(--radius-sm);
      background: var(--color-indigo);
      color: white;

      svg {
        width: 12px;
        height: 12px;
      }
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-xs);
      letter-spacing: -0.02em;
      transition: color var(--transition-slow);
    }

    .page-subtitle {
      font-size: 0.9375rem;
      color: var(--color-text-secondary);
      transition: color var(--transition-slow);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-lg);
      font-size: 0.875rem;
      font-weight: 600;
      font-family: inherit;
      border: none;
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
      text-decoration: none;
      cursor: pointer;

      svg {
        width: 18px;
        height: 18px;
      }

      &--primary {
        background: var(--color-primary);
        color: var(--color-primary-text);

        &:hover {
          background: var(--color-primary-hover);
          transform: translateY(-1px);
        }
      }

      &--ghost {
        background: transparent;
        color: var(--color-text-secondary);

        &:hover {
          background: var(--color-fill-tertiary);
          color: var(--color-text);
        }
      }

      &--sm {
        padding: var(--space-sm) var(--space-md);
        font-size: 0.8125rem;

        svg {
          width: 15px;
          height: 15px;
        }
      }
    }

    /* Stats Row */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-lg);
      margin-bottom: var(--space-2xl);
    }

    .stat-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-xl);
      text-align: center;
      transition: background-color var(--transition-slow), border-color var(--transition-slow);

      &--active .stat-value { color: var(--color-success); }
      &--clients .stat-value { color: var(--color-primary); }
      &--revenue .stat-value { color: var(--color-success); }
    }

    .stat-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text);
      line-height: 1;
      margin-bottom: var(--space-sm);
      transition: color var(--transition-slow);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      transition: color var(--transition-slow);
    }

    /* Loading State */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      color: var(--color-text-secondary);
      transition: color var(--transition-slow);
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

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 80px var(--space-xl);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      border: 2px dashed var(--color-border);
      transition: background-color var(--transition-slow), border-color var(--transition-slow);
    }

    .empty-state__icon {
      width: 64px;
      height: 64px;
      margin: 0 auto var(--space-xl);
      color: var(--color-text-tertiary);
      transition: color var(--transition-slow);

      svg {
        width: 100%;
        height: 100%;
      }
    }

    .empty-state h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-sm);
      transition: color var(--transition-slow);
    }

    .empty-state p {
      color: var(--color-text-secondary);
      margin-bottom: var(--space-xl);
      transition: color var(--transition-slow);
    }

    /* Tasks Grid */
    .tasks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: var(--space-xl);
    }

    .task-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-card);
      animation: slideUp 0.4s ease both;
      transition: all var(--transition-base);
      display: flex;
      flex-direction: column;
      height: 100%;

      &:hover {
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
      }

      &--inactive {
        opacity: 0.7;
      }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .task-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-lg) var(--space-xl);
      border-bottom: 1px solid var(--color-border);
      background: var(--color-fill-quaternary);
      transition: background-color var(--transition-slow), border-color var(--transition-slow);
    }

    .task-card__client {
      display: flex;
      align-items: center;
      gap: var(--space-md);
    }

    .client-avatar {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      background: var(--color-primary);
      color: var(--color-primary-text);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      transition: background-color var(--transition-slow), color var(--transition-slow);
    }

    .client-info {
      display: flex;
      flex-direction: column;
    }

    .client-name {
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--color-text);
      transition: color var(--transition-slow);

      &--link {
        text-decoration: none;

        &:hover {
          color: var(--color-primary);
        }
      }
    }

    .client-rate {
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
      transition: color var(--transition-slow);
    }

    .task-card__status {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .status-badge {
      padding: var(--space-xs) var(--space-md);
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: var(--radius-sm);

      &--active {
        background: var(--color-success-subtle);
        color: var(--color-success);
      }

      &--inactive {
        background: var(--color-fill-tertiary);
        color: var(--color-text-tertiary);
      }
    }

    .task-card__body {
      padding: var(--space-xl);
      transition: background-color var(--transition-slow);
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .task-card__name-link {
      text-decoration: none;
      display: block;
    }

    .task-card__name {
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-sm);
      transition: color var(--transition-fast);

      &:hover {
        color: var(--color-primary);
      }
    }

    .task-card__description {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin-bottom: var(--space-lg);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      transition: color var(--transition-slow);
    }

    .task-card__meta {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      margin-top: auto;
      padding-top: var(--space-md);
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      transition: color var(--transition-slow);

      svg {
        width: 14px;
        height: 14px;
        color: var(--color-text-tertiary);
        transition: color var(--transition-slow);
      }

      &--warning {
        color: var(--color-warning);

        svg {
          color: var(--color-warning);
        }
      }
    }

    .task-card__footer {
      display: flex;
      gap: var(--space-sm);
      padding: var(--space-md) var(--space-xl);
      background: var(--color-fill-quaternary);
      border-top: 1px solid var(--color-border);
      transition: background-color var(--transition-slow), border-color var(--transition-slow);
    }

    @media (max-width: 768px) {
      .tasks-page {
        padding: var(--space-lg);
      }

      .stats-row {
        grid-template-columns: repeat(2, 1fr);
      }

      .tasks-grid {
        grid-template-columns: 1fr;
      }

      .page-header {
        flex-direction: column;
        gap: var(--space-lg);
      }
    }
  `]
})
export class TasksListComponent implements OnInit {
  private taskService = inject(TaskService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  @ViewChild('invoiceModal') invoiceModal!: InvoiceModalComponent;

  tasks = signal<Task[]>([]);
  isLoading = signal(true);
  showArchived = signal(false);
  selectedTask = signal<Task | null>(null);

  sortedTasks = computed(() => {
    return [...this.tasks()].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  });

  activeCount = computed(() => this.tasks().filter(t => t.isActive).length);

  uniqueClientsCount = computed(() => {
    const clients = new Set(this.tasks().map(t => t.clientId).filter(Boolean));
    return clients.size;
  });

  totalRevenue = computed(() => {
    return this.tasks().reduce((sum, t) => {
      const rate = t.client?.hourlyRate || 0;
      const hours = t.client?.hoursWorked || 0;
      return sum + (rate * hours);
    }, 0);
  });

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.taskService.getTasks(this.showArchived()).subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  toggleShowArchived(): void {
    this.showArchived.update(v => !v);
    this.isLoading.set(true);
    this.loadTasks();
  }

  getClientInitials(name: string | null | undefined): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      PLN: 'zł',
      GBP: '£'
    };
    return symbols[currency] || '$';
  }

  formatCurrency(amount: number): string {
    if (amount >= 1000) {
      return '$' + (amount / 1000).toFixed(1) + 'k';
    }
    return '$' + amount.toFixed(0);
  }

  openInvoiceModal(task: Task): void {
    this.selectedTask.set(task);
    setTimeout(() => {
      this.invoiceModal.open(task);
    }, 0);
  }

  handleInvoiceGenerate(data: InvoiceGenerationData): void {
    this.invoiceModal.setGenerating(true);

    this.taskService.generateInvoice(data.taskId, {
      hoursWorked: data.hoursWorked,
      hourlyRate: data.hourlyRate,
      fixedAmount: data.fixedAmount,
      month: data.month,
      year: data.year,
      description: data.description,
      language: data.language,
      currency: data.currency,
      invoiceTemplate: data.invoiceTemplate,
      bankAccountId: data.bankAccountId,
      googleAccountId: data.googleAccountId,
      useCustomEmailTemplate: data.useCustomEmailTemplate,
      emailSubject: data.emailSubject,
      emailBody: data.emailBody
    }).subscribe({
      next: (invoice) => {
        this.invoiceModal.setGenerating(false);
        this.invoiceModal.close();
        this.notificationService.success('Invoice generated successfully!');
        this.router.navigate(['/invoices', invoice.id]);
      },
      error: () => {
        this.invoiceModal.setGenerating(false);
        this.notificationService.error('Failed to generate invoice');
      }
    });
  }
}
