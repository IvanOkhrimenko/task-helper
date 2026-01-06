import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth.middleware.js';

export async function register(req: Request, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: 'Email, password and name are required' });
    return;
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        address: true,
        nip: true,
        bankName: true,
        bankIban: true,
        bankSwift: true,
        createdAt: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { name, address, nip, bankName, bankIban, bankSwift } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        name,
        address,
        nip,
        bankName,
        bankIban,
        bankSwift
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        address: true,
        nip: true,
        bankName: true,
        bankIban: true,
        bankSwift: true,
        createdAt: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error('UpdateProfile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}
