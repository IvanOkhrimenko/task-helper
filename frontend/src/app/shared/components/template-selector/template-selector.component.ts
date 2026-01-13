import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { InvoiceTemplate } from '../../../core/services/client.service';

interface TemplateOption {
  id: InvoiceTemplate;
  nameKey: string;
  descriptionKey: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    text: string;
  };
}

@Component({
  selector: 'app-template-selector',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="template-selector">
      <div class="template-grid">
        @for (template of templates; track template.id; let i = $index) {
          <button
            type="button"
            class="template-card"
            [class.template-card--selected]="value === template.id"
            (click)="selectTemplate(template.id)"
            [style.animation-delay]="i * 50 + 'ms'"
          >
            <div class="template-preview" [attr.data-template]="template.id">
              <!-- Mini Invoice Preview -->
              <div class="preview-invoice" [style.background]="template.colors.bg">
                <!-- Header -->
                <div class="preview-header" [style.background]="template.colors.primary">
                  @if (template.id === 'CREATIVE') {
                    <div class="creative-corner" [style.background]="template.colors.secondary"></div>
                  }
                  @if (template.id === 'CORPORATE') {
                    <div class="corporate-accent" [style.background]="template.colors.accent"></div>
                  }
                </div>

                <!-- Body -->
                <div class="preview-body">
                  <div class="preview-line preview-line--title" [style.background]="template.colors.text"></div>
                  <div class="preview-line preview-line--short" [style.background]="template.colors.secondary"></div>

                  <div class="preview-table">
                    <div class="preview-row preview-row--header" [style.background]="template.colors.primary"></div>
                    <div class="preview-row" [style.border-color]="template.colors.secondary"></div>
                    <div class="preview-row" [style.border-color]="template.colors.secondary"></div>
                  </div>

                  <div class="preview-total">
                    <div class="preview-total-box" [style.background]="template.colors.primary">
                      <div class="preview-total-line" [style.background]="template.colors.accent"></div>
                    </div>
                  </div>
                </div>

                <!-- Footer -->
                <div class="preview-footer" [style.background]="template.colors.secondary"></div>
              </div>

              <!-- Selected checkmark -->
              <div class="selected-indicator">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>

            <div class="template-info">
              <h4 class="template-name">{{ template.nameKey | translate }}</h4>
              <p class="template-description">{{ template.descriptionKey | translate }}</p>
            </div>

            <!-- Color dots indicator -->
            <div class="color-dots">
              <span class="color-dot" [style.background]="template.colors.primary"></span>
              <span class="color-dot" [style.background]="template.colors.secondary"></span>
              <span class="color-dot" [style.background]="template.colors.accent"></span>
            </div>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .template-selector {
      width: 100%;
    }

    .template-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-md);

      @media (max-width: 900px) {
        grid-template-columns: repeat(2, 1fr);
      }

      @media (max-width: 500px) {
        grid-template-columns: 1fr;
      }
    }

    .template-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--space-md);
      background: var(--color-surface);
      border: 2px solid var(--color-border);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      animation: fadeSlideIn 0.4s ease-out both;

      &:hover {
        border-color: var(--color-text-muted);
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);

        .template-preview {
          transform: scale(1.02);
        }

        .color-dots {
          opacity: 1;
          transform: translateY(0);
        }
      }

      &:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
      }

      &--selected {
        border-color: var(--color-primary);
        background: var(--color-primary-subtle);

        .selected-indicator {
          opacity: 1;
          transform: scale(1);
        }

        .template-name {
          color: var(--color-primary);
        }

        &:hover {
          border-color: var(--color-primary);
        }
      }
    }

    @keyframes fadeSlideIn {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .template-preview {
      position: relative;
      width: 100%;
      aspect-ratio: 210 / 297; /* A4 ratio */
      max-height: 160px;
      border-radius: var(--radius-md);
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: transform 0.25s ease;
    }

    .preview-invoice {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .preview-header {
      height: 18%;
      position: relative;
      overflow: hidden;
    }

    .creative-corner {
      position: absolute;
      top: 0;
      left: 0;
      width: 40%;
      height: 100%;
      clip-path: polygon(0 0, 100% 0, 70% 100%, 0 100%);
    }

    .corporate-accent {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
    }

    .preview-body {
      flex: 1;
      padding: 8% 6%;
      display: flex;
      flex-direction: column;
      gap: 6%;
    }

    .preview-line {
      height: 4px;
      border-radius: 2px;

      &--title {
        width: 45%;
        opacity: 0.8;
      }

      &--short {
        width: 30%;
        opacity: 0.4;
      }
    }

    .preview-table {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
      margin-top: 4%;
    }

    .preview-row {
      height: 8px;
      border-radius: 2px;

      &--header {
        opacity: 0.9;
      }

      &:not(.preview-row--header) {
        border: 1px solid;
        opacity: 0.3;
        background: transparent;
      }
    }

    .preview-total {
      display: flex;
      justify-content: flex-end;
      margin-top: auto;
    }

    .preview-total-box {
      width: 35%;
      height: 12px;
      border-radius: 2px;
      position: relative;
      overflow: hidden;
    }

    .preview-total-line {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 2px;
    }

    .preview-footer {
      height: 8%;
      opacity: 0.5;
    }

    .selected-indicator {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      background: var(--color-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      opacity: 0;
      transform: scale(0.5);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);

      svg {
        width: 14px;
        height: 14px;
      }
    }

    .template-info {
      text-align: center;
      margin-top: var(--space-md);
      width: 100%;
    }

    .template-name {
      font-family: var(--font-display);
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 2px;
      transition: color 0.2s ease;
    }

    .template-description {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      line-height: 1.3;
    }

    .color-dots {
      display: flex;
      gap: 4px;
      margin-top: var(--space-sm);
      opacity: 0;
      transform: translateY(4px);
      transition: all 0.2s ease;
    }

    .color-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      box-shadow: inset 0 -1px 2px rgba(0, 0, 0, 0.15);
    }

    /* Template-specific preview styles */
    [data-template="ELEGANT"] {
      .preview-invoice {
        font-family: serif;
      }

      .preview-header {
        border-bottom: 2px solid #2d2d2d;

        &::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 10%;
          right: 10%;
          height: 1px;
          background: #8b7355;
        }
      }
    }

    [data-template="CREATIVE"] {
      .preview-invoice {
        overflow: hidden;
      }

      .preview-total-box {
        border-radius: 0;
        border-left: 3px solid #7c3aed;
      }
    }

    [data-template="MINIMAL"] {
      .preview-header {
        height: 12%;
      }

      .preview-footer {
        display: none;
      }
    }
  `]
})
export class TemplateSelectorComponent {
  @Input() value: InvoiceTemplate = 'STANDARD';
  @Output() valueChange = new EventEmitter<InvoiceTemplate>();

  templates: TemplateOption[] = [
    {
      id: 'STANDARD',
      nameKey: 'shared.templateSelector.templates.standard.name',
      descriptionKey: 'shared.templateSelector.templates.standard.description',
      colors: {
        primary: '#4a5568',
        secondary: '#e2e8f0',
        accent: '#ffffff',
        bg: '#ffffff',
        text: '#2d3748'
      }
    },
    {
      id: 'MINIMAL',
      nameKey: 'shared.templateSelector.templates.minimal.name',
      descriptionKey: 'shared.templateSelector.templates.minimal.description',
      colors: {
        primary: '#f7fafc',
        secondary: '#edf2f7',
        accent: '#333333',
        bg: '#ffffff',
        text: '#333333'
      }
    },
    {
      id: 'MODERN',
      nameKey: 'shared.templateSelector.templates.modern.name',
      descriptionKey: 'shared.templateSelector.templates.modern.description',
      colors: {
        primary: '#2563eb',
        secondary: '#f1f5f9',
        accent: '#ffffff',
        bg: '#ffffff',
        text: '#1e293b'
      }
    },
    {
      id: 'CORPORATE',
      nameKey: 'shared.templateSelector.templates.corporate.name',
      descriptionKey: 'shared.templateSelector.templates.corporate.description',
      colors: {
        primary: '#1e3a5f',
        secondary: '#f8fafc',
        accent: '#c9a227',
        bg: '#ffffff',
        text: '#2d3748'
      }
    },
    {
      id: 'CREATIVE',
      nameKey: 'shared.templateSelector.templates.creative.name',
      descriptionKey: 'shared.templateSelector.templates.creative.description',
      colors: {
        primary: '#7c3aed',
        secondary: '#ec4899',
        accent: '#f5f3ff',
        bg: '#ffffff',
        text: '#1f2937'
      }
    },
    {
      id: 'ELEGANT',
      nameKey: 'shared.templateSelector.templates.elegant.name',
      descriptionKey: 'shared.templateSelector.templates.elegant.description',
      colors: {
        primary: '#2d2d2d',
        secondary: '#d4d0c8',
        accent: '#8b7355',
        bg: '#faf8f5',
        text: '#2d2d2d'
      }
    }
  ];

  selectTemplate(templateId: InvoiceTemplate): void {
    this.value = templateId;
    this.valueChange.emit(templateId);
  }
}
