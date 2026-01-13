import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BusinessService } from '../business.service';
import { BusinessContextService } from '../business-context.service';
import {
  Business,
  BusinessMembership,
  BusinessInvite,
  BusinessRole,
  InviteStatus,
  SettlementType,
  getRoleDisplayName,
  LedgerSummary,
  MemberBalance,
  formatCurrency,
  parseDecimal,
} from '../business.models';

@Component({
  selector: 'app-business-members',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="members-container">
      <!-- Toolbar -->
      <div class="members-toolbar">
        <h2 class="section-title">{{ 'business.members.subtitle' | translate }}</h2>
        @if (canInvite()) {
          <button class="action-btn primary" (click)="openInviteModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <path d="M20 8v6M23 11h-6"/>
            </svg>
            <span>{{ 'business.members.inviteMember' | translate }}</span>
          </button>
        }
      </div>

      <!-- Tabs -->
      <div class="tab-bar">
        <button class="tab-btn" [class.active]="activeTab() === 'members'" (click)="activeTab.set('members')">
          {{ 'business.members.tabs.members' | translate }} ({{ members().length }})
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'invites'" (click)="activeTab.set('invites')">
          {{ 'business.members.tabs.pendingInvites' | translate }} ({{ pendingInvites().length }})
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'balances'" (click)="activeTab.set('balances')">
          {{ 'business.members.tabs.balances' | translate }}
        </button>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>{{ 'common.loading' | translate }}</p>
        </div>
      }

      <!-- Members Tab -->
      @if (!loading() && activeTab() === 'members') {
        <div class="members-list">
          @for (member of members(); track member.id) {
            <div class="member-card">
              <div class="member-avatar">
                {{ getInitials(member.user.name) }}
              </div>
              <div class="member-info">
                <h3 class="member-name">{{ member.user.name }}</h3>
                <p class="member-email">{{ member.user.email }}</p>
                <div class="member-meta">
                  <span class="role-badge" [class]="getRoleClass(member.role)">
                    {{ getRoleDisplay(member.role) }}
                  </span>
                  @if (member.invitedBy) {
                    <span class="invited-by">{{ 'business.members.invitedBy' | translate }} {{ member.invitedBy.name }}</span>
                  }
                </div>
              </div>
              <div class="member-balance" [class.positive]="getMemberBalanceValue(member.id) > 0" [class.negative]="getMemberBalanceValue(member.id) < 0">
                @if (getMemberBalanceValue(member.id) !== 0) {
                  <span class="balance-label">{{ 'business.members.balance' | translate }}</span>
                  <span class="balance-value">{{ formatAmount(getMemberBalanceValue(member.id)) }}</span>
                }
              </div>
              <div class="member-actions">
                @if (canChangeRole(member)) {
                  <select class="role-select" [value]="member.role" (change)="updateRole(member, $event)">
                    @for (role of availableRoles; track role) {
                      <option [value]="role" [disabled]="!canAssignRole(role)">{{ getRoleDisplay(role) }}</option>
                    }
                  </select>
                }
                @if (canRemove(member)) {
                  <button class="action-icon-btn danger" (click)="removeMember(member)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                      <circle cx="8.5" cy="7" r="4"/>
                      <path d="M18 8l5 5M23 8l-5 5"/>
                    </svg>
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Invites Tab -->
      @if (!loading() && activeTab() === 'invites') {
        @if (pendingInvites().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M22 10.5V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12c0 1.1.9 2 2 2h8"/>
                <path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/>
                <path d="M18 15v6M21 18h-6"/>
              </svg>
            </div>
            <h2 class="empty-title">{{ 'business.members.invites.emptyTitle' | translate }}</h2>
            <p class="empty-text">{{ 'business.members.invites.emptyDescription' | translate }}</p>
          </div>
        } @else {
          <div class="invites-list">
            @for (invite of pendingInvites(); track invite.id) {
              <div class="invite-card">
                <div class="invite-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 10.5V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12c0 1.1.9 2 2 2h8"/>
                    <path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/>
                  </svg>
                </div>
                <div class="invite-info">
                  <h3 class="invite-email">{{ invite.email || ('business.members.invites.openLink' | translate) }}</h3>
                  <div class="invite-meta">
                    <span class="role-badge" [class]="getRoleClass(invite.assignedRole)">
                      {{ getRoleDisplay(invite.assignedRole) }}
                    </span>
                    <span class="invite-expires">
                      {{ 'business.members.invites.expires' | translate }} {{ formatDate(invite.expiresAt) }}
                    </span>
                    @if (invite.isSingleUse) {
                      <span class="invite-single-use">{{ 'business.members.invites.singleUse' | translate }}</span>
                    } @else {
                      <span class="invite-uses">{{ 'business.members.invites.usedTimes' | translate: { count: invite.usedCount } }}</span>
                    }
                  </div>
                </div>
                <div class="invite-actions">
                  <button class="action-icon-btn" (click)="copyInviteLink(invite)" [title]="'business.members.invites.copyLink' | translate">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2"/>
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                  </button>
                  <button class="action-icon-btn danger" (click)="revokeInvite(invite)" [title]="'business.members.invites.revokeInvite' | translate">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- Balances Tab -->
      @if (!loading() && activeTab() === 'balances') {
        <div class="balances-section">
          <!-- Summary -->
          <div class="balance-summary-cards">
            <div class="summary-card owed-to">
              <span class="summary-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
              </span>
              <div class="summary-content">
                <span class="summary-label">{{ 'business.members.balances.businessOwes' | translate }}</span>
                <span class="summary-value">{{ formatAmount(ledger()?.totalOwedToMembers || '0') }}</span>
              </div>
            </div>
            <div class="summary-card owed-by">
              <span class="summary-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
              </span>
              <div class="summary-content">
                <span class="summary-label">{{ 'business.members.balances.membersOwe' | translate }}</span>
                <span class="summary-value">{{ formatAmount(ledger()?.totalOwedByMembers || '0') }}</span>
              </div>
            </div>
            <div class="summary-card net" [class.positive]="parseDecimal(ledger()?.netBalance || '0') >= 0" [class.negative]="parseDecimal(ledger()?.netBalance || '0') < 0">
              <span class="summary-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 20V10M12 20V4M6 20v-6"/>
                </svg>
              </span>
              <div class="summary-content">
                <span class="summary-label">{{ 'business.members.balances.netBalance' | translate }}</span>
                <span class="summary-value">{{ formatAmount(ledger()?.netBalance || '0') }}</span>
              </div>
            </div>
          </div>

          <!-- Balance List -->
          <div class="balance-list">
            @for (balance of ledger()?.memberBalances || []; track balance.memberId) {
              <div class="balance-row" [class.positive]="parseDecimal(balance.balance) > 0" [class.negative]="parseDecimal(balance.balance) < 0">
                <div class="balance-member">
                  <div class="member-avatar small">{{ getInitials(balance.userName) }}</div>
                  <div class="member-details">
                    <span class="member-name">{{ balance.userName }}</span>
                    <span class="member-role">{{ balance.role }}</span>
                  </div>
                </div>
                <div class="balance-breakdown">
                  <div class="breakdown-item">
                    <span class="breakdown-label">{{ 'business.members.balances.paidOutOfPocket' | translate }}</span>
                    <span class="breakdown-value">{{ formatAmount(balance.totalPaidOutOfPocket) }}</span>
                  </div>
                  <div class="breakdown-item">
                    <span class="breakdown-label">{{ 'business.members.balances.receivedPersonally' | translate }}</span>
                    <span class="breakdown-value">{{ formatAmount(balance.totalReceivedPersonally) }}</span>
                  </div>
                  <div class="breakdown-item">
                    <span class="breakdown-label">{{ 'business.members.balances.settlementsReceived' | translate }}</span>
                    <span class="breakdown-value">{{ formatAmount(balance.totalSettlementsReceived) }}</span>
                  </div>
                  <div class="breakdown-item">
                    <span class="breakdown-label">{{ 'business.members.balances.settlementsPaid' | translate }}</span>
                    <span class="breakdown-value">{{ formatAmount(balance.totalSettlementsPaid) }}</span>
                  </div>
                </div>
                <div class="balance-total">
                  <span class="total-label">
                    @if (parseDecimal(balance.balance) > 0) {
                      {{ 'business.members.balances.businessOwesLabel' | translate }}
                    } @else if (parseDecimal(balance.balance) < 0) {
                      {{ 'business.members.balances.owesBusinessLabel' | translate }}
                    } @else {
                      {{ 'business.members.balances.settled' | translate }}
                    }
                  </span>
                  <span class="total-value">{{ formatAmount(Math.abs(parseDecimal(balance.balance))) }}</span>
                </div>
                @if (parseDecimal(balance.balance) !== 0) {
                  <button class="settle-btn" (click)="openSettlementModal(balance)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                    </svg>
                    <span>{{ 'business.members.balances.settleUp' | translate }}</span>
                  </button>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- Invite Modal -->
      @if (showInviteModal()) {
        <div class="modal-overlay" (click)="closeInviteModal()">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">{{ 'business.members.modal.title' | translate }}</h2>
              <button class="modal-close" (click)="closeInviteModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form class="modal-form" (submit)="sendInvite($event)">
              <div class="form-group">
                <label class="form-label">{{ 'business.members.modal.emailLabel' | translate }} <span class="optional">({{ 'common.optional' | translate }})</span></label>
                <input
                  type="email"
                  class="form-input"
                  [(ngModel)]="inviteEmail"
                  name="email"
                  [placeholder]="'business.members.modal.emailPlaceholder' | translate"
                >
                <span class="form-hint">{{ 'business.members.modal.emailHint' | translate }}</span>
              </div>

              <div class="form-group">
                <label class="form-label">{{ 'business.members.modal.roleLabel' | translate }}</label>
                <select class="form-select" [(ngModel)]="inviteRole" name="role">
                  @for (role of invitableRoles; track role) {
                    <option [value]="role">{{ getRoleDisplay(role) }}</option>
                  }
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">{{ 'business.members.modal.expiresIn' | translate }}</label>
                  <select class="form-select" [(ngModel)]="inviteExpiresDays" name="expiresDays">
                    <option [value]="1">{{ 'business.members.modal.expiry.1day' | translate }}</option>
                    <option [value]="7">{{ 'business.members.modal.expiry.7days' | translate }}</option>
                    <option [value]="14">{{ 'business.members.modal.expiry.14days' | translate }}</option>
                    <option [value]="30">{{ 'business.members.modal.expiry.30days' | translate }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">{{ 'business.members.modal.usage' | translate }}</label>
                  <select class="form-select" [(ngModel)]="inviteSingleUse" name="singleUse">
                    <option [value]="true">{{ 'business.members.modal.singleUse' | translate }}</option>
                    <option [value]="false">{{ 'business.members.modal.multipleUses' | translate }}</option>
                  </select>
                </div>
              </div>

              <div class="modal-actions">
                <button type="button" class="action-btn secondary" (click)="closeInviteModal()">{{ 'common.cancel' | translate }}</button>
                <button type="submit" class="action-btn primary" [disabled]="sendingInvite()">
                  @if (sendingInvite()) {
                    <span class="spinner"></span>
                  }
                  <span>{{ inviteEmail ? ('business.members.modal.sendInvite' | translate) : ('business.members.modal.createLink' | translate) }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Settlement Modal -->
      @if (showSettlementModal()) {
        <div class="modal-overlay" (click)="closeSettlementModal()">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">{{ 'business.members.settlement.title' | translate }}</h2>
              <button class="modal-close" (click)="closeSettlementModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form class="modal-form" (submit)="createSettlement($event)">
              <div class="settlement-info">
                <div class="settlement-member">
                  <div class="member-avatar small">{{ getInitials(settlementMember()?.userName || '') }}</div>
                  <span class="member-name">{{ settlementMember()?.userName }}</span>
                </div>
                <div class="settlement-direction" [class.business-owes]="parseDecimal(settlementMember()?.balance || '0') > 0">
                  @if (parseDecimal(settlementMember()?.balance || '0') > 0) {
                    <span class="direction-label">{{ 'business.members.settlement.businessPays' | translate }}</span>
                    <span class="direction-desc">{{ 'business.members.settlement.reimburseMember' | translate }}</span>
                  } @else {
                    <span class="direction-label">{{ 'business.members.settlement.memberPays' | translate }}</span>
                    <span class="direction-desc">{{ 'business.members.settlement.memberRepays' | translate }}</span>
                  }
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">{{ 'business.members.settlement.amount' | translate }}</label>
                <div class="amount-input-group">
                  <span class="currency-prefix">{{ currency() }}</span>
                  <input
                    type="number"
                    class="form-input amount"
                    [(ngModel)]="settlementAmount"
                    name="amount"
                    step="0.01"
                    min="0.01"
                    required
                    [placeholder]="'0.00'"
                  >
                </div>
                <span class="form-hint">
                  {{ 'business.members.settlement.suggestedAmount' | translate }}: {{ formatAmount(Math.abs(parseDecimal(settlementMember()?.balance || '0'))) }}
                </span>
              </div>

              <div class="form-group">
                <label class="form-label">{{ 'business.members.settlement.date' | translate }}</label>
                <input
                  type="date"
                  class="form-input"
                  [(ngModel)]="settlementDate"
                  name="date"
                  required
                >
              </div>

              <div class="form-group">
                <label class="form-label">{{ 'business.members.settlement.note' | translate }} <span class="optional">({{ 'common.optional' | translate }})</span></label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="settlementNote"
                  name="note"
                  [placeholder]="'business.members.settlement.notePlaceholder' | translate"
                >
              </div>

              <div class="modal-actions">
                <button type="button" class="action-btn secondary" (click)="closeSettlementModal()">{{ 'common.cancel' | translate }}</button>
                <button type="submit" class="action-btn primary" [disabled]="savingSettlement()">
                  @if (savingSettlement()) {
                    <span class="spinner"></span>
                  }
                  <span>{{ 'business.members.settlement.confirm' | translate }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Copy Success Toast -->
      @if (showCopyToast()) {
        <div class="toast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span>{{ 'business.members.toast.linkCopied' | translate }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Sora:wght@400;500;600;700&display=swap');

    :host {
      /* Map global theme variables to component variables */
      --terminal-bg: var(--color-bg);
      --terminal-surface: var(--color-surface);
      --terminal-surface-hover: var(--color-surface-secondary);
      --terminal-border: var(--color-border);
      --terminal-border-light: var(--color-border-opaque);

      --text-primary: var(--color-text);
      --text-secondary: var(--color-text-secondary);
      --text-tertiary: var(--color-text-tertiary);

      --accent-cyan: var(--color-primary);
      --accent-cyan-dim: var(--color-primary-subtle);
      --accent-green: var(--color-success);
      --accent-green-dim: var(--color-success-subtle);
      --accent-amber: var(--color-warning);
      --accent-amber-dim: var(--color-warning-subtle);
      --accent-red: var(--color-danger);
      --accent-red-dim: var(--color-danger-subtle);
      --accent-purple: var(--color-purple);
      --accent-purple-dim: rgba(175, 82, 222, 0.15);

      --font-mono: 'JetBrains Mono', monospace;
      --font-display: 'Sora', sans-serif;

      --radius-sm: 4px;
      --radius-md: 8px;
      --radius-lg: 12px;

      display: block;
      min-height: 100%;
      background: var(--terminal-bg);
      color: var(--text-primary);
      font-family: var(--font-display);
    }

    .members-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Toolbar */
    .members-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--terminal-border);
    }

    .section-title {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    /* Header */
    .members-header {
      margin-bottom: 2rem;
    }

    .header-nav {
      margin-bottom: 1rem;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-secondary);
      text-decoration: none;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      transition: color 0.2s;
    }

    .back-link:hover {
      color: var(--accent-cyan);
    }

    .back-link svg {
      width: 16px;
      height: 16px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--terminal-border);
    }

    .page-title {
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 700;
      margin: 0;
      color: var(--text-primary);
    }

    .page-subtitle {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      color: var(--text-tertiary);
      margin-top: 0.25rem;
      display: block;
    }

    /* Action Button */
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

    .action-btn.primary:hover {
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

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-btn svg {
      width: 16px;
      height: 16px;
    }

    /* Tabs */
    .tab-bar {
      display: flex;
      gap: 0.25rem;
      margin-bottom: 1.5rem;
      padding: 0.25rem;
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-md);
    }

    .tab-btn {
      flex: 1;
      padding: 0.75rem 1rem;
      background: transparent;
      border: none;
      font-family: var(--font-mono);
      font-size: 0.8rem;
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

    /* Loading */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem;
      color: var(--text-secondary);
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--terminal-border);
      border-top-color: var(--accent-cyan);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      text-align: center;
    }

    .empty-icon {
      width: 64px;
      height: 64px;
      margin-bottom: 1.5rem;
      color: var(--text-tertiary);
    }

    .empty-icon svg {
      width: 100%;
      height: 100%;
    }

    .empty-title {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 0.5rem 0;
    }

    .empty-text {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin: 0;
    }

    /* Members List */
    .members-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .member-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
      transition: all 0.2s;
    }

    .member-card:hover {
      border-color: var(--terminal-border-light);
    }

    .member-avatar {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, var(--accent-cyan-dim), var(--accent-purple-dim));
      border: 1px solid var(--terminal-border);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono);
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--accent-cyan);
      flex-shrink: 0;
    }

    .member-avatar.small {
      width: 36px;
      height: 36px;
      font-size: 0.75rem;
    }

    .member-info {
      flex: 1;
      min-width: 0;
    }

    .member-name {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 0.25rem 0;
    }

    .member-email {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--text-tertiary);
      margin: 0 0 0.5rem 0;
    }

    .member-meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .role-badge {
      padding: 0.2rem 0.5rem;
      font-family: var(--font-mono);
      font-size: 0.65rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      border-radius: var(--radius-sm);
      text-transform: uppercase;
    }

    .role-badge.owner {
      background: var(--accent-amber-dim);
      color: var(--accent-amber);
      border: 1px solid var(--accent-amber);
    }

    .role-badge.co-owner {
      background: var(--accent-purple-dim);
      color: var(--accent-purple);
      border: 1px solid var(--accent-purple);
    }

    .role-badge.admin {
      background: var(--accent-cyan-dim);
      color: var(--accent-cyan);
      border: 1px solid var(--accent-cyan);
    }

    .role-badge.accountant {
      background: var(--accent-green-dim);
      color: var(--accent-green);
      border: 1px solid var(--accent-green);
    }

    .role-badge.employee {
      background: rgba(139, 148, 158, 0.15);
      color: var(--text-secondary);
      border: 1px solid var(--text-tertiary);
    }

    .invited-by {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .member-balance {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.125rem;
      flex-shrink: 0;
    }

    .member-balance .balance-label {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    .member-balance .balance-value {
      font-family: var(--font-mono);
      font-size: 1rem;
      font-weight: 600;
    }

    .member-balance.positive .balance-value {
      color: var(--accent-green);
    }

    .member-balance.negative .balance-value {
      color: var(--accent-red);
    }

    .member-actions {
      display: flex;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .role-select {
      padding: 0.5rem 0.75rem;
      background: var(--terminal-bg);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-md);
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .role-select:hover {
      border-color: var(--accent-cyan);
    }

    .action-icon-btn {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-md);
      color: var(--text-tertiary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-icon-btn:hover {
      background: var(--terminal-surface-hover);
      border-color: var(--accent-cyan);
      color: var(--accent-cyan);
    }

    .action-icon-btn.danger:hover {
      border-color: var(--accent-red);
      color: var(--accent-red);
    }

    .action-icon-btn svg {
      width: 16px;
      height: 16px;
    }

    /* Invites List */
    .invites-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .invite-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
    }

    .invite-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--accent-amber-dim);
      border-radius: var(--radius-md);
      color: var(--accent-amber);
      flex-shrink: 0;
    }

    .invite-icon svg {
      width: 20px;
      height: 20px;
    }

    .invite-info {
      flex: 1;
      min-width: 0;
    }

    .invite-email {
      font-size: 0.95rem;
      font-weight: 500;
      color: var(--text-primary);
      margin: 0 0 0.5rem 0;
    }

    .invite-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
    }

    .invite-expires,
    .invite-single-use,
    .invite-uses {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--text-tertiary);
    }

    .invite-actions {
      display: flex;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    /* Balances Section */
    .balances-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .balance-summary-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .summary-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
    }

    .summary-card.owed-to {
      border-left: 3px solid var(--accent-amber);
    }

    .summary-card.owed-by {
      border-left: 3px solid var(--accent-purple);
    }

    .summary-card.net.positive {
      border-left: 3px solid var(--accent-green);
    }

    .summary-card.net.negative {
      border-left: 3px solid var(--accent-red);
    }

    .summary-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--terminal-surface-hover);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
    }

    .summary-icon svg {
      width: 20px;
      height: 20px;
    }

    .summary-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .summary-label {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      font-weight: 500;
      letter-spacing: 0.05em;
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    .summary-value {
      font-family: var(--font-mono);
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .balance-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .balance-row {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 1.25rem;
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
    }

    .balance-row.positive {
      border-left: 3px solid var(--accent-green);
    }

    .balance-row.negative {
      border-left: 3px solid var(--accent-red);
    }

    .balance-member {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 180px;
    }

    .member-details {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .member-details .member-name {
      font-size: 0.9rem;
      margin: 0;
    }

    .member-details .member-role {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    .balance-breakdown {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }

    .breakdown-item {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .breakdown-label {
      font-family: var(--font-mono);
      font-size: 0.6rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    .breakdown-value {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      color: var(--text-primary);
    }

    .balance-total {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.125rem;
      min-width: 120px;
    }

    .total-label {
      font-family: var(--font-mono);
      font-size: 0.6rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    .total-value {
      font-family: var(--font-mono);
      font-size: 1.25rem;
      font-weight: 700;
    }

    .balance-row.positive .total-value {
      color: var(--accent-green);
    }

    .balance-row.negative .total-value {
      color: var(--accent-red);
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
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-container {
      width: 100%;
      max-width: 450px;
      background: var(--terminal-surface);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
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
      transition: all 0.2s ease;
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

    .form-label .optional {
      color: var(--text-tertiary);
    }

    .form-input,
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
    .form-select:focus {
      outline: none;
      border-color: var(--accent-cyan);
      box-shadow: 0 0 0 3px var(--accent-cyan-dim);
    }

    .form-input::placeholder {
      color: var(--text-tertiary);
    }

    .form-hint {
      display: block;
      font-size: 0.7rem;
      color: var(--text-tertiary);
      margin-top: 0.375rem;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 0.5rem;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* Settle Button */
    .settle-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.875rem;
      background: linear-gradient(135deg, var(--accent-green), #00a86b);
      border: none;
      border-radius: var(--radius-md);
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--terminal-bg);
      cursor: pointer;
      transition: all 0.2s;
      margin-left: auto;
    }

    .settle-btn:hover {
      box-shadow: 0 0 15px var(--accent-green-dim);
      transform: translateY(-1px);
    }

    .settle-btn svg {
      width: 14px;
      height: 14px;
    }

    /* Settlement Modal Specific */
    .settlement-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      background: var(--terminal-surface-hover);
      border-radius: var(--radius-md);
      margin-bottom: 1.5rem;
    }

    .settlement-member {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .settlement-member .member-name {
      font-weight: 600;
      color: var(--text-primary);
    }

    .settlement-direction {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.125rem;
    }

    .settlement-direction .direction-label {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--accent-red);
      text-transform: uppercase;
    }

    .settlement-direction.business-owes .direction-label {
      color: var(--accent-green);
    }

    .settlement-direction .direction-desc {
      font-size: 0.7rem;
      color: var(--text-tertiary);
    }

    .amount-input-group {
      display: flex;
      align-items: center;
      background: var(--terminal-bg);
      border: 1px solid var(--terminal-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .amount-input-group:focus-within {
      border-color: var(--accent-cyan);
      box-shadow: 0 0 0 3px var(--accent-cyan-dim);
    }

    .amount-input-group .currency-prefix {
      padding: 0.75rem 1rem;
      background: var(--terminal-surface);
      font-family: var(--font-mono);
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
      border-right: 1px solid var(--terminal-border);
    }

    .amount-input-group .form-input.amount {
      border: none;
      background: transparent;
      box-shadow: none;
      border-radius: 0;
    }

    .amount-input-group .form-input.amount:focus {
      box-shadow: none;
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      background: var(--accent-green);
      color: var(--terminal-bg);
      font-family: var(--font-mono);
      font-size: 0.85rem;
      font-weight: 500;
      border-radius: var(--radius-md);
      animation: toastIn 0.3s ease;
      z-index: 1001;
    }

    .toast svg {
      width: 16px;
      height: 16px;
    }

    @keyframes toastIn {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .members-container {
        padding: 1rem;
      }

      .header-content {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .tab-bar {
        flex-direction: column;
      }

      .balance-summary-cards {
        grid-template-columns: 1fr;
      }

      .balance-row {
        flex-direction: column;
        align-items: flex-start;
      }

      .balance-breakdown {
        grid-template-columns: repeat(2, 1fr);
        width: 100%;
      }

      .balance-total {
        width: 100%;
        align-items: flex-start;
        padding-top: 1rem;
        border-top: 1px solid var(--terminal-border);
      }
    }
  `]
})
export class BusinessMembersComponent implements OnInit {
  private router = inject(Router);
  private businessService = inject(BusinessService);
  private businessContext = inject(BusinessContextService);

  members = signal<BusinessMembership[]>([]);
  invites = signal<BusinessInvite[]>([]);
  ledger = signal<LedgerSummary | null>(null);

  // Use context
  business = this.businessContext.business;
  businessId = this.businessContext.businessId;
  currency = this.businessContext.currency;

  loading = signal(true);
  activeTab = signal<'members' | 'invites' | 'balances'>('members');

  // Modal
  showInviteModal = signal(false);
  sendingInvite = signal(false);
  inviteEmail = '';
  inviteRole: BusinessRole = BusinessRole.EMPLOYEE;
  inviteExpiresDays = 7;
  inviteSingleUse = true;

  // Toast
  showCopyToast = signal(false);

  // Settlement Modal
  showSettlementModal = signal(false);
  settlementMember = signal<MemberBalance | null>(null);
  settlementAmount = '';
  settlementNote = '';
  settlementDate = new Date().toISOString().split('T')[0];
  savingSettlement = signal(false);

  // Role options
  availableRoles = Object.values(BusinessRole);
  invitableRoles = [BusinessRole.CO_OWNER, BusinessRole.ADMIN, BusinessRole.ACCOUNTANT, BusinessRole.EMPLOYEE];

  pendingInvites = computed(() =>
    this.invites().filter(i => i.status === InviteStatus.PENDING)
  );

  Math = Math;
  parseDecimal = parseDecimal;

  ngOnInit() {
    const id = this.businessId();
    if (id) {
      this.loadAll();
    }
  }

  loadAll() {
    this.loading.set(true);
    let completed = 0;
    const checkDone = () => {
      completed++;
      if (completed >= 3) {
        this.loading.set(false);
      }
    };

    this.loadMembers(checkDone);
    this.loadInvites(checkDone);
    this.loadLedger(checkDone);
  }

  loadMembers(onComplete?: () => void) {
    this.businessService.getMembers(this.businessId()).subscribe({
      next: (members) => {
        this.members.set(members);
        onComplete?.();
      },
      error: (err) => {
        console.error('Failed to load members:', err);
        onComplete?.();
      }
    });
  }

  loadInvites(onComplete?: () => void) {
    this.businessService.getInvites(this.businessId()).subscribe({
      next: (invites) => {
        this.invites.set(invites);
        onComplete?.();
      },
      error: (err) => {
        console.error('Failed to load invites:', err);
        onComplete?.();
      }
    });
  }

  loadLedger(onComplete?: () => void) {
    this.businessService.getLedger(this.businessId()).subscribe({
      next: (ledger) => {
        this.ledger.set(ledger);
        onComplete?.();
      },
      error: (err) => {
        console.error('Failed to load ledger:', err);
        onComplete?.();
      }
    });
  }

  canInvite(): boolean {
    return this.business()?.permissions?.canInviteMembers || false;
  }

  canChangeRole(member: BusinessMembership): boolean {
    const permissions = this.business()?.permissions;
    if (!permissions?.canChangeRoles) return false;
    if (member.role === BusinessRole.OWNER) return false;
    return true;
  }

  canRemove(member: BusinessMembership): boolean {
    const permissions = this.business()?.permissions;
    if (!permissions?.canRemoveMembers) return false;
    if (member.role === BusinessRole.OWNER) return false;
    return true;
  }

  canAssignRole(role: BusinessRole): boolean {
    const myRole = this.business()?.role;
    if (!myRole) return false;
    if (role === BusinessRole.OWNER) return false;
    const hierarchy: Record<BusinessRole, number> = {
      [BusinessRole.OWNER]: 5,
      [BusinessRole.CO_OWNER]: 4,
      [BusinessRole.ADMIN]: 3,
      [BusinessRole.ACCOUNTANT]: 2,
      [BusinessRole.EMPLOYEE]: 1,
    };
    return hierarchy[myRole] > hierarchy[role];
  }

  getRoleDisplay(role: BusinessRole): string {
    return getRoleDisplayName(role);
  }

  getRoleClass(role: BusinessRole): string {
    const classes: Record<BusinessRole, string> = {
      [BusinessRole.OWNER]: 'owner',
      [BusinessRole.CO_OWNER]: 'co-owner',
      [BusinessRole.ADMIN]: 'admin',
      [BusinessRole.ACCOUNTANT]: 'accountant',
      [BusinessRole.EMPLOYEE]: 'employee',
    };
    return classes[role];
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatAmount(value: string | number): string {
    return formatCurrency(value, this.currency());
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getMemberBalanceValue(memberId: string): number {
    const balance = this.ledger()?.memberBalances?.find(b => b.memberId === memberId);
    return balance ? parseDecimal(balance.balance) : 0;
  }

  updateRole(member: BusinessMembership, event: Event) {
    const newRole = (event.target as HTMLSelectElement).value as BusinessRole;
    this.businessService.updateMemberRole(this.businessId(), member.id, newRole).subscribe({
      next: (updated) => {
        this.members.update(list =>
          list.map(m => m.id === updated.id ? updated : m)
        );
      },
      error: (err) => console.error('Failed to update role:', err)
    });
  }

  removeMember(member: BusinessMembership) {
    if (!confirm(`Are you sure you want to remove ${member.user.name} from this business?`)) return;

    this.businessService.removeMember(this.businessId(), member.id).subscribe({
      next: () => {
        this.members.update(list => list.filter(m => m.id !== member.id));
      },
      error: (err) => console.error('Failed to remove member:', err)
    });
  }

  openInviteModal() {
    this.showInviteModal.set(true);
  }

  closeInviteModal() {
    this.showInviteModal.set(false);
    this.inviteEmail = '';
    this.inviteRole = BusinessRole.EMPLOYEE;
    this.inviteExpiresDays = 7;
    this.inviteSingleUse = true;
  }

  sendInvite(event: Event) {
    event.preventDefault();
    this.sendingInvite.set(true);

    this.businessService.createInvite(this.businessId(), {
      email: this.inviteEmail || undefined,
      role: this.inviteRole,
      expiresInDays: this.inviteExpiresDays,
      isSingleUse: this.inviteSingleUse,
    }).subscribe({
      next: (invite) => {
        this.invites.update(list => [invite, ...list]);
        this.closeInviteModal();
        this.sendingInvite.set(false);

        if (invite.inviteLink) {
          navigator.clipboard.writeText(invite.inviteLink);
          this.showToast();
        }
      },
      error: (err) => {
        console.error('Failed to create invite:', err);
        this.sendingInvite.set(false);
      }
    });
  }

  copyInviteLink(invite: BusinessInvite) {
    if (invite.inviteLink) {
      navigator.clipboard.writeText(invite.inviteLink);
      this.showToast();
    }
  }

  revokeInvite(invite: BusinessInvite) {
    if (!confirm('Are you sure you want to revoke this invite?')) return;

    this.businessService.revokeInvite(this.businessId(), invite.id).subscribe({
      next: () => {
        this.invites.update(list => list.filter(i => i.id !== invite.id));
      },
      error: (err) => console.error('Failed to revoke invite:', err)
    });
  }

  private showToast() {
    this.showCopyToast.set(true);
    setTimeout(() => this.showCopyToast.set(false), 3000);
  }

  // Settlement Modal
  openSettlementModal(balance: MemberBalance) {
    this.settlementMember.set(balance);
    this.settlementAmount = Math.abs(parseDecimal(balance.balance)).toFixed(2);
    this.settlementDate = new Date().toISOString().split('T')[0];
    this.settlementNote = '';
    this.showSettlementModal.set(true);
  }

  closeSettlementModal() {
    this.showSettlementModal.set(false);
    this.settlementMember.set(null);
    this.settlementAmount = '';
    this.settlementNote = '';
  }

  createSettlement(event: Event) {
    event.preventDefault();

    const member = this.settlementMember();
    if (!member || !this.settlementAmount) return;

    const amount = parseFloat(this.settlementAmount);
    if (amount <= 0) return;

    // Determine settlement type based on balance direction
    // If balance > 0, business owes member -> BUSINESS_TO_MEMBER
    // If balance < 0, member owes business -> MEMBER_TO_BUSINESS
    const settlementType = parseDecimal(member.balance) > 0
      ? SettlementType.BUSINESS_TO_MEMBER
      : SettlementType.MEMBER_TO_BUSINESS;

    this.savingSettlement.set(true);

    this.businessService.createSettlement(this.businessId(), {
      memberId: member.memberId,
      settlementType,
      amount: this.settlementAmount,
      note: this.settlementNote || undefined,
      settlementDate: new Date(this.settlementDate).toISOString()
    }).subscribe({
      next: () => {
        this.loadLedger();
        this.closeSettlementModal();
        this.savingSettlement.set(false);
      },
      error: (err) => {
        console.error('Failed to create settlement:', err);
        this.savingSettlement.set(false);
      }
    });
  }
}
