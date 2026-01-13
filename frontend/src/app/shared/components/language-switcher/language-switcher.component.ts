import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService, Language, LanguageOption } from '../../../core/services/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="language-switcher" [class.language-switcher--open]="isOpen()">
      <button
        class="language-switcher__trigger"
        (click)="toggleDropdown()"
        [attr.aria-expanded]="isOpen()"
        aria-haspopup="listbox"
      >
        <span class="language-switcher__flag">{{ currentLanguage().flag }}</span>
        <span class="language-switcher__code">{{ currentLanguage().code.toUpperCase() }}</span>
        <svg class="language-switcher__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      @if (isOpen()) {
        <div class="language-switcher__dropdown" role="listbox">
          @for (lang of languages; track lang.code) {
            <button
              class="language-switcher__option"
              [class.language-switcher__option--active]="lang.code === currentLanguage().code"
              (click)="selectLanguage(lang.code)"
              role="option"
              [attr.aria-selected]="lang.code === currentLanguage().code"
            >
              <span class="language-switcher__option-flag">{{ lang.flag }}</span>
              <span class="language-switcher__option-name">{{ lang.nativeName }}</span>
              @if (lang.code === currentLanguage().code) {
                <svg class="language-switcher__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .language-switcher {
      position: relative;
      display: inline-block;
    }

    .language-switcher__trigger {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-md);
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      background: var(--color-fill-quaternary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--color-text);
        background: var(--color-fill-tertiary);
        border-color: var(--color-text-tertiary);
      }
    }

    .language-switcher--open .language-switcher__trigger {
      color: var(--color-primary);
      border-color: var(--color-primary);
      background: var(--color-primary-subtle);
    }

    .language-switcher__flag {
      font-size: 1.125rem;
      line-height: 1;
    }

    .language-switcher__code {
      letter-spacing: 0.02em;
    }

    .language-switcher__chevron {
      width: 14px;
      height: 14px;
      transition: transform var(--transition-fast);
    }

    .language-switcher--open .language-switcher__chevron {
      transform: rotate(180deg);
    }

    .language-switcher__dropdown {
      position: absolute;
      top: calc(100% + var(--space-xs));
      right: 0;
      min-width: 180px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: var(--space-xs);
      z-index: 1000;
      animation: dropdownSlide 0.2s ease;
    }

    @keyframes dropdownSlide {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .language-switcher__option {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      width: 100%;
      padding: var(--space-sm) var(--space-md);
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
      background: transparent;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      text-align: left;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-fill-tertiary);
      }

      &--active {
        color: var(--color-primary);
        background: var(--color-primary-subtle);

        &:hover {
          background: var(--color-primary-subtle);
        }
      }
    }

    .language-switcher__option-flag {
      font-size: 1.25rem;
      line-height: 1;
    }

    .language-switcher__option-name {
      flex: 1;
    }

    .language-switcher__check {
      width: 16px;
      height: 16px;
      color: var(--color-primary);
    }
  `]
})
export class LanguageSwitcherComponent {
  private languageService = inject(LanguageService);
  private elementRef = inject(ElementRef);

  isOpen = signal(false);
  languages = this.languageService.languages;

  currentLanguage(): LanguageOption {
    return this.languageService.getCurrentLanguageOption();
  }

  toggleDropdown(): void {
    this.isOpen.update(v => !v);
  }

  selectLanguage(code: Language): void {
    this.languageService.setLanguage(code);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.isOpen.set(false);
  }
}
