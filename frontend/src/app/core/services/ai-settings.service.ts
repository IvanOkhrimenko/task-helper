import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export type AIProvider = 'CLAUDE' | 'OPENAI' | 'LOCAL';

export interface AISettings {
  provider: AIProvider;
  modelId: string;
  maxTokens: number;
  temperature: number;
  isActive: boolean;
}

export interface AISettingsAdmin extends AISettings {
  claudeApiKey: string | null;
  openaiApiKey: string | null;
  hasClaudeKey: boolean;
  hasOpenaiKey: boolean;
  updatedAt: string;
}

export interface UpdateAISettings {
  provider?: AIProvider;
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
  claudeApiKey?: string;
  openaiApiKey?: string;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AISettingsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/chat`;

  // State
  settings = signal<AISettingsAdmin | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Get settings (admin endpoint with full details)
  fetchSettings(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.http.get<AISettingsAdmin>(`${this.apiUrl}/settings/admin`)
      .pipe(
        tap(settings => {
          this.settings.set(settings);
          this.isLoading.set(false);
        }),
        catchError(err => {
          this.error.set(err.error?.error || 'Failed to load settings');
          this.isLoading.set(false);
          return of(null);
        })
      )
      .subscribe();
  }

  // Update settings
  updateSettings(data: UpdateAISettings): Observable<AISettingsAdmin> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.put<AISettingsAdmin>(`${this.apiUrl}/settings`, data)
      .pipe(
        tap(settings => {
          this.settings.set(settings);
          this.isLoading.set(false);
        }),
        catchError(err => {
          this.error.set(err.error?.error || 'Failed to update settings');
          this.isLoading.set(false);
          throw err;
        })
      );
  }

  // Available models for each provider
  getAvailableModels(provider: AIProvider): { id: string; name: string; description: string }[] {
    switch (provider) {
      case 'CLAUDE':
        return [
          { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Best balance of speed and intelligence' },
          { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Most capable, best for complex tasks' },
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Previous generation, stable' },
          { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest, most cost-effective' }
        ];
      case 'OPENAI':
        return [
          { id: 'gpt-4o', name: 'GPT-4o', description: 'Latest multimodal model' },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Fast and capable' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and affordable' }
        ];
      case 'LOCAL':
        return [
          { id: 'llama-3', name: 'Llama 3', description: 'Local LLM' },
          { id: 'mistral', name: 'Mistral', description: 'Local LLM' }
        ];
      default:
        return [];
    }
  }
}
