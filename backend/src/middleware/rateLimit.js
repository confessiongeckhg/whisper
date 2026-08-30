import rateLimit from 'express-rate-limit';

// Protects the public "send message" endpoint from spam/abuse bots.
// NOTE: default store is in-memory, which only works for a single server
// instance. If you scale to multiple instances, swap in a Redis store
// (rate-limit-redis) so limits are shared across them.
export const sendMessageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,                  // 30 messages per IP per hour, across all recipients
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages sent from this network. Try again later.' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a bit.' },
});
