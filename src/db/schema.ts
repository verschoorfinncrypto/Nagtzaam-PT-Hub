import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["trainer", "client"] }).notNull(),
  /** Beheerder van de trainers (toevoegen, verwijderen, wachtwoord resetten). Wordt bij elke start gezet vanuit ADMIN_EMAIL of TRAINER_EMAIL. */
  isAdmin: boolean("is_admin").notNull().default(false),
  trainerId: integer("trainer_id").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
  goal: text("goal"),
  /** Herkomst van een cliënt: doorgestroomd vanuit de fysiotherapie of van buiten. */
  source: text("source", { enum: ["fysio", "extern"] }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull().default("Overig"),
  /** Lichaamsregio waar de oefening vooral op aangrijpt (Knie, Heup, Schouder, …). */
  region: text("region"),
  /** Benodigd materiaal (Lichaamsgewicht, Dumbbell, Elastiek, …). */
  equipment: text("equipment"),
  /** "revalidatie", "kracht" of "beide". */
  purpose: text("purpose", { enum: ["revalidatie", "kracht", "beide"] }),
  /** 1 = basis, 2 = gevorderd, 3 = zwaar/complex. */
  level: integer("level"),
  muscles: text("muscles"),
  cues: text("cues"),
  /** true voor oefeningen uit de meegeleverde bibliotheek; die worden bij elke start bijgewerkt. */
  builtIn: boolean("built_in").notNull().default(false),
});

export const programs = pgTable(
  "programs",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    trainerId: integer("trainer_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    notes: text("notes"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("programs_client_idx").on(t.clientId)],
);

export const programDays = pgTable("program_days", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
});

export const programExercises = pgTable("program_exercises", {
  id: serial("id").primaryKey(),
  dayId: integer("day_id").notNull().references(() => programDays.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id").notNull().references(() => exercises.id, { onDelete: "restrict" }),
  position: integer("position").notNull().default(0),
  sets: integer("sets").notNull().default(3),
  reps: text("reps").notNull().default("8"),
  /** Voorgeschreven RPE, bijv. "7" of "7-8". */
  rpe: text("rpe"),
  /** Voorgeschreven rust tussen sets, bijv. "90 s" of "2 min". */
  rest: text("rest"),
  /** Optioneel voorgeschreven belasting; leeg = cliënt kiest zelf tijdens het trainen. */
  load: text("load"),
  notes: text("notes"),
});

export const workouts = pgTable(
  "workouts",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    title: text("title").notNull(),
    programDayId: integer("program_day_id").references(() => programDays.id, { onDelete: "set null" }),
    rpe: integer("rpe"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("workouts_client_date_idx").on(t.clientId, t.date)],
);

export const workoutSets = pgTable(
  "workout_sets",
  {
    id: serial("id").primaryKey(),
    workoutId: integer("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id").notNull().references(() => exercises.id, { onDelete: "restrict" }),
    position: integer("position").notNull().default(0),
    setNumber: integer("set_number").notNull(),
    reps: integer("reps").notNull(),
    weight: doublePrecision("weight").notNull().default(0),
  },
  (t) => [index("workout_sets_workout_idx").on(t.workoutId)],
);

export const bodyWeights = pgTable(
  "body_weights",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    weightKg: doublePrecision("weight_kg").notNull(),
    note: text("note"),
  },
  (t) => [uniqueIndex("body_weights_client_date_uq").on(t.clientId, t.date)],
);

export type User = typeof users.$inferSelect;
