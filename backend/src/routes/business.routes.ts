/**
 * Business Finance Module Routes
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';

// Business CRUD and settings
import {
  createBusiness,
  getMyBusinesses,
  getBusiness,
  updateBusiness,
  archiveBusiness,
  getMembers,
  updateMemberRole,
  updateMemberPermissions,
  removeMember,
  createInvite,
  getInvites,
  revokeInvite,
  getInviteByToken,
  acceptInvite,
  getCategories,
  createCategory,
  updateCategory,
} from '../controllers/business.controller';

// Transactions
import {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getIncomes,
  createIncome,
  updateIncome,
  deleteIncome,
  getLedger,
  getMemberLedger,
  getSettlements,
  createSettlementEndpoint,
} from '../controllers/business-transactions.controller';

// Analytics
import {
  getAnalytics,
  getKPIs,
  getExpenseCategoryBreakdown,
  getIncomeCategoryBreakdown,
  getTimeSeriesData,
  getBalancesWidget,
  getUserAnalytics,
  getBusinessAuditLog,
  getEntityAuditLog,
  getOwnAnalytics,
} from '../controllers/business-analytics.controller';

const router = Router();

// ========== Public routes (invite acceptance) ==========
// Get invite details by token (public - for invite landing page)
router.get('/invite/:token', getInviteByToken);

// ========== Protected routes ==========
router.use(authMiddleware);

// ========== Business CRUD ==========
router.post('/', createBusiness);
router.get('/', getMyBusinesses);
router.get('/:businessId', getBusiness);
router.patch('/:businessId', updateBusiness);
router.post('/:businessId/archive', archiveBusiness);

// ========== Members ==========
router.get('/:businessId/members', getMembers);
router.patch('/:businessId/members/:membershipId/role', updateMemberRole);
router.patch('/:businessId/members/:membershipId/permissions', updateMemberPermissions);
router.delete('/:businessId/members/:membershipId', removeMember);

// ========== Invites ==========
router.post('/:businessId/invites', createInvite);
router.get('/:businessId/invites', getInvites);
router.delete('/:businessId/invites/:inviteId', revokeInvite);
router.post('/invite/:token/accept', acceptInvite); // Accept invite (authenticated)

// ========== Categories ==========
router.get('/:businessId/categories', getCategories);
router.post('/:businessId/categories', createCategory);
router.patch('/:businessId/categories/:categoryId', updateCategory);

// ========== Expenses ==========
router.get('/:businessId/expenses', getExpenses);
router.post('/:businessId/expenses', createExpense);
router.get('/:businessId/expenses/:expenseId', getExpense);
router.patch('/:businessId/expenses/:expenseId', updateExpense);
router.delete('/:businessId/expenses/:expenseId', deleteExpense);

// ========== Income ==========
router.get('/:businessId/incomes', getIncomes);
router.post('/:businessId/incomes', createIncome);
router.patch('/:businessId/incomes/:incomeId', updateIncome);
router.delete('/:businessId/incomes/:incomeId', deleteIncome);

// ========== Ledger & Settlements ==========
router.get('/:businessId/ledger', getLedger);
router.get('/:businessId/ledger/:membershipId', getMemberLedger);
router.get('/:businessId/settlements', getSettlements);
router.post('/:businessId/settlements', createSettlementEndpoint);

// ========== Analytics ==========
router.get('/:businessId/analytics', getAnalytics);
router.get('/:businessId/analytics/kpis', getKPIs);
router.get('/:businessId/analytics/expenses/categories', getExpenseCategoryBreakdown);
router.get('/:businessId/analytics/incomes/categories', getIncomeCategoryBreakdown);
router.get('/:businessId/analytics/timeseries', getTimeSeriesData);
router.get('/:businessId/analytics/balances', getBalancesWidget);
router.get('/:businessId/analytics/own', getOwnAnalytics); // Employee's own analytics

// ========== Audit Log ==========
router.get('/:businessId/audit', getBusinessAuditLog);
router.get('/:businessId/audit/:entityType/:entityId', getEntityAuditLog);

// ========== User-level routes (cross-business) ==========
router.get('/user/analytics', getUserAnalytics);

export default router;
