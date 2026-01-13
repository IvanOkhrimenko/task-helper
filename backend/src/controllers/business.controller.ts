/**
 * Business Controller
 * Handles CRUD operations for businesses, memberships, and settings
 */

import { Request, Response } from 'express';
import { PrismaClient, BusinessRole, CategoryType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import crypto from 'crypto';
import {
  getEffectivePermissions,
  hasPermission,
  canAssignRole,
  BusinessPermissions,
} from '../services/business-permissions.service';
import {
  auditBusinessCreated,
  auditBusinessUpdated,
  auditBusinessArchived,
  auditMemberInvited,
  auditMemberAccepted,
  auditMemberRoleChanged,
  auditMemberRemoved,
  auditCategoryCreated,
  auditCategoryUpdated,
  auditInviteRevoked,
} from '../services/business-audit.service';

const prisma = new PrismaClient();

// Default expense categories to seed when creating a business
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Salary', isSalary: true, color: '#4CAF50', isDefault: true },
  { name: 'Office Supplies', color: '#2196F3' },
  { name: 'Fuel', color: '#FF9800' },
  { name: 'Maintenance', color: '#9C27B0' },
  { name: 'Insurance', color: '#607D8B' },
  { name: 'Other', color: '#795548' },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Sales Revenue', color: '#4CAF50', isDefault: true },
  { name: 'Service Income', color: '#2196F3' },
  { name: 'Commission', color: '#FF9800' },
  { name: 'Other', color: '#795548' },
];

/**
 * Get user's membership in a business
 */
async function getMembership(userId: string, businessId: string) {
  return prisma.businessMembership.findUnique({
    where: { businessId_userId: { businessId, userId } },
    include: {
      business: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

/**
 * Check permission and return membership or throw
 */
async function requirePermission(
  userId: string,
  businessId: string,
  permission: keyof BusinessPermissions,
  res: Response
): Promise<{
  membership: Awaited<ReturnType<typeof getMembership>>;
  permissions: BusinessPermissions;
} | null> {
  const membership = await getMembership(userId, businessId);

  if (!membership) {
    res.status(403).json({ error: 'Not a member of this business' });
    return null;
  }

  if (!membership.isActive) {
    res.status(403).json({ error: 'Membership is inactive' });
    return null;
  }

  if (membership.business.isArchived) {
    res.status(403).json({ error: 'Business is archived' });
    return null;
  }

  const permissions = getEffectivePermissions(
    membership.role,
    membership.permissions as Partial<BusinessPermissions> | null
  );

  if (!permissions[permission]) {
    res.status(403).json({ error: `Permission denied: ${permission}` });
    return null;
  }

  return { membership, permissions };
}

// ========== Business CRUD ==========

/**
 * Create a new business
 */
export async function createBusiness(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { name, description, currency = 'USD', timezone = 'UTC' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Business name is required' });
    }

    // Create business with owner membership and default categories
    const business = await prisma.business.create({
      data: {
        name,
        description,
        currency,
        timezone,
        memberships: {
          create: {
            user: { connect: { id: userId } },
            role: BusinessRole.OWNER,
          },
        },
        categories: {
          create: [
            ...DEFAULT_EXPENSE_CATEGORIES.map(c => ({
              ...c,
              type: CategoryType.EXPENSE,
            })),
            ...DEFAULT_INCOME_CATEGORIES.map(c => ({
              ...c,
              type: CategoryType.INCOME,
            })),
          ],
        },
      },
      include: {
        memberships: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        categories: true,
      },
    });

    await auditBusinessCreated(business.id, userId, { name, currency, timezone });

    res.status(201).json(business);
  } catch (error) {
    console.error('Error creating business:', error);
    res.status(500).json({ error: 'Failed to create business' });
  }
}

/**
 * Get all businesses for current user
 */
export async function getMyBusinesses(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;

    const memberships = await prisma.businessMembership.findMany({
      where: { userId, isActive: true },
      include: {
        business: {
          include: {
            _count: {
              select: {
                memberships: true,
                expenses: { where: { isDeleted: false } },
                incomes: { where: { isDeleted: false } },
              },
            },
          },
        },
      },
      orderBy: { business: { name: 'asc' } },
    });

    const businesses = memberships.map(m => ({
      ...m.business,
      role: m.role,
      membershipId: m.id,
      permissions: getEffectivePermissions(
        m.role,
        m.permissions as Partial<BusinessPermissions> | null
      ),
    }));

    res.json(businesses);
  } catch (error) {
    console.error('Error getting businesses:', error);
    res.status(500).json({ error: 'Failed to get businesses' });
  }
}

/**
 * Get a single business by ID
 */
export async function getBusiness(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;

    const membership = await getMembership(userId, businessId);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        categories: { where: { isArchived: false } },
        _count: {
          select: {
            expenses: { where: { isDeleted: false } },
            incomes: { where: { isDeleted: false } },
            settlements: true,
          },
        },
      },
    });

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const permissions = getEffectivePermissions(
      membership.role,
      membership.permissions as Partial<BusinessPermissions> | null
    );

    res.json({
      ...business,
      role: membership.role,
      membershipId: membership.id,
      permissions,
    });
  } catch (error) {
    console.error('Error getting business:', error);
    res.status(500).json({ error: 'Failed to get business' });
  }
}

/**
 * Update a business
 */
export async function updateBusiness(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;
    const { name, description, timezone } = req.body;

    const check = await requirePermission(userId, businessId, 'canUpdateBusiness', res);
    if (!check) return;

    // Get current values for audit
    const current = await prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, description: true, timezone: true },
    });

    const changes: Record<string, { oldValue: any; newValue: any }> = {};
    if (name !== undefined && name !== current?.name) {
      changes.name = { oldValue: current?.name, newValue: name };
    }
    if (description !== undefined && description !== current?.description) {
      changes.description = { oldValue: current?.description, newValue: description };
    }
    if (timezone !== undefined && timezone !== current?.timezone) {
      changes.timezone = { oldValue: current?.timezone, newValue: timezone };
    }

    const business = await prisma.business.update({
      where: { id: businessId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(timezone !== undefined && { timezone }),
      },
    });

    if (Object.keys(changes).length > 0) {
      await auditBusinessUpdated(businessId, userId, changes);
    }

    res.json(business);
  } catch (error) {
    console.error('Error updating business:', error);
    res.status(500).json({ error: 'Failed to update business' });
  }
}

/**
 * Archive a business (soft delete)
 */
export async function archiveBusiness(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;

    const check = await requirePermission(userId, businessId, 'canArchiveBusiness', res);
    if (!check) return;

    const business = await prisma.business.update({
      where: { id: businessId },
      data: { isArchived: true },
    });

    await auditBusinessArchived(businessId, userId);

    res.json(business);
  } catch (error) {
    console.error('Error archiving business:', error);
    res.status(500).json({ error: 'Failed to archive business' });
  }
}

// ========== Members ==========

/**
 * Get all members of a business
 */
export async function getMembers(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;

    const membership = await getMembership(userId, businessId);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    const members = await prisma.businessMembership.findMany({
      where: { businessId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        invitedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });

    res.json(members);
  } catch (error) {
    console.error('Error getting members:', error);
    res.status(500).json({ error: 'Failed to get members' });
  }
}

/**
 * Update a member's role
 */
export async function updateMemberRole(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId, membershipId } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(BusinessRole).includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const check = await requirePermission(userId, businessId, 'canChangeRoles', res);
    if (!check) return;

    // Get target membership
    const targetMembership = await prisma.businessMembership.findUnique({
      where: { id: membershipId },
      include: { user: { select: { name: true } } },
    });

    if (!targetMembership || targetMembership.businessId !== businessId) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Check privilege escalation
    if (!canAssignRole(check.membership!.role, role)) {
      return res.status(403).json({ error: 'Cannot assign this role' });
    }

    // Cannot change own role (except owner can demote themselves if another owner exists)
    if (targetMembership.userId === userId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const oldRole = targetMembership.role;
    const updated = await prisma.businessMembership.update({
      where: { id: membershipId },
      data: { role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await auditMemberRoleChanged(businessId, membershipId, userId, {
      oldValue: oldRole,
      newValue: role,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
}

/**
 * Update a member's permissions
 */
export async function updateMemberPermissions(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId, membershipId } = req.params;
    const { permissions } = req.body;

    const check = await requirePermission(userId, businessId, 'canChangePermissions', res);
    if (!check) return;

    const targetMembership = await prisma.businessMembership.findUnique({
      where: { id: membershipId },
    });

    if (!targetMembership || targetMembership.businessId !== businessId) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const updated = await prisma.businessMembership.update({
      where: { id: membershipId },
      data: { permissions: permissions as Prisma.InputJsonValue },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating member permissions:', error);
    res.status(500).json({ error: 'Failed to update member permissions' });
  }
}

/**
 * Remove a member from business
 */
export async function removeMember(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId, membershipId } = req.params;

    const check = await requirePermission(userId, businessId, 'canRemoveMembers', res);
    if (!check) return;

    const targetMembership = await prisma.businessMembership.findUnique({
      where: { id: membershipId },
      include: { user: { select: { id: true, name: true } } },
    });

    if (!targetMembership || targetMembership.businessId !== businessId) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Cannot remove owner
    if (targetMembership.role === BusinessRole.OWNER) {
      return res.status(400).json({ error: 'Cannot remove owner' });
    }

    // Cannot remove self
    if (targetMembership.userId === userId) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    // Soft delete - set inactive
    await prisma.businessMembership.update({
      where: { id: membershipId },
      data: { isActive: false },
    });

    await auditMemberRemoved(businessId, membershipId, userId, {
      userId: targetMembership.userId,
      userName: targetMembership.user.name,
    });

    res.json({ message: 'Member removed' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
}

// ========== Invites ==========

/**
 * Create an invite
 */
export async function createInvite(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;
    const { email, role = BusinessRole.EMPLOYEE, expiresInDays = 7, isSingleUse = true } = req.body;

    const check = await requirePermission(userId, businessId, 'canInviteMembers', res);
    if (!check) return;

    // Check role assignment permission
    if (!canAssignRole(check.membership!.role, role)) {
      return res.status(403).json({ error: 'Cannot assign this role' });
    }

    // Check if user is already a member
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        const existingMembership = await prisma.businessMembership.findUnique({
          where: { businessId_userId: { businessId, userId: existingUser.id } },
        });
        if (existingMembership) {
          return res.status(400).json({ error: 'User is already a member of this business' });
        }
      }
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invite = await prisma.businessInvite.create({
      data: {
        businessId,
        email: email || null,
        token,
        assignedRole: role,
        expiresAt,
        isSingleUse,
        createdById: userId,
      },
      include: {
        business: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    });

    await auditMemberInvited(businessId, invite.id, userId, {
      email,
      role,
    });

    // Return invite with invite link - use origin from request or fallback
    const origin = req.get('origin') || req.get('referer')?.replace(/\/[^/]*$/, '') || process.env.FRONTEND_URL || 'http://localhost:4200';
    const baseUrl = origin.replace(/\/$/, ''); // Remove trailing slash if any
    const inviteLink = `${baseUrl}/invite/${token}`;

    res.status(201).json({
      ...invite,
      inviteLink,
    });
  } catch (error) {
    console.error('Error creating invite:', error);
    res.status(500).json({ error: 'Failed to create invite' });
  }
}

/**
 * Get pending invites for a business
 */
export async function getInvites(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;

    const check = await requirePermission(userId, businessId, 'canInviteMembers', res);
    if (!check) return;

    const invites = await prisma.businessInvite.findMany({
      where: {
        businessId,
        status: 'PENDING',
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const origin = req.get('origin') || req.get('referer')?.replace(/\/[^/]*$/, '') || process.env.FRONTEND_URL || 'http://localhost:4200';
    const baseUrl = origin.replace(/\/$/, '');
    const invitesWithLinks = invites.map(i => ({
      ...i,
      inviteLink: `${baseUrl}/invite/${i.token}`,
    }));

    res.json(invitesWithLinks);
  } catch (error) {
    console.error('Error getting invites:', error);
    res.status(500).json({ error: 'Failed to get invites' });
  }
}

/**
 * Revoke an invite
 */
export async function revokeInvite(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId, inviteId } = req.params;

    const check = await requirePermission(userId, businessId, 'canInviteMembers', res);
    if (!check) return;

    const invite = await prisma.businessInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite || invite.businessId !== businessId) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    const updated = await prisma.businessInvite.update({
      where: { id: inviteId },
      data: { isRevoked: true, status: 'REVOKED' },
    });

    await auditInviteRevoked(businessId, inviteId, userId, { email: invite.email ?? undefined });

    res.json(updated);
  } catch (error) {
    console.error('Error revoking invite:', error);
    res.status(500).json({ error: 'Failed to revoke invite' });
  }
}

/**
 * Get invite details by token (public endpoint for invite page)
 */
export async function getInviteByToken(req: Request, res: Response) {
  try {
    const { token } = req.params;

    const invite = await prisma.businessInvite.findUnique({
      where: { token },
      include: {
        business: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
      },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    if (invite.isRevoked || invite.status === 'REVOKED') {
      return res.status(400).json({ error: 'Invite has been revoked' });
    }

    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invite has expired' });
    }

    if (invite.isSingleUse && invite.usedCount > 0) {
      return res.status(400).json({ error: 'Invite has already been used' });
    }

    res.json({
      businessName: invite.business.name,
      invitedBy: invite.createdBy.name,
      role: invite.assignedRole,
      expiresAt: invite.expiresAt,
      email: invite.email,
    });
  } catch (error) {
    console.error('Error getting invite:', error);
    res.status(500).json({ error: 'Failed to get invite' });
  }
}

/**
 * Accept an invite
 */
export async function acceptInvite(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { token } = req.params;

    const invite = await prisma.businessInvite.findUnique({
      where: { token },
      include: { business: true },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    if (invite.isRevoked || invite.status === 'REVOKED') {
      return res.status(400).json({ error: 'Invite has been revoked' });
    }

    if (invite.expiresAt < new Date()) {
      await prisma.businessInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });
      return res.status(400).json({ error: 'Invite has expired' });
    }

    if (invite.isSingleUse && invite.usedCount > 0) {
      return res.status(400).json({ error: 'Invite has already been used' });
    }

    // Check if already a member
    const existingMembership = await prisma.businessMembership.findUnique({
      where: { businessId_userId: { businessId: invite.businessId, userId } },
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        return res.status(400).json({ error: 'Already a member of this business' });
      }
      // Reactivate membership
      await prisma.businessMembership.update({
        where: { id: existingMembership.id },
        data: {
          isActive: true,
          role: invite.assignedRole,
          invitedById: invite.createdById,
        },
      });

      await prisma.businessInvite.update({
        where: { id: invite.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          acceptedByUserId: userId,
          usedCount: { increment: 1 },
        },
      });

      await auditMemberAccepted(invite.businessId, existingMembership.id, userId, {
        inviteId: invite.id,
        role: invite.assignedRole,
      });

      return res.json({ message: 'Membership reactivated', businessId: invite.businessId });
    }

    // Create new membership
    const membership = await prisma.businessMembership.create({
      data: {
        businessId: invite.businessId,
        userId,
        role: invite.assignedRole,
        invitedById: invite.createdById,
      },
    });

    await prisma.businessInvite.update({
      where: { id: invite.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedByUserId: userId,
        usedCount: { increment: 1 },
      },
    });

    await auditMemberAccepted(invite.businessId, membership.id, userId, {
      inviteId: invite.id,
      role: invite.assignedRole,
    });

    res.json({ message: 'Invite accepted', businessId: invite.businessId });
  } catch (error) {
    console.error('Error accepting invite:', error);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
}

// ========== Categories ==========

/**
 * Get categories for a business
 */
export async function getCategories(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;
    const { type, includeArchived } = req.query;

    const membership = await getMembership(userId, businessId);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this business' });
    }

    const where: Prisma.BusinessCategoryWhereInput = {
      businessId,
      ...(type && { type: type as CategoryType }),
      ...(includeArchived !== 'true' && { isArchived: false }),
    };

    const categories = await prisma.businessCategory.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { isSalary: 'desc' }, { name: 'asc' }],
    });

    res.json(categories);
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
}

/**
 * Create a category
 */
export async function createCategory(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId } = req.params;
    const { name, type, color, icon, isSalary = false, isDefault = false } = req.body;

    const check = await requirePermission(userId, businessId, 'canManageCategories', res);
    if (!check) return;

    if (!name || !type || !Object.values(CategoryType).includes(type)) {
      return res.status(400).json({ error: 'Name and valid type are required' });
    }

    const category = await prisma.businessCategory.create({
      data: {
        businessId,
        name,
        type,
        color,
        icon,
        isSalary,
        isDefault,
      },
    });

    await auditCategoryCreated(businessId, category.id, userId, { name, type });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    if ((error as any).code === 'P2002') {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
}

/**
 * Update a category
 */
export async function updateCategory(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { businessId, categoryId } = req.params;
    const { name, color, icon, isDefault, isArchived } = req.body;

    const check = await requirePermission(userId, businessId, 'canManageCategories', res);
    if (!check) return;

    const current = await prisma.businessCategory.findUnique({
      where: { id: categoryId },
    });

    if (!current || current.businessId !== businessId) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const changes: Record<string, { oldValue: any; newValue: any }> = {};
    if (name !== undefined && name !== current.name) {
      changes.name = { oldValue: current.name, newValue: name };
    }
    if (color !== undefined && color !== current.color) {
      changes.color = { oldValue: current.color, newValue: color };
    }
    if (isArchived !== undefined && isArchived !== current.isArchived) {
      changes.isArchived = { oldValue: current.isArchived, newValue: isArchived };
    }

    const category = await prisma.businessCategory.update({
      where: { id: categoryId },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isArchived !== undefined && { isArchived }),
      },
    });

    if (Object.keys(changes).length > 0) {
      await auditCategoryUpdated(businessId, categoryId, userId, changes);
    }

    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
}
