import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './auth.middleware.js';

export interface AdminRequest extends AuthRequest {
  userRole?: string;
}

export async function adminMiddleware(req: AdminRequest, res: Response, next: NextFunction): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');

  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    req.userRole = user.role;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}
