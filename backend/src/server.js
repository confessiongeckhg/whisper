// Local-dev entry point only. Vercel never calls this file — it calls the
// exported handler in api/index.js instead. This file exists so
// `npm run dev` / `npm start` work exactly the same on your machine.
import 'dotenv/config';
import app from './app.js';

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on :${port}`));
