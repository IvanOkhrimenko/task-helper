import { Component, inject, signal, computed, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppNotificationService, AppNotification } from '../../core/services/app-notification.service';
import { AISettingsService } from '../../core/services/ai-settings.service';
import { ChatComponent } from '../../features/chat/chat.component';
import { filter, Subscription } from 'rxjs';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  exactMatch?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
  collapsed: boolean;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ChatComponent],
  template: `
    <div class="layout">
      <!-- Sidebar -->
      <aside class="sidebar" [class.sidebar--collapsed]="sidebarCollapsed()">
        <div class="sidebar__header">
          <div class="logo">
            <div class="logo__icon">
              <svg viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="currentColor"/>
                <path d="M10 16L14 20L22 12" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="logo__text">
              <span class="logo__title">Daily Helper</span>
              <span class="logo__subtitle">Invoice & Reminders</span>
            </div>
          </div>
          <button class="sidebar__toggle" (click)="toggleSidebar()" title="Toggle sidebar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7"/>
            </svg>
          </button>
        </div>

        <nav class="sidebar__nav">
          @for (section of navSections(); track section.title) {
            <div class="nav-section">
              <button
                class="nav-section__header"
                (click)="toggleSection(section)"
                [class.nav-section__header--collapsed]="isSectionCollapsed(section.title)"
              >
                <span class="nav-section__title">{{ section.title }}</span>
                <svg class="nav-section__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              <div class="nav-section__items" [class.nav-section__items--collapsed]="isSectionCollapsed(section.title)">
                @for (item of section.items; track item.route) {
                  <a
                    class="nav-item"
                    [routerLink]="item.route"
                    routerLinkActive="nav-item--active"
                    [routerLinkActiveOptions]="{ exact: item.exactMatch ?? false }"
                  >
                    <span class="nav-item__icon" [innerHTML]="item.icon"></span>
                    <span class="nav-item__label">{{ item.label }}</span>
                    <span class="nav-item__indicator"></span>
                  </a>
                }
              </div>
            </div>
          }
        </nav>

        <div class="sidebar__footer">
          <div class="user-card">
            <div class="user-card__avatar">
              {{ userInitial() }}
            </div>
            <div class="user-card__info">
              <span class="user-card__name">{{ userName() }}</span>
              <span class="user-card__email">{{ userEmail() }}</span>
            </div>
            <button class="user-card__logout" (click)="logout()" title="Sign out">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <div class="content-wrapper">
        <!-- Header -->
        <header class="header">
          <div class="header__left">
            <div class="breadcrumb">
              <span class="breadcrumb__page">{{ currentPageTitle() }}</span>
            </div>
          </div>

          <div class="header__right">
            <!-- Notification Bell -->
            <div class="notification-wrapper">
              <button
                class="notification-bell"
                (click)="toggleNotifications()"
                [class.notification-bell--active]="notificationsOpen()"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                @if (notificationService.unreadCount() > 0) {
                  <span class="notification-badge">{{ notificationService.unreadCount() > 99 ? '99+' : notificationService.unreadCount() }}</span>
                }
              </button>

              @if (notificationsOpen()) {
                <div class="notification-dropdown" (click)="$event.stopPropagation()">
                  <div class="notification-dropdown__header">
                    <span>Notifications</span>
                    <div class="notification-dropdown__actions">
                      @if (notificationService.unreadCount() > 0) {
                        <button class="notification-dropdown__action" (click)="markAllRead()">Mark read</button>
                      }
                      @if (notificationService.notifications().length > 0) {
                        <button class="notification-dropdown__action notification-dropdown__action--danger" (click)="clearAllNotifications()">Clear all</button>
                      }
                    </div>
                  </div>
                  <div class="notification-dropdown__content">
                    @if (notificationService.notifications().length === 0) {
                      <div class="notification-dropdown__empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                          <path d="M13.73 21a2 2 0 01-3.46 0"/>
                        </svg>
                        <p>No notifications yet</p>
                      </div>
                    } @else {
                      <div class="notification-dropdown__list">
                        @for (notification of notificationService.recentNotifications(); track notification.id) {
                          <div
                            class="notification-item"
                            [class.notification-item--unread]="notification.status !== 'READ'"
                            (click)="openNotification(notification)"
                          >
                            @if (notification.status !== 'READ') {
                              <div class="notification-item__dot"></div>
                            } @else {
                              <div class="notification-item__dot notification-item__dot--read"></div>
                            }
                            <div class="notification-item__content">
                              <p class="notification-item__title">{{ notification.title }}</p>
                              <span class="notification-item__message">{{ notification.message | slice:0:50 }}{{ notification.message.length > 50 ? '...' : '' }}</span>
                              <span class="notification-item__time">{{ notificationService.getRelativeTime(notification.createdAt) }}</span>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                  @if (notificationService.totalCount() > 5) {
                    <div class="notification-dropdown__footer">
                      <span class="notification-dropdown__count">{{ notificationService.totalCount() }} total notifications</span>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- User Avatar -->
            <div class="header-avatar">
              <span class="header-avatar__initial">{{ userInitial() }}</span>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <main class="main-content">
          <router-outlet />
        </main>
      </div>
    </div>

    <!-- AI Chat Assistant - Only show when AI is enabled -->
    @if (aiEnabled()) {
      <app-chat />
    }
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

    :host {
      --sidebar-width: 260px;
      --sidebar-collapsed-width: 72px;
      --header-height: 64px;
      --color-primary: #2563EB;
      --color-primary-subtle: rgba(37, 99, 235, 0.08);
      --color-primary-hover: #1d4ed8;
      --color-surface: #FFFFFF;
      --color-bg: #F8FAFC;
      --color-border: #E5E7EB;
      --color-border-subtle: #F1F5F9;
      --color-text: #0F172A;
      --color-text-secondary: #64748B;
      --color-text-muted: #94A3B8;
      --color-danger: #EF4444;
      --radius-sm: 6px;
      --radius-md: 8px;
      --radius-lg: 12px;
      --transition-fast: 0.15s ease;
      --transition-base: 0.2s ease;
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
      --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
      --shadow-dropdown: 0 10px 40px rgba(0, 0, 0, 0.12);

      display: block;
      font-family: 'Outfit', sans-serif;
    }

    .layout {
      display: flex;
      min-height: 100vh;
      background: var(--color-bg);
    }

    /* ========== SIDEBAR ========== */
    .sidebar {
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      width: var(--sidebar-width);
      background: var(--color-surface);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      z-index: 100;
      transition: width var(--transition-base), transform var(--transition-base);

      /* Subtle texture */
      &::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at 20% 80%, rgba(37, 99, 235, 0.02) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(37, 99, 235, 0.015) 0%, transparent 40%);
        pointer-events: none;
      }
    }

    .sidebar--collapsed {
      width: var(--sidebar-collapsed-width);

      .logo__text,
      .nav-section__title,
      .nav-item__label,
      .user-card__info,
      .nav-section__chevron {
        opacity: 0;
        visibility: hidden;
      }

      .sidebar__toggle svg {
        transform: rotate(180deg);
      }

      .user-card {
        justify-content: center;
        padding: var(--space-sm);
      }

      .user-card__logout {
        display: none;
      }
    }

    .sidebar__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px;
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo__icon {
      width: 36px;
      height: 36px;
      color: var(--color-primary);
      flex-shrink: 0;

      svg {
        width: 100%;
        height: 100%;
      }
    }

    .logo__text {
      display: flex;
      flex-direction: column;
      transition: opacity var(--transition-base), visibility var(--transition-base);
    }

    .logo__title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
      line-height: 1.2;
      letter-spacing: -0.01em;
    }

    .logo__subtitle {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      letter-spacing: 0.02em;
    }

    .sidebar__toggle {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      color: var(--color-text-muted);
      transition: all var(--transition-fast);

      svg {
        width: 16px;
        height: 16px;
        transition: transform var(--transition-base);
      }

      &:hover {
        background: var(--color-bg);
        color: var(--color-text);
      }
    }

    .sidebar__nav {
      flex: 1;
      overflow-y: auto;
      padding: 16px 12px;

      /* Custom scrollbar */
      &::-webkit-scrollbar {
        width: 4px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      &::-webkit-scrollbar-thumb {
        background: var(--color-border);
        border-radius: 4px;
      }
    }

    .nav-section {
      margin-bottom: 8px;
    }

    .nav-section__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      width: 100%;
      border-radius: var(--radius-sm);
      transition: background var(--transition-fast);

      &:hover {
        background: var(--color-bg);
      }
    }

    .nav-section__title {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
      transition: opacity var(--transition-base), visibility var(--transition-base);
    }

    .nav-section__chevron {
      width: 14px;
      height: 14px;
      color: var(--color-text-muted);
      transition: transform var(--transition-base), opacity var(--transition-base), visibility var(--transition-base);
    }

    .nav-section__header--collapsed .nav-section__chevron {
      transform: rotate(-90deg);
    }

    .nav-section__items {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-top: 4px;
      overflow: hidden;
      max-height: 500px;
      transition: max-height 0.3s ease, opacity 0.2s ease;
    }

    .nav-section__items--collapsed {
      max-height: 0;
      opacity: 0;
      margin-top: 0;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      text-decoration: none;
      position: relative;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-bg);
        color: var(--color-text);
      }
    }

    .nav-item--active {
      background: var(--color-primary-subtle);
      color: var(--color-primary);

      .nav-item__indicator {
        opacity: 1;
        transform: scaleY(1);
      }

      .nav-item__icon {
        color: var(--color-primary);
      }
    }

    .nav-item__icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;

      :host ::ng-deep svg {
        width: 100%;
        height: 100%;
      }
    }

    .nav-item__label {
      font-size: 0.875rem;
      font-weight: 500;
      transition: opacity var(--transition-base), visibility var(--transition-base);
      white-space: nowrap;
    }

    .nav-item__indicator {
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%) scaleY(0);
      width: 3px;
      height: 20px;
      background: var(--color-primary);
      border-radius: 0 3px 3px 0;
      opacity: 0;
      transition: all var(--transition-fast);
    }

    .sidebar__footer {
      padding: 16px;
      border-top: 1px solid var(--color-border-subtle);
      margin-top: auto;
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--color-bg);
      border-radius: var(--radius-md);
      transition: all var(--transition-base);
    }

    .user-card__avatar {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, var(--color-primary) 0%, #3b82f6 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      font-weight: 600;
      flex-shrink: 0;
      text-transform: uppercase;
    }

    .user-card__info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      transition: opacity var(--transition-base), visibility var(--transition-base);
    }

    .user-card__name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-card__email {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-card__logout {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      color: var(--color-text-muted);
      transition: all var(--transition-fast);
      flex-shrink: 0;

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: rgba(239, 68, 68, 0.1);
        color: var(--color-danger);
      }
    }

    /* ========== CONTENT WRAPPER ========== */
    .content-wrapper {
      flex: 1;
      margin-left: var(--sidebar-width);
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      transition: margin-left var(--transition-base);
    }

    .sidebar--collapsed ~ .content-wrapper {
      margin-left: var(--sidebar-collapsed-width);
    }

    /* ========== HEADER ========== */
    .header {
      height: var(--header-height);
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .header__left {
      display: flex;
      align-items: center;
    }

    .breadcrumb__page {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
      letter-spacing: -0.01em;
    }

    .header__right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .notification-wrapper {
      position: relative;
      z-index: 300;
    }

    .notification-bell {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      position: relative;
      transition: all var(--transition-fast);

      svg {
        width: 20px;
        height: 20px;
        transition: transform var(--transition-fast);
      }

      &:hover {
        background: var(--color-bg);
        color: var(--color-text);

        svg {
          transform: rotate(15deg) scale(1.05);
        }
      }
    }

    .notification-bell--active {
      background: var(--color-bg);
      color: var(--color-primary);
    }

    .notification-badge {
      position: absolute;
      top: 6px;
      right: 6px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      background: var(--color-danger);
      color: white;
      font-size: 0.625rem;
      font-weight: 600;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--color-surface);
      animation: badgePop 0.3s ease;
    }

    @keyframes badgePop {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }

    .notification-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 360px;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-dropdown);
      border: 1px solid var(--color-border);
      animation: dropdownSlide 0.2s ease;
      z-index: 300;
      overflow: hidden;
    }

    @keyframes dropdownSlide {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .notification-dropdown__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border-subtle);

      span {
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--color-text);
      }
    }

    .notification-dropdown__actions {
      display: flex;
      gap: 12px;
    }

    .notification-dropdown__action {
      font-size: 0.8125rem;
      color: var(--color-primary);
      font-weight: 500;
      background: none;
      border: none;
      cursor: pointer;
      font-family: inherit;

      &:hover {
        text-decoration: underline;
      }

      &--danger {
        color: var(--color-danger);
      }
    }

    .notification-dropdown__content {
      max-height: 320px;
      overflow-y: auto;
      overflow-x: hidden;

      &::-webkit-scrollbar {
        width: 6px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      &::-webkit-scrollbar-thumb {
        background: var(--color-border);
        border-radius: 3px;
      }
    }

    .notification-dropdown__empty {
      padding: 40px 20px;
      text-align: center;
      color: var(--color-text-muted);

      svg {
        width: 40px;
        height: 40px;
        margin-bottom: 12px;
        opacity: 0.5;
      }

      p {
        font-size: 0.875rem;
      }
    }

    .notification-dropdown__list {
      padding: 8px;
    }

    .notification-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      border-radius: var(--radius-md);
      transition: background var(--transition-fast);
      cursor: pointer;

      &:hover {
        background: var(--color-bg);
      }
    }

    .notification-item--unread {
      background: var(--color-primary-subtle);
    }

    .notification-item__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-primary);
      flex-shrink: 0;
      margin-top: 6px;
    }

    .notification-item__content {
      flex: 1;
      min-width: 0;
    }

    .notification-item__title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
      margin-bottom: 2px;
    }

    .notification-item__message {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      display: block;
      margin-bottom: 4px;
      line-height: 1.4;
    }

    .notification-item__time {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .notification-item__dot--read {
      opacity: 0;
    }

    .notification-dropdown__count {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .notification-dropdown__footer {
      padding: 12px 20px;
      border-top: 1px solid var(--color-border-subtle);
      text-align: center;

      a {
        font-size: 0.8125rem;
        color: var(--color-primary);
        font-weight: 500;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    .header-avatar {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, #64748B 0%, #475569 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .header-avatar__initial {
      color: white;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    /* ========== MAIN CONTENT ========== */
    .main-content {
      flex: 1;
      overflow-y: auto;
    }

    /* ========== RESPONSIVE ========== */
    @media (max-width: 1024px) {
      .sidebar {
        transform: translateX(-100%);

        &:not(.sidebar--collapsed) {
          transform: translateX(0);
        }
      }

      .content-wrapper {
        margin-left: 0;
      }

      .sidebar--collapsed ~ .content-wrapper {
        margin-left: 0;
      }
    }
  `]
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  notificationService = inject(AppNotificationService);
  private aiSettingsService = inject(AISettingsService);
  private routerSubscription?: Subscription;

  sidebarCollapsed = signal(false);
  notificationsOpen = signal(false);
  currentRoute = signal('');

  user = this.authService.user;
  isAdmin = this.authService.isAdmin;
  aiEnabled = this.aiSettingsService.aiEnabled;

  navSections = computed<NavSection[]>(() => {
    const baseNav: NavSection[] = [
      {
        title: 'Main',
        collapsed: false,
        items: [
          {
            label: 'Dashboard',
            route: '/dashboard',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
            exactMatch: true
          }
        ]
      },
      {
        title: 'Tasks',
        collapsed: false,
        items: [
          {
            label: 'Invoice Tasks',
            route: '/tasks/invoices',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
          },
          {
            label: 'Reminders',
            route: '/tasks/reminders',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
          }
        ]
      },
      {
        title: 'Documents',
        collapsed: false,
        items: [
          {
            label: 'Invoices',
            route: '/invoices',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>'
          }
        ]
      },
      {
        title: 'Settings',
        collapsed: false,
        items: [
          {
            label: 'Profile',
            route: '/profile',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
          },
          {
            label: 'CRM Integrations',
            route: '/settings/crm',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>'
          },
          {
            label: 'Bank Accounts',
            route: '/settings/bank-accounts',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 6l7-3 7 3"/><path d="M4 10v11"/><path d="M20 10v11"/><path d="M8 10v11"/><path d="M12 10v11"/><path d="M16 10v11"/></svg>'
          },
          // AI Settings - only shown to admins
          ...(this.isAdmin() ? [{
            label: 'AI Settings',
            route: '/settings/ai',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11h3a3 3 0 0 1 3 3v1.5a1.5 1.5 0 0 1-3 0V14h-2v4.5a1.5 1.5 0 0 1-3 0V14h-2v1.5a1.5 1.5 0 0 1-3 0V14a3 3 0 0 1 3-3h3V9.5A4 4 0 0 1 8 6a4 4 0 0 1 4-4z"/><circle cx="12" cy="6" r="1"/></svg>'
          }] : []),
          // Google Integration - only shown to admins
          ...(this.isAdmin() ? [{
            label: 'Google Integration',
            route: '/settings/google',
            icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>'
          }] : [])
        ]
      }
    ];
    return baseNav;
  });

  pageTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/tasks/invoices': 'Invoice Tasks',
    '/tasks/reminders': 'Reminders',
    '/tasks/new': 'New Task',
    '/invoices': 'Invoices',
    '/profile': 'Profile',
    '/settings/crm': 'CRM Integrations',
    '/settings/bank-accounts': 'Bank Accounts',
    '/settings/ai': 'AI Settings',
    '/settings/google': 'Google Integration'
  };

  // Track section collapse state separately since navSections is computed
  sectionCollapseState = signal<Record<string, boolean>>({});

  currentPageTitle = computed(() => {
    const route = this.currentRoute();
    // Check for exact match first
    if (this.pageTitles[route]) {
      return this.pageTitles[route];
    }
    // Check for partial matches
    for (const [path, title] of Object.entries(this.pageTitles)) {
      if (route.startsWith(path)) {
        return title;
      }
    }
    return 'Daily Helper';
  });

  userName = computed(() => this.user()?.name || 'User');
  userEmail = computed(() => this.user()?.email || '');
  userInitial = computed(() => {
    const name = this.user()?.name;
    return name ? name.charAt(0).toUpperCase() : 'U';
  });

  ngOnInit(): void {
    this.currentRoute.set(this.router.url);

    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentRoute.set((event as NavigationEnd).urlAfterRedirects);
      });

    // Fetch AI settings status to determine if chat should be shown
    this.aiSettingsService.fetchPublicStatus();
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  toggleSection(section: NavSection): void {
    this.sectionCollapseState.update(state => ({
      ...state,
      [section.title]: !this.isSectionCollapsed(section.title)
    }));
  }

  isSectionCollapsed(title: string): boolean {
    return this.sectionCollapseState()[title] ?? false;
  }

  toggleNotifications(): void {
    this.notificationsOpen.update(v => !v);
  }

  markAllRead(): void {
    this.notificationService.markAllAsRead().subscribe();
  }

  clearAllNotifications(): void {
    this.notificationService.clearAll().subscribe();
  }

  openNotification(notification: AppNotification): void {
    // Mark as read
    if (notification.status !== 'READ') {
      this.notificationService.markAsRead(notification.id).subscribe();
    }

    // Close dropdown
    this.notificationsOpen.set(false);

    // Navigate to related task if exists
    if (notification.taskId) {
      this.router.navigate(['/tasks/reminders', notification.taskId]);
    }
  }

  logout(): void {
    this.authService.logout();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.notificationsOpen()) {
      this.notificationsOpen.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // Check if click is outside notification wrapper
    if (this.notificationsOpen() && !target.closest('.notification-wrapper')) {
      this.notificationsOpen.set(false);
    }
  }
}
