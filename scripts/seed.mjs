// Idempotent: vult en actualiseert de oefenbibliotheek (scripts/exercise-library.mjs) en maakt het eerste traineraccount aan
// (uit TRAINER_EMAIL / TRAINER_NAME / TRAINER_PASSWORD) zolang er nog geen gebruikers zijn.
import bcrypt from "bcryptjs";
import pg from "pg";
import { EXERCISE_LIBRARY } from "./exercise-library.mjs";

const url = process.env.DATABASE_URL;
const local = /localhost|127\.0\.0\.1|\.railway\.internal|sslmode=disable/.test(url ?? "");
const pool = new pg.Pool({ connectionString: url, ssl: local ? undefined : { rejectUnauthorized: false } });

try {
  // Bibliotheek: nieuwe oefeningen toevoegen, bestaande bibliotheekoefeningen bijwerken.
  const L = EXERCISE_LIBRARY;
  const res = await pool.query(
    `INSERT INTO exercises (name, category, region, equipment, purpose, level, muscles, cues, built_in)
     SELECT * , true FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::int[], $7::text[], $8::text[])
     ON CONFLICT (name) DO UPDATE SET
       category = EXCLUDED.category, region = EXCLUDED.region, equipment = EXCLUDED.equipment,
       purpose = EXCLUDED.purpose, level = EXCLUDED.level, muscles = EXCLUDED.muscles,
       cues = EXCLUDED.cues, built_in = true`,
    ["name", "category", "region", "equipment", "purpose", "level", "muscles", "cues"].map((k) => L.map((e) => e[k])),
  );
  console.log(`Oefenbibliotheek: ${res.rowCount} oefeningen bijgewerkt.`);

  const { rows } = await pool.query("SELECT count(*)::int AS n FROM users");
  const { TRAINER_EMAIL, TRAINER_NAME, TRAINER_PASSWORD } = process.env;
  if (rows[0].n === 0) {
    if (TRAINER_EMAIL && TRAINER_PASSWORD) {
      if (TRAINER_PASSWORD.length < 10) throw new Error("TRAINER_PASSWORD moet minstens 10 tekens zijn.");
      const hash = await bcrypt.hash(TRAINER_PASSWORD, 12);
      await pool.query(
        "INSERT INTO users (email, name, password_hash, role, is_admin) VALUES ($1, $2, $3, 'trainer', true)",
        [TRAINER_EMAIL.trim().toLowerCase(), TRAINER_NAME?.trim() || "Trainer", hash],
      );
      console.log(`Eerste trainer aangemaakt: ${TRAINER_EMAIL}`);
    } else {
      console.warn("Nog geen gebruikers. Zet TRAINER_EMAIL en TRAINER_PASSWORD om de eerste trainer aan te maken.");
    }
  }
  // Beheerder: precies één trainer, op basis van ADMIN_EMAIL (of anders TRAINER_EMAIL).
  const adminEmail = (process.env.ADMIN_EMAIL || process.env.TRAINER_EMAIL || "").trim().toLowerCase();
  if (adminEmail) {
    const r = await pool.query(
      "UPDATE users SET is_admin = (lower(email) = $1) WHERE role = 'trainer' RETURNING email, is_admin",
      [adminEmail],
    );
    const admin = r.rows.find((x) => x.is_admin);
    console.log(admin ? `Beheerder: ${admin.email}` : `Let op: geen trainer met e-mail ${adminEmail}; er is nu geen beheerder.`);
  }
  console.log("Seed klaar.");
} catch (err) {
  console.error("Seed mislukt:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
