import { Component, inject, signal, computed, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { AppNotificationService, AppNotification } from '../../core/services/app-notification.service';
import { AISettingsService } from '../../core/services/ai-settings.service';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageService } from '../../core/services/language.service';
import { ChatComponent } from '../../features/chat/chat.component';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { filter, Subscription } from 'rxjs';

interface NavItem {
  labelKey: string;
  route: string;
  icon: string;
  exactMatch?: boolean;
}

interface NavSection {
  titleKey: string;
  items: NavItem[];
  collapsed: boolean;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslateModule, ChatComponent, LanguageSwitcherComponent],
  template: `
    <div class="layout">
      <!-- Mobile Overlay -->
      @if (mobileMenuOpen()) {
        <div class="mobile-overlay" (click)="closeMobileMenu()"></div>
      }

      <!-- Sidebar -->
      <aside class="sidebar" [class.sidebar--collapsed]="sidebarCollapsed()" [class.sidebar--mobile-open]="mobileMenuOpen()">
        <div class="sidebar__header">
          <div class="logo">
            <div class="logo__icon">
              <svg viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="currentColor"/>
                <circle cx="16" cy="16" r="8" stroke="white" stroke-width="2" fill="none"/>
                <path d="M16 10V16L20 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="16" cy="6" r="1.5" fill="white"/>
              </svg>
            </div>
            <div class="logo__text">
              <span class="logo__title">Daylium</span>
              <span class="logo__subtitle">Invoice & Tasks</span>
            </div>
          </div>
          <button class="sidebar__toggle" (click)="toggleSidebar()" title="Toggle sidebar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7"/>
            </svg>
          </button>
        </div>

        <nav class="sidebar__nav">
          @for (section of navSections(); track section.titleKey) {
            <div class="nav-section">
              <button
                class="nav-section__header"
                (click)="toggleSection(section)"
                [class.nav-section__header--collapsed]="isSectionCollapsed(section.titleKey)"
              >
                <span class="nav-section__title">{{ section.titleKey | translate }}</span>
                <svg class="nav-section__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              <div class="nav-section__items" [class.nav-section__items--collapsed]="isSectionCollapsed(section.titleKey)">
                @for (item of section.items; track item.route) {
                  <a
                    class="nav-item"
                    [routerLink]="item.route"
                    routerLinkActive="nav-item--active"
                    [routerLinkActiveOptions]="{ exact: item.exactMatch ?? false }"
                    (click)="closeMobileMenu()"
                  >
                    <span class="nav-item__icon" [innerHTML]="item.icon"></span>
                    <span class="nav-item__label">{{ item.labelKey | translate }}</span>
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
            <!-- Mobile Menu Button -->
            <button class="mobile-menu-btn" (click)="toggleMobileMenu()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div class="breadcrumb">
              <span class="breadcrumb__page">{{ currentPageTitleKey() | translate }}</span>
            </div>
          </div>

          <div class="header__right">
            <!-- Language Switcher -->
            <app-language-switcher />

            <!-- Theme Toggle -->
            <button class="theme-toggle" (click)="themeService.cycle()" [title]="'Theme: ' + themeService.mode()">
              @if (themeService.currentTheme() === 'light') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              }
              @if (themeService.mode() === 'system') {
                <span class="theme-toggle__badge">A</span>
              }
            </button>

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
    :host {
      --sidebar-width: 260px;
      --sidebar-collapsed-width: 72px;
      --header-height: 56px;

      display: block;
      font-family: var(--font-body);
    }

    .layout {
      display: flex;
      min-height: 100vh;
      background: var(--color-bg);
      transition: background-color var(--transition-slow);
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
      transition: width var(--transition-base), background-color var(--transition-slow), border-color var(--transition-slow);
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
      padding: var(--space-lg) var(--space-lg);
      border-bottom: 1px solid var(--color-border);
      transition: border-color var(--transition-slow);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: var(--space-md);
    }

    .logo__icon {
      width: 32px;
      height: 32px;
      color: var(--color-primary);
      flex-shrink: 0;
      transition: color var(--transition-slow);

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
      transition: color var(--transition-slow);
    }

    .logo__subtitle {
      font-size: 0.6875rem;
      color: var(--color-text-tertiary);
      letter-spacing: 0.01em;
      transition: color var(--transition-slow);
    }

    .sidebar__toggle {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      color: var(--color-text-secondary);
      background: transparent;
      transition: all var(--transition-fast);

      svg {
        width: 14px;
        height: 14px;
        transition: transform var(--transition-base);
      }

      &:hover {
        background: var(--color-fill-tertiary);
        color: var(--color-text);
      }
    }

    .sidebar__nav {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-md) var(--space-sm);
    }

    .nav-section {
      margin-bottom: var(--space-sm);
    }

    .nav-section__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-sm) var(--space-md);
      width: 100%;
      border-radius: var(--radius-sm);
      background: transparent;
      transition: background var(--transition-fast);

      &:hover {
        background: var(--color-fill-quaternary);
      }
    }

    .nav-section__title {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-text-tertiary);
      transition: opacity var(--transition-base), visibility var(--transition-base), color var(--transition-slow);
    }

    .nav-section__chevron {
      width: 12px;
      height: 12px;
      color: var(--color-text-tertiary);
      transition: transform var(--transition-base), opacity var(--transition-base), visibility var(--transition-base), color var(--transition-slow);
    }

    .nav-section__header--collapsed .nav-section__chevron {
      transform: rotate(-90deg);
    }

    .nav-section__items {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-top: var(--space-xs);
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
      gap: var(--space-md);
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      text-decoration: none;
      position: relative;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-fill-quaternary);
        color: var(--color-text);
      }
    }

    .nav-item--active {
      background: var(--color-fill-tertiary);
      color: var(--color-text);

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
      transition: color var(--transition-fast);

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

    .sidebar__footer {
      padding: var(--space-md);
      border-top: 1px solid var(--color-border);
      margin-top: auto;
      transition: border-color var(--transition-slow);
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      padding: var(--space-md);
      background: var(--color-fill-quaternary);
      border-radius: var(--radius-md);
      transition: all var(--transition-base);
    }

    .user-card__avatar {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: var(--color-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      font-weight: 600;
      flex-shrink: 0;
      text-transform: uppercase;
      transition: background-color var(--transition-slow);
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
      transition: color var(--transition-slow);
    }

    .user-card__email {
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: color var(--transition-slow);
    }

    .user-card__logout {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      color: var(--color-text-secondary);
      background: transparent;
      transition: all var(--transition-fast);
      flex-shrink: 0;

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: var(--color-danger-subtle);
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
      padding: 0 var(--space-xl);
      position: sticky;
      top: 0;
      z-index: 50;
      transition: background-color var(--transition-slow), border-color var(--transition-slow);
    }

    .header__left {
      display: flex;
      align-items: center;
    }

    .breadcrumb__page {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
      letter-spacing: -0.01em;
      transition: color var(--transition-slow);
    }

    .header__right {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    /* Theme Toggle */
    .theme-toggle {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      background: transparent;
      position: relative;
      transition: all var(--transition-fast);

      svg {
        width: 20px;
        height: 20px;
        transition: transform var(--transition-base);
      }

      &:hover {
        background: var(--color-fill-tertiary);
        color: var(--color-text);

        svg {
          transform: rotate(15deg);
        }
      }
    }

    .theme-toggle__badge {
      position: absolute;
      bottom: 4px;
      right: 4px;
      width: 14px;
      height: 14px;
      background: var(--color-primary);
      color: white;
      font-size: 0.5rem;
      font-weight: 700;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--color-surface);
    }

    .notification-wrapper {
      position: relative;
      z-index: 300;
    }

    .notification-bell {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      background: transparent;
      position: relative;
      transition: all var(--transition-fast);

      svg {
        width: 20px;
        height: 20px;
        transition: transform var(--transition-fast);
      }

      &:hover {
        background: var(--color-fill-tertiary);
        color: var(--color-text);

        svg {
          transform: rotate(15deg) scale(1.05);
        }
      }
    }

    .notification-bell--active {
      background: var(--color-fill-tertiary);
      color: var(--color-primary);
    }

    .notification-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      background: var(--color-danger);
      color: white;
      font-size: 0.625rem;
      font-weight: 600;
      border-radius: var(--radius-full);
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
      box-shadow: var(--shadow-xl);
      border: 1px solid var(--color-border);
      animation: dropdownSlide 0.2s ease;
      z-index: 300;
      overflow: hidden;
      transition: background-color var(--transition-slow), border-color var(--transition-slow);
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
      padding: var(--space-lg) var(--space-xl);
      border-bottom: 1px solid var(--color-border);
      transition: border-color var(--transition-slow);

      span {
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--color-text);
        transition: color var(--transition-slow);
      }
    }

    .notification-dropdown__actions {
      display: flex;
      gap: var(--space-md);
    }

    .notification-dropdown__action {
      font-size: 0.8125rem;
      color: var(--color-primary);
      font-weight: 500;
      background: none;
      border: none;
      cursor: pointer;
      font-family: inherit;
      transition: color var(--transition-slow);

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
    }

    .notification-dropdown__empty {
      padding: 40px var(--space-xl);
      text-align: center;
      color: var(--color-text-tertiary);
      transition: color var(--transition-slow);

      svg {
        width: 40px;
        height: 40px;
        margin-bottom: var(--space-md);
        opacity: 0.5;
      }

      p {
        font-size: 0.875rem;
      }
    }

    .notification-dropdown__list {
      padding: var(--space-sm);
    }

    .notification-item {
      display: flex;
      align-items: flex-start;
      gap: var(--space-md);
      padding: var(--space-md);
      border-radius: var(--radius-md);
      transition: background var(--transition-fast);
      cursor: pointer;

      &:hover {
        background: var(--color-fill-quaternary);
      }
    }

    .notification-item--unread {
      background: var(--color-primary-subtle);
    }

    .notification-item__dot {
      width: 8px;
      height: 8px;
      border-radius: var(--radius-full);
      background: var(--color-primary);
      flex-shrink: 0;
      margin-top: 6px;
      transition: background-color var(--transition-slow);
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
      transition: color var(--transition-slow);
    }

    .notification-item__message {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      display: block;
      margin-bottom: var(--space-xs);
      line-height: 1.4;
      transition: color var(--transition-slow);
    }

    .notification-item__time {
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
      transition: color var(--transition-slow);
    }

    .notification-item__dot--read {
      opacity: 0;
    }

    .notification-dropdown__count {
      font-size: 0.8125rem;
      color: var(--color-text-tertiary);
      transition: color var(--transition-slow);
    }

    .notification-dropdown__footer {
      padding: var(--space-md) var(--space-xl);
      border-top: 1px solid var(--color-border);
      text-align: center;
      transition: border-color var(--transition-slow);

      a {
        font-size: 0.8125rem;
        color: var(--color-primary);
        font-weight: 500;
        text-decoration: none;
        transition: color var(--transition-slow);

        &:hover {
          text-decoration: underline;
        }
      }
    }

    .header-avatar {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      background: var(--color-fill-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color var(--transition-slow);
    }

    .header-avatar__initial {
      color: var(--color-text-secondary);
      font-size: 0.8125rem;
      font-weight: 600;
      text-transform: uppercase;
      transition: color var(--transition-slow);
    }

    /* ========== MAIN CONTENT ========== */
    .main-content {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-lg);

      @media (max-width: 767px) {
        padding: var(--space-md);
      }
    }

    /* ========== MOBILE OVERLAY ========== */
    .mobile-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 90;
      animation: fadeIn 0.2s ease;

      @media (max-width: 767px) {
        display: block;
      }
    }

    /* ========== MOBILE MENU BUTTON ========== */
    .mobile-menu-btn {
      display: none;
      width: 40px;
      height: 40px;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      color: var(--color-text);
      background: transparent;
      margin-right: var(--space-sm);
      flex-shrink: 0;
      transition: background var(--transition-fast);

      svg {
        width: 22px;
        height: 22px;
      }

      &:hover {
        background: var(--color-fill-tertiary);
      }

      @media (max-width: 767px) {
        display: flex;
      }
    }

    /* ========== RESPONSIVE ========== */
    @media (max-width: 767px) {
      .sidebar {
        position: fixed;
        transform: translateX(-100%);
        width: 280px;
        z-index: 100;
        box-shadow: var(--shadow-xl);
      }

      .sidebar--mobile-open {
        transform: translateX(0);
      }

      .sidebar--collapsed {
        width: 280px;

        .logo__text,
        .nav-section__title,
        .nav-item__label,
        .user-card__info,
        .nav-section__chevron {
          opacity: 1;
          visibility: visible;
        }

        .sidebar__toggle svg {
          transform: rotate(0);
        }

        .user-card {
          justify-content: flex-start;
          padding: var(--space-md);
        }

        .user-card__logout {
          display: flex;
        }
      }

      .sidebar__toggle {
        display: none;
      }

      .content-wrapper {
        margin-left: 0 !important;
      }

      .header {
        padding: 0 var(--space-md);
      }

      .header__left {
        flex: 1;
        min-width: 0;
      }

      .breadcrumb__page {
        font-size: 0.9375rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .header__right {
        gap: var(--space-xs);
      }

      .theme-toggle,
      .notification-bell {
        width: 40px;
        height: 40px;
      }

      .header-avatar {
        display: none;
      }

      .notification-dropdown {
        position: fixed;
        top: auto;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        max-height: 70vh;
        border-radius: var(--radius-xl) var(--radius-xl) 0 0;
        animation: slideUpSheet 0.3s ease;
      }

      .main-content {
        padding-bottom: calc(var(--space-xl) + env(safe-area-inset-bottom));
      }
    }

    @media (min-width: 768px) and (max-width: 1023px) {
      .sidebar {
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

      .content-wrapper {
        margin-left: var(--sidebar-collapsed-width);
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUpSheet {
      from {
        transform: translateY(100%);
      }
      to {
        transform: translateY(0);
      }
    }
  `]
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  notificationService = inject(AppNotificationService);
  private aiSettingsService = inject(AISettingsService);
  themeService = inject(ThemeService);
  private routerSubscription?: Subscription;

  sidebarCollapsed = signal(false);
  mobileMenuOpen = signal(false);
  notificationsOpen = signal(false);
  currentRoute = signal('');

  user = this.authService.user;
  isAdmin = this.authService.isAdmin;
  aiEnabled = this.aiSettingsService.aiEnabled;

  navSections = computed<NavSection[]>(() => {
    const baseNav: NavSection[] = [
      {
        titleKey: 'nav.sections.main',
        collapsed: false,
        items: [
          {
            labelKey: 'nav.dashboard',
            route: '/dashboard',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
            exactMatch: true
          },
          {
            labelKey: 'nav.clients',
            route: '/clients',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
          }
        ]
      },
      {
        titleKey: 'nav.sections.tasks',
        collapsed: false,
        items: [
          {
            labelKey: 'nav.invoiceTasks',
            route: '/tasks/invoices',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
          },
          {
            labelKey: 'nav.reminders',
            route: '/tasks/reminders',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
          }
        ]
      },
      {
        titleKey: 'nav.sections.documents',
        collapsed: false,
        items: [
          {
            labelKey: 'nav.invoices',
            route: '/invoices',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>'
          }
        ]
      },
      {
        titleKey: 'nav.sections.finance',
        collapsed: false,
        items: [
          {
            labelKey: 'nav.taxes',
            route: '/taxes',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>'
          },
          {
            labelKey: 'nav.expenses',
            route: '/expenses',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'
          }
        ]
      },
      {
        titleKey: 'nav.sections.business',
        collapsed: false,
        items: [
          {
            labelKey: 'nav.myBusinesses',
            route: '/business',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
            exactMatch: true
          }
        ]
      },
      {
        titleKey: 'nav.sections.settings',
        collapsed: false,
        items: [
          {
            labelKey: 'nav.profile',
            route: '/profile',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
          },
          {
            labelKey: 'nav.crmIntegrations',
            route: '/settings/crm',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>'
          },
          // AI Settings - only shown to admins
          ...(this.isAdmin() ? [{
            labelKey: 'nav.aiSettings',
            route: '/settings/ai',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11h3a3 3 0 0 1 3 3v1.5a1.5 1.5 0 0 1-3 0V14h-2v4.5a1.5 1.5 0 0 1-3 0V14h-2v1.5a1.5 1.5 0 0 1-3 0V14a3 3 0 0 1 3-3h3V9.5A4 4 0 0 1 8 6a4 4 0 0 1 4-4z"/><circle cx="12" cy="6" r="1"/></svg>'
          }] : []),
          // Google Integration - only shown to admins
          ...(this.isAdmin() ? [{
            labelKey: 'nav.googleIntegration',
            route: '/settings/google',
            icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>'
          }] : [])
        ]
      }
    ];
    return baseNav;
  });

  pageTitleKeys: Record<string, string> = {
    '/dashboard': 'pages.dashboard',
    '/clients': 'pages.clients',
    '/clients/new': 'pages.newClient',
    '/tasks/invoices': 'pages.invoiceTasks',
    '/tasks/reminders': 'pages.reminders',
    '/tasks/new': 'pages.newTask',
    '/invoices': 'pages.invoices',
    '/taxes': 'pages.taxes',
    '/expenses': 'pages.expenses',
    '/expenses/new': 'pages.newExpense',
    '/settings/taxes': 'pages.taxSettings',
    '/profile': 'pages.profile',
    '/settings/crm': 'pages.crmIntegrations',
    '/settings/ai': 'pages.aiSettings',
    '/settings/google': 'pages.googleIntegration',
    '/business': 'pages.myBusinesses',
    '/business/new': 'pages.newBusiness'
  };

  // Track section collapse state separately since navSections is computed
  sectionCollapseState = signal<Record<string, boolean>>({});

  currentPageTitleKey = computed(() => {
    const route = this.currentRoute();
    // Check for exact match first
    if (this.pageTitleKeys[route]) {
      return this.pageTitleKeys[route];
    }
    // Check for partial matches
    for (const [path, titleKey] of Object.entries(this.pageTitleKeys)) {
      if (route.startsWith(path)) {
        return titleKey;
      }
    }
    return 'app.name';
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

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleSection(section: NavSection): void {
    this.sectionCollapseState.update(state => ({
      ...state,
      [section.titleKey]: !this.isSectionCollapsed(section.titleKey)
    }));
  }

  isSectionCollapsed(titleKey: string): boolean {
    return this.sectionCollapseState()[titleKey] ?? false;
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
