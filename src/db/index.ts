import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: Pool };

function sslFor(url: string | undefined) {
  if (!url) return undefined;
  // Railway's interne netwerk (*.railway.internal) en localhost hebben geen TLS nodig.
  if (/localhost|127\.0\.0\.1|\.railway\.internal/.test(url)) return undefined;
  if (/sslmode=disable/.test(url)) return undefined;
  return { rejectUnauthorized: false };
}

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslFor(process.env.DATABASE_URL),
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export * from "./schema";
