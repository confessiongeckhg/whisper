import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

const usernameRe = /^[a-z0-9_]{3,20}$/;

const registerSchema = z.object({
  username: z.string().regex(usernameRe, 'Username must be 3-20 chars: a-z, 0-9, underscore only'),
  displayName: z.string().min(1).max(40),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

function signToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

router.post('/register', authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { username, displayName, password } = parsed.data;
  const normalizedUsername = username.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { username: normalizedUsername } });
  if (existing) return res.status(409).json({ error: 'That username is taken' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { username: normalizedUsername, displayName, password: passwordHash },
  });

  const token = signToken(user);
  res.status(201).json({
    token,
    user: { username: user.username, displayName: user.displayName },
  });
});

router.post('/login', authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  const { username, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  if (!user) return res.status(401).json({ error: 'Incorrect username or password' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Incorrect username or password' });

  const token = signToken(user);
  res.json({ token, user: { username: user.username, displayName: user.displayName } });
});

export default router;
