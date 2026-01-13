import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { TaxService, TaxSettings, TaxForm, ZUSType } from '../../../core/services/tax.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-tax-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="settings-page">
      <!-- Header -->
      <header class="header">
        <a routerLink="/taxes" class="back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          {{ 'taxes.settings.back' | translate }}
        </a>
        <div class="header__content">
          <h1 class="header__title">{{ 'taxes.settings.title' | translate }}</h1>
          <p class="header__subtitle">{{ 'taxes.settings.subtitle' | translate }}</p>
        </div>
      </header>

      @if (isLoading()) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>{{ 'taxes.settings.loading' | translate }}</p>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="settings-form">
          <!-- Tax Form Section -->
          <section class="settings-section" [style.animation-delay]="'0ms'">
            <div class="section-header">
              <h2 class="section-title">{{ 'taxes.settings.taxFormSection.title' | translate }}</h2>
              <p class="section-description">{{ 'taxes.settings.taxFormSection.description' | translate }}</p>
            </div>

            <div class="tax-form-grid">
              <!-- LINIOWY -->
              <label
                class="tax-form-card"
                [class.tax-form-card--selected]="form.get('taxForm')?.value === 'LINIOWY'"
                [class.tax-form-card--liniowy]="form.get('taxForm')?.value === 'LINIOWY'"
              >
                <input
                  type="radio"
                  formControlName="taxForm"
                  value="LINIOWY"
                  class="tax-form-card__input"
                />
                <div class="tax-form-card__indicator"></div>
                <div class="tax-form-card__icon tax-form-card__icon--liniowy">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
                <div class="tax-form-card__content">
                  <span class="tax-form-card__name">{{ 'taxes.settings.taxFormSection.liniowy.name' | translate }}</span>
                  <span class="tax-form-card__rate">19%</span>
                  <p class="tax-form-card__description">
                    {{ 'taxes.settings.taxFormSection.liniowy.description' | translate }}
                  </p>
                </div>
                <div class="tax-form-card__check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </label>

              <!-- SKALA -->
              <label
                class="tax-form-card"
                [class.tax-form-card--selected]="form.get('taxForm')?.value === 'SKALA'"
                [class.tax-form-card--skala]="form.get('taxForm')?.value === 'SKALA'"
              >
                <input
                  type="radio"
                  formControlName="taxForm"
                  value="SKALA"
                  class="tax-form-card__input"
                />
                <div class="tax-form-card__indicator"></div>
                <div class="tax-form-card__icon tax-form-card__icon--skala">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </div>
                <div class="tax-form-card__content">
                  <span class="tax-form-card__name">{{ 'taxes.settings.taxFormSection.skala.name' | translate }}</span>
                  <span class="tax-form-card__rate">12% / 32%</span>
                  <p class="tax-form-card__description">
                    {{ 'taxes.settings.taxFormSection.skala.description' | translate }}
                  </p>
                </div>
                <div class="tax-form-card__check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </label>

              <!-- RYCZALT -->
              <label
                class="tax-form-card"
                [class.tax-form-card--selected]="form.get('taxForm')?.value === 'RYCZALT'"
                [class.tax-form-card--ryczalt]="form.get('taxForm')?.value === 'RYCZALT'"
              >
                <input
                  type="radio"
                  formControlName="taxForm"
                  value="RYCZALT"
                  class="tax-form-card__input"
                />
                <div class="tax-form-card__indicator"></div>
                <div class="tax-form-card__icon tax-form-card__icon--ryczalt">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18"/>
                    <path d="M9 21V9"/>
                  </svg>
                </div>
                <div class="tax-form-card__content">
                  <span class="tax-form-card__name">{{ 'taxes.settings.taxFormSection.ryczalt.name' | translate }}</span>
                  <span class="tax-form-card__rate">2% - 17%</span>
                  <p class="tax-form-card__description">
                    {{ 'taxes.settings.taxFormSection.ryczalt.description' | translate }}
                  </p>
                </div>
                <div class="tax-form-card__check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </label>
            </div>
          </section>

          <!-- Ryczalt Rate Section (conditional) -->
          @if (form.get('taxForm')?.value === 'RYCZALT') {
            <section class="settings-section" [style.animation-delay]="'50ms'">
              <div class="section-header">
                <h2 class="section-title">{{ 'taxes.settings.ryczaltRate.title' | translate }}</h2>
                <p class="section-description">{{ 'taxes.settings.ryczaltRate.description' | translate }}</p>
              </div>

              <div class="rate-grid">
                @for (rate of ryczaltRates; track rate.value) {
                  <label
                    class="rate-chip"
                    [class.rate-chip--selected]="form.get('ryczaltRate')?.value === rate.value"
                  >
                    <input
                      type="radio"
                      formControlName="ryczaltRate"
                      [value]="rate.value"
                      class="rate-chip__input"
                    />
                    <span class="rate-chip__value">{{ rate.label }}</span>
                    @if (rate.common) {
                      <span class="rate-chip__badge">IT</span>
                    }
                  </label>
                }
              </div>

              <div class="info-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <p>{{ 'taxes.settings.ryczaltRate.info' | translate }}</p>
              </div>
            </section>
          }

          <!-- ZUS Section -->
          <section class="settings-section" [style.animation-delay]="'100ms'">
            <div class="section-header">
              <h2 class="section-title">{{ 'taxes.settings.zusSection.title' | translate }}</h2>
              <p class="section-description">{{ 'taxes.settings.zusSection.description' | translate }}</p>
            </div>

            <div class="form-group">
              <label class="form-label">{{ 'taxes.settings.zusSection.typeLabel' | translate }}</label>
              <div class="select-wrapper">
                <select formControlName="zusType" class="form-select">
                  @for (type of zusTypes; track type.value) {
                    <option [value]="type.value">{{ type.label }}</option>
                  }
                </select>
                <svg class="select-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            <!-- ZUS Info Cards -->
            <div class="zus-info-grid">
              <div class="zus-info-card" [class.zus-info-card--active]="form.get('zusType')?.value === 'STANDARD'">
                <span class="zus-info-card__label">{{ 'taxes.settings.zusSection.standard.label' | translate }}</span>
                <span class="zus-info-card__amount">~1 600 zł</span>
                <span class="zus-info-card__note">{{ 'taxes.settings.zusSection.standard.note' | translate }}</span>
              </div>
              <div class="zus-info-card" [class.zus-info-card--active]="form.get('zusType')?.value === 'MALY_ZUS_PLUS'">
                <span class="zus-info-card__label">{{ 'taxes.settings.zusSection.malyZusPlus.label' | translate }}</span>
                <span class="zus-info-card__amount">~400 zł</span>
                <span class="zus-info-card__note">{{ 'taxes.settings.zusSection.malyZusPlus.note' | translate }}</span>
              </div>
              <div class="zus-info-card" [class.zus-info-card--active]="form.get('zusType')?.value === 'PREFERENCYJNY'">
                <span class="zus-info-card__label">{{ 'taxes.settings.zusSection.preferencyjny.label' | translate }}</span>
                <span class="zus-info-card__amount">~300 zł</span>
                <span class="zus-info-card__note">{{ 'taxes.settings.zusSection.preferencyjny.note' | translate }}</span>
              </div>
            </div>

            <!-- Custom ZUS Amount -->
            @if (form.get('zusType')?.value === 'CUSTOM') {
              <div class="form-group" style="margin-top: var(--space-lg);">
                <label class="form-label">{{ 'taxes.settings.zusSection.customAmount' | translate }}</label>
                <div class="input-wrapper">
                  <input
                    type="number"
                    formControlName="customZusAmount"
                    class="form-input"
                    placeholder="0.00"
                    step="0.01"
                  />
                  <span class="input-suffix">PLN</span>
                </div>
              </div>
            }
          </section>

          <!-- Additional Settings -->
          <section class="settings-section" [style.animation-delay]="'150ms'">
            <div class="section-header">
              <h2 class="section-title">{{ 'taxes.settings.additionalSection.title' | translate }}</h2>
            </div>

            <div class="form-group">
              <label class="form-label">{{ 'taxes.settings.additionalSection.fiscalYearStart' | translate }}</label>
              <div class="select-wrapper">
                <select formControlName="fiscalYearStart" class="form-select">
                  @for (month of months; track month.value) {
                    <option [value]="month.value">{{ month.label }}</option>
                  }
                </select>
                <svg class="select-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              <p class="form-hint">{{ 'taxes.settings.additionalSection.fiscalYearHint' | translate }}</p>
            </div>
          </section>

          <!-- Submit -->
          <div class="form-actions">
            <button type="button" class="btn btn--secondary" routerLink="/taxes">
              {{ 'taxes.settings.cancel' | translate }}
            </button>
            <button
              type="submit"
              class="btn btn--primary"
              [disabled]="isSaving() || form.invalid"
            >
              @if (isSaving()) {
                <span class="btn__spinner"></span>
                {{ 'taxes.settings.saving' | translate }}
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                {{ 'taxes.settings.save' | translate }}
              }
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

    :host {
      --tax-font-mono: 'IBM Plex Mono', 'SF Mono', monospace;
      --tax-font-sans: 'Plus Jakarta Sans', var(--font-body);

      --tax-liniowy: #3b82f6;
      --tax-liniowy-soft: rgba(59, 130, 246, 0.1);
      --tax-skala: #8b5cf6;
      --tax-skala-soft: rgba(139, 92, 246, 0.1);
      --tax-ryczalt: #10b981;
      --tax-ryczalt-soft: rgba(16, 185, 129, 0.1);

      display: block;
      font-family: var(--tax-font-sans);
    }

    .settings-page {
      min-height: 100%;
      padding: var(--space-xl) var(--space-2xl);
      background: var(--color-bg);
      max-width: 800px;
      margin: 0 auto;
    }

    /* Header */
    .header {
      margin-bottom: var(--space-2xl);
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      text-decoration: none;
      margin-bottom: var(--space-lg);
      transition: color var(--transition-fast);

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover {
        color: var(--color-primary);
      }
    }

    .header__title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text);
      letter-spacing: -0.02em;
      margin-bottom: var(--space-xs);
    }

    .header__subtitle {
      font-size: 0.9375rem;
      color: var(--color-text-secondary);
    }

    /* Loading */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px var(--space-xl);
      color: var(--color-text-secondary);
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: var(--space-lg);
    }

    /* Sections */
    .settings-section {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      padding: var(--space-xl);
      margin-bottom: var(--space-xl);
      animation: slideUp 0.4s ease both;
    }

    .section-header {
      margin-bottom: var(--space-xl);
    }

    .section-title {
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-xs);
    }

    .section-description {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }

    /* Tax Form Cards */
    .tax-form-grid {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .tax-form-card {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: var(--space-lg);
      padding: var(--space-lg);
      background: var(--color-fill-quaternary);
      border: 2px solid transparent;
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-fill-tertiary);
      }

      &--selected {
        background: var(--color-surface);
        border-color: var(--color-primary);
        box-shadow: var(--shadow-md);

        .tax-form-card__check {
          opacity: 1;
          transform: scale(1);
        }
      }

      &--liniowy.tax-form-card--selected {
        border-color: var(--tax-liniowy);
        .tax-form-card__indicator { background: var(--tax-liniowy); }
      }

      &--skala.tax-form-card--selected {
        border-color: var(--tax-skala);
        .tax-form-card__indicator { background: var(--tax-skala); }
      }

      &--ryczalt.tax-form-card--selected {
        border-color: var(--tax-ryczalt);
        .tax-form-card__indicator { background: var(--tax-ryczalt); }
      }
    }

    .tax-form-card__input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .tax-form-card__indicator {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      border-radius: 4px 0 0 4px;
      opacity: 0;
      transition: opacity var(--transition-fast);
    }

    .tax-form-card--selected .tax-form-card__indicator {
      opacity: 1;
    }

    .tax-form-card__icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-lg);
      flex-shrink: 0;

      svg {
        width: 24px;
        height: 24px;
      }

      &--liniowy {
        background: var(--tax-liniowy-soft);
        color: var(--tax-liniowy);
      }

      &--skala {
        background: var(--tax-skala-soft);
        color: var(--tax-skala);
      }

      &--ryczalt {
        background: var(--tax-ryczalt-soft);
        color: var(--tax-ryczalt);
      }
    }

    .tax-form-card__content {
      flex: 1;
    }

    .tax-form-card__name {
      display: block;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 2px;
    }

    .tax-form-card__rate {
      display: block;
      font-family: var(--tax-font-mono);
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-primary);
      margin-bottom: var(--space-sm);
    }

    .tax-form-card__description {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      line-height: 1.5;
      margin: 0;
    }

    .tax-form-card__check {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-primary);
      color: white;
      border-radius: var(--radius-full);
      flex-shrink: 0;
      opacity: 0;
      transform: scale(0.8);
      transition: all var(--transition-fast);

      svg {
        width: 14px;
        height: 14px;
      }
    }

    /* Ryczalt Rate Grid */
    .rate-grid {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
      margin-bottom: var(--space-lg);
    }

    .rate-chip {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      padding: var(--space-sm) var(--space-md);
      background: var(--color-fill-quaternary);
      border: 2px solid transparent;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-fill-tertiary);
      }

      &--selected {
        background: var(--tax-ryczalt-soft);
        border-color: var(--tax-ryczalt);

        .rate-chip__value {
          color: var(--tax-ryczalt);
          font-weight: 600;
        }
      }
    }

    .rate-chip__input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .rate-chip__value {
      font-family: var(--tax-font-mono);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
    }

    .rate-chip__badge {
      font-size: 0.625rem;
      font-weight: 600;
      padding: 2px 6px;
      background: var(--tax-ryczalt);
      color: white;
      border-radius: var(--radius-sm);
    }

    /* Info Box */
    .info-box {
      display: flex;
      align-items: flex-start;
      gap: var(--space-md);
      padding: var(--space-md) var(--space-lg);
      background: var(--color-primary-subtle);
      border-radius: var(--radius-md);

      svg {
        width: 20px;
        height: 20px;
        color: var(--color-primary);
        flex-shrink: 0;
        margin-top: 2px;
      }

      p {
        font-size: 0.8125rem;
        color: var(--color-text-secondary);
        margin: 0;
        line-height: 1.5;

        strong {
          color: var(--color-text);
        }
      }
    }

    /* ZUS Info Grid */
    .zus-info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-md);
      margin-top: var(--space-lg);
    }

    .zus-info-card {
      padding: var(--space-md);
      background: var(--color-fill-quaternary);
      border: 2px solid transparent;
      border-radius: var(--radius-md);
      text-align: center;
      transition: all var(--transition-fast);

      &--active {
        background: var(--color-primary-subtle);
        border-color: var(--color-primary);

        .zus-info-card__amount {
          color: var(--color-primary);
        }
      }
    }

    .zus-info-card__label {
      display: block;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      margin-bottom: var(--space-xs);
    }

    .zus-info-card__amount {
      display: block;
      font-family: var(--tax-font-mono);
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 2px;
    }

    .zus-info-card__note {
      font-size: 0.6875rem;
      color: var(--color-text-tertiary);
    }

    /* Form Elements */
    .form-group {
      margin-bottom: var(--space-lg);

      &:last-child {
        margin-bottom: 0;
      }
    }

    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
      margin-bottom: var(--space-sm);
    }

    .form-hint {
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
      margin-top: var(--space-xs);
    }

    .select-wrapper {
      position: relative;
    }

    .form-select {
      width: 100%;
      padding: var(--space-md) var(--space-lg);
      padding-right: 48px;
      background: var(--color-fill-quaternary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-family: inherit;
      font-size: 0.9375rem;
      color: var(--color-text);
      appearance: none;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-border-hover);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-subtle);
      }
    }

    .select-icon {
      position: absolute;
      right: var(--space-md);
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 20px;
      color: var(--color-text-tertiary);
      pointer-events: none;
    }

    .input-wrapper {
      position: relative;
    }

    .form-input {
      width: 100%;
      padding: var(--space-md) var(--space-lg);
      padding-right: 60px;
      background: var(--color-fill-quaternary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-family: var(--tax-font-mono);
      font-size: 0.9375rem;
      color: var(--color-text);
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-border-hover);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-subtle);
      }

      &::placeholder {
        color: var(--color-text-tertiary);
      }
    }

    .input-suffix {
      position: absolute;
      right: var(--space-lg);
      top: 50%;
      transform: translateY(-50%);
      font-family: var(--tax-font-mono);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-tertiary);
    }

    /* Form Actions */
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-md);
      padding-top: var(--space-xl);
      border-top: 1px solid var(--color-border);
      animation: slideUp 0.4s ease 0.2s both;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      padding: var(--space-md) var(--space-xl);
      font-family: inherit;
      font-size: 0.9375rem;
      font-weight: 600;
      border-radius: var(--radius-lg);
      border: none;
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 18px;
        height: 18px;
      }

      &--primary {
        background: var(--color-primary);
        color: var(--color-primary-text);

        &:hover:not(:disabled) {
          background: var(--color-primary-hover);
          transform: translateY(-1px);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      &--secondary {
        background: var(--color-fill-tertiary);
        color: var(--color-text);

        &:hover {
          background: var(--color-fill-secondary);
        }
      }
    }

    .btn__spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* Animations */
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .settings-page {
        padding: var(--space-lg);
      }

      .tax-form-card {
        flex-direction: column;
        text-align: center;
      }

      .tax-form-card__icon {
        margin: 0 auto;
      }

      .tax-form-card__check {
        position: absolute;
        top: var(--space-md);
        right: var(--space-md);
      }

      .zus-info-grid {
        grid-template-columns: 1fr;
      }

      .form-actions {
        flex-direction: column;
      }

      .btn {
        width: 100%;
      }
    }
  `]
})
export class TaxSettingsComponent implements OnInit {
  private taxService = inject(TaxService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  settings = signal<TaxSettings | null>(null);
  isLoading = signal(true);
  isSaving = signal(false);

  form = this.fb.group({
    taxForm: ['LINIOWY' as TaxForm, Validators.required],
    zusType: ['STANDARD' as ZUSType, Validators.required],
    customZusAmount: [null as number | null],
    ryczaltRate: [12 as number],
    fiscalYearStart: [1, Validators.required]
  });

  zusTypes = [
    { value: 'STANDARD', label: 'Pełny ZUS (~1 600 zł/mies.)' },
    { value: 'MALY_ZUS_PLUS', label: 'Mały ZUS Plus (~400 zł/mies.)' },
    { value: 'PREFERENCYJNY', label: 'Preferencyjny (~300 zł/mies.)' },
    { value: 'CUSTOM', label: 'Własna kwota' }
  ];

  ryczaltRates = [
    { value: 2, label: '2%', common: false },
    { value: 3, label: '3%', common: false },
    { value: 5.5, label: '5.5%', common: false },
    { value: 8.5, label: '8.5%', common: false },
    { value: 10, label: '10%', common: false },
    { value: 12, label: '12%', common: true },
    { value: 14, label: '14%', common: false },
    { value: 15, label: '15%', common: false },
    { value: 17, label: '17%', common: false }
  ];

  months = [
    { value: 1, label: 'Styczeń' },
    { value: 2, label: 'Luty' },
    { value: 3, label: 'Marzec' },
    { value: 4, label: 'Kwiecień' },
    { value: 5, label: 'Maj' },
    { value: 6, label: 'Czerwiec' },
    { value: 7, label: 'Lipiec' },
    { value: 8, label: 'Sierpień' },
    { value: 9, label: 'Wrzesień' },
    { value: 10, label: 'Październik' },
    { value: 11, label: 'Listopad' },
    { value: 12, label: 'Grudzień' }
  ];

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.isLoading.set(true);

    this.taxService.getSettings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.form.patchValue({
          taxForm: settings.taxForm,
          zusType: settings.zusType,
          customZusAmount: settings.customZusAmount ? Number(settings.customZusAmount) : null,
          ryczaltRate: Number(settings.ryczaltRate) || 12,
          fiscalYearStart: settings.fiscalYearStart || 1
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load tax settings:', err);
        this.isLoading.set(false);
        // Settings might not exist yet, that's okay
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.isSaving.set(true);

    const formValue = this.form.value;
    const settingsData: Partial<TaxSettings> = {
      taxForm: formValue.taxForm as TaxForm,
      zusType: formValue.zusType as ZUSType,
      fiscalYearStart: formValue.fiscalYearStart || 1
    };

    if (formValue.zusType === 'CUSTOM' && formValue.customZusAmount) {
      settingsData.customZusAmount = formValue.customZusAmount;
    }

    if (formValue.taxForm === 'RYCZALT') {
      settingsData.ryczaltRate = formValue.ryczaltRate || 12;
    }

    this.taxService.updateSettings(settingsData).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notificationService.success('Ustawienia podatkowe zostały zapisane');
        this.router.navigate(['/taxes']);
      },
      error: (err) => {
        console.error('Failed to save tax settings:', err);
        this.isSaving.set(false);
        this.notificationService.error('Nie udało się zapisać ustawień');
      }
    });
  }
}
