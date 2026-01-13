/**
 * Business Permissions Service
 * Handles RBAC permission checks for business operations
 */

import { BusinessRole } from '@prisma/client';

// Permission definitions
export interface BusinessPermissions {
  // Business management
  canUpdateBusiness: boolean;
  canArchiveBusiness: boolean;
  canDeleteBusiness: boolean;

  // Member management
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canChangeRoles: boolean;
  canChangePermissions: boolean;

  // Categories
  canManageCategories: boolean;

  // Finance - Expenses
  canCreateExpense: boolean;
  canViewAllExpenses: boolean;
  canViewOwnExpenses: boolean;
  canEditAnyExpense: boolean;
  canDeleteExpense: boolean;

  // Finance - Income
  canCreateIncome: boolean;
  canViewAllIncomes: boolean;
  canViewOwnIncomes: boolean;
  canEditAnyIncome: boolean;
  canDeleteIncome: boolean;

  // Settlements
  canCreateSettlement: boolean;
  canViewSettlements: boolean;

  // Analytics
  canViewFullAnalytics: boolean;
  canViewOwnAnalytics: boolean;
  canExportData: boolean;

  // Audit log
  canViewAuditLog: boolean;

  // Salary-specific (for employees)
  canViewSalaryInfo: boolean;
}

// Default permissions per role
const ROLE_PERMISSIONS: Record<BusinessRole, BusinessPermissions> = {
  [BusinessRole.OWNER]: {
    canUpdateBusiness: true,
    canArchiveBusiness: true,
    canDeleteBusiness: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canChangeRoles: true,
    canChangePermissions: true,
    canManageCategories: true,
    canCreateExpense: true,
    canViewAllExpenses: true,
    canViewOwnExpenses: true,
    canEditAnyExpense: true,
    canDeleteExpense: true,
    canCreateIncome: true,
    canViewAllIncomes: true,
    canViewOwnIncomes: true,
    canEditAnyIncome: true,
    canDeleteIncome: true,
    canCreateSettlement: true,
    canViewSettlements: true,
    canViewFullAnalytics: true,
    canViewOwnAnalytics: true,
    canExportData: true,
    canViewAuditLog: true,
    canViewSalaryInfo: true,
  },
  [BusinessRole.CO_OWNER]: {
    canUpdateBusiness: true,
    canArchiveBusiness: true,
    canDeleteBusiness: false, // Cannot delete business
    canInviteMembers: true,
    canRemoveMembers: true,
    canChangeRoles: true,
    canChangePermissions: true,
    canManageCategories: true,
    canCreateExpense: true,
    canViewAllExpenses: true,
    canViewOwnExpenses: true,
    canEditAnyExpense: true,
    canDeleteExpense: true,
    canCreateIncome: true,
    canViewAllIncomes: true,
    canViewOwnIncomes: true,
    canEditAnyIncome: true,
    canDeleteIncome: true,
    canCreateSettlement: true,
    canViewSettlements: true,
    canViewFullAnalytics: true,
    canViewOwnAnalytics: true,
    canExportData: true,
    canViewAuditLog: true,
    canViewSalaryInfo: true,
  },
  [BusinessRole.ADMIN]: {
    canUpdateBusiness: false,
    canArchiveBusiness: false,
    canDeleteBusiness: false,
    canInviteMembers: true,
    canRemoveMembers: false,
    canChangeRoles: false,
    canChangePermissions: false,
    canManageCategories: true,
    canCreateExpense: true,
    canViewAllExpenses: true,
    canViewOwnExpenses: true,
    canEditAnyExpense: true,
    canDeleteExpense: true,
    canCreateIncome: true,
    canViewAllIncomes: true,
    canViewOwnIncomes: true,
    canEditAnyIncome: true,
    canDeleteIncome: true,
    canCreateSettlement: true,
    canViewSettlements: true,
    canViewFullAnalytics: true,
    canViewOwnAnalytics: true,
    canExportData: true,
    canViewAuditLog: true,
    canViewSalaryInfo: true,
  },
  [BusinessRole.ACCOUNTANT]: {
    canUpdateBusiness: false,
    canArchiveBusiness: false,
    canDeleteBusiness: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canChangeRoles: false,
    canChangePermissions: false,
    canManageCategories: false,
    canCreateExpense: false,
    canViewAllExpenses: true,
    canViewOwnExpenses: true,
    canEditAnyExpense: false,
    canDeleteExpense: false,
    canCreateIncome: false,
    canViewAllIncomes: true,
    canViewOwnIncomes: true,
    canEditAnyIncome: false,
    canDeleteIncome: false,
    canCreateSettlement: false,
    canViewSettlements: true,
    canViewFullAnalytics: true,
    canViewOwnAnalytics: true,
    canExportData: true,
    canViewAuditLog: true,
    canViewSalaryInfo: true,
  },
  [BusinessRole.EMPLOYEE]: {
    canUpdateBusiness: false,
    canArchiveBusiness: false,
    canDeleteBusiness: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canChangeRoles: false,
    canChangePermissions: false,
    canManageCategories: false,
    canCreateExpense: false,
    canViewAllExpenses: false, // Cannot see all expenses
    canViewOwnExpenses: true,  // Can see their own out-of-pocket expenses
    canEditAnyExpense: false,
    canDeleteExpense: false,
    canCreateIncome: false,
    canViewAllIncomes: false,  // Cannot see all incomes
    canViewOwnIncomes: true,   // Can see their own received incomes
    canEditAnyIncome: false,
    canDeleteIncome: false,
    canCreateSettlement: false,
    canViewSettlements: false,
    canViewFullAnalytics: false, // Cannot access full analytics
    canViewOwnAnalytics: true,   // Can see own balance/salary info
    canExportData: false,
    canViewAuditLog: false,
    canViewSalaryInfo: true,    // Can see salary-related info
  },
};

/**
 * Get effective permissions for a membership
 * Merges role defaults with any granular overrides
 */
export function getEffectivePermissions(
  role: BusinessRole,
  overrides: Partial<BusinessPermissions> | null
): BusinessPermissions {
  const rolePermissions = { ...ROLE_PERMISSIONS[role] };

  if (overrides) {
    // Apply overrides (only for explicitly set values)
    for (const key of Object.keys(overrides) as Array<keyof BusinessPermissions>) {
      if (overrides[key] !== undefined) {
        rolePermissions[key] = overrides[key] as boolean;
      }
    }
  }

  return rolePermissions;
}

/**
 * Check if a role can assign another role
 * Prevents privilege escalation
 */
export function canAssignRole(assignerRole: BusinessRole, targetRole: BusinessRole): boolean {
  const roleHierarchy: Record<BusinessRole, number> = {
    [BusinessRole.OWNER]: 5,
    [BusinessRole.CO_OWNER]: 4,
    [BusinessRole.ADMIN]: 3,
    [BusinessRole.ACCOUNTANT]: 2,
    [BusinessRole.EMPLOYEE]: 1,
  };

  // Can only assign roles lower than your own
  // Exception: OWNER can assign any role
  if (assignerRole === BusinessRole.OWNER) {
    return true;
  }

  return roleHierarchy[assignerRole] > roleHierarchy[targetRole];
}

/**
 * Check if a user has a specific permission in a business
 */
export function hasPermission(
  role: BusinessRole,
  overrides: Partial<BusinessPermissions> | null,
  permission: keyof BusinessPermissions
): boolean {
  const permissions = getEffectivePermissions(role, overrides);
  return permissions[permission];
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: BusinessRole): string {
  const names: Record<BusinessRole, string> = {
    [BusinessRole.OWNER]: 'Owner',
    [BusinessRole.CO_OWNER]: 'Co-Owner',
    [BusinessRole.ADMIN]: 'Admin',
    [BusinessRole.ACCOUNTANT]: 'Accountant',
    [BusinessRole.EMPLOYEE]: 'Employee',
  };
  return names[role];
}

/**
 * Get all available roles for assignment
 */
export function getAssignableRoles(assignerRole: BusinessRole): BusinessRole[] {
  return Object.values(BusinessRole).filter(role => canAssignRole(assignerRole, role));
}

export { ROLE_PERMISSIONS };
