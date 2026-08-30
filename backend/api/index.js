// Vercel serverless entry point. Vercel treats any file under /api as a
// function; this one wraps the same Express app used locally (src/app.js)
// — same routes, same Prisma/Postgres, same auth, no rewrite. vercel.json
// routes every request here so Express's own internal routing (already
// prefixed with /api/...) works unchanged.
import app from '../src/app.js';

export default app;
