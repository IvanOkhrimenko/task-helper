import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AISettingsService, AIProvider, UpdateAISettings } from '../../../core/services/ai-settings.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastComponent } from '../../../shared/components/toast/toast.component';

@Component({
  selector: 'app-ai-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ToastComponent],
  template: `
    <app-toast />
    <div class="ai-settings-page">
      <!-- Decorative background -->
      <div class="bg-pattern"></div>

      <div class="container">
        <header class="page-header">
          <a routerLink="/dashboard" class="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to Dashboard
          </a>
          <div class="header-content">
            <div class="header-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11h3a3 3 0 0 1 3 3v1.5a1.5 1.5 0 0 1-3 0V14h-2v4.5a1.5 1.5 0 0 1-3 0V14h-2v1.5a1.5 1.5 0 0 1-3 0V14a3 3 0 0 1 3-3h3V9.5A4 4 0 0 1 8 6a4 4 0 0 1 4-4z"/>
                <circle cx="12" cy="6" r="1"/>
              </svg>
            </div>
            <div>
              <h1 class="page-title">AI Assistant Settings</h1>
              <p class="page-subtitle">Configure AI provider, models, and API credentials</p>
            </div>
            <div class="status-badge" [class.active]="formData.isActive" [class.inactive]="!formData.isActive">
              <span class="status-dot"></span>
              {{ formData.isActive ? 'Active' : 'Inactive' }}
            </div>
          </div>
        </header>

        @if (aiSettings.error()) {
          <div class="error-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {{ aiSettings.error() }}
          </div>
        }

        @if (aiSettings.isLoading() && !aiSettings.settings()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading settings...</p>
          </div>
        } @else {
          <form (ngSubmit)="onSubmit()" class="settings-form">
            <!-- Provider Selection -->
            <section class="form-section" style="animation-delay: 0.1s">
              <div class="section-header">
                <div class="section-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                </div>
                <div>
                  <h2 class="section-title">AI Provider</h2>
                  <p class="section-description">Select the AI service provider</p>
                </div>
              </div>

              <div class="provider-selector">
                @for (provider of providers; track provider.id) {
                  <label
                    class="provider-option"
                    [class.selected]="formData.provider === provider.id"
                    [class.disabled]="!provider.available"
                  >
                    <input
                      type="radio"
                      name="provider"
                      [value]="provider.id"
                      [(ngModel)]="formData.provider"
                      (ngModelChange)="onProviderChange($event)"
                      [disabled]="!provider.available"
                    />
                    <div class="provider-content">
                      <div class="provider-icon" [innerHTML]="provider.icon"></div>
                      <div class="provider-info">
                        <span class="provider-name">{{ provider.name }}</span>
                        <span class="provider-desc">{{ provider.description }}</span>
                      </div>
                      @if (!provider.available) {
                        <span class="provider-badge">Coming Soon</span>
                      }
                      @if (formData.provider === provider.id) {
                        <div class="check-mark">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                      }
                    </div>
                  </label>
                }
              </div>
            </section>

            <!-- Model Configuration -->
            <section class="form-section" style="animation-delay: 0.2s">
              <div class="section-header">
                <div class="section-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 3v18"/>
                    <rect x="4" y="8" width="6" height="7" rx="1"/>
                    <rect x="14" y="5" width="6" height="10" rx="1"/>
                  </svg>
                </div>
                <div>
                  <h2 class="section-title">Model Configuration</h2>
                  <p class="section-description">Fine-tune the AI model parameters</p>
                </div>
              </div>

              <div class="config-grid">
                <div class="form-group">
                  <label class="form-label">Model</label>
                  <div class="select-wrapper">
                    <select
                      class="form-select"
                      [(ngModel)]="formData.modelId"
                      name="modelId"
                    >
                      @for (model of availableModels(); track model.id) {
                        <option [value]="model.id">{{ model.name }}</option>
                      }
                    </select>
                    <svg class="select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                  @if (selectedModelDescription()) {
                    <span class="form-hint">{{ selectedModelDescription() }}</span>
                  }
                </div>

                <div class="form-group">
                  <label class="form-label">Max Tokens</label>
                  <div class="number-input-wrapper">
                    <input
                      type="number"
                      class="form-input form-input--mono"
                      [(ngModel)]="formData.maxTokens"
                      name="maxTokens"
                      min="1024"
                      max="8192"
                      step="256"
                    />
                    <span class="input-suffix">tokens</span>
                  </div>
                  <span class="form-hint">Response length limit (1024 - 8192)</span>
                </div>

                <div class="form-group form-group--full">
                  <label class="form-label">
                    Temperature
                    <span class="temp-value">{{ formData.temperature.toFixed(1) }}</span>
                  </label>
                  <div class="slider-wrapper">
                    <input
                      type="range"
                      class="form-slider"
                      [(ngModel)]="formData.temperature"
                      name="temperature"
                      min="0"
                      max="1"
                      step="0.1"
                    />
                    <div class="slider-labels">
                      <span>Precise</span>
                      <span>Balanced</span>
                      <span>Creative</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- API Keys -->
            <section class="form-section" style="animation-delay: 0.3s">
              <div class="section-header">
                <div class="section-icon section-icon--secure">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                  </svg>
                </div>
                <div>
                  <h2 class="section-title">API Credentials</h2>
                  <p class="section-description">Securely manage your API keys</p>
                </div>
              </div>

              <div class="api-keys-grid">
                <!-- Claude API Key -->
                <div class="api-key-card" [class.has-key]="aiSettings.settings()?.hasClaudeKey">
                  <div class="api-key-header">
                    <div class="api-key-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                      </svg>
                    </div>
                    <div class="api-key-info">
                      <span class="api-key-name">Claude (Anthropic)</span>
                      <span class="api-key-status">
                        @if (aiSettings.settings()?.hasClaudeKey) {
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                          Configured
                        } @else {
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                          </svg>
                          Not configured
                        }
                      </span>
                    </div>
                  </div>
                  <div class="api-key-input-wrapper">
                    <input
                      [type]="showClaudeKey() ? 'text' : 'password'"
                      class="form-input form-input--mono form-input--key"
                      [(ngModel)]="formData.claudeApiKey"
                      name="claudeApiKey"
                      [placeholder]="aiSettings.settings()?.claudeApiKey || 'sk-ant-...'"
                    />
                    <button
                      type="button"
                      class="key-toggle"
                      (click)="showClaudeKey.set(!showClaudeKey())"
                    >
                      @if (showClaudeKey()) {
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
                </div>

                <!-- OpenAI API Key -->
                <div class="api-key-card" [class.has-key]="aiSettings.settings()?.hasOpenaiKey">
                  <div class="api-key-header">
                    <div class="api-key-icon api-key-icon--openai">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.6 8.3829l2.02-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.5056-2.6067-1.5056z"/>
                      </svg>
                    </div>
                    <div class="api-key-info">
                      <span class="api-key-name">OpenAI</span>
                      <span class="api-key-status">
                        @if (aiSettings.settings()?.hasOpenaiKey) {
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                          Configured
                        } @else {
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                          </svg>
                          Not configured
                        }
                      </span>
                    </div>
                  </div>
                  <div class="api-key-input-wrapper">
                    <input
                      [type]="showOpenaiKey() ? 'text' : 'password'"
                      class="form-input form-input--mono form-input--key"
                      [(ngModel)]="formData.openaiApiKey"
                      name="openaiApiKey"
                      [placeholder]="aiSettings.settings()?.openaiApiKey || 'sk-...'"
                    />
                    <button
                      type="button"
                      class="key-toggle"
                      (click)="showOpenaiKey.set(!showOpenaiKey())"
                    >
                      @if (showOpenaiKey()) {
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
                </div>
              </div>
            </section>

            <!-- Status -->
            <section class="form-section" style="animation-delay: 0.4s">
              <div class="section-header">
                <div class="section-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
                    <line x1="12" y1="2" x2="12" y2="12"/>
                  </svg>
                </div>
                <div>
                  <h2 class="section-title">Service Status</h2>
                  <p class="section-description">Enable or disable the AI assistant</p>
                </div>
              </div>

              <div class="status-control">
                <label class="toggle-wrapper">
                  <input
                    type="checkbox"
                    class="toggle-input"
                    [(ngModel)]="formData.isActive"
                    name="isActive"
                  />
                  <div class="toggle-track">
                    <div class="toggle-thumb"></div>
                  </div>
                  <div class="toggle-label">
                    <span class="toggle-title">AI Assistant</span>
                    <span class="toggle-desc">
                      {{ formData.isActive ? 'Users can access the AI chat feature' : 'AI chat is disabled for all users' }}
                    </span>
                  </div>
                </label>

                @if (aiSettings.settings()?.updatedAt) {
                  <div class="last-updated">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Last updated: {{ formatDate(aiSettings.settings()!.updatedAt) }}
                  </div>
                }
              </div>
            </section>

            <!-- Form Actions -->
            <div class="form-actions" style="animation-delay: 0.5s">
              <a routerLink="/dashboard" class="btn btn--secondary">
                Cancel
              </a>
              <button
                type="submit"
                class="btn btn--primary"
                [disabled]="aiSettings.isLoading()"
              >
                @if (aiSettings.isLoading()) {
                  <span class="btn__spinner"></span>
                  Saving...
                } @else {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn__icon">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Save Changes
                }
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .ai-settings-page {
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
        linear-gradient(180deg, rgba(16, 185, 129, 0.03) 0%, transparent 100%),
        repeating-linear-gradient(
          90deg,
          transparent,
          transparent 100px,
          rgba(16, 185, 129, 0.02) 100px,
          rgba(16, 185, 129, 0.02) 101px
        ),
        repeating-linear-gradient(
          0deg,
          transparent,
          transparent 100px,
          rgba(16, 185, 129, 0.02) 100px,
          rgba(16, 185, 129, 0.02) 101px
        );
      pointer-events: none;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 0 var(--space-lg);
      position: relative;
    }

    .page-header {
      margin-bottom: var(--space-2xl);
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
        color: var(--color-primary);
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
      background: linear-gradient(135deg, var(--color-primary) 0%, #1e40af 100%);
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow:
        0 4px 12px rgba(16, 185, 129, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);

      svg {
        width: 28px;
        height: 28px;
        color: white;
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
        background: rgba(16, 185, 129, 0.1);
        color: #059669;
      }

      &.inactive {
        background: rgba(239, 68, 68, 0.1);
        color: #dc2626;
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
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: var(--radius-lg);
      color: #dc2626;
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
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

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
      background: var(--color-primary-subtle);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      svg {
        width: 20px;
        height: 20px;
        color: var(--color-primary);
      }

      &--secure {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%);

        svg {
          color: #059669;
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

    /* Provider Selector */
    .provider-selector {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-md);

      @media (max-width: 600px) {
        grid-template-columns: 1fr;
      }
    }

    .provider-option {
      position: relative;
      cursor: pointer;

      input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      &.disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }
    }

    .provider-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-lg);
      background: var(--color-bg);
      border: 2px solid var(--color-border);
      border-radius: var(--radius-lg);
      transition: all var(--transition-fast);
      position: relative;

      .provider-option:not(.disabled):hover & {
        border-color: var(--color-primary);
        background: var(--color-primary-subtle);
      }

      .provider-option.selected & {
        border-color: var(--color-primary);
        background: var(--color-primary-subtle);
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
      }
    }

    .provider-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text);

      svg {
        width: 32px;
        height: 32px;
      }
    }

    .provider-info {
      text-align: center;
    }

    .provider-name {
      display: block;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 2px;
    }

    .provider-desc {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .provider-badge {
      position: absolute;
      top: var(--space-sm);
      right: var(--space-sm);
      padding: 2px 6px;
      background: var(--color-bg-subtle);
      color: var(--color-text-muted);
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: var(--radius-sm);
    }

    .check-mark {
      position: absolute;
      top: var(--space-sm);
      right: var(--space-sm);
      width: 24px;
      height: 24px;
      background: var(--color-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: scaleIn 0.2s ease-out;

      svg {
        width: 14px;
        height: 14px;
        color: white;
      }
    }

    /* Config Grid */
    .config-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-lg);

      @media (max-width: 500px) {
        grid-template-columns: 1fr;
      }
    }

    .form-group {
      &--full {
        grid-column: 1 / -1;
      }
    }

    .form-label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
      margin-bottom: var(--space-sm);
    }

    .temp-value {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.8125rem;
      color: var(--color-primary);
      background: var(--color-primary-subtle);
      padding: 2px 8px;
      border-radius: var(--radius-sm);
    }

    .select-wrapper {
      position: relative;
    }

    .form-select {
      width: 100%;
      padding: var(--space-md);
      padding-right: 40px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 0.9375rem;
      appearance: none;
      cursor: pointer;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

      &:hover {
        border-color: var(--color-text-muted);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-subtle);
      }
    }

    .select-arrow {
      position: absolute;
      right: var(--space-md);
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      color: var(--color-text-muted);
      pointer-events: none;
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
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-subtle);
      }

      &--mono {
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 0.875rem;
      }

      &--key {
        padding-right: 48px;
      }
    }

    .number-input-wrapper {
      position: relative;
    }

    .input-suffix {
      position: absolute;
      right: var(--space-md);
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-text-muted);
      font-size: 0.8125rem;
      pointer-events: none;
    }

    .form-hint {
      display: block;
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      margin-top: var(--space-xs);
    }

    /* Slider */
    .slider-wrapper {
      padding-top: var(--space-sm);
    }

    .form-slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: var(--color-border);
      appearance: none;
      cursor: pointer;

      &::-webkit-slider-thumb {
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--color-primary);
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
        cursor: pointer;
        transition: transform var(--transition-fast);

        &:hover {
          transform: scale(1.1);
        }
      }

      &::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border: none;
        border-radius: 50%;
        background: var(--color-primary);
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
        cursor: pointer;
      }
    }

    .slider-labels {
      display: flex;
      justify-content: space-between;
      margin-top: var(--space-sm);
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    /* API Keys */
    .api-keys-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-lg);

      @media (max-width: 600px) {
        grid-template-columns: 1fr;
      }
    }

    .api-key-card {
      padding: var(--space-lg);
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      transition: border-color var(--transition-fast);

      &.has-key {
        border-color: rgba(16, 185, 129, 0.3);
        background: rgba(16, 185, 129, 0.02);
      }
    }

    .api-key-header {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      margin-bottom: var(--space-md);
    }

    .api-key-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #d4a574 0%, #c19a6b 100%);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        width: 22px;
        height: 22px;
        color: white;
      }

      &--openai {
        background: linear-gradient(135deg, #10a37f 0%, #0d8a6a 100%);
      }
    }

    .api-key-info {
      flex: 1;
    }

    .api-key-name {
      display: block;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 2px;
    }

    .api-key-status {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      font-size: 0.75rem;

      svg {
        width: 14px;
        height: 14px;
      }

      .api-key-card.has-key & {
        color: #059669;
      }

      .api-key-card:not(.has-key) & {
        color: var(--color-text-muted);
      }
    }

    .api-key-input-wrapper {
      position: relative;
    }

    .key-toggle {
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
        background: var(--color-primary);
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

    .last-updated {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: 0.8125rem;
      color: var(--color-text-muted);

      svg {
        width: 16px;
        height: 16px;
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
        background: var(--color-primary);
        color: white;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);

        &:hover:not(:disabled) {
          background: var(--color-primary-hover);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
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

    @keyframes scaleIn {
      from { transform: scale(0); }
      to { transform: scale(1); }
    }
  `]
})
export class AISettingsComponent implements OnInit {
  aiSettings = inject(AISettingsService);
  private notificationService = inject(NotificationService);

  showClaudeKey = signal(false);
  showOpenaiKey = signal(false);

  formData = {
    provider: 'CLAUDE' as AIProvider,
    modelId: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    temperature: 0.7,
    claudeApiKey: '',
    openaiApiKey: '',
    isActive: true
  };

  providers = [
    {
      id: 'CLAUDE' as AIProvider,
      name: 'Claude',
      description: 'Anthropic',
      available: true,
      icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`
    },
    {
      id: 'OPENAI' as AIProvider,
      name: 'OpenAI',
      description: 'GPT Models',
      available: false,
      icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.28 9.82a5.98 5.98 0 0 0-.52-4.91 6.05 6.05 0 0 0-6.51-2.9A6.07 6.07 0 0 0 4.98 4.18a5.98 5.98 0 0 0-4 2.9 6.05 6.05 0 0 0 .74 7.1 5.98 5.98 0 0 0 .51 4.91 6.05 6.05 0 0 0 6.51 2.9A5.98 5.98 0 0 0 13.26 24a6.06 6.06 0 0 0 5.77-4.21 5.99 5.99 0 0 0 4-2.9 6.06 6.06 0 0 0-.75-7.07z"/></svg>`
    },
    {
      id: 'LOCAL' as AIProvider,
      name: 'Local',
      description: 'Self-hosted',
      available: false,
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`
    }
  ];

  availableModels = computed(() => {
    return this.aiSettings.getAvailableModels(this.formData.provider);
  });

  selectedModelDescription = computed(() => {
    const models = this.availableModels();
    const selected = models.find(m => m.id === this.formData.modelId);
    return selected?.description || '';
  });

  ngOnInit() {
    this.aiSettings.fetchSettings();

    // Watch for settings to load and populate form
    const checkSettings = setInterval(() => {
      const settings = this.aiSettings.settings();
      if (settings) {
        this.formData.provider = settings.provider;
        this.formData.modelId = settings.modelId;
        this.formData.maxTokens = settings.maxTokens;
        this.formData.temperature = settings.temperature;
        this.formData.isActive = settings.isActive;
        clearInterval(checkSettings);
      }
    }, 100);

    // Cleanup after 5 seconds
    setTimeout(() => clearInterval(checkSettings), 5000);
  }

  onProviderChange(provider: AIProvider): void {
    // Reset to first model of new provider
    const models = this.aiSettings.getAvailableModels(provider);
    if (models.length > 0) {
      this.formData.modelId = models[0].id;
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  onSubmit(): void {
    const updateData: UpdateAISettings = {
      provider: this.formData.provider,
      modelId: this.formData.modelId,
      maxTokens: this.formData.maxTokens,
      temperature: this.formData.temperature,
      isActive: this.formData.isActive
    };

    // Only include API keys if they were changed
    if (this.formData.claudeApiKey) {
      updateData.claudeApiKey = this.formData.claudeApiKey;
    }
    if (this.formData.openaiApiKey) {
      updateData.openaiApiKey = this.formData.openaiApiKey;
    }

    this.aiSettings.updateSettings(updateData).subscribe({
      next: () => {
        this.notificationService.success('AI settings updated successfully');
        // Clear API key fields after save
        this.formData.claudeApiKey = '';
        this.formData.openaiApiKey = '';
      },
      error: (err) => {
        this.notificationService.error(err.error?.error || 'Failed to update settings');
      }
    });
  }
}
