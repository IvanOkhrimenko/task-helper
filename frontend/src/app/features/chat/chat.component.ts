import {
  Component,
  inject,
  signal,
  computed,
  effect,
  ElementRef,
  ViewChild,
  AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ChatService, ChatMessage, PendingAction } from '../../core/services/chat.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <!-- FAB Button -->
    <button
      class="chat-fab"
      [class.chat-fab--active]="isOpen()"
      [class.chat-fab--pulse]="pendingActions().length > 0"
      (click)="toggleChat()"
      [attr.aria-label]="(isOpen() ? 'shared.chat.closeChat' : 'shared.chat.openAiAssistant') | translate"
    >
      @if (isOpen()) {
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      } @else {
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"/>
          <path d="M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2"/>
          <path d="M19 11h2m-1 -1v2"/>
        </svg>
      }
      @if (pendingActions().length > 0 && !isOpen()) {
        <span class="chat-fab__badge">{{ pendingActions().length }}</span>
      }
    </button>

    <!-- Chat Panel -->
    @if (isOpen()) {
      <div class="chat-panel" [class.chat-panel--visible]="isOpen()">
        <!-- Header -->
        <div class="chat-header">
          <div class="chat-header__left">
            <div class="chat-header__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"/>
                <path d="M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2"/>
              </svg>
            </div>
            <div class="chat-header__title">
              <span class="chat-header__name">{{ 'shared.chat.dayliumAi' | translate }}</span>
              <span class="chat-header__status">
                @if (isStreaming()) {
                  <span class="status-dot status-dot--active"></span>
                  {{ 'shared.chat.thinking' | translate }}
                } @else {
                  <span class="status-dot"></span>
                  {{ 'shared.chat.readyToHelp' | translate }}
                }
              </span>
            </div>
          </div>
          <div class="chat-header__actions">
            <button
              class="header-btn"
              (click)="startNewChat()"
              [title]="'shared.chat.newConversation' | translate"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </button>
            <button
              class="header-btn"
              (click)="toggleChat()"
              [title]="'shared.chat.close' | translate"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Messages Area -->
        <div class="chat-messages" #messagesContainer (click)="onChatClick($event)">
          <div class="chat-messages-inner">
          @if (!hasMessages()) {
            <!-- Welcome State -->
            <div class="chat-welcome">
              <div class="chat-welcome__icon">
                <svg viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="20" fill="url(#welcomeGradient)" opacity="0.15"/>
                  <path d="M24 8c.264 0 .526 0 .786 0a15 15 0 0 0 15.84 24.892A18 18 0 1 1 24 8z" stroke="url(#welcomeGradient)" stroke-width="2" fill="none"/>
                  <path d="M34 12a4 4 0 0 0 4 4a4 4 0 0 0 -4 4a4 4 0 0 0 -4 -4a4 4 0 0 0 4 -4" stroke="url(#welcomeGradient)" stroke-width="2" fill="none"/>
                  <defs>
                    <linearGradient id="welcomeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#10B981"/>
                      <stop offset="100%" stop-color="#059669"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h3 class="chat-welcome__title">{{ 'shared.chat.howCanIHelp' | translate }}</h3>
              <p class="chat-welcome__subtitle">{{ 'shared.chat.capabilities' | translate }}</p>
              <div class="chat-suggestions">
                @for (suggestion of suggestions; track suggestion) {
                  <button
                    class="suggestion-btn"
                    (click)="sendSuggestion(suggestion)"
                  >
                    <span class="suggestion-btn__icon">{{ getSuggestionIcon(suggestion) }}</span>
                    {{ suggestion }}
                  </button>
                }
              </div>
            </div>
          } @else {
            <!-- Messages - Only show USER and ASSISTANT messages, hide TOOL messages (internal) -->
            @for (message of messages(); track message.id) {
              @if (message.role !== 'TOOL') {
                <div
                  class="chat-message"
                  [class.chat-message--user]="message.role === 'USER'"
                  [class.chat-message--assistant]="message.role === 'ASSISTANT'"
                >
                  @if (message.role === 'ASSISTANT') {
                    <div class="message-avatar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"/>
                      </svg>
                    </div>
                  }
                  <div class="message-content">
                    <div class="message-text" [innerHTML]="formatMessage(message.content)"></div>
                    <span class="message-time">{{ formatTime(message.createdAt) }}</span>
                  </div>
                </div>
              }
            }

            <!-- Streaming Content -->
            @if (isStreaming() && streamingContent()) {
              <div class="chat-message chat-message--assistant chat-message--streaming">
                <div class="message-avatar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"/>
                  </svg>
                </div>
                <div class="message-content">
                  <div class="message-text" [innerHTML]="formatMessage(streamingContent())"></div>
                </div>
              </div>
            }

            <!-- Typing Indicator -->
            @if (isStreaming() && !streamingContent()) {
              <div class="chat-message chat-message--assistant">
                <div class="message-avatar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"/>
                  </svg>
                </div>
                <div class="message-content">
                  <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            }

            <!-- Pending Actions -->
            @for (action of pendingActions(); track action.id) {
              <div class="action-card">
                <div class="action-card__header">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 9v4M12 17h.01"/>
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                  <span>{{ 'shared.chat.actionRequired' | translate }}</span>
                </div>
                <div class="action-card__body">
                  <p class="action-card__title">{{ getActionTitle(action.toolName) }}</p>
                  <div class="action-card__details">
                    @for (item of getActionDetails(action.toolArgs); track item.key) {
                      <div class="detail-row">
                        <span class="detail-key">{{ item.key }}:</span>
                        <span class="detail-value">{{ item.value }}</span>
                      </div>
                    }
                  </div>
                </div>
                <div class="action-card__actions">
                  <button
                    class="action-btn action-btn--cancel"
                    (click)="rejectAction(action.id)"
                  >
                    {{ 'shared.chat.cancel' | translate }}
                  </button>
                  <button
                    class="action-btn action-btn--approve"
                    (click)="approveAction(action.id)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M5 12l5 5L20 7"/>
                    </svg>
                    {{ 'shared.chat.approve' | translate }}
                  </button>
                </div>
              </div>
            }
          }
          </div>
        </div>

        <!-- Input Area -->
        <div class="chat-input">
          <div class="chat-input__wrapper">
            <textarea
              #inputField
              class="chat-input__field"
              [(ngModel)]="inputMessage"
              (keydown)="onKeyDown($event)"
              [placeholder]="'shared.chat.askAnything' | translate"
              rows="1"
              [disabled]="isStreaming()"
            ></textarea>
            <button
              class="chat-input__send"
              (click)="sendMessage()"
              [disabled]="!inputMessage.trim() || isStreaming()"
              [class.chat-input__send--active]="inputMessage.trim() && !isStreaming()"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
          <p class="chat-input__hint">{{ 'shared.chat.inputHint' | translate }}</p>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      --chat-bg: #0f1419;
      --chat-surface: #1a1f26;
      --chat-surface-elevated: #242b35;
      --chat-border: rgba(255, 255, 255, 0.08);
      --chat-text: #e7e9ea;
      --chat-text-muted: #71767b;
      --chat-primary: #10B981;
      --chat-primary-light: #34D399;
      --chat-accent: #7c3aed;
      --chat-success: #22c55e;
      --chat-warning: #f59e0b;
      --chat-radius: 16px;
      --chat-radius-sm: 8px;

      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* FAB Button */
    .chat-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      background: linear-gradient(135deg, var(--chat-primary) 0%, var(--chat-accent) 100%);
      box-shadow:
        0 4px 20px rgba(16, 185, 129, 0.4),
        0 0 0 0 rgba(16, 185, 129, 0.4);
      color: white;

      svg {
        width: 24px;
        height: 24px;
        transition: transform 0.3s ease;
      }

      &:hover {
        transform: scale(1.08);
        box-shadow:
          0 6px 28px rgba(16, 185, 129, 0.5),
          0 0 0 0 rgba(16, 185, 129, 0.4);
      }

      &:active {
        transform: scale(0.95);
      }

      &--active {
        background: var(--chat-surface-elevated);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

        &:hover {
          box-shadow: 0 6px 28px rgba(0, 0, 0, 0.4);
        }
      }

      &--pulse {
        animation: fabPulse 2s infinite;
      }

      &__badge {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        border-radius: 10px;
        background: var(--chat-warning);
        color: black;
        font-size: 11px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    @keyframes fabPulse {
      0%, 100% { box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4), 0 0 0 0 rgba(245, 158, 11, 0.4); }
      50% { box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4), 0 0 0 8px rgba(245, 158, 11, 0); }
    }

    /* Chat Panel */
    .chat-panel {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 400px;
      max-height: 600px;
      height: calc(100vh - 140px);
      min-height: 400px;
      background: var(--chat-bg);
      border-radius: var(--chat-radius);
      border: 1px solid var(--chat-border);
      box-shadow:
        0 25px 50px -12px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 999;
      animation: panelSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      transform-origin: bottom right;
    }

    @keyframes panelSlideIn {
      from {
        opacity: 0;
        transform: scale(0.9) translateY(20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    /* Header */
    .chat-header {
      flex-shrink: 0;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--chat-border);
      background: var(--chat-surface);

      &__left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      &__icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: linear-gradient(135deg, var(--chat-primary) 0%, var(--chat-accent) 100%);
        display: flex;
        align-items: center;
        justify-content: center;

        svg {
          width: 20px;
          height: 20px;
          color: white;
        }
      }

      &__title {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      &__name {
        font-size: 15px;
        font-weight: 600;
        color: var(--chat-text);
      }

      &__status {
        font-size: 12px;
        color: var(--chat-text-muted);
        display: flex;
        align-items: center;
        gap: 6px;
      }

      &__actions {
        display: flex;
        gap: 4px;
      }
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--chat-text-muted);

      &--active {
        background: var(--chat-success);
        animation: statusPulse 1.5s infinite;
      }
    }

    @keyframes statusPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .header-btn {
      width: 32px;
      height: 32px;
      border-radius: var(--chat-radius-sm);
      border: none;
      background: transparent;
      color: var(--chat-text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: var(--chat-surface-elevated);
        color: var(--chat-text);
      }
    }

    /* Messages Area */
    .chat-messages {
      flex: 1;
      min-height: 0;
      overflow-y: scroll;
      overflow-x: hidden;
      padding: 20px;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }

      &::-webkit-scrollbar-thumb {
        background: var(--chat-border);
        border-radius: 3px;

        &:hover {
          background: var(--chat-text-muted);
        }
      }
    }

    .chat-messages-inner {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-height: 100%;
    }

    /* Welcome State */
    .chat-welcome {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40px 20px;
      height: 100%;

      &__icon {
        margin-bottom: 20px;
        animation: welcomeFloat 3s ease-in-out infinite;

        svg {
          width: 64px;
          height: 64px;
        }
      }

      &__title {
        font-size: 18px;
        font-weight: 600;
        color: var(--chat-text);
        margin: 0 0 8px 0;
      }

      &__subtitle {
        font-size: 13px;
        color: var(--chat-text-muted);
        margin: 0 0 24px 0;
        max-width: 280px;
        line-height: 1.5;
      }
    }

    @keyframes welcomeFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    .chat-suggestions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
    }

    .suggestion-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: var(--chat-surface);
      border: 1px solid var(--chat-border);
      border-radius: var(--chat-radius-sm);
      color: var(--chat-text);
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;

      &:hover {
        background: var(--chat-surface-elevated);
        border-color: var(--chat-primary);
        transform: translateX(4px);
      }

      &__icon {
        font-size: 16px;
      }
    }

    /* Messages */
    .chat-message {
      display: flex;
      gap: 12px;
      max-width: 90%;
      animation: messageSlideIn 0.3s ease;

      &--user {
        align-self: flex-end;
        flex-direction: row-reverse;

        .message-content {
          background: linear-gradient(135deg, var(--chat-primary) 0%, var(--chat-primary-light) 100%);
          color: white;
          border-radius: var(--chat-radius) var(--chat-radius) 4px var(--chat-radius);
        }

        .message-time {
          text-align: right;
          color: rgba(255, 255, 255, 0.7);
        }
      }

      &--assistant {
        align-self: flex-start;

        .message-content {
          background: var(--chat-surface);
          border-radius: var(--chat-radius) var(--chat-radius) var(--chat-radius) 4px;
          color: var(--chat-text);
        }

        .message-text {
          color: var(--chat-text);
        }
      }

      &--tool {
        align-self: flex-start;
        max-width: 100%;
      }

      &--streaming {
        .message-content {
          position: relative;

          &::after {
            content: '';
            display: inline-block;
            width: 2px;
            height: 16px;
            background: var(--chat-primary);
            margin-left: 2px;
            animation: cursorBlink 1s infinite;
            vertical-align: middle;
          }
        }
      }
    }

    @keyframes messageSlideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes cursorBlink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }

    .message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--chat-primary) 0%, var(--chat-accent) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      svg {
        width: 18px;
        height: 18px;
        color: white;
      }
    }

    .message-content {
      padding: 12px 16px;
      border: 1px solid var(--chat-border);
    }

    .message-text {
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      color: var(--chat-text);

      code {
        background: rgba(0, 0, 0, 0.3);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 12px;
        color: var(--chat-primary-light);
      }

      strong {
        color: white;
        font-weight: 600;
      }

      .chat-link {
        color: var(--chat-primary-light);
        text-decoration: none;
        border-bottom: 1px solid transparent;
        transition: all 0.2s ease;
        cursor: pointer;

        &:hover {
          color: white;
          border-bottom-color: var(--chat-primary-light);
        }

        &--internal {
          display: inline;
        }

        &--external::after {
          content: ' ↗';
          font-size: 10px;
        }
      }

      .chat-bullet {
        color: var(--chat-primary);
        margin-right: 4px;
      }
    }

    .message-time {
      font-size: 10px;
      color: var(--chat-text-muted);
      margin-top: 6px;
      display: block;
    }

    /* Tool Result */
    .tool-result {
      width: 100%;

      &__label {
        display: inline-block;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--chat-text-muted);
        background: var(--chat-surface-elevated);
        padding: 4px 8px;
        border-radius: 4px;
        margin-bottom: 8px;
      }

      &__code {
        background: var(--chat-bg);
        border: 1px solid var(--chat-border);
        border-radius: var(--chat-radius-sm);
        padding: 12px;
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 11px;
        color: var(--chat-text);
        overflow-x: auto;
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
      }
    }

    /* Typing Indicator */
    .typing-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 0;

      span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--chat-text-muted);
        animation: typingDot 1.4s infinite ease-in-out;

        &:nth-child(1) { animation-delay: 0s; }
        &:nth-child(2) { animation-delay: 0.2s; }
        &:nth-child(3) { animation-delay: 0.4s; }
      }
    }

    @keyframes typingDot {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }

    /* Action Card */
    .action-card {
      background: var(--chat-surface);
      border: 1px solid var(--chat-warning);
      border-radius: var(--chat-radius);
      overflow: hidden;
      animation: actionSlideIn 0.4s ease;

      &__header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: rgba(245, 158, 11, 0.1);
        color: var(--chat-warning);
        font-size: 12px;
        font-weight: 600;

        svg {
          width: 16px;
          height: 16px;
        }
      }

      &__body {
        padding: 16px;
      }

      &__title {
        font-size: 14px;
        font-weight: 600;
        color: var(--chat-text);
        margin: 0 0 12px 0;
      }

      &__details {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      &__actions {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        border-top: 1px solid var(--chat-border);
        background: var(--chat-surface-elevated);
      }
    }

    @keyframes actionSlideIn {
      from {
        opacity: 0;
        transform: translateY(10px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .detail-row {
      display: flex;
      gap: 8px;
      font-size: 13px;
    }

    .detail-key {
      color: var(--chat-text-muted);
      text-transform: capitalize;
    }

    .detail-value {
      color: var(--chat-text);
      font-weight: 500;
    }

    .action-btn {
      flex: 1;
      padding: 10px 16px;
      border-radius: var(--chat-radius-sm);
      border: none;
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s ease;

      svg {
        width: 16px;
        height: 16px;
      }

      &--cancel {
        background: var(--chat-surface);
        border: 1px solid var(--chat-border);
        color: var(--chat-text-muted);

        &:hover {
          background: var(--chat-bg);
          color: var(--chat-text);
        }
      }

      &--approve {
        background: var(--chat-success);
        color: white;

        &:hover {
          filter: brightness(1.1);
        }
      }
    }

    /* Input Area */
    .chat-input {
      flex-shrink: 0;
      padding: 16px 20px;
      border-top: 1px solid var(--chat-border);
      background: var(--chat-surface);

      &__wrapper {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        background: var(--chat-bg);
        border: 1px solid var(--chat-border);
        border-radius: var(--chat-radius);
        padding: 8px 8px 8px 16px;
        transition: border-color 0.2s ease;

        &:focus-within {
          border-color: var(--chat-primary);
        }
      }

      &__field {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--chat-text);
        font-family: inherit;
        font-size: 14px;
        line-height: 1.5;
        resize: none;
        max-height: 120px;

        &::placeholder {
          color: var(--chat-text-muted);
        }

        &:disabled {
          opacity: 0.5;
        }
      }

      &__send {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: none;
        background: var(--chat-surface-elevated);
        color: var(--chat-text-muted);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex-shrink: 0;

        svg {
          width: 18px;
          height: 18px;
        }

        &:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        &--active {
          background: linear-gradient(135deg, var(--chat-primary) 0%, var(--chat-accent) 100%);
          color: white;

          &:hover {
            transform: scale(1.05);
          }
        }
      }

      &__hint {
        font-size: 11px;
        color: var(--chat-text-muted);
        margin: 8px 0 0 0;
        text-align: center;
      }
    }

    /* Responsive */
    @media (max-width: 480px) {
      .chat-panel {
        bottom: 0;
        right: 0;
        left: 0;
        width: 100%;
        max-height: 100vh;
        height: 100vh;
        border-radius: 0;
      }

      .chat-fab {
        bottom: 16px;
        right: 16px;
      }
    }
  `]
})
export class ChatComponent implements AfterViewChecked {
  private chatService = inject(ChatService);
  private router = inject(Router);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('inputField') inputField!: ElementRef;

  isOpen = signal(false);
  inputMessage = '';

  // Service signals
  messages = this.chatService.messages;
  currentConversation = this.chatService.currentConversation;
  isStreaming = this.chatService.isStreaming;
  pendingActions = this.chatService.pendingActions;
  streamingContent = this.chatService.streamingContent;

  hasMessages = computed(() => this.messages().length > 0);

  suggestions = [
    'Create invoice for last month',
    'Show my earnings this year',
    'Set a reminder for tomorrow',
    'List unpaid invoices'
  ];

  private shouldScrollToBottom = false;

  constructor() {
    // Auto-scroll on new messages
    effect(() => {
      this.messages();
      this.streamingContent();
      this.shouldScrollToBottom = true;
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  toggleChat(): void {
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      this.chatService.fetchConversations();
      if (!this.currentConversation()) {
        this.startNewChat();
      }
      setTimeout(() => this.inputField?.nativeElement?.focus(), 100);
    }
  }

  startNewChat(): void {
    this.chatService.startNewChat();
  }

  sendMessage(): void {
    const message = this.inputMessage.trim();
    if (!message || this.isStreaming()) return;

    this.inputMessage = '';
    this.chatService.sendMessageStream(message);
  }

  sendSuggestion(suggestion: string): void {
    this.inputMessage = suggestion;
    this.sendMessage();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  approveAction(actionId: string): void {
    this.chatService.approveAction(actionId).subscribe();
  }

  rejectAction(actionId: string): void {
    this.chatService.rejectAction(actionId).subscribe();
  }

  // Handle clicks on internal links to use Angular Router (event delegation)
  onChatClick(event: MouseEvent): void {
    let target = event.target as HTMLElement;

    // Walk up the DOM tree to find element with data-route
    while (target && target !== event.currentTarget) {
      if (target.hasAttribute('data-route')) {
        event.preventDefault();
        event.stopPropagation();
        const route = target.getAttribute('data-route');
        if (route) {
          this.isOpen.set(false); // Close chat panel
          setTimeout(() => {
            this.router.navigateByUrl(route);
          }, 100);
        }
        return;
      }
      target = target.parentElement as HTMLElement;
    }
  }

  formatMessage(content: string): string {
    if (!content) return '';

    // Markdown-like formatting with links support
    return content
      // Links: [text](url) - internal links use data-route for Angular Router navigation
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
        if (url.startsWith('/')) {
          // Internal link - use span styled as link with data-route for router navigation
          return `<span class="chat-link chat-link--internal" data-route="${url}" role="link" tabindex="0">${text}</span>`;
        }
        // External link
        return `<a href="${url}" target="_blank" rel="noopener" class="chat-link chat-link--external">${text}</a>`;
      })
      // Code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Bullet points
      .replace(/^- (.+)$/gm, '<span class="chat-bullet">•</span> $1')
      // Line breaks
      .replace(/\n/g, '<br>');
  }

  formatJson(content: string): string {
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  getSuggestionIcon(suggestion: string): string {
    if (suggestion.toLowerCase().includes('invoice')) return '📄';
    if (suggestion.toLowerCase().includes('earning') || suggestion.toLowerCase().includes('revenue')) return '💰';
    if (suggestion.toLowerCase().includes('reminder')) return '⏰';
    if (suggestion.toLowerCase().includes('unpaid')) return '📋';
    return '✨';
  }

  getActionTitle(toolName: string): string {
    const titles: Record<string, string> = {
      createInvoice: 'Create Invoice',
      updateTask: 'Update Task',
      createReminder: 'Create Reminder',
      deleteReminder: 'Delete Reminder'
    };
    return titles[toolName] || toolName;
  }

  getActionDetails(args: Record<string, unknown>): { key: string; value: string }[] {
    return Object.entries(args)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => ({
        key: key.replace(/([A-Z])/g, ' $1').toLowerCase(),
        value: typeof value === 'object' ? JSON.stringify(value) : String(value)
      }));
  }

  private scrollToBottom(): void {
    if (this.messagesContainer?.nativeElement) {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }
}
