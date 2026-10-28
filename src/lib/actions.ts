"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  bodyWeights,
  db,
  exercises,
  programDays,
  programExercises,
  programs,
  users,
  workouts,
  workoutSets,
} from "@/db";
import { checkPassword, hashPassword, requireClientAccess, requireUser } from "./auth";
import { parseNum, today } from "./format";

export type FormResult = { error?: string; ok?: string };

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum");

/* ---------- Trainingen ---------- */

const workoutSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  date: isoDate,
  title: z.string().trim().min(1, "Geef de training een naam").max(120),
  programDayId: z.coerce.number().int().positive().optional(),
  rpe: z.coerce.number().int().min(1).max(10).optional(),
  notes: z.string().trim().max(2000).optional(),
  exercises: z
    .array(
      z.object({
        exerciseId: z.number().int().positive(),
        sets: z
          .array(z.object({ reps: z.number().int().min(0).max(1000), weight: z.number().min(0).max(1000) }))
          .max(30),
      }),
    )
    .max(40),
});

export async function saveWorkout(_: FormResult, form: FormData): Promise<FormResult> {
  let payload: unknown;
  try {
    payload = JSON.parse(String(form.get("payload") ?? "[]"));
  } catch {
    return { error: "Kon de sets niet lezen." };
  }
  const parsed = workoutSchema.safeParse({
    clientId: form.get("clientId"),
    date: form.get("date"),
    title: form.get("title"),
    programDayId: form.get("programDayId") || undefined,
    rpe: form.get("rpe") || undefined,
    notes: form.get("notes") || undefined,
    exercises: payload,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Controleer je invoer." };
  const d = parsed.data;
  await requireClientAccess(d.clientId);

  const filled = d.exercises
    .map((e) => ({ ...e, sets: e.sets.filter((s) => s.reps > 0) }))
    .filter((e) => e.sets.length > 0);
  if (!filled.length) return { error: "Vul minstens één set in met herhalingen." };

  const id = await db.transaction(async (tx) => {
    const [w] = await tx
      .insert(workouts)
      .values({
        clientId: d.clientId,
        date: d.date,
        title: d.title,
        programDayId: d.programDayId ?? null,
        rpe: d.rpe ?? null,
        notes: d.notes ?? null,
      })
      .returning({ id: workouts.id });
    const rows = filled.flatMap((e, position) =>
      e.sets.map((s, i) => ({
        workoutId: w.id,
        exerciseId: e.exerciseId,
        position,
        setNumber: i + 1,
        reps: s.reps,
        weight: s.weight,
      })),
    );
    await tx.insert(workoutSets).values(rows);
    return w.id;
  });
  revalidatePath("/", "layout");
  redirect(`/workouts/${id}?saved=1`);
}

export async function deleteWorkout(form: FormData) {
  const id = Number(form.get("id"));
  const [w] = await db.select().from(workouts).where(eq(workouts.id, id)).limit(1);
  if (!w) redirect("/");
  const { viewer } = await requireClientAccess(w.clientId);
  await db.delete(workouts).where(eq(workouts.id, id));
  revalidatePath("/", "layout");
  redirect(viewer.role === "trainer" ? `/trainer/clients/${w.clientId}` : "/workouts");
}

/* ---------- Lichaamsgewicht ---------- */

export async function addWeight(_: FormResult, form: FormData): Promise<FormResult> {
  const clientId = Number(form.get("clientId"));
  const date = String(form.get("date") ?? today());
  const weight = parseNum(form.get("weight"));
  const note = String(form.get("note") ?? "").trim() || null;
  if (!isoDate.safeParse(date).success) return { error: "Ongeldige datum." };
  if (date > today()) return { error: "Een datum in de toekomst kan niet." };
  if (!Number.isFinite(weight) || weight < 20 || weight > 400) return { error: "Vul een gewicht in tussen 20 en 400 kg." };
  await requireClientAccess(clientId);
  await db
    .insert(bodyWeights)
    .values({ clientId, date, weightKg: Math.round(weight * 10) / 10, note })
    .onConflictDoUpdate({
      target: [bodyWeights.clientId, bodyWeights.date],
      set: { weightKg: Math.round(weight * 10) / 10, note },
    });
  revalidatePath("/", "layout");
  return { ok: "Gewicht opgeslagen." };
}

export async function deleteWeight(form: FormData) {
  const id = Number(form.get("id"));
  const [row] = await db.select().from(bodyWeights).where(eq(bodyWeights.id, id)).limit(1);
  if (!row) return;
  await requireClientAccess(row.clientId);
  await db.delete(bodyWeights).where(eq(bodyWeights.id, id));
  revalidatePath("/", "layout");
}

/* ---------- Cliënten (trainer) ---------- */

const clientSchema = z.object({
  name: z.string().trim().min(2, "Vul een naam in").max(100),
  email: z.string().trim().toLowerCase().email("Vul een geldig e-mailadres in"),
  password: z.string().min(10, "Het startwachtwoord moet minstens 10 tekens zijn").max(200),
  goal: z.string().trim().max(300).optional(),
});

export async function createClient(_: FormResult, form: FormData): Promise<FormResult> {
  const trainer = await requireUser("trainer");
  const parsed = clientSchema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    password: form.get("password"),
    goal: form.get("goal") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, d.email)).limit(1);
  if (exists) return { error: "Er bestaat al een account met dit e-mailadres." };
  const [c] = await db
    .insert(users)
    .values({
      name: d.name,
      email: d.email,
      passwordHash: await hashPassword(d.password),
      role: "client",
      trainerId: trainer.id,
      goal: d.goal ?? null,
    })
    .returning({ id: users.id });
  revalidatePath("/trainer");
  redirect(`/trainer/clients/${c.id}?created=1`);
}

export async function updateClient(_: FormResult, form: FormData): Promise<FormResult> {
  const clientId = Number(form.get("clientId"));
  const { viewer } = await requireClientAccess(clientId);
  if (viewer.role !== "trainer") return { error: "Alleen je trainer kan dit aanpassen." };
  const name = String(form.get("name") ?? "").trim();
  const goal = String(form.get("goal") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (name.length < 2) return { error: "Vul een naam in." };
  if (password && password.length < 10) return { error: "Een nieuw wachtwoord moet minstens 10 tekens zijn." };
  await db
    .update(users)
    .set({ name, goal: goal || null, ...(password ? { passwordHash: await hashPassword(password) } : {}) })
    .where(eq(users.id, clientId));
  revalidatePath(`/trainer/clients/${clientId}`);
  return { ok: password ? "Opgeslagen. Het nieuwe wachtwoord is actief." : "Opgeslagen." };
}

export async function addTrainer(_: FormResult, form: FormData): Promise<FormResult> {
  await requireUser("trainer");
  const parsed = clientSchema.omit({ goal: true }).safeParse({
    name: form.get("name"),
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, d.email)).limit(1);
  if (exists) return { error: "Er bestaat al een account met dit e-mailadres." };
  await db.insert(users).values({ name: d.name, email: d.email, passwordHash: await hashPassword(d.password), role: "trainer" });
  return { ok: `Trainer ${d.name} toegevoegd.` };
}

/* ---------- Schema's (trainer) ---------- */

const programSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, "Geef het schema een naam").max(120),
  notes: z.string().trim().max(2000).optional(),
  days: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Elke dag heeft een naam nodig").max(80),
        items: z
          .array(
            z.object({
              exerciseId: z.number().int().positive(),
              sets: z.number().int().min(1).max(20),
              reps: z.string().trim().min(1).max(20),
              load: z.string().trim().max(40).optional(),
              notes: z.string().trim().max(200).optional(),
            }),
          )
          .min(1, "Elke dag heeft minstens één oefening nodig")
          .max(20),
      }),
    )
    .min(1, "Voeg minstens één trainingsdag toe")
    .max(7),
});

export async function saveProgram(_: FormResult, form: FormData): Promise<FormResult> {
  let days: unknown;
  try {
    days = JSON.parse(String(form.get("payload") ?? "[]"));
  } catch {
    return { error: "Kon het schema niet lezen." };
  }
  const parsed = programSchema.safeParse({
    clientId: form.get("clientId"),
    name: form.get("name"),
    notes: form.get("notes") || undefined,
    days,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Controleer het schema." };
  const d = parsed.data;
  const { viewer } = await requireClientAccess(d.clientId);
  if (viewer.role !== "trainer") return { error: "Alleen je trainer kan schema's maken." };

  await db.transaction(async (tx) => {
    await tx.update(programs).set({ active: false }).where(and(eq(programs.clientId, d.clientId), eq(programs.active, true)));
    const [p] = await tx
      .insert(programs)
      .values({ clientId: d.clientId, trainerId: viewer.id, name: d.name, notes: d.notes ?? null, active: true })
      .returning({ id: programs.id });
    for (const [i, day] of d.days.entries()) {
      const [pd] = await tx.insert(programDays).values({ programId: p.id, name: day.name, position: i }).returning({ id: programDays.id });
      await tx.insert(programExercises).values(
        day.items.map((it, j) => ({
          dayId: pd.id,
          exerciseId: it.exerciseId,
          position: j,
          sets: it.sets,
          reps: it.reps,
          load: it.load || null,
          notes: it.notes || null,
        })),
      );
    }
  });
  revalidatePath("/", "layout");
  redirect(`/trainer/clients/${d.clientId}?program=1`);
}

export async function stopProgram(form: FormData) {
  const clientId = Number(form.get("clientId"));
  const { viewer } = await requireClientAccess(clientId);
  if (viewer.role !== "trainer") return;
  await db.update(programs).set({ active: false }).where(and(eq(programs.clientId, clientId), eq(programs.active, true)));
  revalidatePath("/", "layout");
}

/* ---------- Oefeningen (trainer) ---------- */

export async function addExercise(_: FormResult, form: FormData): Promise<FormResult> {
  await requireUser("trainer");
  const str = (k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max) || null;
  const name = String(form.get("name") ?? "").trim();
  const category = str("category", 60) ?? "Overig";
  const purposeRaw = String(form.get("purpose") ?? "");
  const purpose = (["revalidatie", "kracht", "beide"] as const).find((p) => p === purposeRaw) ?? null;
  const levelNum = Number(form.get("level"));
  const level = [1, 2, 3].includes(levelNum) ? levelNum : null;
  if (name.length < 2 || name.length > 80) return { error: "Vul een naam in (2–80 tekens)." };
  const res = await db
    .insert(exercises)
    .values({
      name,
      category,
      region: str("region", 60),
      equipment: str("equipment", 60),
      purpose,
      level,
      muscles: str("muscles", 200),
      cues: str("cues", 600),
      builtIn: false,
    })
    .onConflictDoNothing()
    .returning({ id: exercises.id });
  if (!res.length) return { error: "Die oefening bestaat al." };
  revalidatePath("/trainer/exercises");
  return { ok: `${name} toegevoegd.` };
}

/* ---------- Account ---------- */

export async function changePassword(_: FormResult, form: FormData): Promise<FormResult> {
  const u = await requireUser();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const repeat = String(form.get("repeat") ?? "");
  if (!(await checkPassword(current, u.passwordHash))) return { error: "Je huidige wachtwoord klopt niet." };
  if (next.length < 10) return { error: "Kies een nieuw wachtwoord van minstens 10 tekens." };
  if (next !== repeat) return { error: "De twee nieuwe wachtwoorden zijn niet hetzelfde." };
  await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, u.id));
  return { ok: "Je wachtwoord is gewijzigd." };
}
