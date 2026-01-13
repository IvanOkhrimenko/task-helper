/**
 * Unit tests for Business Permissions Service
 * Tests RBAC role permission resolution and privilege escalation prevention
 */

import { BusinessRole } from '@prisma/client';
import {
  getEffectivePermissions,
  hasPermission,
  canAssignRole,
  getAssignableRoles,
  getRoleDisplayName,
  ROLE_PERMISSIONS,
  BusinessPermissions,
} from '../services/business-permissions.service';

describe('Business Permissions Service', () => {
  describe('getEffectivePermissions', () => {
    describe('OWNER role', () => {
      it('should have all permissions', () => {
        const permissions = getEffectivePermissions(BusinessRole.OWNER, null);

        expect(permissions.canUpdateBusiness).toBe(true);
        expect(permissions.canArchiveBusiness).toBe(true);
        expect(permissions.canDeleteBusiness).toBe(true);
        expect(permissions.canInviteMembers).toBe(true);
        expect(permissions.canRemoveMembers).toBe(true);
        expect(permissions.canChangeRoles).toBe(true);
        expect(permissions.canChangePermissions).toBe(true);
        expect(permissions.canManageCategories).toBe(true);
        expect(permissions.canCreateExpense).toBe(true);
        expect(permissions.canViewAllExpenses).toBe(true);
        expect(permissions.canViewFullAnalytics).toBe(true);
        expect(permissions.canExportData).toBe(true);
        expect(permissions.canViewAuditLog).toBe(true);
      });
    });

    describe('CO_OWNER role', () => {
      it('should have all permissions except delete business', () => {
        const permissions = getEffectivePermissions(BusinessRole.CO_OWNER, null);

        expect(permissions.canUpdateBusiness).toBe(true);
        expect(permissions.canArchiveBusiness).toBe(true);
        expect(permissions.canDeleteBusiness).toBe(false); // Key difference from OWNER
        expect(permissions.canInviteMembers).toBe(true);
        expect(permissions.canViewFullAnalytics).toBe(true);
      });
    });

    describe('ADMIN role', () => {
      it('should manage finance and view analytics but not business settings', () => {
        const permissions = getEffectivePermissions(BusinessRole.ADMIN, null);

        expect(permissions.canUpdateBusiness).toBe(false);
        expect(permissions.canArchiveBusiness).toBe(false);
        expect(permissions.canDeleteBusiness).toBe(false);
        expect(permissions.canInviteMembers).toBe(true);
        expect(permissions.canRemoveMembers).toBe(false);
        expect(permissions.canChangeRoles).toBe(false);
        expect(permissions.canManageCategories).toBe(true);
        expect(permissions.canCreateExpense).toBe(true);
        expect(permissions.canViewAllExpenses).toBe(true);
        expect(permissions.canViewFullAnalytics).toBe(true);
        expect(permissions.canViewAuditLog).toBe(true);
      });
    });

    describe('ACCOUNTANT role', () => {
      it('should view finance and export but not create or manage', () => {
        const permissions = getEffectivePermissions(BusinessRole.ACCOUNTANT, null);

        expect(permissions.canUpdateBusiness).toBe(false);
        expect(permissions.canInviteMembers).toBe(false);
        expect(permissions.canManageCategories).toBe(false);
        expect(permissions.canCreateExpense).toBe(false);
        expect(permissions.canViewAllExpenses).toBe(true);
        expect(permissions.canEditAnyExpense).toBe(false);
        expect(permissions.canViewFullAnalytics).toBe(true);
        expect(permissions.canExportData).toBe(true);
        expect(permissions.canViewAuditLog).toBe(true);
      });
    });

    describe('EMPLOYEE role', () => {
      it('should have very limited permissions - no full analytics', () => {
        const permissions = getEffectivePermissions(BusinessRole.EMPLOYEE, null);

        // Business management
        expect(permissions.canUpdateBusiness).toBe(false);
        expect(permissions.canArchiveBusiness).toBe(false);
        expect(permissions.canDeleteBusiness).toBe(false);

        // Member management
        expect(permissions.canInviteMembers).toBe(false);
        expect(permissions.canRemoveMembers).toBe(false);
        expect(permissions.canChangeRoles).toBe(false);
        expect(permissions.canChangePermissions).toBe(false);

        // Categories
        expect(permissions.canManageCategories).toBe(false);

        // Expenses - can only see own
        expect(permissions.canCreateExpense).toBe(false);
        expect(permissions.canViewAllExpenses).toBe(false);
        expect(permissions.canViewOwnExpenses).toBe(true);
        expect(permissions.canEditAnyExpense).toBe(false);
        expect(permissions.canDeleteExpense).toBe(false);

        // Income - can only see own
        expect(permissions.canViewAllIncomes).toBe(false);
        expect(permissions.canViewOwnIncomes).toBe(true);

        // Analytics - NO full analytics (critical requirement)
        expect(permissions.canViewFullAnalytics).toBe(false);
        expect(permissions.canViewOwnAnalytics).toBe(true);
        expect(permissions.canExportData).toBe(false);

        // Audit log
        expect(permissions.canViewAuditLog).toBe(false);

        // Salary info - can see
        expect(permissions.canViewSalaryInfo).toBe(true);
      });
    });

    describe('Permission overrides', () => {
      it('should apply overrides on top of role defaults', () => {
        const overrides: Partial<BusinessPermissions> = {
          canViewAllExpenses: true, // Grant additional permission
          canExportData: true,
        };

        const permissions = getEffectivePermissions(BusinessRole.EMPLOYEE, overrides);

        // Overridden permissions
        expect(permissions.canViewAllExpenses).toBe(true);
        expect(permissions.canExportData).toBe(true);

        // Non-overridden permissions should use defaults
        expect(permissions.canViewFullAnalytics).toBe(false);
        expect(permissions.canCreateExpense).toBe(false);
      });

      it('should allow restricting permissions via overrides', () => {
        const overrides: Partial<BusinessPermissions> = {
          canInviteMembers: false, // Restrict
        };

        const permissions = getEffectivePermissions(BusinessRole.ADMIN, overrides);

        // Should be restricted
        expect(permissions.canInviteMembers).toBe(false);

        // Other permissions unchanged
        expect(permissions.canManageCategories).toBe(true);
      });

      it('should handle null overrides gracefully', () => {
        const permissions = getEffectivePermissions(BusinessRole.OWNER, null);
        expect(permissions.canUpdateBusiness).toBe(true);
      });

      it('should handle empty overrides object', () => {
        const permissions = getEffectivePermissions(BusinessRole.ADMIN, {});
        expect(permissions.canManageCategories).toBe(true);
      });
    });
  });

  describe('hasPermission', () => {
    it('should return true for permission user has', () => {
      expect(hasPermission(BusinessRole.OWNER, null, 'canUpdateBusiness')).toBe(true);
      expect(hasPermission(BusinessRole.ADMIN, null, 'canViewFullAnalytics')).toBe(true);
    });

    it('should return false for permission user lacks', () => {
      expect(hasPermission(BusinessRole.EMPLOYEE, null, 'canViewFullAnalytics')).toBe(false);
      expect(hasPermission(BusinessRole.ACCOUNTANT, null, 'canCreateExpense')).toBe(false);
    });

    it('should respect overrides', () => {
      // Employee with granted permission
      expect(hasPermission(BusinessRole.EMPLOYEE, { canViewAllExpenses: true }, 'canViewAllExpenses')).toBe(true);

      // Admin with restricted permission
      expect(hasPermission(BusinessRole.ADMIN, { canInviteMembers: false }, 'canInviteMembers')).toBe(false);
    });
  });

  describe('canAssignRole', () => {
    describe('OWNER', () => {
      it('should be able to assign any role', () => {
        expect(canAssignRole(BusinessRole.OWNER, BusinessRole.CO_OWNER)).toBe(true);
        expect(canAssignRole(BusinessRole.OWNER, BusinessRole.ADMIN)).toBe(true);
        expect(canAssignRole(BusinessRole.OWNER, BusinessRole.ACCOUNTANT)).toBe(true);
        expect(canAssignRole(BusinessRole.OWNER, BusinessRole.EMPLOYEE)).toBe(true);
        expect(canAssignRole(BusinessRole.OWNER, BusinessRole.OWNER)).toBe(true);
      });
    });

    describe('CO_OWNER', () => {
      it('should be able to assign lower roles but not OWNER', () => {
        expect(canAssignRole(BusinessRole.CO_OWNER, BusinessRole.OWNER)).toBe(false);
        expect(canAssignRole(BusinessRole.CO_OWNER, BusinessRole.CO_OWNER)).toBe(false);
        expect(canAssignRole(BusinessRole.CO_OWNER, BusinessRole.ADMIN)).toBe(true);
        expect(canAssignRole(BusinessRole.CO_OWNER, BusinessRole.ACCOUNTANT)).toBe(true);
        expect(canAssignRole(BusinessRole.CO_OWNER, BusinessRole.EMPLOYEE)).toBe(true);
      });
    });

    describe('ADMIN', () => {
      it('should be able to assign only ACCOUNTANT and EMPLOYEE', () => {
        expect(canAssignRole(BusinessRole.ADMIN, BusinessRole.OWNER)).toBe(false);
        expect(canAssignRole(BusinessRole.ADMIN, BusinessRole.CO_OWNER)).toBe(false);
        expect(canAssignRole(BusinessRole.ADMIN, BusinessRole.ADMIN)).toBe(false);
        expect(canAssignRole(BusinessRole.ADMIN, BusinessRole.ACCOUNTANT)).toBe(true);
        expect(canAssignRole(BusinessRole.ADMIN, BusinessRole.EMPLOYEE)).toBe(true);
      });
    });

    describe('ACCOUNTANT', () => {
      it('should only be able to assign EMPLOYEE', () => {
        expect(canAssignRole(BusinessRole.ACCOUNTANT, BusinessRole.OWNER)).toBe(false);
        expect(canAssignRole(BusinessRole.ACCOUNTANT, BusinessRole.CO_OWNER)).toBe(false);
        expect(canAssignRole(BusinessRole.ACCOUNTANT, BusinessRole.ADMIN)).toBe(false);
        expect(canAssignRole(BusinessRole.ACCOUNTANT, BusinessRole.ACCOUNTANT)).toBe(false);
        expect(canAssignRole(BusinessRole.ACCOUNTANT, BusinessRole.EMPLOYEE)).toBe(true);
      });
    });

    describe('EMPLOYEE', () => {
      it('should not be able to assign any role', () => {
        expect(canAssignRole(BusinessRole.EMPLOYEE, BusinessRole.OWNER)).toBe(false);
        expect(canAssignRole(BusinessRole.EMPLOYEE, BusinessRole.CO_OWNER)).toBe(false);
        expect(canAssignRole(BusinessRole.EMPLOYEE, BusinessRole.ADMIN)).toBe(false);
        expect(canAssignRole(BusinessRole.EMPLOYEE, BusinessRole.ACCOUNTANT)).toBe(false);
        expect(canAssignRole(BusinessRole.EMPLOYEE, BusinessRole.EMPLOYEE)).toBe(false);
      });
    });

    describe('Privilege escalation prevention', () => {
      it('should prevent assigning same or higher role', () => {
        // Cannot self-promote or promote to equal level
        expect(canAssignRole(BusinessRole.ADMIN, BusinessRole.ADMIN)).toBe(false);
        expect(canAssignRole(BusinessRole.ADMIN, BusinessRole.CO_OWNER)).toBe(false);
        expect(canAssignRole(BusinessRole.ACCOUNTANT, BusinessRole.ADMIN)).toBe(false);
      });
    });
  });

  describe('getAssignableRoles', () => {
    it('should return all roles for OWNER', () => {
      const roles = getAssignableRoles(BusinessRole.OWNER);
      expect(roles).toContain(BusinessRole.OWNER);
      expect(roles).toContain(BusinessRole.CO_OWNER);
      expect(roles).toContain(BusinessRole.ADMIN);
      expect(roles).toContain(BusinessRole.ACCOUNTANT);
      expect(roles).toContain(BusinessRole.EMPLOYEE);
    });

    it('should return lower roles for CO_OWNER', () => {
      const roles = getAssignableRoles(BusinessRole.CO_OWNER);
      expect(roles).not.toContain(BusinessRole.OWNER);
      expect(roles).not.toContain(BusinessRole.CO_OWNER);
      expect(roles).toContain(BusinessRole.ADMIN);
      expect(roles).toContain(BusinessRole.ACCOUNTANT);
      expect(roles).toContain(BusinessRole.EMPLOYEE);
    });

    it('should return only lower roles for ADMIN', () => {
      const roles = getAssignableRoles(BusinessRole.ADMIN);
      expect(roles).not.toContain(BusinessRole.OWNER);
      expect(roles).not.toContain(BusinessRole.CO_OWNER);
      expect(roles).not.toContain(BusinessRole.ADMIN);
      expect(roles).toContain(BusinessRole.ACCOUNTANT);
      expect(roles).toContain(BusinessRole.EMPLOYEE);
    });

    it('should return empty array for EMPLOYEE', () => {
      const roles = getAssignableRoles(BusinessRole.EMPLOYEE);
      expect(roles).toHaveLength(0);
    });
  });

  describe('getRoleDisplayName', () => {
    it('should return human-readable names', () => {
      expect(getRoleDisplayName(BusinessRole.OWNER)).toBe('Owner');
      expect(getRoleDisplayName(BusinessRole.CO_OWNER)).toBe('Co-Owner');
      expect(getRoleDisplayName(BusinessRole.ADMIN)).toBe('Admin');
      expect(getRoleDisplayName(BusinessRole.ACCOUNTANT)).toBe('Accountant');
      expect(getRoleDisplayName(BusinessRole.EMPLOYEE)).toBe('Employee');
    });
  });

  describe('ROLE_PERMISSIONS export', () => {
    it('should export all role permission sets', () => {
      expect(ROLE_PERMISSIONS[BusinessRole.OWNER]).toBeDefined();
      expect(ROLE_PERMISSIONS[BusinessRole.CO_OWNER]).toBeDefined();
      expect(ROLE_PERMISSIONS[BusinessRole.ADMIN]).toBeDefined();
      expect(ROLE_PERMISSIONS[BusinessRole.ACCOUNTANT]).toBeDefined();
      expect(ROLE_PERMISSIONS[BusinessRole.EMPLOYEE]).toBeDefined();
    });

    it('should have all permission keys defined for each role', () => {
      const expectedKeys: (keyof BusinessPermissions)[] = [
        'canUpdateBusiness',
        'canArchiveBusiness',
        'canDeleteBusiness',
        'canInviteMembers',
        'canRemoveMembers',
        'canChangeRoles',
        'canChangePermissions',
        'canManageCategories',
        'canCreateExpense',
        'canViewAllExpenses',
        'canViewOwnExpenses',
        'canEditAnyExpense',
        'canDeleteExpense',
        'canCreateIncome',
        'canViewAllIncomes',
        'canViewOwnIncomes',
        'canEditAnyIncome',
        'canDeleteIncome',
        'canCreateSettlement',
        'canViewSettlements',
        'canViewFullAnalytics',
        'canViewOwnAnalytics',
        'canExportData',
        'canViewAuditLog',
        'canViewSalaryInfo',
      ];

      for (const role of Object.values(BusinessRole)) {
        for (const key of expectedKeys) {
          expect(ROLE_PERMISSIONS[role][key]).toBeDefined();
        }
      }
    });
  });
});
