import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, TranslateModule, LanguageSwitcherComponent],
  template: `
    <div class="auth-page">
      <div class="language-switcher-wrapper">
        <app-language-switcher />
      </div>
      <div class="auth-container">
        <div class="auth-header">
          <div class="auth-logo">
            <svg viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="var(--color-primary)"/>
              <path d="M12 20L18 26L28 14" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h1 class="auth-title">{{ 'auth.register.title' | translate }}</h1>
          <p class="auth-subtitle">{{ 'auth.register.subtitle' | translate }}</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <div class="form-group">
            <label for="name" class="form-label">{{ 'auth.register.name' | translate }}</label>
            <input
              type="text"
              id="name"
              formControlName="name"
              class="form-input"
              [placeholder]="'auth.register.namePlaceholder' | translate"
              [class.form-input--error]="form.get('name')?.touched && form.get('name')?.invalid"
            />
            @if (form.get('name')?.touched && form.get('name')?.errors?.['required']) {
              <span class="form-error">{{ 'auth.validation.nameRequired' | translate }}</span>
            }
          </div>

          <div class="form-group">
            <label for="email" class="form-label">{{ 'auth.register.email' | translate }}</label>
            <input
              type="email"
              id="email"
              formControlName="email"
              class="form-input"
              [placeholder]="'auth.register.emailPlaceholder' | translate"
              [class.form-input--error]="form.get('email')?.touched && form.get('email')?.invalid"
            />
            @if (form.get('email')?.touched && form.get('email')?.errors?.['required']) {
              <span class="form-error">{{ 'auth.validation.emailRequired' | translate }}</span>
            }
            @if (form.get('email')?.touched && form.get('email')?.errors?.['email']) {
              <span class="form-error">{{ 'auth.validation.emailInvalid' | translate }}</span>
            }
          </div>

          <div class="form-group">
            <label for="password" class="form-label">{{ 'auth.register.password' | translate }}</label>
            <div class="password-wrapper">
              <input
                [type]="showPassword() ? 'text' : 'password'"
                id="password"
                formControlName="password"
                class="form-input"
                [placeholder]="'auth.register.passwordPlaceholder' | translate"
                [class.form-input--error]="form.get('password')?.touched && form.get('password')?.invalid"
              />
              <button
                type="button"
                class="password-toggle"
                (click)="showPassword.set(!showPassword())"
              >
                @if (showPassword()) {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
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
            @if (form.get('password')?.touched && form.get('password')?.errors?.['required']) {
              <span class="form-error">{{ 'auth.validation.passwordRequired' | translate }}</span>
            }
            @if (form.get('password')?.touched && form.get('password')?.errors?.['minlength']) {
              <span class="form-error">{{ 'auth.validation.passwordMinLength' | translate }}</span>
            }
          </div>

          <button
            type="submit"
            class="btn btn--primary btn--full"
            [disabled]="isLoading() || form.invalid"
          >
            @if (isLoading()) {
              <span class="btn__spinner"></span>
              {{ 'auth.register.submitting' | translate }}
            } @else {
              {{ 'auth.register.submit' | translate }}
            }
          </button>
        </form>

        <p class="auth-footer">
          {{ 'auth.register.hasAccount' | translate }} <a routerLink="/login">{{ 'auth.register.signIn' | translate }}</a>
        </p>
      </div>

      <div class="auth-decoration">
        <div class="decoration-shape decoration-shape--1"></div>
        <div class="decoration-shape decoration-shape--2"></div>
        <div class="decoration-shape decoration-shape--3"></div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-xl);
      position: relative;
      overflow: hidden;
      background:
        radial-gradient(ellipse at 20% 0%, rgba(16, 185, 129, 0.06) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 100%, rgba(16, 185, 129, 0.04) 0%, transparent 50%),
        var(--color-bg);
    }

    .language-switcher-wrapper {
      position: absolute;
      top: var(--space-lg);
      right: var(--space-lg);
      z-index: 10;
    }

    .auth-container {
      width: 100%;
      max-width: 420px;
      background: var(--color-surface);
      border-radius: var(--radius-xl);
      padding: var(--space-2xl);
      box-shadow: var(--shadow-lg);
      position: relative;
      z-index: 1;
      animation: scaleIn 0.4s ease;
    }

    .auth-header {
      text-align: center;
      margin-bottom: var(--space-2xl);
    }

    .auth-logo {
      width: 56px;
      height: 56px;
      margin: 0 auto var(--space-lg);

      svg {
        width: 100%;
        height: 100%;
      }
    }

    .auth-title {
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-xs);
    }

    .auth-subtitle {
      color: var(--color-text-secondary);
      font-size: 0.9375rem;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-lg);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .form-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
    }

    .form-input {
      width: 100%;
      padding: var(--space-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

      &::placeholder {
        color: var(--color-text-muted);
      }

      &:hover {
        border-color: var(--color-text-muted);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-subtle);
      }

      &--error {
        border-color: var(--color-danger);

        &:focus {
          box-shadow: 0 0 0 3px var(--color-danger-subtle);
        }
      }
    }

    .password-wrapper {
      position: relative;
    }

    .password-wrapper .form-input {
      padding-right: 48px;
    }

    .password-toggle {
      position: absolute;
      right: var(--space-md);
      top: 50%;
      transform: translateY(-50%);
      width: 24px;
      height: 24px;
      padding: 0;
      color: var(--color-text-muted);
      transition: color var(--transition-fast);

      &:hover {
        color: var(--color-text-secondary);
      }

      svg {
        width: 100%;
        height: 100%;
      }
    }

    .form-error {
      font-size: 0.8125rem;
      color: var(--color-danger);
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

      &--primary {
        background: var(--color-primary);
        color: var(--color-primary-text);

        &:hover:not(:disabled) {
          background: var(--color-primary-hover);
          transform: translateY(-1px);
        }

        &:active:not(:disabled) {
          transform: translateY(0);
        }
      }

      &--full {
        width: 100%;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .btn__spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: var(--color-primary-text);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .auth-footer {
      text-align: center;
      margin-top: var(--space-xl);
      font-size: 0.9375rem;
      color: var(--color-text-secondary);

      a {
        font-weight: 500;
      }
    }

    .auth-decoration {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
    }

    .decoration-shape {
      position: absolute;
      border-radius: 50%;
      opacity: 0.5;

      &--1 {
        width: 400px;
        height: 400px;
        background: radial-gradient(circle, var(--color-primary-subtle) 0%, transparent 70%);
        top: -200px;
        right: -100px;
      }

      &--2 {
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, var(--color-success-subtle) 0%, transparent 70%);
        bottom: -100px;
        left: -100px;
      }

      &--3 {
        width: 200px;
        height: 200px;
        background: radial-gradient(circle, var(--color-warning-subtle) 0%, transparent 70%);
        top: 40%;
        left: 10%;
      }
    }

    /* Mobile Responsive */
    @media (max-width: 480px) {
      .auth-page {
        padding: var(--space-md);
        align-items: flex-start;
        padding-top: 60px;
      }

      .language-switcher-wrapper {
        top: var(--space-md);
        right: var(--space-md);
      }

      .auth-container {
        padding: var(--space-xl);
        border-radius: var(--radius-lg);
        max-width: 100%;
      }

      .auth-header {
        margin-bottom: var(--space-xl);
      }

      .auth-logo {
        width: 48px;
        height: 48px;
        margin-bottom: var(--space-md);
      }

      .auth-title {
        font-size: 1.5rem;
      }

      .auth-subtitle {
        font-size: 0.875rem;
      }

      .form-input {
        font-size: 16px; /* Prevent zoom on iOS */
        padding: var(--space-md);
      }

      .btn {
        padding: var(--space-lg);
        font-size: 1rem;
      }

      .decoration-shape {
        display: none;
      }
    }

    @media (max-height: 700px) {
      .auth-page {
        align-items: flex-start;
        padding-top: var(--space-lg);
      }

      .auth-container {
        padding: var(--space-lg);
      }

      .auth-header {
        margin-bottom: var(--space-lg);
      }

      .auth-form {
        gap: var(--space-md);
      }
    }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private translateService = inject(TranslateService);

  showPassword = signal(false);
  isLoading = signal(false);

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit() {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    const { name, email, password } = this.form.getRawValue();

    this.authService.register(email, password, name).subscribe({
      next: () => {
        this.notificationService.success(this.translateService.instant('auth.register.success'));
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.notificationService.error(error);
      }
    });
  }
}
