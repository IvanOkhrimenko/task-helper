import { Component, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { TaskService, Task } from '../../../core/services/task.service';
import { NotificationService } from '../../../core/services/notification.service';
import { InvoiceModalComponent, InvoiceGenerationData } from '../../../shared/components/invoice-modal/invoice-modal.component';

@Component({
  selector: 'app-tasks-list',
  standalone: true,
  imports: [CommonModule, RouterLink, InvoiceModalComponent],
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
          <h1 class="page-title">Invoice Tasks</h1>
          <p class="page-subtitle">Manage your client projects and generate invoices</p>
        </div>
        <a routerLink="/tasks/invoices/new" class="btn btn--primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Task
        </a>
      </header>

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-value">{{ tasks().length }}</span>
          <span class="stat-label">Total Tasks</span>
        </div>
        <div class="stat-card stat-card--active">
          <span class="stat-value">{{ activeCount() }}</span>
          <span class="stat-label">Active</span>
        </div>
        <div class="stat-card stat-card--clients">
          <span class="stat-value">{{ uniqueClientsCount() }}</span>
          <span class="stat-label">Clients</span>
        </div>
        <div class="stat-card stat-card--revenue">
          <span class="stat-value">{{ formatCurrency(totalRevenue()) }}</span>
          <span class="stat-label">This Month</span>
        </div>
      </div>

      <!-- Content -->
      @if (isLoading()) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading tasks...</p>
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
          <h3>No invoice tasks yet</h3>
          <p>Create your first task to start tracking client work and generating invoices</p>
          <a routerLink="/tasks/invoices/new" class="btn btn--primary">Create Task</a>
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
                    {{ getClientInitials(task.clientName) }}
                  </div>
                  <div class="client-info">
                    <span class="client-name">{{ task.clientName || 'No client' }}</span>
                    @if (task.currency && task.hourlyRate) {
                      <span class="client-rate">{{ getCurrencySymbol(task.currency) }}{{ task.hourlyRate }}/hr</span>
                    }
                  </div>
                </div>
                <div class="task-card__status">
                  <span class="status-badge" [class.status-badge--active]="task.isActive" [class.status-badge--inactive]="!task.isActive">
                    {{ task.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </div>

              <div class="task-card__body">
                <a [routerLink]="['/tasks/invoices', task.id]" class="task-card__name-link">
                  <h3 class="task-card__name">{{ task.name }}</h3>
                </a>

                @if (task.description) {
                  <p class="task-card__description">{{ task.description }}</p>
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
                      <span>Deadline: {{ task.deadlineDate }}th of month</span>
                    </div>
                  }
                  @if (task.warningDate) {
                    <div class="meta-item meta-item--warning">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <span>Warning: {{ task.warningDate }}th of month</span>
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
                  Generate Invoice
                </button>
                <a [routerLink]="['/tasks/invoices', task.id, 'edit']" class="btn btn--ghost btn--sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit
                </a>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

    :host {
      display: block;
      font-family: 'Outfit', sans-serif;
      --color-primary: #2563EB;
      --color-primary-hover: #1d4ed8;
      --color-primary-subtle: rgba(37, 99, 235, 0.08);
      --color-bg: #FAFBFC;
      --color-surface: #FFFFFF;
      --color-border: #E5E7EB;
      --color-text: #0F172A;
      --color-text-secondary: #64748B;
      --color-text-muted: #94A3B8;
      --color-success: #10B981;
      --color-success-bg: rgba(16, 185, 129, 0.1);
      --color-warning: #F59E0B;
      --color-warning-bg: rgba(245, 158, 11, 0.1);
      --color-danger: #EF4444;
      --radius-sm: 6px;
      --radius-md: 8px;
      --radius-lg: 12px;
      --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
      --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
      --transition-fast: 0.15s ease;
      --transition-base: 0.2s ease;
    }

    .tasks-page {
      padding: 32px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 32px;
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 4px;
      letter-spacing: -0.02em;
    }

    .page-subtitle {
      font-size: 0.9375rem;
      color: var(--color-text-secondary);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      font-size: 0.9375rem;
      font-weight: 500;
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
        color: white;

        &:hover {
          background: var(--color-primary-hover);
          transform: translateY(-1px);
        }
      }

      &--ghost {
        background: transparent;
        color: var(--color-text-secondary);

        &:hover {
          background: var(--color-bg);
          color: var(--color-text);
        }
      }

      &--sm {
        padding: 8px 14px;
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
      gap: 16px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 20px;
      text-align: center;

      &--active .stat-value { color: var(--color-success); }
      &--clients .stat-value { color: var(--color-primary); }
      &--revenue .stat-value { color: var(--color-success); }
    }

    .stat-value {
      display: block;
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--color-text);
      line-height: 1;
      margin-bottom: 6px;
    }

    .stat-label {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Loading State */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      color: var(--color-text-secondary);
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 80px 20px;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      border: 2px dashed var(--color-border);
    }

    .empty-state__icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      color: var(--color-text-muted);

      svg {
        width: 100%;
        height: 100%;
      }
    }

    .empty-state h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 8px;
    }

    .empty-state p {
      color: var(--color-text-secondary);
      margin-bottom: 24px;
    }

    /* Tasks Grid */
    .tasks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px;
    }

    .task-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-card);
      animation: slideUp 0.4s ease both;
      transition: all var(--transition-base);

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
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-bg);
    }

    .task-card__client {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .client-avatar {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, var(--color-primary) 0%, #3b82f6 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .client-info {
      display: flex;
      flex-direction: column;
    }

    .client-name {
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--color-text);
    }

    .client-rate {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .status-badge {
      padding: 4px 10px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: 4px;

      &--active {
        background: var(--color-success-bg);
        color: var(--color-success);
      }

      &--inactive {
        background: var(--color-bg);
        color: var(--color-text-muted);
      }
    }

    .task-card__body {
      padding: 20px;
    }

    .task-card__name-link {
      text-decoration: none;
      display: block;
    }

    .task-card__name {
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 8px;
      transition: color var(--transition-fast);

      &:hover {
        color: var(--color-primary);
      }
    }

    .task-card__description {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin-bottom: 16px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .task-card__meta {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8125rem;
      color: var(--color-text-secondary);

      svg {
        width: 14px;
        height: 14px;
        color: var(--color-text-muted);
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
      gap: 8px;
      padding: 12px 20px;
      background: var(--color-bg);
      border-top: 1px solid var(--color-border);
    }

    @media (max-width: 768px) {
      .tasks-page {
        padding: 20px;
      }

      .stats-row {
        grid-template-columns: repeat(2, 1fr);
      }

      .tasks-grid {
        grid-template-columns: 1fr;
      }

      .page-header {
        flex-direction: column;
        gap: 16px;
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
  selectedTask = signal<Task | null>(null);

  sortedTasks = computed(() => {
    return [...this.tasks()].sort((a, b) => {
      // Sort by active status first, then by name
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  });

  activeCount = computed(() => this.tasks().filter(t => t.isActive).length);

  uniqueClientsCount = computed(() => {
    const clients = new Set(this.tasks().map(t => t.clientName).filter(Boolean));
    return clients.size;
  });

  totalRevenue = computed(() => {
    // This would ideally come from the backend
    return this.tasks().reduce((sum, t) => {
      const rate = t.hourlyRate || 0;
      const hours = t.hoursWorked || 0;
      return sum + (rate * hours);
    }, 0);
  });

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
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

    this.taskService.generateInvoice(
      data.taskId,
      data.hoursWorked,
      data.hourlyRate,
      data.month,
      data.year,
      data.description,
      data.language
    ).subscribe({
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
