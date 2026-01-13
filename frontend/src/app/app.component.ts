import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { LanguageService } from './core/services/language.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: []
})
export class AppComponent {
  // Initialize ThemeService early to ensure theme is applied
  // and system preference listener is active
  private themeService = inject(ThemeService);
  // Initialize LanguageService early to ensure translations are loaded
  private languageService = inject(LanguageService);
}
