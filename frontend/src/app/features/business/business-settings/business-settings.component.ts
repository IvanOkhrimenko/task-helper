import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BusinessService } from '../business.service';
import { BusinessContextService } from '../business-context.service';
import { Business, BusinessRole, CategoryType } from '../business.models';

@Component({
  selector: 'app-business-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  template: `
    <div class="settings-container">
      @if (loading()) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
        </div>
      }

      @if (!loading() && business()) {
        <!-- General Settings -->
        <section class="settings-section">
          <div class="section-header">
            <h2 class="section-title">{{ 'business.settings.general' | translate }}</h2>
            <p class="section-description">{{ 'business.settings.generalDescription' | translate }}</p>
          </div>
          <div class="settings-card">
            <div class="form-group">
              <label class="form-label">{{ 'business.settings.name' | translate }}</label>
              <input
                type="text"
                class="form-input"
                [(ngModel)]="editForm.name"
                [placeholder]="'business.settings.namePlaceholder' | translate"
              >
            </div>
            <div class="form-group">
              <label class="form-label">{{ 'business.settings.description' | translate }}</label>
              <textarea
                class="form-textarea"
                [(ngModel)]="editForm.description"
                [placeholder]="'business.settings.descriptionPlaceholder' | translate"
                rows="3"
              ></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ 'business.settings.currency' | translate }}</label>
                <select class="form-select" [(ngModel)]="editForm.currency">
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="PLN">PLN - Polish Zloty</option>
                  <option value="UAH">UAH - Ukrainian Hryvnia</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'business.settings.timezone' | translate }}</label>
                <select class="form-select" [(ngModel)]="editForm.timezone">
                  @for (tz of availableTimezones; track tz.value) {
                    <option [value]="tz.value">{{ tz.label }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="form-actions">
              <button
                class="action-btn primary"
                (click)="saveSettings()"
                [disabled]="saving() || !hasChanges()"
              >
                @if (saving()) {
                  <span class="spinner"></span>
                }
                <span>{{ 'business.settings.saveChanges' | translate }}</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Categories -->
        <section class="settings-section">
          <div class="section-header">
            <h2 class="section-title">{{ 'business.settings.categories' | translate }}</h2>
            <p class="section-description">{{ 'business.settings.categoriesDescription' | translate }}</p>
          </div>
          <div class="settings-card">
            <div class="categories-tabs">
              <button
                class="tab-btn"
                [class.active]="categoryTab() === 'expense'"
                (click)="categoryTab.set('expense')"
              >
                {{ 'business.settings.expenseCategories' | translate }}
              </button>
              <button
                class="tab-btn"
                [class.active]="categoryTab() === 'income'"
                (click)="categoryTab.set('income')"
              >
                {{ 'business.settings.incomeCategories' | translate }}
              </button>
            </div>

            <div class="categories-list">
              @for (category of filteredCategories(); track category.id) {
                <div class="category-item" [class.archived]="category.isArchived">
                  <div class="category-color" [style.background]="category.color || '#6e7681'"></div>
                  <span class="category-name">{{ category.name }}</span>
                  @if (category.isArchived) {
                    <span class="category-badge archived">{{ 'business.settings.archived' | translate }}</span>
                  }
                  <div class="category-actions">
                    <button class="icon-btn" (click)="editCategory(category)" [title]="'common.edit' | translate">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    @if (!category.isArchived) {
                      <button class="icon-btn danger" (click)="archiveCategory(category)" [title]="'common.archive' | translate">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                      </button>
                    }
                  </div>
                </div>
              }

              @if (filteredCategories().length === 0) {
                <div class="empty-categories">
                  <p>{{ 'business.settings.noCategories' | translate }}</p>
                </div>
              }
            </div>

            <button class="add-category-btn" (click)="openAddCategoryModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <span>{{ 'business.settings.addCategory' | translate }}</span>
            </button>
          </div>
        </section>

        <!-- Danger Zone -->
        @if (canManageBusiness()) {
          <section class="settings-section danger-zone">
            <div class="section-header">
              <h2 class="section-title danger">{{ 'business.settings.dangerZone' | translate }}</h2>
              <p class="section-description">{{ 'business.settings.dangerZoneDescription' | translate }}</p>
            </div>
            <div class="settings-card danger">
              <div class="danger-item">
                <div class="danger-info">
                  <h3>{{ 'business.settings.archiveBusiness' | translate }}</h3>
                  <p>{{ 'business.settings.archiveBusinessDescription' | translate }}</p>
                </div>
                <button class="action-btn danger" (click)="archiveBusiness()" [disabled]="archiving()">
                  @if (archiving()) {
                    <span class="spinner"></span>
                  }
                  <span>{{ 'business.settings.archive' | translate }}</span>
                </button>
              </div>
            </div>
          </section>
        }
      }

      <!-- Add/Edit Category Modal -->
      @if (showCategoryModal()) {
        <div class="modal-overlay" (click)="closeCategoryModal()">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">
                {{ editingCategory() ? ('business.settings.editCategory' | translate) : ('business.settings.addCategory' | translate) }}
              </h2>
              <button class="modal-close" (click)="closeCategoryModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form class="modal-form" (submit)="saveCategory($event)">
              <div class="form-group">
                <label class="form-label">{{ 'business.settings.categoryName' | translate }}</label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="categoryForm.name"
                  name="name"
                  required
                >
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'business.settings.categoryColor' | translate }}</label>
                <div class="color-picker">
                  @for (color of availableColors; track color) {
                    <button
                      type="button"
                      class="color-option"
                      [style.background]="color"
                      [class.selected]="categoryForm.color === color"
                      (click)="categoryForm.color = color"
                    ></button>
                  }
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="action-btn secondary" (click)="closeCategoryModal()">
                  {{ 'common.cancel' | translate }}
                </button>
                <button type="submit" class="action-btn primary" [disabled]="savingCategory()">
                  @if (savingCategory()) {
                    <span class="spinner"></span>
                  }
                  <span>{{ 'common.save' | translate }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Toast -->
      @if (showToast()) {
        <div class="toast" [class.success]="toastType() === 'success'" [class.error]="toastType() === 'error'">
          <span>{{ toastMessage() }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      --accent-cyan: var(--color-primary);
      --accent-cyan-dim: var(--color-primary-subtle);
      --accent-green: var(--color-success);
      --accent-green-dim: var(--color-success-subtle);
      --accent-amber: var(--color-warning);
      --accent-amber-dim: var(--color-warning-subtle);
      --accent-red: var(--color-danger);
      --accent-red-dim: var(--color-danger-subtle);

      --terminal-bg: var(--color-bg);
      --terminal-surface: var(--color-surface);
      --terminal-surface-hover: var(--color-surface-secondary);
      --terminal-border: var(--color-border);
      --terminal-border-light: var(--color-border-opaque);

      --text-primary: var(--color-text);
      --text-secondary: var(--color-text-secondary);
      --text-tertiary: var(--color-text-tertiary);

      --font-mono: 'JetBrains Mono', monospace;
      --font-display: 'Sora', sans-serif;

      --radius-sm: 4px;
      --radius-md: 8px;
      --radius-lg: 12px;

      display: block;
    }

    .settings-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 800px;
    }

    /* Loading */
    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4rem;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--terminal-border);
      border-top-color: var(--accent-cyan);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Sections */
    .settings-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .section-header {
      padding-bottom: 0.5rem;
    }

    .section-title {
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 0.25rem 0;
    }

    .section-title.danger {
      color: var(--accent-red);
    }

    .section-description {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin: 0;
    }

    .settings-card {
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
    }

    .settings-card.danger {
      border-color: var(--accent-red-dim);
    }

    /* Forms */
    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-label {
      display: block;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.02em;
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
    }

    .form-input,
    .form-textarea,
    .form-select {
      width: 100%;
      padding: 0.75rem 1rem;
      background: var(--terminal-bg);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-md);
      font-family: var(--font-display);
      font-size: 0.9rem;
      color: var(--text-primary);
      transition: all 0.2s ease;
    }

    .form-input:focus,
    .form-textarea:focus,
    .form-select:focus {
      outline: none;
      border-color: var(--accent-cyan);
      box-shadow: 0 0 0 3px var(--accent-cyan-dim);
    }

    .form-textarea {
      resize: vertical;
      min-height: 80px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 0.5rem;
    }

    /* Buttons */
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      font-weight: 500;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .action-btn.primary {
      background: linear-gradient(135deg, var(--accent-cyan) 0%, #00a3cc 100%);
      color: var(--terminal-bg);
      border-color: var(--accent-cyan);
    }

    .action-btn.primary:hover:not(:disabled) {
      box-shadow: 0 0 20px var(--accent-cyan-dim);
    }

    .action-btn.secondary {
      background: transparent;
      color: var(--text-secondary);
      border-color: var(--terminal-border-light);
    }

    .action-btn.secondary:hover {
      background: var(--terminal-surface-hover);
      color: var(--text-primary);
    }

    .action-btn.danger {
      background: transparent;
      color: var(--accent-red);
      border-color: var(--accent-red);
    }

    .action-btn.danger:hover:not(:disabled) {
      background: var(--accent-red-dim);
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* Categories */
    .categories-tabs {
      display: flex;
      gap: 0.25rem;
      margin-bottom: 1rem;
      padding: 0.25rem;
      background: var(--terminal-bg);
      border-radius: var(--radius-md);
    }

    .tab-btn {
      flex: 1;
      padding: 0.625rem 1rem;
      background: transparent;
      border: none;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-secondary);
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: all 0.2s;
    }

    .tab-btn:hover {
      color: var(--text-primary);
    }

    .tab-btn.active {
      background: var(--accent-cyan-dim);
      color: var(--accent-cyan);
    }

    .categories-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .category-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--terminal-bg);
      border-radius: var(--radius-md);
    }

    .category-item.archived {
      opacity: 0.6;
    }

    .category-color {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .category-name {
      flex: 1;
      font-size: 0.9rem;
      color: var(--text-primary);
    }

    .category-badge {
      padding: 0.125rem 0.5rem;
      font-family: var(--font-mono);
      font-size: 0.6rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      border-radius: var(--radius-sm);
    }

    .category-badge.archived {
      background: var(--terminal-surface-hover);
      color: var(--text-tertiary);
    }

    .category-actions {
      display: flex;
      gap: 0.25rem;
    }

    .icon-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--text-tertiary);
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: all 0.2s;
    }

    .icon-btn:hover {
      background: var(--terminal-surface-hover);
      color: var(--accent-cyan);
    }

    .icon-btn.danger:hover {
      color: var(--accent-red);
    }

    .icon-btn svg {
      width: 16px;
      height: 16px;
    }

    .empty-categories {
      padding: 2rem;
      text-align: center;
      color: var(--text-tertiary);
    }

    .add-category-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.75rem;
      background: transparent;
      border: 1px dashed var(--terminal-border);
      border-radius: var(--radius-md);
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .add-category-btn:hover {
      border-color: var(--accent-cyan);
      color: var(--accent-cyan);
    }

    .add-category-btn svg {
      width: 16px;
      height: 16px;
    }

    /* Danger Zone */
    .danger-zone .settings-card {
      background: var(--accent-red-dim);
    }

    .danger-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
    }

    .danger-info h3 {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 0.25rem 0;
    }

    .danger-info p {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin: 0;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-container {
      width: 100%;
      max-width: 400px;
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--terminal-border);
    }

    .modal-title {
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .modal-close {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--text-tertiary);
      cursor: pointer;
      border-radius: var(--radius-sm);
    }

    .modal-close:hover {
      background: var(--terminal-surface-hover);
      color: var(--text-primary);
    }

    .modal-close svg {
      width: 18px;
      height: 18px;
    }

    .modal-form {
      padding: 1.5rem;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 0.5rem;
    }

    /* Color Picker */
    .color-picker {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .color-option {
      width: 32px;
      height: 32px;
      border: 2px solid transparent;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.2s;
    }

    .color-option:hover {
      transform: scale(1.1);
    }

    .color-option.selected {
      border-color: var(--text-primary);
      box-shadow: 0 0 0 2px var(--terminal-bg);
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      padding: 0.75rem 1.25rem;
      font-family: var(--font-mono);
      font-size: 0.85rem;
      font-weight: 500;
      border-radius: var(--radius-md);
      z-index: 1001;
    }

    .toast.success {
      background: var(--accent-green);
      color: var(--terminal-bg);
    }

    .toast.error {
      background: var(--accent-red);
      color: white;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .form-row {
        grid-template-columns: 1fr;
      }

      .danger-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
    }
  `]
})
export class BusinessSettingsComponent implements OnInit {
  private router = inject(Router);
  private businessService = inject(BusinessService);
  private businessContext = inject(BusinessContextService);

  loading = signal(false);
  saving = signal(false);
  archiving = signal(false);
  savingCategory = signal(false);

  categoryTab = signal<'expense' | 'income'>('expense');
  categories = signal<any[]>([]);
  showCategoryModal = signal(false);
  editingCategory = signal<any>(null);

  showToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error'>('success');

  business = this.businessContext.business;
  businessId = this.businessContext.businessId;

  editForm = {
    name: '',
    description: '',
    currency: 'USD',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };

  // Timezone options with browser timezone included
  availableTimezones = this.buildTimezoneOptions();

  private buildTimezoneOptions(): { value: string; label: string }[] {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const defaultTimezones = [
      { value: 'UTC', label: 'UTC' },
      { value: 'America/New_York', label: 'America/New_York (Eastern)' },
      { value: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific)' },
      { value: 'Europe/London', label: 'Europe/London' },
      { value: 'Europe/Warsaw', label: 'Europe/Warsaw' },
      { value: 'Europe/Kyiv', label: 'Europe/Kyiv' },
    ];

    const hasBrowserTz = defaultTimezones.some(tz => tz.value === browserTz);
    if (!hasBrowserTz) {
      return [{ value: browserTz, label: `${browserTz} (Local)` }, ...defaultTimezones];
    }
    return defaultTimezones;
  }

  categoryForm = {
    name: '',
    color: '#00d4ff',
    type: 'expense' as 'expense' | 'income'
  };

  availableColors = [
    '#00d4ff', '#3fb950', '#d29922', '#f85149', '#a371f7',
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
    '#dfe6e9', '#6c5ce7', '#fd79a8', '#00b894', '#e17055'
  ];

  originalForm = { ...this.editForm };

  ngOnInit() {
    const business = this.business();
    if (business) {
      this.editForm = {
        name: business.name,
        description: business.description || '',
        currency: business.currency,
        timezone: business.timezone
      };
      this.originalForm = { ...this.editForm };
      // Ensure business timezone is in dropdown options
      this.ensureTimezoneInOptions(business.timezone);
    }
    this.loadCategories();
  }

  private ensureTimezoneInOptions(timezone: string): void {
    if (!timezone) return;
    const exists = this.availableTimezones.some(tz => tz.value === timezone);
    if (!exists) {
      this.availableTimezones = [{ value: timezone, label: timezone }, ...this.availableTimezones];
    }
  }

  private loadCategories() {
    const id = this.businessId();
    if (!id) return;

    this.businessService.getCategories(id, undefined, true).subscribe({
      next: (categories) => this.categories.set(categories),
      error: (err) => console.error('Failed to load categories:', err)
    });
  }

  filteredCategories() {
    return this.categories().filter(c => c.type === this.categoryTab());
  }

  hasChanges(): boolean {
    return JSON.stringify(this.editForm) !== JSON.stringify(this.originalForm);
  }

  canManageBusiness(): boolean {
    const role = this.business()?.role;
    return role === BusinessRole.OWNER || role === BusinessRole.CO_OWNER;
  }

  saveSettings() {
    const id = this.businessId();
    if (!id || !this.hasChanges()) return;

    this.saving.set(true);
    this.businessService.updateBusiness(id, this.editForm).subscribe({
      next: (updated) => {
        this.businessContext.updateBusiness(updated);
        this.originalForm = { ...this.editForm };
        this.saving.set(false);
        this.showSuccessToast('Settings saved successfully');
      },
      error: (err) => {
        console.error('Failed to save settings:', err);
        this.saving.set(false);
        this.showErrorToast('Failed to save settings');
      }
    });
  }

  openAddCategoryModal() {
    this.editingCategory.set(null);
    this.categoryForm = {
      name: '',
      color: '#00d4ff',
      type: this.categoryTab()
    };
    this.showCategoryModal.set(true);
  }

  editCategory(category: any) {
    this.editingCategory.set(category);
    this.categoryForm = {
      name: category.name,
      color: category.color || '#00d4ff',
      type: category.type
    };
    this.showCategoryModal.set(true);
  }

  closeCategoryModal() {
    this.showCategoryModal.set(false);
    this.editingCategory.set(null);
  }

  saveCategory(event: Event) {
    event.preventDefault();
    const id = this.businessId();
    if (!id || !this.categoryForm.name.trim()) return;

    this.savingCategory.set(true);
    const editing = this.editingCategory();

    if (editing) {
      this.businessService.updateCategory(id, editing.id, {
        name: this.categoryForm.name,
        color: this.categoryForm.color
      }).subscribe({
        next: (updated) => {
          this.categories.update(list =>
            list.map(c => c.id === updated.id ? updated : c)
          );
          this.closeCategoryModal();
          this.savingCategory.set(false);
          this.showSuccessToast('Category updated');
        },
        error: (err) => {
          console.error('Failed to update category:', err);
          this.savingCategory.set(false);
          this.showErrorToast('Failed to update category');
        }
      });
    } else {
      this.businessService.createCategory(id, {
        name: this.categoryForm.name,
        color: this.categoryForm.color,
        type: this.categoryForm.type === 'expense' ? CategoryType.EXPENSE : CategoryType.INCOME
      }).subscribe({
        next: (created) => {
          this.categories.update(list => [...list, created]);
          this.closeCategoryModal();
          this.savingCategory.set(false);
          this.showSuccessToast('Category created');
        },
        error: (err) => {
          console.error('Failed to create category:', err);
          this.savingCategory.set(false);
          this.showErrorToast('Failed to create category');
        }
      });
    }
  }

  archiveCategory(category: any) {
    const id = this.businessId();
    if (!id) return;

    if (!confirm('Are you sure you want to archive this category?')) return;

    this.businessService.updateCategory(id, category.id, { isArchived: true }).subscribe({
      next: (updated) => {
        this.categories.update(list =>
          list.map(c => c.id === updated.id ? updated : c)
        );
        this.showSuccessToast('Category archived');
      },
      error: (err) => {
        console.error('Failed to archive category:', err);
        this.showErrorToast('Failed to archive category');
      }
    });
  }

  archiveBusiness() {
    const id = this.businessId();
    if (!id) return;

    if (!confirm('Are you sure you want to archive this business? This action cannot be easily undone.')) return;

    this.archiving.set(true);
    this.businessService.archiveBusiness(id).subscribe({
      next: () => {
        this.archiving.set(false);
        this.router.navigate(['/business']);
      },
      error: (err) => {
        console.error('Failed to archive business:', err);
        this.archiving.set(false);
        this.showErrorToast('Failed to archive business');
      }
    });
  }

  private showSuccessToast(message: string) {
    this.toastMessage.set(message);
    this.toastType.set('success');
    this.showToast.set(true);
    setTimeout(() => this.showToast.set(false), 3000);
  }

  private showErrorToast(message: string) {
    this.toastMessage.set(message);
    this.toastType.set('error');
    this.showToast.set(true);
    setTimeout(() => this.showToast.set(false), 3000);
  }
}
