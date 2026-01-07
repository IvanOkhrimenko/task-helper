import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'theme-preference';
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Media query for system preference
  private readonly mediaQuery = this.isBrowser
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

  // The user's theme preference
  private themeMode = signal<ThemeMode>(this.getStoredTheme());

  // System preference signal
  private systemPrefersDark = signal(
    this.mediaQuery?.matches ?? false
  );

  // The actual resolved theme (light or dark)
  readonly currentTheme = computed<ResolvedTheme>(() => {
    const mode = this.themeMode();
    if (mode === 'system') {
      return this.systemPrefersDark() ? 'dark' : 'light';
    }
    return mode;
  });

  // Expose the mode for UI
  readonly mode = computed(() => this.themeMode());

  // Is dark mode active?
  readonly isDark = computed(() => this.currentTheme() === 'dark');

  constructor() {
    // Listen for system theme changes
    if (this.mediaQuery) {
      this.mediaQuery.addEventListener('change', (e) => {
        this.systemPrefersDark.set(e.matches);
      });
    }

    // Apply theme whenever it changes - run immediately
    effect(() => {
      const theme = this.currentTheme();
      this.applyTheme(theme);
    });

    // Apply theme immediately on construction (don't wait for effect)
    if (this.isBrowser) {
      this.applyTheme(this.currentTheme());
    }
  }

  /**
   * Set the theme mode
   */
  setTheme(mode: ThemeMode): void {
    this.themeMode.set(mode);
    this.storeTheme(mode);
  }

  /**
   * Toggle between light and dark (ignores system)
   */
  toggle(): void {
    const current = this.currentTheme();
    this.setTheme(current === 'dark' ? 'light' : 'dark');
  }

  /**
   * Cycle through: light -> dark -> system -> light
   */
  cycle(): void {
    const modes: ThemeMode[] = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf(this.themeMode());
    const nextIndex = (currentIndex + 1) % modes.length;
    this.setTheme(modes[nextIndex]);
  }

  private applyTheme(theme: ResolvedTheme): void {
    if (!this.isBrowser) return;

    document.documentElement.setAttribute('data-theme', theme);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        theme === 'dark' ? '#000000' : '#F2F2F7'
      );
    }
  }

  private getStoredTheme(): ThemeMode {
    if (!this.isBrowser) return 'system';

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch (e) {
      console.warn('Failed to read theme from localStorage:', e);
    }
    return 'system'; // Default to system preference
  }

  private storeTheme(mode: ThemeMode): void {
    if (!this.isBrowser) return;

    try {
      localStorage.setItem(this.STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
  }
}
