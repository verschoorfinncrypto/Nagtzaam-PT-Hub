"use server";

import { and, eq, sql } from "drizzle-orm";
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
import {
  checkPassword,
  currentSession,
  endSession,
  hashPassword,
  NO_EMAIL_DOMAIN,
  NO_LOGIN,
  requireAdmin,
  requireClientAccess,
  requireUser,
  startSession,
  viewingTrainer,
} from "./auth";
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

const newClientSchema = z.object({
  name: z.string().trim().min(2, "Vul een naam in").max(100),
  email: z.string().trim().toLowerCase().email("Vul een geldig e-mailadres in, of laat het leeg").optional(),
  password: z.string().min(10, "Een wachtwoord moet minstens 10 tekens zijn, of laat het leeg").max(200).optional(),
  goal: z.string().trim().max(300).optional(),
});

function parseSource(v: FormDataEntryValue | null) {
  return v === "fysio" || v === "extern" ? v : null;
}

/** Wachtwoord en e-mail zijn optioneel: zonder wachtwoord kan de cliënt niet zelf inloggen en beheert de trainer alles. */
export async function createClient(_: FormResult, form: FormData): Promise<FormResult> {
  const trainer = await requireUser("trainer");
  const parsed = newClientSchema.safeParse({
    name: form.get("name"),
    email: String(form.get("email") ?? "").trim() || undefined,
    password: String(form.get("password") ?? "") || undefined,
    goal: form.get("goal") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  if (d.password && !d.email) return { error: "Vul ook een e-mailadres in: daarmee logt de cliënt in." };
  const email = d.email ?? `client-${crypto.randomUUID().slice(0, 12)}${NO_EMAIL_DOMAIN}`;
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (exists) return { error: "Er bestaat al een account met dit e-mailadres." };
  const [c] = await db
    .insert(users)
    .values({
      name: d.name,
      email,
      passwordHash: d.password ? await hashPassword(d.password) : NO_LOGIN,
      role: "client",
      trainerId: trainer.id,
      goal: d.goal ?? null,
      source: parseSource(form.get("source")),
    })
    .returning({ id: users.id });
  revalidatePath("/trainer");
  redirect(`/trainer/clients/${c.id}?created=${d.password ? "login" : "nologin"}`);
}

/** Cliënt definitief verwijderen, met al zijn trainingen, schema's en metingen (cascade in de database). */
export async function deleteClient(form: FormData) {
  const trainer = await requireUser("trainer");
  const { client } = await requireClientAccess(Number(form.get("clientId")));
  await db.delete(users).where(and(eq(users.id, client.id), eq(users.role, "client"), eq(users.trainerId, trainer.id)));
  revalidatePath("/", "layout");
  redirect(`/trainer?deleted=${encodeURIComponent(client.name)}`);
}

/** Trainer bekijkt en gebruikt de hub als deze cliënt (om te testen of samen in te vullen). */
export async function viewAsClient(form: FormData) {
  const trainer = await requireUser("trainer");
  const { client } = await requireClientAccess(Number(form.get("clientId")));
  await startSession(client, trainer.id);
  redirect("/dashboard");
}

/** Terug naar het eigen traineraccount. */
export async function stopViewAs() {
  const s = await currentSession();
  const trainer = await viewingTrainer();
  if (!s?.by || !trainer) {
    endSession();
    redirect("/login");
  }
  await startSession(trainer);
  redirect(`/trainer/clients/${s.uid}`);
}

export async function updateClient(_: FormResult, form: FormData): Promise<FormResult> {
  const clientId = Number(form.get("clientId"));
  const { viewer } = await requireClientAccess(clientId);
  if (viewer.role !== "trainer") return { error: "Alleen je trainer kan dit aanpassen." };
  const name = String(form.get("name") ?? "").trim();
  const goal = String(form.get("goal") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const emailRaw = String(form.get("email") ?? "").trim().toLowerCase();
  if (name.length < 2) return { error: "Vul een naam in." };
  if (password && password.length < 10) return { error: "Een nieuw wachtwoord moet minstens 10 tekens zijn." };
  const [cur] = await db.select().from(users).where(eq(users.id, clientId)).limit(1);
  let email = cur.email;
  if (emailRaw && emailRaw !== cur.email) {
    if (!z.string().email().safeParse(emailRaw).success) return { error: "Vul een geldig e-mailadres in." };
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, emailRaw)).limit(1);
    if (taken) return { error: "Er bestaat al een account met dit e-mailadres." };
    email = emailRaw;
  }
  if (password && email.endsWith(NO_EMAIL_DOMAIN)) return { error: "Vul ook een e-mailadres in: daarmee logt de cliënt in." };
  await db
    .update(users)
    .set({ name, email, goal: goal || null, source: parseSource(form.get("source")), ...(password ? { passwordHash: await hashPassword(password) } : {}) })
    .where(eq(users.id, clientId));
  revalidatePath(`/trainer/clients/${clientId}`);
  return { ok: password ? `Opgeslagen. ${name} kan nu inloggen met ${email}.` : "Opgeslagen." };
}

export async function addTrainer(_: FormResult, form: FormData): Promise<FormResult> {
  await requireAdmin();
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

/** Beheerder: wachtwoord van een trainer opnieuw instellen. */
export async function resetTrainerPassword(_: FormResult, form: FormData): Promise<FormResult> {
  await requireAdmin();
  const id = Number(form.get("trainerId"));
  const password = String(form.get("password") ?? "");
  if (password.length < 10) return { error: "Het nieuwe wachtwoord moet minstens 10 tekens zijn." };
  const [t] = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, "trainer"))).limit(1);
  if (!t) return { error: "Trainer niet gevonden." };
  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, id));
  return { ok: `Nieuw wachtwoord voor ${t.name} is actief.` };
}

/** Beheerder: trainer verwijderen; diens cliënten gaan naar een andere trainer. */
export async function deleteTrainer(_: FormResult, form: FormData): Promise<FormResult> {
  const admin = await requireAdmin();
  const id = Number(form.get("trainerId"));
  const to = Number(form.get("transferTo"));
  if (id === admin.id) return { error: "Je kunt jezelf niet verwijderen." };
  const [t] = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, "trainer"))).limit(1);
  if (!t) return { error: "Trainer niet gevonden." };
  if (t.isAdmin) return { error: "De beheerder kan niet verwijderd worden." };
  const [target] = await db.select().from(users).where(and(eq(users.id, to), eq(users.role, "trainer"))).limit(1);
  if (!target || target.id === id) return { error: "Kies een andere trainer om de cliënten aan over te dragen." };
  const moved = await db.transaction(async (tx) => {
    const r = await tx.update(users).set({ trainerId: target.id }).where(and(eq(users.trainerId, id), eq(users.role, "client"))).returning({ id: users.id });
    await tx.delete(users).where(eq(users.id, id));
    return r.length;
  });
  revalidatePath("/", "layout");
  const msg = `${t.name} is verwijderd. ${moved} ${moved === 1 ? "cliënt is" : "cliënten zijn"} overgedragen aan ${target.name}.`;
  redirect(`/trainer/team?msg=${encodeURIComponent(msg)}`);
}

/* ---------- Schema's (trainer) ---------- */

const programSchema = z.object({
  clientId: z.coerce.number().int().positive("Kies eerst een cliënt"),
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
              reps: z.string().trim().min(1, "Vul bij elke oefening de reps in").max(20),
              rpe: z.string().trim().max(10).optional(),
              rest: z.string().trim().max(20).optional(),
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
          rpe: it.rpe || null,
          rest: it.rest || null,
          load: it.load || null,
          notes: it.notes || null,
        })),
      );
    }
  });
  revalidatePath("/", "layout");
  if (form.get("returnTo") === "schemas") redirect(`/trainer/schemas?saved=${d.clientId}`);
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

/** Ontbrekende oefening toevoegen vanuit de schemabouwer; geeft de nieuwe oefening terug. */
export async function quickAddExercise(nameRaw: string, categoryRaw: string) {
  await requireUser("trainer");
  const name = String(nameRaw ?? "").trim().replace(/\s+/g, " ");
  const category = String(categoryRaw ?? "").trim().slice(0, 60) || "Overig";
  if (name.length < 2 || name.length > 80) return { error: "Geef de oefening een naam van 2–80 tekens." } as const;
  const cols = {
    id: exercises.id,
    name: exercises.name,
    category: exercises.category,
    region: exercises.region,
    purpose: exercises.purpose,
    cues: exercises.cues,
  };
  // Bestaat al (ook met andere hoofdletters)? Dan die gebruiken.
  const findExisting = () => db.select(cols).from(exercises).where(sql`lower(${exercises.name}) = lower(${name})`).limit(1);
  const [existing] = await findExisting();
  if (existing) return { exercise: existing } as const;
  const [created] = await db.insert(exercises).values({ name, category, builtIn: false }).onConflictDoNothing().returning(cols);
  if (created) {
    revalidatePath("/exercises");
    return { exercise: created } as const;
  }
  const [raced] = await findExisting();
  return raced ? ({ exercise: raced } as const) : ({ error: "Kon de oefening niet toevoegen." } as const);
}

/* ---------- Account ---------- */

export async function changePassword(_: FormResult, form: FormData): Promise<FormResult> {
  const u = await requireUser();
  if ((await currentSession())?.by) return { error: "Je bekijkt de hub als cliënt; het wachtwoord stel je in op de cliëntpagina." };
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const repeat = String(form.get("repeat") ?? "");
  if (!(await checkPassword(current, u.passwordHash))) return { error: "Je huidige wachtwoord klopt niet." };
  if (next.length < 10) return { error: "Kies een nieuw wachtwoord van minstens 10 tekens." };
  if (next !== repeat) return { error: "De twee nieuwe wachtwoorden zijn niet hetzelfde." };
  await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, u.id));
  return { ok: "Je wachtwoord is gewijzigd." };
}
