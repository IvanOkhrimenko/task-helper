import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { NotificationService, Notification } from '../../../core/services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="toast-container">
      @for (notification of notificationService.notifications(); track notification.id) {
        <div
          class="toast"
          [class]="'toast--' + notification.type"
          (click)="notificationService.dismiss(notification.id)"
        >
          <div class="toast__icon">
            @switch (notification.type) {
              @case ('success') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              }
              @case ('error') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M15 9l-6 6M9 9l6 6"/>
                </svg>
              }
              @case ('warning') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 9v4M12 17h.01"/>
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
              }
              @default {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4M12 8h.01"/>
                </svg>
              }
            }
          </div>
          <span class="toast__message">{{ notification.message }}</span>
          <button class="toast__close" (click)="notificationService.dismiss(notification.id); $event.stopPropagation()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: var(--space-lg);
      right: var(--space-lg);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      padding: var(--space-md) var(--space-lg);
      background: var(--color-surface);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      border-left: 4px solid;
      pointer-events: auto;
      cursor: pointer;
      animation: slideInRight 0.3s ease;
      min-width: 320px;
      max-width: 420px;

      &--success {
        border-color: var(--color-success);
        .toast__icon { color: var(--color-success); }
      }

      &--error {
        border-color: var(--color-danger);
        .toast__icon { color: var(--color-danger); }
      }

      &--warning {
        border-color: var(--color-warning);
        .toast__icon { color: var(--color-warning); }
      }

      &--info {
        border-color: var(--color-primary);
        .toast__icon { color: var(--color-primary); }
      }
    }

    .toast__icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;

      svg {
        width: 100%;
        height: 100%;
      }
    }

    .toast__message {
      flex: 1;
      font-size: 0.9375rem;
      color: var(--color-text);
      line-height: 1.4;
    }

    .toast__close {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      padding: 0;
      color: var(--color-text-muted);
      transition: color var(--transition-fast);

      &:hover {
        color: var(--color-text);
      }

      svg {
        width: 100%;
        height: 100%;
      }
    }
  `]
})
export class ToastComponent {
  notificationService = inject(NotificationService);
}
