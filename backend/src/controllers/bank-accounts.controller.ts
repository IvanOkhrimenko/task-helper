import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware.js';

export async function getBankAccounts(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');

  try {
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { userId: req.userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(bankAccounts);
  } catch (error) {
    console.error('GetBankAccounts error:', error);
    res.status(500).json({ error: 'Failed to get bank accounts' });
  }
}

export async function getBankAccount(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const bankAccount = await prisma.bankAccount.findFirst({
      where: {
        id,
        userId: req.userId
      }
    });

    if (!bankAccount) {
      res.status(404).json({ error: 'Bank account not found' });
      return;
    }

    res.json(bankAccount);
  } catch (error) {
    console.error('GetBankAccount error:', error);
    res.status(500).json({ error: 'Failed to get bank account' });
  }
}

export async function createBankAccount(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const {
    name,
    currency,
    bankName,
    iban,
    swift,
    crmRequisitesId,
    isDefault
  } = req.body;

  if (!name || !currency || !bankName || !iban) {
    res.status(400).json({ error: 'Name, currency, bankName, and iban are required' });
    return;
  }

  try {
    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.bankAccount.updateMany({
        where: { userId: req.userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    // If this is the first bank account, make it default
    const existingCount = await prisma.bankAccount.count({
      where: { userId: req.userId }
    });

    const bankAccount = await prisma.bankAccount.create({
      data: {
        name,
        currency: currency.toUpperCase(),
        bankName,
        iban,
        swift,
        crmRequisitesId,
        isDefault: isDefault || existingCount === 0,
        userId: req.userId!
      }
    });

    res.status(201).json(bankAccount);
  } catch (error) {
    console.error('CreateBankAccount error:', error);
    res.status(500).json({ error: 'Failed to create bank account' });
  }
}

export async function updateBankAccount(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;
  const {
    name,
    currency,
    bankName,
    iban,
    swift,
    crmRequisitesId,
    isDefault
  } = req.body;

  try {
    const existing = await prisma.bankAccount.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Bank account not found' });
      return;
    }

    // If setting as default, unset other defaults
    if (isDefault && !existing.isDefault) {
      await prisma.bankAccount.updateMany({
        where: { userId: req.userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const bankAccount = await prisma.bankAccount.update({
      where: { id },
      data: {
        name,
        currency: currency?.toUpperCase(),
        bankName,
        iban,
        swift,
        crmRequisitesId,
        isDefault
      }
    });

    res.json(bankAccount);
  } catch (error) {
    console.error('UpdateBankAccount error:', error);
    res.status(500).json({ error: 'Failed to update bank account' });
  }
}

export async function deleteBankAccount(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const existing = await prisma.bankAccount.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Bank account not found' });
      return;
    }

    // Check if any tasks are using this bank account
    const tasksUsingAccount = await prisma.task.count({
      where: { bankAccountId: id }
    });

    if (tasksUsingAccount > 0) {
      res.status(400).json({
        error: `Cannot delete: ${tasksUsingAccount} task(s) are using this bank account`
      });
      return;
    }

    await prisma.bankAccount.delete({ where: { id } });

    // If deleted was default, make another one default
    if (existing.isDefault) {
      const anotherAccount = await prisma.bankAccount.findFirst({
        where: { userId: req.userId }
      });
      if (anotherAccount) {
        await prisma.bankAccount.update({
          where: { id: anotherAccount.id },
          data: { isDefault: true }
        });
      }
    }

    res.status(204).send();
  } catch (error) {
    console.error('DeleteBankAccount error:', error);
    res.status(500).json({ error: 'Failed to delete bank account' });
  }
}

export async function setDefaultBankAccount(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const existing = await prisma.bankAccount.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Bank account not found' });
      return;
    }

    // Unset all defaults
    await prisma.bankAccount.updateMany({
      where: { userId: req.userId, isDefault: true },
      data: { isDefault: false }
    });

    // Set this one as default
    const bankAccount = await prisma.bankAccount.update({
      where: { id },
      data: { isDefault: true }
    });

    res.json(bankAccount);
  } catch (error) {
    console.error('SetDefaultBankAccount error:', error);
    res.status(500).json({ error: 'Failed to set default bank account' });
  }
}
