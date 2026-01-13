import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { filter } from 'rxjs';

interface SettingsNavItem {
  labelKey: string;
  route: string;
  icon: string;
  descriptionKey: string;
}

@Component({
  selector: 'app-settings-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslateModule],
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
            <h1 class="sidebar-header__title">{{ 'settings.layout.title' | translate }}</h1>
            <p class="sidebar-header__subtitle">{{ 'settings.layout.subtitle' | translate }}</p>
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
                <span class="nav-item__label">{{ item.labelKey | translate }}</span>
                <span class="nav-item__description">{{ item.descriptionKey | translate }}</span>
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
            {{ 'common.backToDashboard' | translate }}
          </a>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="settings-content">
        <header class="content-header">
          <div class="breadcrumb">
            <span class="breadcrumb__root">{{ 'settings.layout.title' | translate }}</span>
            <svg class="breadcrumb__separator" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <span class="breadcrumb__current">{{ currentSectionNameKey() | translate }}</span>
          </div>
        </header>

        <div class="content-body">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: var(--font-body);
    }

    .settings-layout {
      display: flex;
      min-height: 100vh;
      background: var(--color-bg);
      position: relative;
      overflow: hidden;
      transition: background-color var(--transition-slow);
    }

    /* Ambient glow effects */
    .ambient-glow {
      position: fixed;
      pointer-events: none;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.3;
      z-index: 0;
    }

    .ambient-glow--top {
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, var(--color-primary-subtle) 0%, transparent 70%);
      top: -200px;
      left: 10%;
      animation: ambientFloat 20s ease-in-out infinite;
    }

    .ambient-glow--bottom {
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, var(--color-info-subtle) 0%, transparent 70%);
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
      width: 260px;
      background: var(--color-surface);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 10;
      animation: slideInLeft 0.4s ease-out;
      transition: background-color var(--transition-slow), border-color var(--transition-slow);
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
      padding: var(--space-2xl) var(--space-xl);
      border-bottom: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      gap: var(--space-md);
      transition: border-color var(--transition-slow);
    }

    .sidebar-header__icon {
      width: 44px;
      height: 44px;
      background: var(--color-primary);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;

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
      transition: color var(--transition-slow);
    }

    .sidebar-header__subtitle {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      margin: 2px 0 0;
      transition: color var(--transition-slow);
    }

    /* Navigation */
    .settings-nav {
      flex: 1;
      padding: var(--space-lg) var(--space-md);
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      padding: var(--space-md) var(--space-lg);
      border-radius: var(--radius-md);
      text-decoration: none;
      position: relative;
      transition: all var(--transition-fast);
      animation: fadeSlideIn 0.4s ease-out both;

      &:hover {
        background: var(--color-fill-quaternary);

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
      color: var(--color-text-tertiary);
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
      color: var(--color-text-tertiary);
      margin-top: 2px;
      transition: color var(--transition-slow);
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
      padding: var(--space-lg) var(--space-md);
      border-top: 1px solid var(--color-border);
      transition: border-color var(--transition-slow);
    }

    .back-link {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-md) var(--space-lg);
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
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
        background: var(--color-fill-quaternary);
        color: var(--color-text);

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
      height: 72px;
      padding: 0 var(--space-3xl);
      border-bottom: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      background: var(--color-surface);
      transition: background-color var(--transition-slow), border-color var(--transition-slow);
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .breadcrumb__root {
      font-size: 0.875rem;
      color: var(--color-text-tertiary);
      font-weight: 500;
      transition: color var(--transition-slow);
    }

    .breadcrumb__separator {
      width: 14px;
      height: 14px;
      color: var(--color-text-tertiary);
      transition: color var(--transition-slow);
    }

    .breadcrumb__current {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
      transition: color var(--transition-slow);
    }

    .content-body {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-3xl);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .settings-layout {
        flex-direction: column;
      }

      .settings-sidebar {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid var(--color-border);
      }

      .settings-nav {
        flex-direction: row;
        overflow-x: auto;
        gap: var(--space-sm);
        padding: var(--space-md);

        &::-webkit-scrollbar {
          display: none;
        }
      }

      .nav-item {
        flex-direction: column;
        align-items: center;
        padding: var(--space-md) var(--space-lg);
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
        padding: var(--space-xl) var(--space-lg);
      }
    }
  `]
})
export class SettingsLayoutComponent {
  private router = inject(Router);

  currentRoute = signal('');

  navItems: SettingsNavItem[] = [
    {
      labelKey: 'settings.nav.profile',
      route: '/settings/profile',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      descriptionKey: 'settings.nav.profileDescription'
    },
    {
      labelKey: 'settings.nav.crm',
      route: '/settings/crm',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
      descriptionKey: 'settings.nav.crmDescription'
    }
  ];

  sectionNameKeys: Record<string, string> = {
    '/settings/profile': 'settings.nav.profile',
    '/settings/crm': 'settings.nav.crm'
  };

  currentSectionNameKey = computed(() => {
    const route = this.currentRoute();
    return this.sectionNameKeys[route] || 'settings.layout.title';
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
