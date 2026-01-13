import { Component, Input, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivityLog, ActionType } from '../../../core/services/activity-log.service';

interface ActionConfig {
  icon: string;
  labelKey: string;
  colorClass: string;
}

@Component({
  selector: 'app-activity-timeline',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="activity-timeline" [class.activity-timeline--empty]="activities().length === 0">
      @if (activities().length === 0) {
        <div class="empty-state">
          <div class="empty-state__icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </div>
          <p class="empty-state__text">{{ 'shared.activityTimeline.noActivity' | translate }}</p>
          <p class="empty-state__subtext">{{ 'shared.activityTimeline.changesWillAppear' | translate }}</p>
        </div>
      } @else {
        <div class="timeline">
          <div class="timeline__line"></div>

          @for (activity of activities(); track activity.id; let i = $index) {
            <div
              class="timeline-item"
              [style.animation-delay]="(i * 50) + 'ms'"
            >
              <div class="timeline-item__dot" [class]="'timeline-item__dot--' + getActionConfig(activity.action).colorClass">
                <span class="timeline-item__dot-inner"></span>
              </div>

              <div class="timeline-item__content">
                <div class="timeline-item__header">
                  <div class="timeline-item__action">
                    <span class="timeline-item__icon" [innerHTML]="getActionConfig(activity.action).icon"></span>
                    <span class="timeline-item__label">{{ getActionConfig(activity.action).labelKey | translate }}</span>
                  </div>
                  <time class="timeline-item__time" [title]="activity.createdAt">
                    {{ formatRelativeTime(activity.createdAt) }}
                  </time>
                </div>

                @if (activity.user) {
                  <div class="timeline-item__user">
                    <span class="timeline-item__user-avatar">{{ getInitials(activity.user.name) }}</span>
                    <span class="timeline-item__user-name">{{ activity.user.name }}</span>
                  </div>
                }

                @if (activity.changes && Object.keys(activity.changes).length > 0) {
                  <button
                    class="timeline-item__toggle"
                    (click)="toggleExpanded(activity.id)"
                    [class.timeline-item__toggle--expanded]="expandedItems()[activity.id]"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6,9 12,15 18,9"/>
                    </svg>
                    <span>{{ (expandedItems()[activity.id] ? 'shared.activityTimeline.hideChanges' : 'shared.activityTimeline.showChanges') | translate: { count: Object.keys(activity.changes).length } }}</span>
                  </button>

                  @if (expandedItems()[activity.id]) {
                    <div class="timeline-item__changes">
                      @for (change of getChangesArray(activity.changes); track change.field) {
                        <div class="change-row">
                          <span class="change-row__field">{{ formatFieldName(change.field) }}</span>
                          <div class="change-row__values">
                            <span class="change-row__old">{{ formatValue(change.oldValue) }}</span>
                            <svg class="change-row__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <line x1="5" y1="12" x2="19" y2="12"/>
                              <polyline points="12,5 19,12 12,19"/>
                            </svg>
                            <span class="change-row__new">{{ formatValue(change.newValue) }}</span>
                          </div>
                        </div>
                      }
                    </div>
                  }
                }

                @if (activity.metadata && hasVisibleMetadata(activity.metadata)) {
                  <div class="timeline-item__metadata">
                    @if (activity.metadata['invoiceNumber']) {
                      <span class="metadata-tag">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14,2 14,8 20,8"/>
                        </svg>
                        {{ activity.metadata['invoiceNumber'] }}
                      </span>
                    }
                    @if (activity.metadata['crmInvoiceId']) {
                      <span class="metadata-tag metadata-tag--crm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        </svg>
                        {{ 'shared.activityTimeline.crm' | translate }}: {{ activity.metadata['crmInvoiceId'] }}
                      </span>
                    }
                    @if (activity.metadata['clientName']) {
                      <span class="metadata-tag metadata-tag--client">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        {{ activity.metadata['clientName'] }}
                      </span>
                    }
                  </div>
                }
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
    }

    .activity-timeline {
      position: relative;
      font-family: var(--font-body);
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-4xl) var(--space-2xl);
      text-align: center;
      background: var(--color-fill-quaternary);
      border-radius: var(--radius-lg);
      border: 1px dashed var(--color-border);
      transition: background-color var(--transition-slow), border-color var(--transition-slow);
    }

    .empty-state__icon {
      color: var(--color-text-tertiary);
      margin-bottom: var(--space-lg);
    }

    .empty-state__text {
      font-size: 15px;
      font-weight: 500;
      color: var(--color-text);
      margin: 0 0 4px 0;
      transition: color var(--transition-slow);
    }

    .empty-state__subtext {
      font-size: 13px;
      color: var(--color-text-secondary);
      margin: 0;
      transition: color var(--transition-slow);
    }

    /* Timeline */
    .timeline {
      position: relative;
      padding-left: 40px;
    }

    .timeline__line {
      position: absolute;
      left: 11px;
      top: 12px;
      bottom: 12px;
      width: 2px;
      background: linear-gradient(180deg, var(--color-primary) 0%, var(--color-fill-tertiary) 100%);
      border-radius: 2px;
      transition: background var(--transition-slow);
    }

    /* Timeline Item */
    .timeline-item {
      position: relative;
      padding-bottom: var(--space-2xl);
      animation: slideIn 0.4s ease-out forwards;
      opacity: 0;
      transform: translateY(12px);
    }

    .timeline-item:last-child {
      padding-bottom: 0;
    }

    @keyframes slideIn {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Dot */
    .timeline-item__dot {
      position: absolute;
      left: -40px;
      top: 4px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: var(--color-surface);
      box-shadow: 0 0 0 4px var(--color-surface);
      transition: background-color var(--transition-slow), box-shadow var(--transition-slow);
    }

    .timeline-item__dot-inner {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--color-text-tertiary);
      transition: transform 0.2s ease, box-shadow 0.2s ease, background-color var(--transition-slow);
    }

    .timeline-item:hover .timeline-item__dot-inner {
      transform: scale(1.2);
    }

    .timeline-item__dot--success .timeline-item__dot-inner {
      background: var(--color-success);
      box-shadow: 0 0 12px var(--color-success-subtle);
    }

    .timeline-item__dot--info .timeline-item__dot-inner {
      background: var(--color-primary);
      box-shadow: 0 0 12px var(--color-primary-subtle);
    }

    .timeline-item__dot--warning .timeline-item__dot-inner {
      background: var(--color-warning);
      box-shadow: 0 0 12px var(--color-warning-subtle);
    }

    .timeline-item__dot--danger .timeline-item__dot-inner {
      background: var(--color-danger);
      box-shadow: 0 0 12px var(--color-danger-subtle);
    }

    /* Content */
    .timeline-item__content {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 14px var(--space-lg);
      transition: background-color var(--transition-slow), border-color var(--transition-slow), box-shadow var(--transition-fast);
    }

    .timeline-item:hover .timeline-item__content {
      border-color: var(--color-primary);
      box-shadow: var(--shadow-sm);
    }

    .timeline-item__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-md);
    }

    .timeline-item__action {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .timeline-item__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      background: var(--color-fill-quaternary);
      color: var(--color-text-secondary);
      transition: background-color var(--transition-slow), color var(--transition-slow);
    }

    .timeline-item__icon svg {
      width: 16px;
      height: 16px;
    }

    .timeline-item__label {
      font-size: 14px;
      font-weight: 500;
      color: var(--color-text);
      transition: color var(--transition-slow);
    }

    .timeline-item__time {
      font-size: 12px;
      color: var(--color-text-secondary);
      font-family: var(--font-mono);
      white-space: nowrap;
      transition: color var(--transition-slow);
    }

    /* User */
    .timeline-item__user {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--color-border);
      transition: border-color var(--transition-slow);
    }

    .timeline-item__user-avatar {
      width: 24px;
      height: 24px;
      border-radius: var(--radius-xs);
      background: var(--color-primary);
      color: var(--color-primary-text);
      font-size: 10px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      text-transform: uppercase;
      transition: background-color var(--transition-slow);
    }

    .timeline-item__user-name {
      font-size: 13px;
      color: var(--color-text-secondary);
      transition: color var(--transition-slow);
    }

    /* Toggle */
    .timeline-item__toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: var(--space-md);
      padding: 6px 10px;
      background: var(--color-fill-quaternary);
      border: none;
      border-radius: var(--radius-xs);
      font-size: 12px;
      font-family: var(--font-body);
      font-weight: 500;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: background-color var(--transition-fast), color var(--transition-fast);
    }

    .timeline-item__toggle:hover {
      background: var(--color-primary);
      color: var(--color-primary-text);
    }

    .timeline-item__toggle svg {
      transition: transform 0.3s ease;
    }

    .timeline-item__toggle--expanded svg {
      transform: rotate(180deg);
    }

    /* Changes */
    .timeline-item__changes {
      margin-top: var(--space-md);
      padding: var(--space-md);
      background: var(--color-fill-quaternary);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      animation: expandIn 0.3s ease-out;
      transition: background-color var(--transition-slow);
    }

    @keyframes expandIn {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .change-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .change-row__field {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-secondary);
      transition: color var(--transition-slow);
    }

    .change-row__values {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      flex-wrap: wrap;
    }

    .change-row__old,
    .change-row__new {
      font-family: var(--font-mono);
      font-size: 12px;
      padding: 4px var(--space-sm);
      border-radius: var(--radius-xs);
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .change-row__old {
      background: var(--color-danger-subtle);
      color: var(--color-danger);
      text-decoration: line-through;
      transition: background-color var(--transition-slow), color var(--transition-slow);
    }

    .change-row__new {
      background: var(--color-success-subtle);
      color: var(--color-success);
      transition: background-color var(--transition-slow), color var(--transition-slow);
    }

    .change-row__arrow {
      color: var(--color-text-secondary);
      flex-shrink: 0;
      transition: color var(--transition-slow);
    }

    /* Metadata */
    .timeline-item__metadata {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
      margin-top: var(--space-md);
    }

    .metadata-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: var(--color-fill-quaternary);
      border-radius: var(--radius-xs);
      font-size: 12px;
      font-family: var(--font-mono);
      color: var(--color-text-secondary);
      transition: background-color var(--transition-slow), color var(--transition-slow);
    }

    .metadata-tag svg {
      opacity: 0.6;
    }

    .metadata-tag--crm {
      background: var(--color-success-subtle);
      color: var(--color-success);
    }

    .metadata-tag--client {
      background: var(--color-primary-subtle);
      color: var(--color-primary);
    }
  `]
})
export class ActivityTimelineComponent {
  @Input() set activityLogs(value: ActivityLog[]) {
    this.activities.set(value || []);
  }

  // Expose Object to template
  Object = Object;

  activities = signal<ActivityLog[]>([]);
  expandedItems = signal<Record<string, boolean>>({});

  private actionConfigs: Record<ActionType, ActionConfig> = {
    CREATED: {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
      labelKey: 'shared.activityTimeline.actions.created',
      colorClass: 'success'
    },
    UPDATED: {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      labelKey: 'shared.activityTimeline.actions.updated',
      colorClass: 'info'
    },
    DELETED: {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
      labelKey: 'shared.activityTimeline.actions.deleted',
      colorClass: 'danger'
    },
    STATUS_CHANGED: {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></svg>',
      labelKey: 'shared.activityTimeline.actions.statusChanged',
      colorClass: 'info'
    },
    ARCHIVED: {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21,8 21,21 3,21 3,8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>',
      labelKey: 'shared.activityTimeline.actions.archived',
      colorClass: 'danger'
    },
    UNARCHIVED: {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21,8 21,21 3,21 3,8"/><rect x="1" y="3" width="22" height="5"/><polyline points="12,11 12,17"/><polyline points="9,14 12,11 15,14"/></svg>',
      labelKey: 'shared.activityTimeline.actions.restored',
      colorClass: 'success'
    },
    ACTIVATED: {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>',
      labelKey: 'shared.activityTimeline.actions.activated',
      colorClass: 'success'
    },
    DEACTIVATED: {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
      labelKey: 'shared.activityTimeline.actions.deactivated',
      colorClass: 'danger'
    },
    INVOICE_GENERATED: {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      labelKey: 'shared.activityTimeline.actions.invoiceGenerated',
      colorClass: 'info'
    },
    PDF_GENERATED: {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><path d="M9 15h6"/></svg>',
      labelKey: 'shared.activityTimeline.actions.pdfCreated',
      colorClass: 'info'
    },
    EMAIL_SENT: {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9 22,2"/></svg>',
      labelKey: 'shared.activityTimeline.actions.emailSent',
      colorClass: 'success'
    },
    EMAIL_DRAFT_CREATED: {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
      labelKey: 'shared.activityTimeline.actions.draftCreated',
      colorClass: 'info'
    },
    CRM_SYNCED: {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23,4 23,10 17,10"/><polyline points="1,20 1,14 7,14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
      labelKey: 'shared.activityTimeline.actions.crmSynced',
      colorClass: 'success'
    },
    CRM_PDF_FETCHED: {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
      labelKey: 'shared.activityTimeline.actions.crmPdfFetched',
      colorClass: 'info'
    },
    COMMENTS_UPDATED: {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
      labelKey: 'shared.activityTimeline.actions.commentsUpdated',
      colorClass: 'info'
    }
  };

  private fieldLabels: Record<string, string> = {
    name: 'Name',
    status: 'Status',
    isActive: 'Active',
    isArchived: 'Archived',
    clientName: 'Client',
    clientEmail: 'Client email',
    clientNip: 'Client NIP',
    clientStreetAddress: 'Address',
    clientCity: 'City',
    clientCountry: 'Country',
    hourlyRate: 'Hourly rate',
    hoursWorked: 'Hours worked',
    currency: 'Currency',
    description: 'Description',
    comments: 'Comments',
    warningDate: 'Warning day',
    deadlineDate: 'Deadline day',
    defaultLanguage: 'Language',
    invoiceTemplate: 'Template'
  };

  getActionConfig(action: ActionType): ActionConfig {
    return this.actionConfigs[action] || {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>',
      labelKey: 'shared.activityTimeline.actions.unknown',
      colorClass: 'neutral'
    };
  }

  toggleExpanded(id: string): void {
    this.expandedItems.update(items => ({
      ...items,
      [id]: !items[id]
    }));
  }

  getChangesArray(changes: Record<string, { oldValue: any; newValue: any }>): Array<{ field: string; oldValue: any; newValue: any }> {
    return Object.entries(changes).map(([field, values]) => ({
      field,
      oldValue: values.oldValue,
      newValue: values.newValue
    }));
  }

  formatFieldName(field: string): string {
    return this.fieldLabels[field] || field;
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Так' : 'Ні';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'щойно';
    if (diffMinutes < 60) return `${diffMinutes} хв тому`;
    if (diffHours < 24) return `${diffHours} год тому`;
    if (diffDays < 7) return `${diffDays} дн тому`;

    return date.toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  hasVisibleMetadata(metadata: Record<string, any>): boolean {
    return !!(metadata['invoiceNumber'] || metadata['crmInvoiceId'] || metadata['clientName']);
  }
}
