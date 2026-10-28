// Draait bij elke start (ook op Railway): past openstaande migraties uit ./drizzle toe.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL ontbreekt.");
  process.exit(1);
}

const local = /localhost|127\.0\.0\.1|\.railway\.internal|sslmode=disable/.test(url);
const pool = new pg.Pool({ connectionString: url, ssl: local ? undefined : { rejectUnauthorized: false } });

try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("Migraties toegepast.");
} catch (err) {
  console.error("Migratie mislukt:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
