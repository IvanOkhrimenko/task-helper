import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  createdAt: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface PendingAction {
  id: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  expiresAt?: string;
  requiresConfirmation?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messageCount: number;
  lastMessage?: { content: string; role: string; createdAt: string };
  updatedAt: string;
}

export interface StreamEvent {
  type: 'text' | 'tool_use' | 'tool_result' | 'done' | 'error';
  content?: string;
  toolCall?: ToolCall;
  pendingAction?: PendingAction;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/chat`;

  // State signals
  conversations = signal<Conversation[]>([]);
  currentConversation = signal<Conversation | null>(null);
  messages = signal<ChatMessage[]>([]);
  isLoading = signal(false);
  isStreaming = signal(false);
  pendingActions = signal<PendingAction[]>([]);
  streamingContent = signal('');

  // Computed
  hasConversation = computed(() => this.currentConversation() !== null);

  // Stream events subject
  private streamEvents = new Subject<StreamEvent>();
  streamEvents$ = this.streamEvents.asObservable();

  // Fetch conversations list
  fetchConversations(): void {
    this.isLoading.set(true);
    this.http.get<{ conversations: Conversation[] }>(`${this.apiUrl}/conversations`)
      .pipe(
        tap(response => {
          this.conversations.set(response.conversations);
          this.isLoading.set(false);
        }),
        catchError(error => {
          console.error('Failed to fetch conversations:', error);
          this.isLoading.set(false);
          return of({ conversations: [] });
        })
      )
      .subscribe();
  }

  // Create new conversation
  createConversation(): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.apiUrl}/conversations`, {})
      .pipe(
        tap(conversation => {
          this.currentConversation.set(conversation);
          this.messages.set([]);
          this.pendingActions.set([]);
          this.conversations.update(convs => [conversation, ...convs]);
        })
      );
  }

  // Load conversation with messages
  loadConversation(conversationId: string): void {
    this.isLoading.set(true);
    this.http.get<any>(`${this.apiUrl}/conversations/${conversationId}`)
      .pipe(
        tap(response => {
          this.currentConversation.set({
            id: response.id,
            title: response.title,
            messageCount: response.messages?.length || 0,
            updatedAt: response.updatedAt
          });
          this.messages.set(response.messages || []);
          this.pendingActions.set(response.pendingActions || []);
          this.isLoading.set(false);
        }),
        catchError(error => {
          console.error('Failed to load conversation:', error);
          this.isLoading.set(false);
          return of(null);
        })
      )
      .subscribe();
  }

  // Delete conversation
  deleteConversation(conversationId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/conversations/${conversationId}`)
      .pipe(
        tap(() => {
          this.conversations.update(convs => convs.filter(c => c.id !== conversationId));
          if (this.currentConversation()?.id === conversationId) {
            this.currentConversation.set(null);
            this.messages.set([]);
          }
        })
      );
  }

  // Send message with streaming
  sendMessageStream(message: string): void {
    const conversationId = this.currentConversation()?.id;
    if (!conversationId) {
      console.error('No active conversation');
      return;
    }

    this.isStreaming.set(true);
    this.streamingContent.set('');

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'USER',
      content: message,
      createdAt: new Date().toISOString()
    };
    this.messages.update(msgs => [...msgs, userMessage]);

    // Create EventSource for SSE
    const token = localStorage.getItem('token');
    const url = `${this.apiUrl}/message/stream`;

    // Use fetch with POST for SSE (EventSource only supports GET)
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ conversationId, message })
    }).then(async response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              // Add final assistant message
              if (assistantContent) {
                const assistantMessage: ChatMessage = {
                  id: crypto.randomUUID(),
                  role: 'ASSISTANT',
                  content: assistantContent,
                  createdAt: new Date().toISOString()
                };
                this.messages.update(msgs => [...msgs, assistantMessage]);
              }
              this.isStreaming.set(false);
              this.streamingContent.set('');
              continue;
            }

            try {
              const event: StreamEvent = JSON.parse(data);
              this.streamEvents.next(event);

              if (event.type === 'text' && event.content) {
                assistantContent += event.content;
                this.streamingContent.set(assistantContent);
              } else if (event.type === 'tool_use' && event.pendingAction) {
                this.pendingActions.update(actions => [...actions, event.pendingAction!]);
              } else if (event.type === 'error') {
                console.error('Stream error:', event.error);
              }
            } catch (e) {
              console.error('Failed to parse event:', e);
            }
          }
        }
      }
    }).catch(error => {
      console.error('Stream error:', error);
      this.isStreaming.set(false);
      this.streamingContent.set('');
    });
  }

  // Approve pending action
  approveAction(actionId: string): Observable<any> {
    const conversationId = this.currentConversation()?.id;
    if (!conversationId) {
      return of({ error: 'No active conversation' });
    }

    return this.http.post<any>(`${this.apiUrl}/actions/${actionId}/approve`, { conversationId })
      .pipe(
        tap(result => {
          this.pendingActions.update(actions => actions.filter(a => a.id !== actionId));
          // Optionally refresh messages
          this.loadConversation(conversationId);
        })
      );
  }

  // Reject pending action
  rejectAction(actionId: string): Observable<any> {
    const conversationId = this.currentConversation()?.id;
    if (!conversationId) {
      return of({ error: 'No active conversation' });
    }

    return this.http.post<any>(`${this.apiUrl}/actions/${actionId}/reject`, { conversationId })
      .pipe(
        tap(() => {
          this.pendingActions.update(actions => actions.filter(a => a.id !== actionId));
        })
      );
  }

  // Start a new chat
  startNewChat(): void {
    this.createConversation().subscribe();
  }

  // Clear current conversation
  clearCurrentConversation(): void {
    this.currentConversation.set(null);
    this.messages.set([]);
    this.pendingActions.set([]);
  }

  // Generate email template with AI
  generateEmailTemplate(prompt: string): Observable<{ success: boolean; subject: string; body: string }> {
    return this.http.post<{ success: boolean; subject: string; body: string }>(
      `${this.apiUrl}/generate-email-template`,
      { prompt }
    );
  }
}
