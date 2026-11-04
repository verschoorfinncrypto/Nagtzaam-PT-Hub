"use server";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { FIELD_LABELS, PROGRAM_LIMITS } from "./limits";
import { cleanVideoUrl } from "./video";
import { bmiFrom, METRICS, type MetricKey } from "./markers";
import {
  bodyWeights,
  db,
  exercises,
  groupMembers,
  groups,
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
  requireProgramAccess,
  requireUser,
  startSession,
  viewingTrainer,
} from "./auth";
import { parseNum, today } from "./format";

export type FormResult = { error?: string; ok?: string };

// Nederlandse standaardmeldingen voor validatie, zodat er nooit Engelse foutteksten in beeld komen.
z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case "too_big":
      return { message: issue.type === "string" ? `Maximaal ${issue.maximum} tekens.` : issue.type === "array" ? `Maximaal ${issue.maximum} items.` : `Maximaal ${issue.maximum}.` };
    case "too_small":
      return { message: issue.type === "string" ? (issue.minimum === 1 ? "Dit veld is verplicht." : `Minimaal ${issue.minimum} tekens.`) : issue.type === "array" ? `Minimaal ${issue.minimum} items.` : `Minimaal ${issue.minimum}.` };
    case "invalid_type":
      return { message: issue.received === "undefined" ? "Dit veld is verplicht." : "Ongeldige waarde." };
    case "invalid_string":
      return { message: issue.validation === "email" ? "Vul een geldig e-mailadres in." : "Ongeldige invoer." };
    default:
      return { message: ctx.defaultError.startsWith("Invalid") ? "Ongeldige invoer." : ctx.defaultError };
  }
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum");

/* ---------- Trainingen ---------- */

const workoutSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  date: isoDate,
  title: z.string().trim().min(1, "Geef de training een naam").max(120),
  programDayId: z.coerce.number().int().positive().optional(),
  rpe: z.coerce.number().int().min(1).max(10).optional(),
  pain: z.coerce.number().int().min(0).max(10).optional(),
  feeling: z.coerce.number().int().min(1).max(5).optional(),
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
    pain: form.get("pain") === "" || form.get("pain") == null ? undefined : form.get("pain"),
    feeling: form.get("feeling") || undefined,
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
        pain: d.pain ?? null,
        feeling: d.feeling ?? null,
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

/** Meting opslaan: gewicht en/of andere waarden van de weegschaal en omtrekken. Op dezelfde dag vult een tweede meting aan. */
export async function addWeight(_: FormResult, form: FormData): Promise<FormResult> {
  const clientId = Number(form.get("clientId"));
  const date = String(form.get("date") ?? today());
  const note = String(form.get("note") ?? "").trim().slice(0, 200) || null;
  if (!isoDate.safeParse(date).success) return { error: "Ongeldige datum." };
  if (date > today()) return { error: "Een datum in de toekomst kan niet." };
  const { client } = await requireClientAccess(clientId);

  const values: Partial<Record<MetricKey, number>> = {};
  for (const m of METRICS) {
    const raw = form.get(m.key === "weightKg" ? "weight" : m.key);
    if (raw == null || String(raw).trim() === "") continue;
    const n = parseNum(raw);
    if (!Number.isFinite(n) || n < m.min || n > m.max) return { error: `${m.label}: vul een waarde in tussen ${m.min} en ${m.max}${m.unit ? " " + m.unit : ""}.` };
    values[m.key] = m.step === "1" ? Math.round(n) : Math.round(n * 10) / 10;
  }
  if (!Object.keys(values).length) return { error: "Vul minstens één meetwaarde in." };
  // BMI automatisch uit gewicht en lengte als die niet is ingevuld
  if (values.bmi == null && values.weightKg && client.heightCm) values.bmi = bmiFrom(values.weightKg, client.heightCm) ?? undefined;

  const set: Record<string, unknown> = {};
  for (const k of Object.keys(values)) set[k] = values[k as MetricKey];
  if (note) set.note = note;
  await db
    .insert(bodyWeights)
    .values({ clientId, date, note, ...values, bmr: values.bmr, metabolicAge: values.metabolicAge })
    .onConflictDoUpdate({ target: [bodyWeights.clientId, bodyWeights.date], set });
  revalidatePath("/", "layout");
  return { ok: "Meting opgeslagen." };
}

/** Geslacht, geboortejaar en lengte (voor BMI en referentiewaarden). Door de cliënt zelf of een trainer. */
export async function updateBodyProfile(_: FormResult, form: FormData): Promise<FormResult> {
  const clientId = Number(form.get("clientId"));
  await requireClientAccess(clientId);
  const sexRaw = String(form.get("sex") ?? "");
  const sex = sexRaw === "m" || sexRaw === "v" ? sexRaw : null;
  const by = String(form.get("birthYear") ?? "").trim();
  const birthYear = by ? Number(by) : null;
  const thisYear = Number(today().slice(0, 4));
  if (birthYear != null && (!Number.isInteger(birthYear) || birthYear < thisYear - 110 || birthYear > thisYear - 5)) return { error: "Vul een geldig geboortejaar in." };
  const h = String(form.get("heightCm") ?? "").trim();
  const heightCm = h ? parseNum(h) : null;
  if (heightCm != null && (!Number.isFinite(heightCm) || heightCm < 100 || heightCm > 250)) return { error: "Vul een lengte in tussen 100 en 250 cm." };
  await db.update(users).set({ sex, birthYear, heightCm }).where(eq(users.id, clientId));
  revalidatePath("/", "layout");
  return { ok: "Gegevens voor de referentiewaarden opgeslagen." };
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

/** Trainer uit een formulier: een bestaande trainer, of null voor "nog niet gekoppeld". */
async function parseTrainerId(v: FormDataEntryValue | null): Promise<number | null | "invalid"> {
  if (v === null || v === "") return null;
  const id = Number(v);
  const [t] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, id), eq(users.role, "trainer"))).limit(1);
  return t ? t.id : "invalid";
}

/** Cliënt aan een (andere) trainer koppelen; direct vanuit de cliëntenlijst. */
export async function assignTrainer(form: FormData) {
  await requireUser("trainer");
  const { client } = await requireClientAccess(Number(form.get("clientId")));
  const trainerId = await parseTrainerId(form.get("trainerId"));
  if (trainerId === "invalid") return;
  await db.update(users).set({ trainerId }).where(eq(users.id, client.id));
  revalidatePath("/", "layout");
}

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
  const chosenTrainer = await parseTrainerId(form.get("trainerId"));
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (exists) return { error: "Er bestaat al een account met dit e-mailadres." };
  const [c] = await db
    .insert(users)
    .values({
      name: d.name,
      email,
      passwordHash: d.password ? await hashPassword(d.password) : NO_LOGIN,
      role: "client",
      trainerId: form.has("trainerId") ? (chosenTrainer === "invalid" ? trainer.id : chosenTrainer) : trainer.id,
      goal: d.goal ?? null,
      source: parseSource(form.get("source")),
    })
    .returning({ id: users.id });
  revalidatePath("/trainer");
  redirect(`/trainer/clients/${c.id}?created=${d.password ? "login" : "nologin"}`);
}

/** Cliënt definitief verwijderen, met al zijn trainingen, schema's en metingen (cascade in de database). */
export async function deleteClient(form: FormData) {
  await requireUser("trainer");
  const { client } = await requireClientAccess(Number(form.get("clientId")));
  await db.delete(users).where(and(eq(users.id, client.id), eq(users.role, "client")));
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
  const trainerId = await parseTrainerId(form.get("trainerId"));
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
    .set({ name, email, goal: goal || null, source: parseSource(form.get("source")), ...(form.has("trainerId") && trainerId !== "invalid" ? { trainerId } : {}), ...(password ? { passwordHash: await hashPassword(password) } : {}) })
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
  name: z.string().trim().min(1, "Geef het schema een naam").max(PROGRAM_LIMITS.name, `De naam van het schema mag maximaal ${PROGRAM_LIMITS.name} tekens zijn`),
  notes: z.string().trim().max(PROGRAM_LIMITS.programNotes, `De toelichting mag maximaal ${PROGRAM_LIMITS.programNotes} tekens zijn`).optional(),
  days: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Elke dag heeft een naam nodig").max(PROGRAM_LIMITS.dayName, `Een dagnaam mag maximaal ${PROGRAM_LIMITS.dayName} tekens zijn`),
        items: z
          .array(
            z.object({
              exerciseId: z.number().int().positive(),
              section: z.enum(["warmup", "main", "cooldown"]).default("main"),
              sets: z.number().int().min(1).max(PROGRAM_LIMITS.sets),
              reps: z.string().trim().min(1).max(PROGRAM_LIMITS.reps),
              rpe: z.string().trim().max(PROGRAM_LIMITS.rpe).optional(),
              rest: z.string().trim().max(PROGRAM_LIMITS.rest).optional(),
              painLimit: z.string().trim().max(PROGRAM_LIMITS.painLimit).optional(),
              load: z.string().trim().max(PROGRAM_LIMITS.load).optional(),
              notes: z.string().trim().max(PROGRAM_LIMITS.notes).optional(),
            }),
          )
          .min(1, "Elke dag heeft minstens één oefening nodig")
          .max(30, "Een dag kan maximaal 30 oefeningen hebben"),
      }),
    )
    .min(1, "Voeg minstens één trainingsdag toe")
    .max(7, "Een schema kan maximaal 7 dagen hebben"),
});

/** Maakt van een validatiefout een Nederlandse melding met dag, oefening en veld erbij. */
async function programErrorMessage(issue: z.ZodIssue, days: unknown): Promise<string> {
  const [root, di, sub, ii, field] = issue.path;
  if (root === "days" && typeof di === "number" && sub === "items" && typeof ii === "number" && typeof field === "string") {
    const day = Array.isArray(days) ? (days[di] as { name?: string; items?: { exerciseId?: number }[] }) : undefined;
    const exId = day?.items?.[ii]?.exerciseId;
    let exName = `oefening ${ii + 1}`;
    if (typeof exId === "number") {
      const [ex] = await db.select({ name: exercises.name }).from(exercises).where(eq(exercises.id, exId)).limit(1);
      if (ex) exName = ex.name;
    }
    const where = `${day?.name || `Dag ${di + 1}`}, ${exName}`;
    const label = FIELD_LABELS[field] ?? field;
    if (issue.code === "too_big") return `${where}: ${label} mag maximaal ${issue.maximum} ${field === "sets" ? "zijn" : "tekens zijn"}.`;
    if (issue.code === "too_small") return field === "reps" ? `${where}: vul de reps in.` : `${where}: ${label} is te laag.`;
    return `${where}: controleer ${label}.`;
  }
  return issue.message && !/^(String|Number|Array|Expected|Required|Invalid)/.test(issue.message)
    ? issue.message
    : "Controleer het schema: een van de velden klopt niet.";
}

export async function saveProgram(_: FormResult, form: FormData): Promise<FormResult> {
  let days: unknown;
  try {
    days = JSON.parse(String(form.get("payload") ?? "[]"));
  } catch {
    return { error: "Kon het schema niet lezen." };
  }
  const groupId = Number(form.get("groupId")) || null;
  const parsed = programSchema.safeParse({
    clientId: groupId ? 1 : form.get("clientId"), // bij een groepsschema telt de cliënt niet
    name: form.get("name"),
    notes: form.get("notes") || undefined,
    days,
  });
  if (!parsed.success) return { error: await programErrorMessage(parsed.error.issues[0], days) };
  const d = parsed.data;
  let viewer;
  if (groupId) {
    viewer = await requireUser("trainer");
    const [g] = await db.select({ id: groups.id }).from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!g) return { error: "Die groep bestaat niet meer." };
  } else {
    ({ viewer } = await requireClientAccess(d.clientId));
    if (viewer.role !== "trainer") return { error: "Alleen je trainer kan schema's maken." };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(programs)
      .set({ active: false })
      .where(and(groupId ? eq(programs.groupId, groupId) : eq(programs.clientId, d.clientId), eq(programs.active, true)));
    const [p] = await tx
      .insert(programs)
      .values({ clientId: groupId ? null : d.clientId, groupId, trainerId: viewer.id, name: d.name, notes: d.notes ?? null, active: true })
      .returning({ id: programs.id });
    for (const [i, day] of d.days.entries()) {
      const [pd] = await tx.insert(programDays).values({ programId: p.id, name: day.name, position: i }).returning({ id: programDays.id });
      await tx.insert(programExercises).values(
        day.items.map((it, j) => ({
          dayId: pd.id,
          exerciseId: it.exerciseId,
          section: it.section,
          position: j,
          sets: it.sets,
          reps: it.reps,
          rpe: it.rpe || null,
          rest: it.rest || null,
          painLimit: it.painLimit || null,
          load: it.load || null,
          notes: it.notes || null,
        })),
      );
    }
  });
  revalidatePath("/", "layout");
  if (groupId) redirect(`/trainer/groups/${groupId}?program=1`);
  if (form.get("returnTo") === "schemas") redirect(`/trainer/schemas?saved=${d.clientId}`);
  redirect(`/trainer/clients/${d.clientId}?program=1`);
}

/** Bestaand schema kopiëren naar één of meer cliënten; elke cliënt krijgt een eigen, los te bewerken kopie die actief wordt. */
export async function copyProgram(_: FormResult, form: FormData): Promise<FormResult> {
  const trainer = await requireUser("trainer");
  const fromId = Number(form.get("fromId"));
  const clientIds = [...new Set(form.getAll("clientId").map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  const name = String(form.get("name") ?? "").trim().slice(0, PROGRAM_LIMITS.name);
  if (!clientIds.length) return { error: "Kies minstens één cliënt." };
  if (clientIds.length > 100) return { error: "Kies maximaal 100 cliënten tegelijk." };

  const [src] = await db.select().from(programs).where(eq(programs.id, fromId)).limit(1);
  if (!src) return { error: "Dat schema bestaat niet meer." };
  await requireProgramAccess(src);
  const targets = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(inArray(users.id, clientIds), eq(users.role, "client")));
  if (targets.length !== clientIds.length) return { error: "Een van de gekozen cliënten bestaat niet meer. Vernieuw de pagina." };

  const srcDays = await db.select().from(programDays).where(eq(programDays.programId, src.id)).orderBy(asc(programDays.position));
  const srcItems = srcDays.length
    ? await db.select().from(programExercises).where(inArray(programExercises.dayId, srcDays.map((d) => d.id))).orderBy(asc(programExercises.position))
    : [];

  await db.transaction(async (tx) => {
    for (const t of targets) {
      await tx.update(programs).set({ active: false }).where(and(eq(programs.clientId, t.id), eq(programs.active, true)));
      const [p] = await tx
        .insert(programs)
        .values({ clientId: t.id, trainerId: trainer.id, name: name || src.name, notes: src.notes, active: true })
        .returning({ id: programs.id });
      for (const d of srcDays) {
        const [nd] = await tx.insert(programDays).values({ programId: p.id, name: d.name, position: d.position }).returning({ id: programDays.id });
        const items = srcItems.filter((i) => i.dayId === d.id);
        if (items.length) {
          await tx.insert(programExercises).values(
            items.map((i) => ({
              dayId: nd.id,
              exerciseId: i.exerciseId,
              section: i.section,
              position: i.position,
              sets: i.sets,
              reps: i.reps,
              rpe: i.rpe,
              rest: i.rest,
              painLimit: i.painLimit,
              load: i.load,
              notes: i.notes,
            })),
          );
        }
      }
    }
  });
  revalidatePath("/", "layout");
  const who = targets.length === 1 ? targets[0].name : `${targets.length} cliënten`;
  redirect(`/trainer/schemas?trainer=all&msg=${encodeURIComponent(`Schema "${name || src.name}" gekopieerd naar ${who} en daar actief gezet.`)}`);
}

export async function stopProgram(form: FormData) {
  const clientId = Number(form.get("clientId"));
  const { viewer } = await requireClientAccess(clientId);
  if (viewer.role !== "trainer") return;
  await db.update(programs).set({ active: false }).where(and(eq(programs.clientId, clientId), eq(programs.active, true)));
  revalidatePath("/", "layout");
}

/* ---------- Groepen (trainer) ---------- */

export async function saveGroup(_: FormResult, form: FormData): Promise<FormResult> {
  const me = await requireUser("trainer");
  const id = Number(form.get("groupId")) || null;
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const schedule = String(form.get("schedule") ?? "").trim().slice(0, 60) || null;
  const notes = String(form.get("notes") ?? "").trim().slice(0, 1000) || null;
  const trainerRaw = String(form.get("trainerId") ?? "");
  const memberIds = [...new Set(form.getAll("memberId").map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  if (name.length < 2) return { error: "Geef de groep een naam." };
  let trainerId: number | null = me.id;
  if (trainerRaw === "") trainerId = null;
  else {
    const [t] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, Number(trainerRaw)), eq(users.role, "trainer"))).limit(1);
    trainerId = t?.id ?? me.id;
  }
  const members = memberIds.length
    ? await db.select({ id: users.id }).from(users).where(and(inArray(users.id, memberIds), eq(users.role, "client")))
    : [];
  const gid = await db.transaction(async (tx) => {
    let g = id;
    if (g) {
      const res = await tx.update(groups).set({ name, schedule, notes, trainerId }).where(eq(groups.id, g)).returning({ id: groups.id });
      if (!res.length) throw new Error("Groep niet gevonden");
      await tx.delete(groupMembers).where(eq(groupMembers.groupId, g));
    } else {
      const [ng] = await tx.insert(groups).values({ name, schedule, notes, trainerId }).returning({ id: groups.id });
      g = ng.id;
    }
    if (members.length) await tx.insert(groupMembers).values(members.map((m) => ({ groupId: g!, clientId: m.id })));
    return g!;
  });
  revalidatePath("/", "layout");
  redirect(`/trainer/groups/${gid}?saved=1`);
}

export async function deleteGroup(form: FormData) {
  await requireUser("trainer");
  const id = Number(form.get("groupId"));
  await db.delete(groups).where(eq(groups.id, id));
  revalidatePath("/", "layout");
  redirect("/trainer/groups?deleted=1");
}

const groupSessionSchema = z.object({
  groupId: z.coerce.number().int().positive(),
  dayId: z.coerce.number().int().positive(),
  date: isoDate,
  entries: z
    .array(
      z.object({
        clientId: z.number().int().positive(),
        pain: z.number().int().min(0).max(10).nullable().optional(),
        exercises: z.array(
          z.object({ exerciseId: z.number().int().positive(), sets: z.number().int().min(0).max(20), reps: z.number().int().min(0).max(1000), weight: z.number().min(0).max(1000) }),
        ),
      }),
    )
    .max(60),
});

/** Groepssessie loggen: per aanwezige een eigen training met zijn sets, zodat PR's en volume per cliënt kloppen. */
export async function logGroupSession(_: FormResult, form: FormData): Promise<FormResult> {
  await requireUser("trainer");
  let entries: unknown;
  try {
    entries = JSON.parse(String(form.get("payload") ?? "[]"));
  } catch {
    return { error: "Kon de sessie niet lezen." };
  }
  const parsed = groupSessionSchema.safeParse({ groupId: form.get("groupId"), dayId: form.get("dayId"), date: form.get("date"), entries });
  if (!parsed.success) return { error: "Controleer de ingevulde waarden." };
  const d = parsed.data;
  if (d.date > today()) return { error: "Een datum in de toekomst kan niet." };
  const [g] = await db.select().from(groups).where(eq(groups.id, d.groupId)).limit(1);
  if (!g) return { error: "Die groep bestaat niet meer." };
  const members = await db.select({ clientId: groupMembers.clientId }).from(groupMembers).where(eq(groupMembers.groupId, g.id));
  const allowed = new Set(members.map((m) => m.clientId));
  const present = d.entries.filter((e) => allowed.has(e.clientId));
  if (!present.length) return { error: "Vink minstens één aanwezige aan." };
  const [day] = await db.select().from(programDays).where(eq(programDays.id, d.dayId)).limit(1);

  await db.transaction(async (tx) => {
    for (const e of present) {
      const [w] = await tx
        .insert(workouts)
        .values({ clientId: e.clientId, date: d.date, title: `${g.name}${day ? ` · ${day.name}` : ""}`, pain: e.pain ?? null })
        .returning({ id: workouts.id });
      const rows = e.exercises
        .filter((x) => x.sets > 0 && x.reps > 0)
        .flatMap((x, position) =>
          Array.from({ length: x.sets }, (_, i) => ({ workoutId: w.id, exerciseId: x.exerciseId, position, setNumber: i + 1, reps: x.reps, weight: x.weight })),
        );
      if (rows.length) await tx.insert(workoutSets).values(rows);
    }
  });
  revalidatePath("/", "layout");
  redirect(`/trainer/groups/${g.id}?logged=${present.length}`);
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
      videoUrl: cleanVideoUrl(String(form.get("videoUrl") ?? "")),
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
    muscles: exercises.muscles,
    videoUrl: exercises.videoUrl,
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

/** Vaste uitlegvideo bij een oefening instellen of weghalen (leeg = YouTube-zoeklink). Geldt direct in alle schema's. */
export async function setExerciseVideo(_: FormResult, form: FormData): Promise<FormResult> {
  await requireUser("trainer");
  const id = Number(form.get("exerciseId"));
  const raw = String(form.get("videoUrl") ?? "");
  const url = cleanVideoUrl(raw);
  if (raw.trim() && !url) return { error: "Plak een volledige link, beginnend met https://" };
  if (url && url.length > 500) return { error: "Die link is te lang." };
  const [ex] = await db.update(exercises).set({ videoUrl: url }).where(eq(exercises.id, id)).returning({ name: exercises.name });
  if (!ex) return { error: "Oefening niet gevonden." };
  revalidatePath("/", "layout");
  return { ok: url ? `Video voor ${ex.name} opgeslagen. Cliënten zien hem direct in hun schema.` : `Vaste video voor ${ex.name} verwijderd; de zoeklink wordt weer gebruikt.` };
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
