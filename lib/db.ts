import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Works for both local Postgres and Neon.
// DATABASE_URL is preferred; POSTGRES_URL is what Vercel's Neon
// integration provisions in production.
const connectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  'postgres://localhost:5432/unkad_platform';

const pool = new Pool({
  connectionString,
  // Neon requires TLS; local Postgres doesn't support it.
  ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
