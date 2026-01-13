import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type Language = 'en' | 'uk' | 'pl' | 'es';

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private translate = inject(TranslateService);
  private readonly STORAGE_KEY = 'preferred-language';

  currentLanguage = signal<Language>('en');

  readonly languages: LanguageOption[] = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
    { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' }
  ];

  constructor() {
    this.initLanguage();
  }

  private initLanguage(): void {
    const availableLanguages = this.languages.map(l => l.code);
    this.translate.addLangs(availableLanguages);
    this.translate.setDefaultLang('en');

    const savedLanguage = this.getSavedLanguage();
    const browserLanguage = this.getBrowserLanguage();
    const initialLanguage = savedLanguage || browserLanguage || 'en';

    this.setLanguage(initialLanguage);
  }

  private getSavedLanguage(): Language | null {
    if (typeof localStorage === 'undefined') return null;
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved && this.isValidLanguage(saved)) {
      return saved as Language;
    }
    return null;
  }

  private getBrowserLanguage(): Language | null {
    if (typeof navigator === 'undefined') return null;
    const browserLang = navigator.language.split('-')[0];
    if (this.isValidLanguage(browserLang)) {
      return browserLang as Language;
    }
    return null;
  }

  private isValidLanguage(lang: string): boolean {
    return this.languages.some(l => l.code === lang);
  }

  setLanguage(lang: Language): void {
    if (!this.isValidLanguage(lang)) {
      lang = 'en';
    }

    this.translate.use(lang);
    this.currentLanguage.set(lang);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, lang);
    }

    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }

  getCurrentLanguage(): Language {
    return this.currentLanguage();
  }

  getCurrentLanguageOption(): LanguageOption {
    return this.languages.find(l => l.code === this.currentLanguage()) || this.languages[0];
  }

  getLanguageByCode(code: Language): LanguageOption | undefined {
    return this.languages.find(l => l.code === code);
  }
}
