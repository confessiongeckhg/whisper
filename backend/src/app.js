import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/auth.js';
import messageRoutes from './routes/messages.js';
import { requireAuth } from './middleware/auth.js';
import { prisma } from './lib/prisma.js';

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: true,
}));
app.use(express.json({ limit: '20kb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api', messageRoutes);

// GET /api/me — convenience endpoint for the frontend after login
app.get('/api/me', async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { username: true, displayName: true },
    });
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// DELETE /api/me — permanently deletes the account. Messages cascade-delete
// automatically (Message.user relation is onDelete: Cascade in the schema).
app.delete('/api/me', requireAuth, async (req, res) => {
  await prisma.user.delete({ where: { id: req.userId } });
  res.json({ ok: true });
});

// Central error handler — keeps stack traces out of responses
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

export default app;
