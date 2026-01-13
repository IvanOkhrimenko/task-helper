import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BusinessService } from '../business.service';
import { AuthService } from '../../../core/services/auth.service';
import { BusinessRole, getRoleDisplayName } from '../business.models';

interface InviteDetails {
  businessName: string;
  invitedBy: string;
  role: BusinessRole;
  expiresAt: string;
  email?: string;
}

@Component({
  selector: 'app-invite-accept',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="invite-container">
      <div class="invite-card">
        <!-- Loading State -->
        @if (loading()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>{{ 'invite.loading' | translate }}</p>
          </div>
        }

        <!-- Error State -->
        @if (error()) {
          <div class="error-state">
            <div class="error-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M15 9l-6 6M9 9l6 6"/>
              </svg>
            </div>
            <h2>{{ 'invite.error.title' | translate }}</h2>
            <p>{{ error() }}</p>
            <button class="btn-primary" (click)="goToLogin()">
              {{ 'invite.error.goToLogin' | translate }}
            </button>
          </div>
        }

        <!-- Invite Details -->
        @if (!loading() && !error() && invite()) {
          <div class="invite-content">
            <div class="invite-header">
              <div class="business-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <h1>{{ 'invite.title' | translate }}</h1>
              <p class="invite-description">
                {{ 'invite.description' | translate:{ businessName: invite()!.businessName } }}
              </p>
            </div>

            <div class="invite-details">
              <div class="detail-row">
                <span class="label">{{ 'invite.businessName' | translate }}</span>
                <span class="value">{{ invite()!.businessName }}</span>
              </div>
              <div class="detail-row">
                <span class="label">{{ 'invite.yourRole' | translate }}</span>
                <span class="value role-badge" [class]="getRoleClass(invite()!.role)">
                  {{ getRoleDisplay(invite()!.role) }}
                </span>
              </div>
              @if (invite()!.invitedBy) {
                <div class="detail-row">
                  <span class="label">{{ 'invite.invitedBy' | translate }}</span>
                  <span class="value">{{ invite()!.invitedBy }}</span>
                </div>
              }
            </div>

            <!-- Auth Form -->
            @if (!isAuthenticated()) {
              <div class="auth-section">
                <div class="auth-tabs">
                  <button
                    class="auth-tab"
                    [class.active]="authMode() === 'login'"
                    (click)="authMode.set('login')"
                  >
                    {{ 'invite.auth.login' | translate }}
                  </button>
                  <button
                    class="auth-tab"
                    [class.active]="authMode() === 'register'"
                    (click)="authMode.set('register')"
                  >
                    {{ 'invite.auth.register' | translate }}
                  </button>
                </div>

                <form class="auth-form" (submit)="submitAuth($event)">
                  @if (authMode() === 'register') {
                    <div class="form-group">
                      <label>{{ 'invite.auth.name' | translate }}</label>
                      <input
                        type="text"
                        [(ngModel)]="name"
                        name="name"
                        [placeholder]="'invite.auth.namePlaceholder' | translate"
                        required
                      />
                    </div>
                  }

                  <div class="form-group">
                    <label>{{ 'invite.auth.email' | translate }}</label>
                    <input
                      type="email"
                      [(ngModel)]="email"
                      name="email"
                      [placeholder]="'invite.auth.emailPlaceholder' | translate"
                      required
                    />
                  </div>

                  <div class="form-group">
                    <label>{{ 'invite.auth.password' | translate }}</label>
                    <input
                      type="password"
                      [(ngModel)]="password"
                      name="password"
                      [placeholder]="'invite.auth.passwordPlaceholder' | translate"
                      required
                    />
                  </div>

                  @if (authError()) {
                    <div class="auth-error">{{ authError() }}</div>
                  }

                  <button
                    type="submit"
                    class="btn-primary btn-full"
                    [disabled]="submitting()"
                  >
                    @if (submitting()) {
                      <span class="spinner"></span>
                    }
                    {{ authMode() === 'login'
                      ? ('invite.auth.loginAndJoin' | translate)
                      : ('invite.auth.registerAndJoin' | translate)
                    }}
                  </button>
                </form>
              </div>
            } @else {
              <!-- Already authenticated -->
              <div class="accept-section">
                <p class="logged-in-as">
                  {{ 'invite.loggedInAs' | translate:{ email: currentUserEmail() } }}
                </p>
                <button
                  class="btn-primary btn-full"
                  (click)="acceptInvite()"
                  [disabled]="submitting()"
                >
                  @if (submitting()) {
                    <span class="spinner"></span>
                  }
                  {{ 'invite.acceptInvite' | translate }}
                </button>
                <button class="btn-secondary btn-full" (click)="logout()">
                  {{ 'invite.useAnotherAccount' | translate }}
                </button>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      --bg-primary: #0a0a0f;
      --bg-secondary: #12121a;
      --bg-tertiary: #1a1a24;
      --text-primary: #e4e4e7;
      --text-secondary: #a1a1aa;
      --text-muted: #71717a;
      --accent-primary: #00d4ff;
      --accent-secondary: #3b82f6;
      --border-color: #27272a;
      --error-color: #ef4444;
      --success-color: #22c55e;
      --font-display: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .invite-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: linear-gradient(135deg, var(--bg-primary) 0%, #0d1117 100%);
    }

    .invite-card {
      width: 100%;
      max-width: 440px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      overflow: hidden;
    }

    .loading-state, .error-state {
      padding: 3rem 2rem;
      text-align: center;
    }

    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 3px solid var(--border-color);
      border-top-color: var(--accent-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 1rem;
      color: var(--error-color);
    }

    .error-icon svg {
      width: 100%;
      height: 100%;
    }

    .error-state h2 {
      font-family: var(--font-display);
      font-size: 1.5rem;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }

    .error-state p {
      color: var(--text-secondary);
      margin-bottom: 1.5rem;
    }

    .invite-content {
      padding: 2rem;
    }

    .invite-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .business-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 1rem;
      background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .business-icon svg {
      width: 32px;
      height: 32px;
      color: white;
    }

    .invite-header h1 {
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }

    .invite-description {
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .invite-details {
      background: var(--bg-tertiary);
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 2rem;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
    }

    .detail-row:not(:last-child) {
      border-bottom: 1px solid var(--border-color);
    }

    .detail-row .label {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .detail-row .value {
      color: var(--text-primary);
      font-weight: 500;
    }

    .role-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .role-badge.owner { background: #7c3aed33; color: #a78bfa; }
    .role-badge.co-owner { background: #6366f133; color: #818cf8; }
    .role-badge.admin { background: #3b82f633; color: #60a5fa; }
    .role-badge.accountant { background: #10b98133; color: #34d399; }
    .role-badge.employee { background: #64748b33; color: #94a3b8; }

    .auth-section {
      border-top: 1px solid var(--border-color);
      padding-top: 1.5rem;
    }

    .auth-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .auth-tab {
      flex: 1;
      padding: 0.75rem;
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.875rem;
    }

    .auth-tab:hover {
      border-color: var(--text-muted);
    }

    .auth-tab.active {
      background: var(--accent-primary);
      border-color: var(--accent-primary);
      color: var(--bg-primary);
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .form-group input {
      padding: 0.75rem 1rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      color: var(--text-primary);
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .form-group input:focus {
      outline: none;
      border-color: var(--accent-primary);
    }

    .form-group input::placeholder {
      color: var(--text-muted);
    }

    .auth-error {
      padding: 0.75rem;
      background: #ef444420;
      border: 1px solid #ef444440;
      border-radius: 8px;
      color: var(--error-color);
      font-size: 0.875rem;
    }

    .btn-primary {
      padding: 0.875rem 1.5rem;
      background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
      border: none;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .btn-primary:hover:not(:disabled) {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      padding: 0.75rem 1.5rem;
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      border-color: var(--text-muted);
      color: var(--text-primary);
    }

    .btn-full {
      width: 100%;
    }

    .accept-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .logged-in-as {
      text-align: center;
      color: var(--text-secondary);
      font-size: 0.875rem;
      padding: 1rem;
      background: var(--bg-tertiary);
      border-radius: 8px;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  `]
})
export class InviteAcceptComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private businessService = inject(BusinessService);
  private authService = inject(AuthService);
  private translate = inject(TranslateService);

  loading = signal(true);
  error = signal<string | null>(null);
  invite = signal<InviteDetails | null>(null);
  authMode = signal<'login' | 'register'>('login');
  submitting = signal(false);
  authError = signal<string | null>(null);

  // Form fields
  name = '';
  email = '';
  password = '';

  private token = '';

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.error.set(this.translate.instant('invite.error.invalidLink'));
      this.loading.set(false);
      return;
    }

    this.loadInvite();
  }

  private loadInvite() {
    this.businessService.getInviteByToken(this.token).subscribe({
      next: (invite) => {
        this.invite.set(invite);
        this.loading.set(false);

        // Pre-fill email if invite has one
        if (invite.email) {
          this.email = invite.email;
        }
      },
      error: (err) => {
        console.error('Failed to load invite:', err);
        const message = err.error?.error || this.translate.instant('invite.error.invalidOrExpired');
        this.error.set(message);
        this.loading.set(false);
      }
    });
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  currentUserEmail(): string {
    return this.authService.user()?.email || '';
  }

  submitAuth(event: Event) {
    event.preventDefault();
    this.authError.set(null);
    this.submitting.set(true);

    if (this.authMode() === 'login') {
      this.authService.login(this.email, this.password).subscribe({
        next: () => {
          this.acceptInvite();
        },
        error: (err) => {
          this.authError.set(err.error?.error || this.translate.instant('invite.auth.loginFailed'));
          this.submitting.set(false);
        }
      });
    } else {
      this.authService.register(this.email, this.password, this.name).subscribe({
        next: () => {
          this.acceptInvite();
        },
        error: (err) => {
          this.authError.set(err.error?.error || this.translate.instant('invite.auth.registerFailed'));
          this.submitting.set(false);
        }
      });
    }
  }

  acceptInvite() {
    this.submitting.set(true);
    this.businessService.acceptInvite(this.token).subscribe({
      next: (result) => {
        this.submitting.set(false);
        // Navigate to the business
        this.router.navigate(['/business', result.businessId]);
      },
      error: (err) => {
        console.error('Failed to accept invite:', err);
        this.authError.set(err.error?.error || this.translate.instant('invite.error.acceptFailed'));
        this.submitting.set(false);
      }
    });
  }

  logout() {
    this.authService.logout();
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  getRoleDisplay(role: BusinessRole): string {
    return getRoleDisplayName(role);
  }

  getRoleClass(role: BusinessRole): string {
    const classes: Record<BusinessRole, string> = {
      [BusinessRole.OWNER]: 'owner',
      [BusinessRole.CO_OWNER]: 'co-owner',
      [BusinessRole.ADMIN]: 'admin',
      [BusinessRole.ACCOUNTANT]: 'accountant',
      [BusinessRole.EMPLOYEE]: 'employee',
    };
    return classes[role] || 'employee';
  }
}

