import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Works for both local Postgres and Neon — only DATABASE_URL changes.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://localhost:5432/unkad_platform',
  // Neon requires TLS; local Postgres doesn't support it.
  ssl: process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : undefined,
});

export const db = drizzle(pool, { schema });
