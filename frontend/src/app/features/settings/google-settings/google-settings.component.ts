import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { IntegrationsService, UpdateIntegrationSettings } from '../../../core/services/integrations.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastComponent } from '../../../shared/components/toast/toast.component';

@Component({
  selector: 'app-google-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ToastComponent, TranslateModule],
  template: `
    <app-toast />
    <div class="google-settings-page">
      <!-- Decorative background with Google colors accent -->
      <div class="bg-pattern"></div>
      <div class="bg-orbs">
        <div class="orb orb--blue"></div>
        <div class="orb orb--red"></div>
        <div class="orb orb--yellow"></div>
        <div class="orb orb--green"></div>
      </div>

      <div class="container">
        <header class="page-header">
          <a routerLink="/dashboard" class="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            {{ 'common.backToDashboard' | translate }}
          </a>
          <div class="header-content">
            <div class="header-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <div>
              <h1 class="page-title">{{ 'settings.google.title' | translate }}</h1>
              <p class="page-subtitle">{{ 'settings.google.subtitle' | translate }}</p>
            </div>
            <div class="status-badge" [class.active]="formData.googleEnabled" [class.inactive]="!formData.googleEnabled">
              <span class="status-dot"></span>
              {{ formData.googleEnabled ? ('common.enabled' | translate) : ('common.disabled' | translate) }}
            </div>
          </div>
        </header>

        @if (integrations.error()) {
          <div class="error-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {{ integrations.error() }}
          </div>
        }

        @if (integrations.isLoading() && !integrations.settings()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>{{ 'common.loadingSettings' | translate }}</p>
          </div>
        } @else {
          <!-- Setup Guide (Collapsible) -->
          <section class="guide-section" [class.expanded]="showGuide()" style="animation-delay: 0.05s">
            <button class="guide-toggle" (click)="showGuide.set(!showGuide())">
              <div class="guide-toggle-content">
                <div class="guide-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <div>
                  <span class="guide-title">{{ 'settings.google.guide.title' | translate }}</span>
                  <span class="guide-subtitle">{{ 'settings.google.guide.subtitle' | translate }}</span>
                </div>
              </div>
              <svg class="guide-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            @if (showGuide()) {
              <div class="guide-content">
                <div class="steps-timeline">
                  <!-- Step 1 -->
                  <div class="step">
                    <div class="step-marker">
                      <span class="step-number">1</span>
                      <div class="step-line"></div>
                    </div>
                    <div class="step-content">
                      <h4 class="step-title">{{ 'settings.google.guide.step1.title' | translate }}</h4>
                      <p class="step-description">
                        {{ 'settings.google.guide.step1.description' | translate }} <a href="https://console.cloud.google.com" target="_blank" rel="noopener">console.cloud.google.com</a>
                      </p>
                      <div class="step-tip">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                          <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                        </svg>
                        {{ 'settings.google.guide.step1.tip' | translate }}
                      </div>
                    </div>
                  </div>

                  <!-- Step 2 -->
                  <div class="step">
                    <div class="step-marker">
                      <span class="step-number">2</span>
                      <div class="step-line"></div>
                    </div>
                    <div class="step-content">
                      <h4 class="step-title">{{ 'settings.google.guide.step2.title' | translate }}</h4>
                      <p class="step-description" [innerHTML]="'settings.google.guide.step2.description' | translate">
                      </p>
                    </div>
                  </div>

                  <!-- Step 3 -->
                  <div class="step">
                    <div class="step-marker">
                      <span class="step-number">3</span>
                      <div class="step-line"></div>
                    </div>
                    <div class="step-content">
                      <h4 class="step-title">{{ 'settings.google.guide.step3.title' | translate }}</h4>
                      <p class="step-description" [innerHTML]="'settings.google.guide.step3.description' | translate">
                      </p>
                      <div class="code-block">
                        <code>https://www.googleapis.com/auth/gmail.compose</code>
                        <code>https://www.googleapis.com/auth/gmail.send</code>
                      </div>
                      <div class="step-tip warning">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/>
                          <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        {{ 'settings.google.guide.step3.warning' | translate }}
                      </div>
                    </div>
                  </div>

                  <!-- Step 4 -->
                  <div class="step">
                    <div class="step-marker">
                      <span class="step-number">4</span>
                      <div class="step-line"></div>
                    </div>
                    <div class="step-content">
                      <h4 class="step-title">{{ 'settings.google.guide.step4.title' | translate }}</h4>
                      <p class="step-description" [innerHTML]="'settings.google.guide.step4.description' | translate">
                      </p>
                    </div>
                  </div>

                  <!-- Step 5 -->
                  <div class="step">
                    <div class="step-marker">
                      <span class="step-number">5</span>
                      <div class="step-line"></div>
                    </div>
                    <div class="step-content">
                      <h4 class="step-title">{{ 'settings.google.guide.step5.title' | translate }}</h4>
                      <p class="step-description">
                        {{ 'settings.google.guide.step5.description' | translate }}
                      </p>
                      <div class="uri-display">
                        <code>{{ formData.googleRedirectUri }}</code>
                        <button type="button" class="copy-btn" (click)="copyToClipboard(formData.googleRedirectUri)" title="Copy to clipboard">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Step 6 -->
                  <div class="step">
                    <div class="step-marker">
                      <span class="step-number">6</span>
                    </div>
                    <div class="step-content">
                      <h4 class="step-title">{{ 'settings.google.guide.step6.title' | translate }}</h4>
                      <p class="step-description" [innerHTML]="'settings.google.guide.step6.description' | translate">
                      </p>
                      <div class="step-tip success">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        {{ 'settings.google.guide.step6.success' | translate }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
          </section>

          <form (ngSubmit)="onSubmit()" class="settings-form">
            <!-- Credentials Section -->
            <section class="form-section" style="animation-delay: 0.1s">
              <div class="section-header">
                <div class="section-icon section-icon--secure">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                  </svg>
                </div>
                <div>
                  <h2 class="section-title">{{ 'settings.google.credentials.title' | translate }}</h2>
                  <p class="section-description">{{ 'settings.google.credentials.description' | translate }}</p>
                </div>
              </div>

              <div class="credentials-grid">
                <!-- Client ID -->
                <div class="form-group form-group--full">
                  <label class="form-label" for="clientId">
                    {{ 'settings.google.credentials.clientId' | translate }}
                    @if (integrations.settings()?.hasGoogleCredentials) {
                      <span class="label-badge configured">{{ 'settings.google.credentials.configured' | translate }}</span>
                    }
                  </label>
                  <input
                    type="text"
                    id="clientId"
                    class="form-input form-input--mono"
                    [(ngModel)]="formData.googleClientId"
                    name="googleClientId"
                    placeholder="123456789-abc123.apps.googleusercontent.com"
                  />
                  <span class="form-hint">{{ 'settings.google.credentials.clientIdHint' | translate }}</span>
                </div>

                <!-- Client Secret -->
                <div class="form-group form-group--full">
                  <label class="form-label" for="clientSecret">{{ 'settings.google.credentials.clientSecret' | translate }}</label>
                  <div class="secret-input-wrapper">
                    <input
                      [type]="showSecret() ? 'text' : 'password'"
                      id="clientSecret"
                      class="form-input form-input--mono form-input--secret"
                      [(ngModel)]="formData.googleClientSecret"
                      name="googleClientSecret"
                      placeholder="GOCSPX-..."
                    />
                    <button
                      type="button"
                      class="secret-toggle"
                      (click)="showSecret.set(!showSecret())"
                    >
                      @if (showSecret()) {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      } @else {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      }
                    </button>
                  </div>
                  <span class="form-hint">{{ 'settings.google.credentials.clientSecretHint' | translate }}</span>
                </div>

                <!-- Redirect URI -->
                <div class="form-group form-group--full">
                  <label class="form-label" for="redirectUri">{{ 'settings.google.credentials.redirectUri' | translate }}</label>
                  <input
                    type="text"
                    id="redirectUri"
                    class="form-input form-input--mono"
                    [(ngModel)]="formData.googleRedirectUri"
                    name="googleRedirectUri"
                    placeholder="https://your-backend.com/api/google/callback"
                  />
                  <span class="form-hint">{{ 'settings.google.credentials.redirectUriHint' | translate }}</span>
                </div>
              </div>
            </section>

            <!-- Status & Test Section -->
            <section class="form-section" style="animation-delay: 0.2s">
              <div class="section-header">
                <div class="section-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
                    <line x1="12" y1="2" x2="12" y2="12"/>
                  </svg>
                </div>
                <div>
                  <h2 class="section-title">{{ 'settings.google.status.title' | translate }}</h2>
                  <p class="section-description">{{ 'settings.google.status.description' | translate }}</p>
                </div>
              </div>

              <div class="status-control">
                <label class="toggle-wrapper">
                  <input
                    type="checkbox"
                    class="toggle-input"
                    [(ngModel)]="formData.googleEnabled"
                    name="googleEnabled"
                  />
                  <div class="toggle-track">
                    <div class="toggle-thumb"></div>
                  </div>
                  <div class="toggle-label">
                    <span class="toggle-title">{{ 'settings.google.status.toggleTitle' | translate }}</span>
                    <span class="toggle-desc">
                      {{ formData.googleEnabled ? ('settings.google.status.enabledDesc' | translate) : ('settings.google.status.disabledDesc' | translate) }}
                    </span>
                  </div>
                </label>

                <button
                  type="button"
                  class="test-btn"
                  [class.testing]="isTesting()"
                  [class.success]="testResult()?.success"
                  [class.error]="testResult()?.success === false"
                  (click)="testConnection()"
                  [disabled]="isTesting()"
                >
                  @if (isTesting()) {
                    <span class="test-spinner"></span>
                    {{ 'common.testing' | translate }}
                  } @else if (testResult()?.success) {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    {{ 'settings.google.status.connectionValid' | translate }}
                  } @else if (testResult()?.success === false) {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="15" y1="9" x2="9" y2="15"/>
                      <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    {{ 'settings.google.status.testFailed' | translate }}
                  } @else {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                    {{ 'settings.google.status.testConnection' | translate }}
                  }
                </button>
              </div>

              @if (testResult()) {
                <div class="test-result" [class.success]="testResult()?.success" [class.error]="!testResult()?.success">
                  @if (testResult()?.success) {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    {{ testResult()?.message }}
                  } @else {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {{ testResult()?.error }}
                  }
                </div>
              }
            </section>

            <!-- Form Actions -->
            <div class="form-actions" style="animation-delay: 0.3s">
              <a routerLink="/dashboard" class="btn btn--secondary">
                {{ 'common.cancel' | translate }}
              </a>
              <button
                type="submit"
                class="btn btn--primary"
                [disabled]="integrations.isLoading()"
              >
                @if (integrations.isLoading()) {
                  <span class="btn__spinner"></span>
                  {{ 'common.saving' | translate }}
                } @else {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn__icon">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  {{ 'common.saveChanges' | translate }}
                }
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .google-settings-page {
      min-height: 100vh;
      background: var(--color-bg);
      padding: var(--space-2xl) 0;
      position: relative;
      overflow: hidden;
    }

    .bg-pattern {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 400px;
      background:
        linear-gradient(180deg, rgba(66, 133, 244, 0.04) 0%, transparent 100%),
        repeating-linear-gradient(
          90deg,
          transparent,
          transparent 80px,
          rgba(66, 133, 244, 0.015) 80px,
          rgba(66, 133, 244, 0.015) 81px
        ),
        repeating-linear-gradient(
          0deg,
          transparent,
          transparent 80px,
          rgba(66, 133, 244, 0.015) 80px,
          rgba(66, 133, 244, 0.015) 81px
        );
      pointer-events: none;
    }

    .bg-orbs {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 500px;
      overflow: hidden;
      pointer-events: none;
    }

    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.15;
      animation: float 20s ease-in-out infinite;
    }

    .orb--blue {
      width: 300px;
      height: 300px;
      background: #4285F4;
      top: -100px;
      right: 10%;
      animation-delay: 0s;
    }

    .orb--red {
      width: 200px;
      height: 200px;
      background: #EA4335;
      top: 50px;
      left: 5%;
      animation-delay: -5s;
    }

    .orb--yellow {
      width: 250px;
      height: 250px;
      background: #FBBC05;
      top: 100px;
      right: 30%;
      animation-delay: -10s;
    }

    .orb--green {
      width: 180px;
      height: 180px;
      background: #34A853;
      top: -50px;
      left: 30%;
      animation-delay: -15s;
    }

    @keyframes float {
      0%, 100% { transform: translate(0, 0) scale(1); }
      25% { transform: translate(20px, -20px) scale(1.05); }
      50% { transform: translate(-10px, 10px) scale(0.95); }
      75% { transform: translate(15px, 15px) scale(1.02); }
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 0 var(--space-lg);
      position: relative;
    }

    .page-header {
      margin-bottom: var(--space-xl);
      animation: fadeSlideDown 0.5s ease-out;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      color: var(--color-text-secondary);
      font-size: 0.9375rem;
      margin-bottom: var(--space-lg);
      transition: color var(--transition-fast);

      &:hover {
        color: #4285F4;
      }

      svg {
        width: 18px;
        height: 18px;
      }
    }

    .header-content {
      display: flex;
      align-items: flex-start;
      gap: var(--space-lg);
      flex-wrap: wrap;
    }

    .header-icon {
      width: 56px;
      height: 56px;
      background: white;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow:
        0 4px 12px rgba(0, 0, 0, 0.08),
        0 0 0 1px rgba(0, 0, 0, 0.05);

      svg {
        width: 32px;
        height: 32px;
      }
    }

    .page-title {
      font-family: var(--font-display);
      font-size: 1.875rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-xs);
    }

    .page-subtitle {
      color: var(--color-text-secondary);
      font-size: 1rem;
      line-height: 1.5;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-full);
      font-size: 0.8125rem;
      font-weight: 500;
      margin-left: auto;

      &.active {
        background: rgba(52, 168, 83, 0.1);
        color: #1e8e3e;
      }

      &.inactive {
        background: rgba(234, 67, 53, 0.1);
        color: #c5221f;
      }
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse 2s ease-in-out infinite;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      padding: var(--space-md) var(--space-lg);
      background: rgba(234, 67, 53, 0.1);
      border: 1px solid rgba(234, 67, 53, 0.2);
      border-radius: var(--radius-lg);
      color: #c5221f;
      margin-bottom: var(--space-xl);
      animation: fadeIn 0.3s ease-out;

      svg {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-3xl);
      color: var(--color-text-secondary);

      p {
        margin-top: var(--space-md);
      }
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--color-border);
      border-top-color: #4285F4;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    /* Guide Section */
    .guide-section {
      background: var(--color-surface);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-card);
      border: 1px solid var(--color-border);
      margin-bottom: var(--space-lg);
      overflow: hidden;
      animation: fadeSlideUp 0.5s ease-out both;

      &.expanded {
        .guide-chevron {
          transform: rotate(180deg);
        }
      }
    }

    .guide-toggle {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-lg) var(--space-xl);
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: left;
      transition: background var(--transition-fast);

      &:hover {
        background: var(--color-bg-subtle);
      }
    }

    .guide-toggle-content {
      display: flex;
      align-items: center;
      gap: var(--space-md);
    }

    .guide-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, rgba(66, 133, 244, 0.1) 0%, rgba(52, 168, 83, 0.1) 100%);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        width: 20px;
        height: 20px;
        color: #4285F4;
      }
    }

    .guide-title {
      display: block;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 2px;
    }

    .guide-subtitle {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .guide-chevron {
      width: 20px;
      height: 20px;
      color: var(--color-text-muted);
      transition: transform var(--transition-fast);
    }

    .guide-content {
      padding: 0 var(--space-xl) var(--space-xl);
      animation: expandIn 0.3s ease-out;
    }

    @keyframes expandIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .steps-timeline {
      position: relative;
      padding-left: var(--space-sm);
    }

    .step {
      display: flex;
      gap: var(--space-lg);
      padding-bottom: var(--space-xl);

      &:last-child {
        padding-bottom: 0;

        .step-line {
          display: none;
        }
      }
    }

    .step-marker {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .step-number {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #4285F4 0%, #1a73e8 100%);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.875rem;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
    }

    .step-line {
      width: 2px;
      flex: 1;
      background: linear-gradient(180deg, #4285F4 0%, var(--color-border) 100%);
      margin-top: var(--space-sm);
      border-radius: 1px;
    }

    .step-content {
      flex: 1;
      padding-top: var(--space-xs);
    }

    .step-title {
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-sm);
      font-size: 0.9375rem;
    }

    .step-description {
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      line-height: 1.6;
      margin-bottom: var(--space-sm);

      a {
        color: #4285F4;
        font-weight: 500;

        &:hover {
          text-decoration: underline;
        }
      }

      strong {
        color: var(--color-text);
        font-weight: 500;
      }
    }

    .step-tip {
      display: flex;
      align-items: flex-start;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-md);
      background: rgba(66, 133, 244, 0.08);
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      color: #1a73e8;
      margin-top: var(--space-sm);

      svg {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        margin-top: 1px;
      }

      &.warning {
        background: rgba(251, 188, 5, 0.12);
        color: #b06000;
      }

      &.success {
        background: rgba(52, 168, 83, 0.1);
        color: #1e8e3e;
      }
    }

    .code-block {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      margin: var(--space-sm) 0;

      code {
        display: block;
        padding: var(--space-sm) var(--space-md);
        background: var(--color-bg);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 0.75rem;
        color: var(--color-text);
        word-break: break-all;
      }
    }

    .uri-display {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      margin-top: var(--space-sm);

      code {
        flex: 1;
        padding: var(--space-sm) var(--space-md);
        background: var(--color-bg);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 0.8125rem;
        color: var(--color-text);
        word-break: break-all;
      }
    }

    .copy-btn {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text-muted);
      cursor: pointer;
      transition: all var(--transition-fast);
      flex-shrink: 0;

      &:hover {
        background: var(--color-bg-subtle);
        color: #4285F4;
        border-color: #4285F4;
      }

      svg {
        width: 16px;
        height: 16px;
      }
    }

    /* Form Styles */
    .settings-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-lg);
    }

    .form-section {
      background: var(--color-surface);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-card);
      border: 1px solid var(--color-border);
      padding: var(--space-xl);
      animation: fadeSlideUp 0.5s ease-out both;
    }

    .section-header {
      display: flex;
      align-items: flex-start;
      gap: var(--space-md);
      margin-bottom: var(--space-xl);
      padding-bottom: var(--space-lg);
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .section-icon {
      width: 40px;
      height: 40px;
      background: rgba(66, 133, 244, 0.1);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      svg {
        width: 20px;
        height: 20px;
        color: #4285F4;
      }

      &--secure {
        background: linear-gradient(135deg, rgba(52, 168, 83, 0.1) 0%, rgba(66, 133, 244, 0.1) 100%);

        svg {
          color: #1e8e3e;
        }
      }
    }

    .section-title {
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 2px;
    }

    .section-description {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    .credentials-grid {
      display: flex;
      flex-direction: column;
      gap: var(--space-lg);
    }

    .form-group {
      &--full {
        width: 100%;
      }
    }

    .form-label {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
      margin-bottom: var(--space-sm);
    }

    .label-badge {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      padding: 2px 6px;
      border-radius: var(--radius-sm);

      &.configured {
        background: rgba(52, 168, 83, 0.1);
        color: #1e8e3e;
      }
    }

    .form-input {
      width: 100%;
      padding: var(--space-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 0.9375rem;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

      &::placeholder {
        color: var(--color-text-muted);
      }

      &:hover:not(:disabled) {
        border-color: var(--color-text-muted);
      }

      &:focus {
        outline: none;
        border-color: #4285F4;
        box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.15);
      }

      &--mono {
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 0.875rem;
      }

      &--secret {
        padding-right: 48px;
      }
    }

    .secret-input-wrapper {
      position: relative;
    }

    .secret-toggle {
      position: absolute;
      right: var(--space-sm);
      top: 50%;
      transform: translateY(-50%);
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      border-radius: var(--radius-md);
      color: var(--color-text-muted);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-bg-subtle);
        color: var(--color-text);
      }

      svg {
        width: 18px;
        height: 18px;
      }
    }

    .form-hint {
      display: block;
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      margin-top: var(--space-xs);
    }

    /* Status Control */
    .status-control {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--space-lg);
    }

    .toggle-wrapper {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      cursor: pointer;
    }

    .toggle-input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .toggle-track {
      width: 52px;
      height: 28px;
      background: var(--color-border);
      border-radius: 14px;
      position: relative;
      transition: background var(--transition-fast);
      flex-shrink: 0;

      .toggle-input:checked + & {
        background: #34A853;
      }
    }

    .toggle-thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 24px;
      height: 24px;
      background: white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: transform var(--transition-fast);

      .toggle-input:checked ~ .toggle-track & {
        transform: translateX(24px);
      }
    }

    .toggle-label {
      display: flex;
      flex-direction: column;
    }

    .toggle-title {
      font-weight: 600;
      color: var(--color-text);
    }

    .toggle-desc {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .test-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-lg);
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover:not(:disabled) {
        border-color: #4285F4;
        color: #4285F4;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      &.testing {
        color: #4285F4;
        border-color: #4285F4;
      }

      &.success {
        background: rgba(52, 168, 83, 0.1);
        border-color: #34A853;
        color: #1e8e3e;
      }

      &.error {
        background: rgba(234, 67, 53, 0.1);
        border-color: #EA4335;
        color: #c5221f;
      }
    }

    .test-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(66, 133, 244, 0.3);
      border-top-color: #4285F4;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .test-result {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      margin-top: var(--space-lg);
      padding: var(--space-md) var(--space-lg);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      animation: fadeIn 0.3s ease-out;

      svg {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }

      &.success {
        background: rgba(52, 168, 83, 0.1);
        color: #1e8e3e;
      }

      &.error {
        background: rgba(234, 67, 53, 0.1);
        color: #c5221f;
      }
    }

    /* Form Actions */
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-md);
      padding-top: var(--space-lg);
      animation: fadeSlideUp 0.5s ease-out both;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      padding: var(--space-md) var(--space-xl);
      font-size: 0.9375rem;
      font-weight: 500;
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
      text-decoration: none;
      border: none;
      cursor: pointer;

      &__icon {
        width: 18px;
        height: 18px;
      }

      &--primary {
        background: #4285F4;
        color: white;
        box-shadow: 0 2px 8px rgba(66, 133, 244, 0.25);

        &:hover:not(:disabled) {
          background: #1a73e8;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(66, 133, 244, 0.35);
        }

        &:active:not(:disabled) {
          transform: translateY(0);
        }
      }

      &--secondary {
        background: var(--color-surface);
        color: var(--color-text);
        border: 1px solid var(--color-border);

        &:hover {
          background: var(--color-bg-subtle);
        }
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }
    }

    .btn__spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* Animations */
    @keyframes fadeSlideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeSlideUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `]
})
export class GoogleSettingsComponent implements OnInit {
  integrations = inject(IntegrationsService);
  private notificationService = inject(NotificationService);

  showGuide = signal(false);
  showSecret = signal(false);
  isTesting = signal(false);
  testResult = signal<{ success: boolean; message?: string; error?: string } | null>(null);

  formData = {
    googleClientId: '',
    googleClientSecret: '',
    googleRedirectUri: '',
    googleEnabled: false
  };

  ngOnInit() {
    this.integrations.fetchSettings();

    // Watch for settings to load and populate form
    const checkSettings = setInterval(() => {
      const settings = this.integrations.settings();
      if (settings) {
        this.formData.googleClientId = settings.googleClientId || '';
        this.formData.googleClientSecret = settings.googleClientSecret || '';
        this.formData.googleRedirectUri = settings.googleRedirectUri || '';
        this.formData.googleEnabled = settings.googleEnabled;
        clearInterval(checkSettings);
      }
    }, 100);

    // Cleanup after 5 seconds
    setTimeout(() => clearInterval(checkSettings), 5000);
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.notificationService.success('Copied to clipboard!');
    }).catch(() => {
      this.notificationService.error('Failed to copy');
    });
  }

  testConnection(): void {
    this.isTesting.set(true);
    this.testResult.set(null);

    this.integrations.testGoogleConnection().subscribe({
      next: (result) => {
        this.testResult.set(result);
        this.isTesting.set(false);
      },
      error: (err) => {
        this.testResult.set({
          success: false,
          error: err.error?.error || 'Failed to test connection'
        });
        this.isTesting.set(false);
      }
    });
  }

  onSubmit(): void {
    const updateData: UpdateIntegrationSettings = {
      googleEnabled: this.formData.googleEnabled
    };

    // Only include credentials if they were changed (not masked)
    if (this.formData.googleClientId) {
      updateData.googleClientId = this.formData.googleClientId;
    }
    if (this.formData.googleClientSecret && this.formData.googleClientSecret !== '••••••••') {
      updateData.googleClientSecret = this.formData.googleClientSecret;
    }
    if (this.formData.googleRedirectUri) {
      updateData.googleRedirectUri = this.formData.googleRedirectUri;
    }

    this.integrations.updateSettings(updateData).subscribe({
      next: () => {
        this.notificationService.success('Google integration settings updated');
        this.testResult.set(null);
      },
      error: (err) => {
        this.notificationService.error(err.error?.error || 'Failed to update settings');
      }
    });
  }
}
