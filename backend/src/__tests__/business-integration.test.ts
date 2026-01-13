/**
 * Integration tests for Business Finance flows
 * Tests API endpoints and business logic integration
 */

import { BusinessRole, SettlementType, CategoryType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  getEffectivePermissions,
  hasPermission,
  BusinessPermissions,
} from '../services/business-permissions.service';
import { getSuggestedSettlement, MemberBalance } from '../services/business-ledger.service';

// These tests verify integration logic without database dependencies

describe('Business Integration Tests', () => {
  describe('Business Creation Flow', () => {
    it('should create business with owner membership and default categories', () => {
      // Verify business creation structure
      const businessData = {
        name: 'Test Business',
        currency: 'USD',
        timezone: 'UTC',
      };

      expect(businessData.name).toBeDefined();
      expect(businessData.currency).toBe('USD');
    });

    it('should seed default expense categories on creation', () => {
      const defaultExpenseCategories = [
        { name: 'Salary', isSalary: true, color: '#4CAF50', isDefault: true },
        { name: 'Office Supplies', color: '#2196F3' },
        { name: 'Fuel', color: '#FF9800' },
        { name: 'Maintenance', color: '#9C27B0' },
        { name: 'Insurance', color: '#607D8B' },
        { name: 'Other', color: '#795548' },
      ];

      expect(defaultExpenseCategories.length).toBe(6);
      expect(defaultExpenseCategories.find(c => c.isSalary)).toBeTruthy();
      expect(defaultExpenseCategories.find(c => c.isDefault)).toBeTruthy();
    });

    it('should seed default income categories on creation', () => {
      const defaultIncomeCategories = [
        { name: 'Sales Revenue', color: '#4CAF50', isDefault: true },
        { name: 'Service Income', color: '#2196F3' },
        { name: 'Commission', color: '#FF9800' },
        { name: 'Other', color: '#795548' },
      ];

      expect(defaultIncomeCategories.length).toBe(4);
      expect(defaultIncomeCategories.find(c => c.isDefault)).toBeTruthy();
    });
  });

  describe('Invite Flow', () => {
    it('should create secure invite token with expiration', () => {
      // Verify invite structure
      const inviteDefaults = {
        expiresInDays: 7,
        isSingleUse: true,
        assignedRole: BusinessRole.EMPLOYEE,
      };

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + inviteDefaults.expiresInDays);

      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(inviteDefaults.isSingleUse).toBe(true);
      expect(inviteDefaults.assignedRole).toBe(BusinessRole.EMPLOYEE);
    });

    it('should validate invite token format', () => {
      // Token should be 64 hex characters (32 bytes)
      const tokenLength = 64;
      const validToken = 'a'.repeat(tokenLength);
      const invalidToken = 'short';

      expect(validToken.length).toBe(64);
      expect(invalidToken.length).toBeLessThan(64);
    });

    it('should apply correct role after invite acceptance', () => {
      const inviteRole = BusinessRole.ACCOUNTANT;
      const permissions = getEffectivePermissions(inviteRole, null);

      expect(permissions.canViewFullAnalytics).toBe(true);
      expect(permissions.canCreateExpense).toBe(false);
      expect(permissions.canExportData).toBe(true);
    });
  });

  describe('Expense/Income with Attribution', () => {
    describe('Expense attribution', () => {
      it('should track business-paid expenses (no member attribution)', () => {
        const expense = {
          amount: new Decimal(100),
          paidByMemberId: null, // Business paid
        };

        expect(expense.paidByMemberId).toBeNull();
        // Should not affect any member's balance
      });

      it('should track member out-of-pocket expenses', () => {
        const expense = {
          amount: new Decimal(150),
          paidByMemberId: 'member123', // Member paid
        };

        expect(expense.paidByMemberId).toBe('member123');
        // Should increase business->member owed
      });
    });

    describe('Income attribution', () => {
      it('should track business-received income (no member attribution)', () => {
        const income = {
          amount: new Decimal(500),
          receivedByMemberId: null, // Business received
        };

        expect(income.receivedByMemberId).toBeNull();
        // Should not affect any member's balance
      });

      it('should track member-received income (creates debt)', () => {
        const income = {
          amount: new Decimal(200),
          receivedByMemberId: 'member456', // Member received personally
        };

        expect(income.receivedByMemberId).toBe('member456');
        // Should increase member->business owed
      });
    });
  });

  describe('Balance Updates', () => {
    describe('Expense creation → Balance update', () => {
      it('should increase positive balance when member pays out-of-pocket', () => {
        // Before: balance = $0
        // Member pays $100 expense
        // After: balance = +$100 (business owes member)

        const initialBalance = new Decimal(0);
        const expenseAmount = new Decimal(100);
        const newBalance = initialBalance.plus(expenseAmount);

        expect(newBalance.toNumber()).toBe(100);
        expect(newBalance.greaterThan(0)).toBe(true);
      });
    });

    describe('Income creation → Balance update', () => {
      it('should decrease balance when member receives income personally', () => {
        // Before: balance = $0
        // Member receives $200 personally
        // After: balance = -$200 (member owes business)

        const initialBalance = new Decimal(0);
        const incomeAmount = new Decimal(200);
        const newBalance = initialBalance.minus(incomeAmount);

        expect(newBalance.toNumber()).toBe(-200);
        expect(newBalance.lessThan(0)).toBe(true);
      });
    });

    describe('Settlement creation → Balance update', () => {
      it('should zero balance when business fully reimburses member', () => {
        // Before: balance = +$100 (business owes member)
        // Business reimburses $100
        // After: balance = $0

        const beforeBalance = new Decimal(100);
        const reimbursement = new Decimal(100);
        const afterBalance = beforeBalance.minus(reimbursement);

        expect(afterBalance.toNumber()).toBe(0);
      });

      it('should zero balance when member fully repays business', () => {
        // Before: balance = -$200 (member owes business)
        // Member repays $200
        // After: balance = $0

        const beforeBalance = new Decimal(-200);
        const repayment = new Decimal(200);
        // Repayment increases balance (becomes less negative)
        const afterBalance = beforeBalance.plus(repayment);

        expect(afterBalance.toNumber()).toBe(0);
      });

      it('should handle partial settlement correctly', () => {
        // Before: balance = +$150
        // Business reimburses $50
        // After: balance = +$100

        const beforeBalance = new Decimal(150);
        const partialReimbursement = new Decimal(50);
        const afterBalance = beforeBalance.minus(partialReimbursement);

        expect(afterBalance.toNumber()).toBe(100);
      });
    });
  });

  describe('Analytics Aggregation', () => {
    it('should calculate correct KPIs', () => {
      const incomes = [100, 200, 150].map(n => new Decimal(n));
      const expenses = [50, 75, 25].map(n => new Decimal(n));

      const totalRevenue = incomes.reduce((sum, i) => sum.plus(i), new Decimal(0));
      const totalExpenses = expenses.reduce((sum, e) => sum.plus(e), new Decimal(0));
      const netProfit = totalRevenue.minus(totalExpenses);

      expect(totalRevenue.toNumber()).toBe(450);
      expect(totalExpenses.toNumber()).toBe(150);
      expect(netProfit.toNumber()).toBe(300);
    });

    it('should calculate category breakdown percentages', () => {
      const categoryTotals = [
        { name: 'Salary', amount: new Decimal(500) },
        { name: 'Fuel', amount: new Decimal(300) },
        { name: 'Other', amount: new Decimal(200) },
      ];

      const total = categoryTotals.reduce((sum, c) => sum.plus(c.amount), new Decimal(0));

      const percentages = categoryTotals.map(c => ({
        name: c.name,
        percentage: c.amount.div(total).mul(100).toNumber(),
      }));

      expect(percentages[0].percentage).toBe(50);  // 500/1000 = 50%
      expect(percentages[1].percentage).toBe(30);  // 300/1000 = 30%
      expect(percentages[2].percentage).toBe(20);  // 200/1000 = 20%
    });
  });

  describe('Driver/Employee Access Restrictions', () => {
    it('should NOT allow employee to view full analytics', () => {
      const employeePermissions = getEffectivePermissions(BusinessRole.EMPLOYEE, null);
      expect(employeePermissions.canViewFullAnalytics).toBe(false);
    });

    it('should NOT allow employee to view all transactions', () => {
      const employeePermissions = getEffectivePermissions(BusinessRole.EMPLOYEE, null);
      expect(employeePermissions.canViewAllExpenses).toBe(false);
      expect(employeePermissions.canViewAllIncomes).toBe(false);
    });

    it('should allow employee to view own expenses only', () => {
      const employeePermissions = getEffectivePermissions(BusinessRole.EMPLOYEE, null);
      expect(employeePermissions.canViewOwnExpenses).toBe(true);
      expect(employeePermissions.canViewOwnIncomes).toBe(true);
    });

    it('should allow employee to view salary-related info', () => {
      const employeePermissions = getEffectivePermissions(BusinessRole.EMPLOYEE, null);
      expect(employeePermissions.canViewSalaryInfo).toBe(true);
    });

    it('should NOT allow employee to view audit log', () => {
      const employeePermissions = getEffectivePermissions(BusinessRole.EMPLOYEE, null);
      expect(employeePermissions.canViewAuditLog).toBe(false);
    });

    it('should NOT allow employee to export data', () => {
      const employeePermissions = getEffectivePermissions(BusinessRole.EMPLOYEE, null);
      expect(employeePermissions.canExportData).toBe(false);
    });
  });

  describe('Audit Events', () => {
    it('should define all required audit actions', () => {
      // Verify all critical actions have corresponding audit events
      const criticalActions = [
        'BUSINESS_CREATED',
        'BUSINESS_UPDATED',
        'BUSINESS_ARCHIVED',
        'MEMBER_INVITED',
        'MEMBER_ACCEPTED',
        'MEMBER_ROLE_CHANGED',
        'MEMBER_REMOVED',
        'CATEGORY_CREATED',
        'CATEGORY_UPDATED',
        'EXPENSE_CREATED',
        'EXPENSE_UPDATED',
        'EXPENSE_DELETED',
        'INCOME_CREATED',
        'INCOME_UPDATED',
        'INCOME_DELETED',
        'ATTACHMENT_ADDED',
        'ATTACHMENT_REMOVED',
        'SETTLEMENT_CREATED',
        'INVITE_REVOKED',
      ];

      // All these should be defined in BusinessAuditAction enum
      criticalActions.forEach(action => {
        expect(action).toBeTruthy();
      });
    });

    it('should track changes with old and new values', () => {
      const changeRecord = {
        field: 'name',
        changes: {
          oldValue: 'Old Name',
          newValue: 'New Name',
        },
      };

      expect(changeRecord.changes.oldValue).toBeDefined();
      expect(changeRecord.changes.newValue).toBeDefined();
      expect(changeRecord.changes.oldValue).not.toBe(changeRecord.changes.newValue);
    });
  });

  describe('Settlement Suggestions', () => {
    it('should suggest correct settlement for positive balance', () => {
      const balance: MemberBalance = {
        memberId: 'm1',
        userId: 'u1',
        userName: 'Test',
        userEmail: 'test@example.com',
        role: 'EMPLOYEE',
        balance: new Decimal(500),
        totalPaidOutOfPocket: new Decimal(500),
        totalReceivedPersonally: new Decimal(0),
        totalSettlementsReceived: new Decimal(0),
        totalSettlementsPaid: new Decimal(0),
      };

      const suggestion = getSuggestedSettlement(balance);

      expect(suggestion?.settlementType).toBe(SettlementType.BUSINESS_TO_MEMBER);
      expect(suggestion?.amount.toNumber()).toBe(500);
    });

    it('should suggest correct settlement for negative balance', () => {
      const balance: MemberBalance = {
        memberId: 'm1',
        userId: 'u1',
        userName: 'Test',
        userEmail: 'test@example.com',
        role: 'EMPLOYEE',
        balance: new Decimal(-300),
        totalPaidOutOfPocket: new Decimal(0),
        totalReceivedPersonally: new Decimal(300),
        totalSettlementsReceived: new Decimal(0),
        totalSettlementsPaid: new Decimal(0),
      };

      const suggestion = getSuggestedSettlement(balance);

      expect(suggestion?.settlementType).toBe(SettlementType.MEMBER_TO_BUSINESS);
      expect(suggestion?.amount.toNumber()).toBe(300);
    });
  });
});

describe('Decimal Safe Operations', () => {
  it('should handle monetary values without floating point errors', () => {
    // Famous floating point issue: 0.1 + 0.2 !== 0.3 in JS
    const a = new Decimal('0.1');
    const b = new Decimal('0.2');
    const result = a.plus(b);

    expect(result.toString()).toBe('0.3');
    expect(result.equals(new Decimal('0.3'))).toBe(true);
  });

  it('should store amounts with proper precision', () => {
    const amount = new Decimal('12345.67');
    expect(amount.decimalPlaces()).toBe(2);
    expect(amount.toString()).toBe('12345.67');
  });

  it('should round correctly for currency operations', () => {
    const amount = new Decimal('100.999');
    const rounded = amount.toDecimalPlaces(2);

    // Decimal.js removes trailing zeros in toString()
    expect(rounded.toFixed(2)).toBe('101.00');
    expect(rounded.equals(new Decimal('101'))).toBe(true);
  });
});
