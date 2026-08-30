import crypto from 'crypto';

// One-way hash of the sender's IP, salted with a server-only secret.
// This can never be reversed to an IP by anyone reading the database export,
// but if the SAME salt + IP occur again, the hash matches — which is enough
// for rate limiting and for a human operator to correlate abuse reports
// without ever storing or displaying the raw IP.
export function hashIp(ip) {
  const salt = process.env.IP_HASH_SALT || 'dev-salt';
  return crypto.createHash('sha256').update(salt + ip).digest('hex');
}
