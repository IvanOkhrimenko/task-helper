import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

interface SettingsNavItem {
  label: string;
  route: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-settings-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="settings-layout">
      <!-- Ambient background effects -->
      <div class="ambient-glow ambient-glow--top"></div>
      <div class="ambient-glow ambient-glow--bottom"></div>

      <!-- Settings Sidebar -->
      <aside class="settings-sidebar">
        <div class="sidebar-header">
          <div class="sidebar-header__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </div>
          <div class="sidebar-header__text">
            <h1 class="sidebar-header__title">Settings</h1>
            <p class="sidebar-header__subtitle">Manage your preferences</p>
          </div>
        </div>

        <nav class="settings-nav">
          @for (item of navItems; track item.route; let i = $index) {
            <a
              class="nav-item"
              [routerLink]="item.route"
              routerLinkActive="nav-item--active"
              [style.animation-delay]="(i * 50) + 'ms'"
            >
              <span class="nav-item__icon" [innerHTML]="item.icon"></span>
              <div class="nav-item__content">
                <span class="nav-item__label">{{ item.label }}</span>
                <span class="nav-item__description">{{ item.description }}</span>
              </div>
              <span class="nav-item__indicator"></span>
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <a routerLink="/dashboard" class="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to Dashboard
          </a>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="settings-content">
        <header class="content-header">
          <div class="breadcrumb">
            <span class="breadcrumb__root">Settings</span>
            <svg class="breadcrumb__separator" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <span class="breadcrumb__current">{{ currentSectionName() }}</span>
          </div>
        </header>

        <div class="content-body">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

    :host {
      --color-bg: #0a0a0f;
      --color-surface: #12121a;
      --color-surface-elevated: #1a1a24;
      --color-border: #2a2a35;
      --color-border-subtle: #1e1e28;
      --color-primary: #e07a3a;
      --color-primary-hover: #f08a4a;
      --color-primary-subtle: rgba(224, 122, 58, 0.1);
      --color-primary-glow: rgba(224, 122, 58, 0.15);
      --color-text: #f5f5f5;
      --color-text-secondary: #a0a0a8;
      --color-text-muted: #6b7280;
      --sidebar-width: 260px;
      --header-height: 72px;
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 14px;
      --transition-fast: 0.15s ease;
      --transition-base: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      --font-display: 'DM Sans', sans-serif;

      display: block;
      font-family: var(--font-display);
    }

    .settings-layout {
      display: flex;
      min-height: 100vh;
      background: var(--color-bg);
      position: relative;
      overflow: hidden;
    }

    /* Ambient glow effects */
    .ambient-glow {
      position: fixed;
      pointer-events: none;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.4;
      z-index: 0;
    }

    .ambient-glow--top {
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, var(--color-primary-glow) 0%, transparent 70%);
      top: -200px;
      left: 10%;
      animation: ambientFloat 20s ease-in-out infinite;
    }

    .ambient-glow--bottom {
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
      bottom: -100px;
      right: 5%;
      animation: ambientFloat 25s ease-in-out infinite reverse;
    }

    @keyframes ambientFloat {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(30px, 20px); }
    }

    /* Sidebar */
    .settings-sidebar {
      width: var(--sidebar-width);
      background: var(--color-surface);
      border-right: 1px solid var(--color-border-subtle);
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 10;
      animation: slideInLeft 0.4s ease-out;
    }

    @keyframes slideInLeft {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .sidebar-header {
      padding: 28px 24px;
      border-bottom: 1px solid var(--color-border-subtle);
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .sidebar-header__icon {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, var(--color-primary) 0%, #d06830 100%);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px var(--color-primary-glow);

      svg {
        width: 22px;
        height: 22px;
        color: white;
      }
    }

    .sidebar-header__text {
      flex: 1;
    }

    .sidebar-header__title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0;
      letter-spacing: -0.02em;
    }

    .sidebar-header__subtitle {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      margin: 2px 0 0;
    }

    /* Navigation */
    .settings-nav {
      flex: 1;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-radius: var(--radius-md);
      text-decoration: none;
      position: relative;
      transition: all var(--transition-base);
      animation: fadeSlideIn 0.4s ease-out both;

      &:hover {
        background: var(--color-surface-elevated);

        .nav-item__icon {
          color: var(--color-primary);
          transform: scale(1.05);
        }

        .nav-item__label {
          color: var(--color-text);
        }
      }
    }

    @keyframes fadeSlideIn {
      from {
        opacity: 0;
        transform: translateX(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .nav-item--active {
      background: var(--color-primary-subtle);

      .nav-item__icon {
        color: var(--color-primary);
      }

      .nav-item__label {
        color: var(--color-text);
        font-weight: 600;
      }

      .nav-item__indicator {
        opacity: 1;
        transform: scaleY(1);
      }
    }

    .nav-item__icon {
      width: 20px;
      height: 20px;
      color: var(--color-text-muted);
      flex-shrink: 0;
      transition: all var(--transition-fast);

      :host ::ng-deep svg {
        width: 100%;
        height: 100%;
      }
    }

    .nav-item__content {
      flex: 1;
      min-width: 0;
    }

    .nav-item__label {
      display: block;
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      transition: color var(--transition-fast);
    }

    .nav-item__description {
      display: block;
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin-top: 2px;
    }

    .nav-item__indicator {
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%) scaleY(0);
      width: 3px;
      height: 24px;
      background: var(--color-primary);
      border-radius: 0 3px 3px 0;
      opacity: 0;
      transition: all var(--transition-fast);
    }

    /* Sidebar Footer */
    .sidebar-footer {
      padding: 16px 12px;
      border-top: 1px solid var(--color-border-subtle);
    }

    .back-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: var(--radius-md);
      color: var(--color-text-muted);
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;
      transition: all var(--transition-fast);

      svg {
        width: 18px;
        height: 18px;
        transition: transform var(--transition-fast);
      }

      &:hover {
        background: var(--color-surface-elevated);
        color: var(--color-text-secondary);

        svg {
          transform: translateX(-3px);
        }
      }
    }

    /* Main Content */
    .settings-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 5;
      animation: fadeIn 0.5s ease-out 0.2s both;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .content-header {
      height: var(--header-height);
      padding: 0 32px;
      border-bottom: 1px solid var(--color-border-subtle);
      display: flex;
      align-items: center;
      background: var(--color-surface);
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .breadcrumb__root {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      font-weight: 500;
    }

    .breadcrumb__separator {
      width: 14px;
      height: 14px;
      color: var(--color-text-muted);
    }

    .breadcrumb__current {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
    }

    .content-body {
      flex: 1;
      overflow-y: auto;
      padding: 32px;

      /* Custom scrollbar */
      &::-webkit-scrollbar {
        width: 8px;
      }
      &::-webkit-scrollbar-track {
        background: var(--color-bg);
      }
      &::-webkit-scrollbar-thumb {
        background: var(--color-border);
        border-radius: 4px;

        &:hover {
          background: var(--color-text-muted);
        }
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .settings-layout {
        flex-direction: column;
      }

      .settings-sidebar {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid var(--color-border-subtle);
      }

      .settings-nav {
        flex-direction: row;
        overflow-x: auto;
        gap: 8px;
        padding: 12px;

        &::-webkit-scrollbar {
          display: none;
        }
      }

      .nav-item {
        flex-direction: column;
        align-items: center;
        padding: 12px 16px;
        min-width: max-content;
        text-align: center;
      }

      .nav-item__content {
        text-align: center;
      }

      .nav-item__description {
        display: none;
      }

      .nav-item__indicator {
        top: auto;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%) scaleX(0);
        width: 24px;
        height: 3px;
        border-radius: 3px 3px 0 0;
      }

      .nav-item--active .nav-item__indicator {
        transform: translateX(-50%) scaleX(1);
      }

      .sidebar-footer {
        display: none;
      }

      .content-body {
        padding: 20px 16px;
      }
    }
  `]
})
export class SettingsLayoutComponent {
  private router = inject(Router);

  currentRoute = signal('');

  navItems: SettingsNavItem[] = [
    {
      label: 'Profile',
      route: '/settings/profile',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      description: 'Personal information'
    },
    {
      label: 'CRM Integrations',
      route: '/settings/crm',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
      description: 'External CRM systems'
    },
    {
      label: 'Bank Accounts',
      route: '/settings/bank-accounts',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
      description: 'Payment details'
    }
  ];

  sectionNames: Record<string, string> = {
    '/settings/profile': 'Profile',
    '/settings/crm': 'CRM Integrations',
    '/settings/bank-accounts': 'Bank Accounts'
  };

  currentSectionName = computed(() => {
    const route = this.currentRoute();
    return this.sectionNames[route] || 'Settings';
  });

  constructor() {
    this.currentRoute.set(this.router.url);

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentRoute.set((event as NavigationEnd).urlAfterRedirects);
      });
  }
}
