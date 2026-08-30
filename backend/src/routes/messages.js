import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { sendMessageLimiter } from '../middleware/rateLimit.js';
import { hashIp } from '../lib/hash.js';

const router = Router();

const sendSchema = z.object({
  text: z.string().trim().min(1, 'Message cannot be empty').max(500, 'Keep it under 500 characters'),
});

const reactionSchema = z.object({
  reaction: z.string().max(8).nullable(),
});

// Public: look up a display name by username, for the "send" page.
router.get('/users/:username', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { username: req.params.username.toLowerCase() },
    select: { username: true, displayName: true },
  });
  if (!user) return res.status(404).json({ error: 'No inbox with that link' });
  res.json(user);
});

// Public: send an anonymous message to a user. Rate-limited per IP.
router.post('/users/:username/messages', sendMessageLimiter, async (req, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const user = await prisma.user.findUnique({ where: { username: req.params.username.toLowerCase() } });
  if (!user) return res.status(404).json({ error: 'No inbox with that link' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

  await prisma.message.create({
    data: {
      text: parsed.data.text,
      userId: user.id,
      senderIpHash: hashIp(ip),
    },
  });

  res.status(201).json({ ok: true });
});

// Auth: list your own messages. senderIpHash is intentionally never selected.
router.get('/messages', requireAuth, async (req, res) => {
  const messages = await prisma.message.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, text: true, reaction: true, createdAt: true },
  });
  res.json(messages);
});

router.patch('/messages/:id/reaction', requireAuth, async (req, res) => {
  const parsed = reactionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid reaction' });

  const message = await prisma.message.findUnique({ where: { id: req.params.id } });
  if (!message || message.userId !== req.userId) {
    return res.status(404).json({ error: 'Message not found' });
  }

  const updated = await prisma.message.update({
    where: { id: req.params.id },
    data: { reaction: parsed.data.reaction },
    select: { id: true, text: true, reaction: true, createdAt: true },
  });
  res.json(updated);
});

router.delete('/messages/:id', requireAuth, async (req, res) => {
  const message = await prisma.message.findUnique({ where: { id: req.params.id } });
  if (!message || message.userId !== req.userId) {
    return res.status(404).json({ error: 'Message not found' });
  }
  await prisma.message.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
