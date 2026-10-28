// Idempotent: vult de oefeningenbibliotheek en maakt het eerste traineraccount aan
// (uit TRAINER_EMAIL / TRAINER_NAME / TRAINER_PASSWORD) zolang er nog geen gebruikers zijn.
import bcrypt from "bcryptjs";
import pg from "pg";

const url = process.env.DATABASE_URL;
const local = /localhost|127\.0\.0\.1|\.railway\.internal|sslmode=disable/.test(url ?? "");
const pool = new pg.Pool({ connectionString: url, ssl: local ? undefined : { rejectUnauthorized: false } });

const EXERCISES = [
  ["Back squat", "Benen"], ["Front squat", "Benen"], ["Goblet squat", "Benen"], ["Bulgarian split squat", "Benen"],
  ["Lunge", "Benen"], ["Leg press", "Benen"], ["Leg extension", "Benen"], ["Leg curl", "Benen"],
  ["Step-up", "Benen"], ["Calf raise", "Benen"],
  ["Deadlift", "Heup"], ["Romanian deadlift", "Heup"], ["Trap bar deadlift", "Heup"], ["Hip thrust", "Heup"],
  ["Glute bridge", "Heup"], ["Kettlebell swing", "Heup"],
  ["Bench press", "Duwen"], ["Incline dumbbell press", "Duwen"], ["Dumbbell bench press", "Duwen"],
  ["Overhead press", "Duwen"], ["Push-up", "Duwen"], ["Dips", "Duwen"], ["Landmine press", "Duwen"],
  ["Pull-up", "Trekken"], ["Lat pulldown", "Trekken"], ["Barbell row", "Trekken"], ["Seated cable row", "Trekken"],
  ["One-arm dumbbell row", "Trekken"], ["Face pull", "Trekken"], ["Inverted row", "Trekken"],
  ["Plank", "Core"], ["Side plank", "Core"], ["Dead bug", "Core"], ["Pallof press", "Core"],
  ["Farmer carry", "Core"], ["Cable crunch", "Core"],
  ["Biceps curl", "Armen"], ["Triceps pushdown", "Armen"], ["Lateral raise", "Armen"],
];

try {
  for (const [name, category] of EXERCISES) {
    await pool.query("INSERT INTO exercises (name, category) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING", [name, category]);
  }

  const { rows } = await pool.query("SELECT count(*)::int AS n FROM users");
  const { TRAINER_EMAIL, TRAINER_NAME, TRAINER_PASSWORD } = process.env;
  if (rows[0].n === 0) {
    if (TRAINER_EMAIL && TRAINER_PASSWORD) {
      if (TRAINER_PASSWORD.length < 10) throw new Error("TRAINER_PASSWORD moet minstens 10 tekens zijn.");
      const hash = await bcrypt.hash(TRAINER_PASSWORD, 12);
      await pool.query(
        "INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, 'trainer')",
        [TRAINER_EMAIL.trim().toLowerCase(), TRAINER_NAME?.trim() || "Trainer", hash],
      );
      console.log(`Eerste trainer aangemaakt: ${TRAINER_EMAIL}`);
    } else {
      console.warn("Nog geen gebruikers. Zet TRAINER_EMAIL en TRAINER_PASSWORD om de eerste trainer aan te maken.");
    }
  }
  console.log("Seed klaar.");
} catch (err) {
  console.error("Seed mislukt:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
