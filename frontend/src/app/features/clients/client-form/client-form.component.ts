import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientService, CreateClientDto } from '../../../core/services/client.service';
import { CRMIntegrationService, CRMIntegration } from '../../../core/services/crm-integration.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="client-form-page">
      <div class="container">
        <header class="page-header">
          <a routerLink="/clients" class="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to Clients
          </a>
          <h1 class="page-title">{{ isEditing() ? 'Edit Client' : 'Add New Client' }}</h1>
          <p class="page-subtitle">{{ isEditing() ? 'Update client details' : 'Add a new client for invoicing' }}</p>
        </header>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-card">
          <!-- Basic Info -->
          <section class="form-section">
            <h2 class="section-title">Basic Information</h2>

            <div class="form-group">
              <label for="name" class="form-label">Client Name *</label>
              <input
                type="text"
                id="name"
                formControlName="name"
                class="form-input"
                placeholder="Acme Corporation"
                [class.form-input--error]="form.get('name')?.touched && form.get('name')?.invalid"
              />
              @if (form.get('name')?.touched && form.get('name')?.errors?.['required']) {
                <span class="form-error">Client name is required</span>
              }
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="nip" class="form-label">Tax ID (NIP)</label>
                <input
                  type="text"
                  id="nip"
                  formControlName="nip"
                  class="form-input"
                  placeholder="1234567890"
                />
              </div>
              <div class="form-group">
                <label for="country" class="form-label">Country</label>
                <input
                  type="text"
                  id="country"
                  formControlName="country"
                  class="form-input"
                  placeholder="Poland"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="streetAddress" class="form-label">Street Address</label>
              <input
                type="text"
                id="streetAddress"
                formControlName="streetAddress"
                class="form-input"
                placeholder="123 Main Street"
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="postcode" class="form-label">Postal Code</label>
                <input
                  type="text"
                  id="postcode"
                  formControlName="postcode"
                  class="form-input"
                  placeholder="00-000"
                />
              </div>
              <div class="form-group">
                <label for="city" class="form-label">City</label>
                <input
                  type="text"
                  id="city"
                  formControlName="city"
                  class="form-input"
                  placeholder="Warsaw"
                />
              </div>
            </div>
          </section>

          <!-- Contact Info -->
          <section class="form-section">
            <h2 class="section-title">Contact Information</h2>

            <div class="form-row">
              <div class="form-group">
                <label for="email" class="form-label">Email</label>
                <input
                  type="email"
                  id="email"
                  formControlName="email"
                  class="form-input"
                  placeholder="contact@acme.com"
                />
              </div>
              <div class="form-group">
                <label for="billingEmail" class="form-label">
                  Billing Email
                  <span class="form-label-hint">(for invoices)</span>
                </label>
                <input
                  type="email"
                  id="billingEmail"
                  formControlName="billingEmail"
                  class="form-input"
                  [placeholder]="form.get('email')?.value || 'billing@acme.com'"
                />
                <span class="form-hint">Leave empty to use main email</span>
              </div>
            </div>

            <div class="form-group">
              <label for="bankAccount" class="form-label">Client's Bank Account</label>
              <input
                type="text"
                id="bankAccount"
                formControlName="bankAccount"
                class="form-input"
                placeholder="PL00 0000 0000 0000 0000 0000 0000"
              />
              <span class="form-hint">Client's bank account number (optional)</span>
            </div>
          </section>

          <!-- CRM Integration -->
          @if (crmIntegrations().length > 0) {
            <section class="form-section">
              <h2 class="section-title">CRM Integration</h2>
              <p class="section-description">Link this client to your CRM system for automatic invoice syncing</p>

              <div class="form-row">
                <div class="form-group">
                  <label for="crmIntegrationId" class="form-label">CRM System</label>
                  @if (crmIntegrations().length === 1) {
                    <div class="static-value">{{ crmIntegrations()[0].name }}</div>
                    <input type="hidden" formControlName="crmIntegrationId" [value]="crmIntegrations()[0].id" />
                  } @else {
                    <select id="crmIntegrationId" formControlName="crmIntegrationId" class="form-input">
                      <option value="">Select CRM...</option>
                      @for (crm of crmIntegrations(); track crm.id) {
                        <option [value]="crm.id">{{ crm.name }}</option>
                      }
                    </select>
                  }
                </div>
                <div class="form-group">
                  <label for="crmClientId" class="form-label">CRM Client ID</label>
                  <input
                    type="text"
                    id="crmClientId"
                    formControlName="crmClientId"
                    class="form-input"
                    placeholder="e.g., 8769"
                  />
                  <span class="form-hint">Client ID from your CRM system</span>
                </div>
              </div>
            </section>
          }

          <!-- Actions -->
          <div class="form-actions">
            <a routerLink="/clients" class="btn-secondary">Cancel</a>
            <button type="submit" class="btn-primary" [disabled]="isSubmitting()">
              @if (isSubmitting()) {
                <span class="spinner-small"></span>
                Saving...
              } @else {
                {{ isEditing() ? 'Save Changes' : 'Create Client' }}
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .client-form-page {
      padding: var(--space-lg);
      background: var(--color-bg);
      min-height: 100vh;
    }

    .container {
      max-width: 640px;
      margin: 0 auto;
    }

    /* Header */
    .page-header {
      margin-bottom: var(--space-xl);
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      color: var(--color-primary);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: var(--space-md);

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover { opacity: 0.7; }
    }

    .page-title {
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-text);
      margin: 0;
      letter-spacing: -0.02em;
    }

    .page-subtitle {
      font-size: 0.9375rem;
      color: var(--color-text-secondary);
      margin: var(--space-xs) 0 0;
    }

    /* Form */
    .form-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 20px;
      overflow: hidden;
    }

    .form-section {
      padding: var(--space-xl);
      border-bottom: 1px solid var(--color-border);

      &:last-of-type {
        border-bottom: none;
      }
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0 0 var(--space-sm);
    }

    .section-description {
      font-size: 0.875rem;
      color: var(--color-text-tertiary);
      margin: 0 0 var(--space-lg);
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-md);
    }

    .form-group {
      margin-bottom: var(--space-md);

      &:last-child {
        margin-bottom: 0;
      }
    }

    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
      margin-bottom: var(--space-xs);
    }

    .form-label-hint {
      font-weight: 400;
      color: var(--color-text-tertiary);
      font-size: 0.75rem;
      margin-left: var(--space-xs);
    }

    .form-input {
      width: 100%;
      padding: var(--space-sm) var(--space-md);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      font-size: 0.9375rem;
      color: var(--color-text);
      transition: all var(--transition-base);

      &::placeholder {
        color: var(--color-text-tertiary);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1);
      }

      &.form-input--error {
        border-color: var(--color-danger);
      }
    }

    .form-hint {
      display: block;
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
      margin-top: var(--space-xs);
    }

    .form-error {
      display: block;
      font-size: 0.75rem;
      color: var(--color-danger);
      margin-top: var(--space-xs);
    }

    .static-value {
      padding: var(--space-sm) var(--space-md);
      background: var(--color-fill-tertiary);
      border-radius: 12px;
      font-size: 0.9375rem;
      color: var(--color-text);
    }

    /* Actions */
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-md);
      padding: var(--space-lg) var(--space-xl);
      background: var(--color-fill-quaternary);
      border-top: 1px solid var(--color-border);
    }

    .btn-primary, .btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-xs);
      padding: var(--space-sm) var(--space-lg);
      border-radius: 12px;
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all var(--transition-base);
      min-width: 140px;
    }

    .btn-primary {
      background: var(--color-primary);
      color: var(--color-primary-text);
      border: none;

      &:hover:not(:disabled) {
        background: var(--color-primary-hover);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .btn-secondary {
      background: var(--color-surface);
      color: var(--color-text);
      border: 1px solid var(--color-border);

      &:hover {
        background: var(--color-fill-tertiary);
      }
    }

    .spinner-small {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .client-form-page {
        padding: var(--space-md);
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .form-actions {
        flex-direction: column-reverse;

        .btn-primary, .btn-secondary {
          width: 100%;
        }
      }
    }
  `]
})
export class ClientFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private clientService = inject(ClientService);
  private crmService = inject(CRMIntegrationService);
  private notificationService = inject(NotificationService);

  isEditing = signal(false);
  isSubmitting = signal(false);
  clientId = signal<string | null>(null);

  crmIntegrations = signal<CRMIntegration[]>([]);
  isLoadingCrmIntegrations = signal(true);

  form = this.fb.group({
    name: ['', Validators.required],
    nip: [''],
    streetAddress: [''],
    postcode: [''],
    city: [''],
    country: [''],
    email: [''],
    billingEmail: [''],
    bankAccount: [''],
    crmClientId: [''],
    crmIntegrationId: ['']
  });

  ngOnInit(): void {
    this.loadCrmIntegrations();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.clientId.set(id);
      this.isEditing.set(true);
      this.loadClient(id);
    }
  }

  loadCrmIntegrations(): void {
    this.crmService.getIntegrations().subscribe({
      next: (integrations) => {
        this.crmIntegrations.set(integrations);
        this.isLoadingCrmIntegrations.set(false);

        // Auto-select if only one CRM
        if (integrations.length === 1 && !this.isEditing()) {
          this.form.patchValue({ crmIntegrationId: integrations[0].id });
        }
      },
      error: () => this.isLoadingCrmIntegrations.set(false)
    });
  }

  loadClient(id: string): void {
    this.clientService.getClient(id).subscribe({
      next: (client) => {
        this.form.patchValue({
          name: client.name,
          nip: client.nip || '',
          streetAddress: client.streetAddress || '',
          postcode: client.postcode || '',
          city: client.city || '',
          country: client.country || '',
          email: client.email || '',
          billingEmail: client.billingEmail || '',
          bankAccount: client.bankAccount || '',
          crmClientId: client.crmClientId || '',
          crmIntegrationId: client.crmIntegrationId || ''
        });
      },
      error: (err) => {
        console.error('Failed to load client:', err);
        this.notificationService.error('Failed to load client');
        this.router.navigate(['/clients']);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.form.value;

    const dto: CreateClientDto = {
      name: formValue.name!,
      nip: formValue.nip || undefined,
      streetAddress: formValue.streetAddress || undefined,
      postcode: formValue.postcode || undefined,
      city: formValue.city || undefined,
      country: formValue.country || undefined,
      email: formValue.email || undefined,
      billingEmail: formValue.billingEmail || undefined,
      bankAccount: formValue.bankAccount || undefined,
      crmClientId: formValue.crmClientId || undefined,
      crmIntegrationId: formValue.crmIntegrationId || undefined
    };

    const action = this.isEditing()
      ? this.clientService.updateClient(this.clientId()!, dto)
      : this.clientService.createClient(dto);

    action.subscribe({
      next: (client) => {
        this.notificationService.success(
          this.isEditing() ? 'Client updated successfully' : 'Client created successfully'
        );
        this.router.navigate(['/clients', client.id]);
      },
      error: (err) => {
        console.error('Failed to save client:', err);
        this.notificationService.error('Failed to save client');
        this.isSubmitting.set(false);
      }
    });
  }
}
