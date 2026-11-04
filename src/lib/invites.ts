"use server";

import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, invites, users } from "@/db";
import type { FormResult } from "./actions";
import { displayEmail, hashPassword, requireUser, startSession } from "./auth";
import { appUrl, layout, mailConfigured, sendMail } from "./mail";
import { findInvite, sha } from "./invite-lookup";
import { TERMS_VERSION } from "./terms";

export type InviteResult = FormResult & { link?: string };

const DAY = 86_400_000;

async function createToken(userId: number, purpose: "invite" | "reset", createdBy: number | null) {
  const token = randomBytes(32).toString("base64url");
  // Oude, ongebruikte links voor dezelfde persoon vervallen: alleen de nieuwste werkt.
  await db.update(invites).set({ usedAt: new Date() }).where(and(eq(invites.userId, userId), isNull(invites.usedAt)));
  await db.insert(invites).values({
    userId,
    tokenHash: sha(token),
    purpose,
    createdBy,
    expiresAt: new Date(Date.now() + (purpose === "invite" ? 14 : 1) * DAY),
  });
  return `${appUrl()}/uitnodiging/${token}`;
}

/** Trainer stuurt een cliënt (of collega) een uitnodiging om zelf een wachtwoord te maken. */
export async function sendInvite(_: InviteResult, form: FormData): Promise<InviteResult> {
  const me = await requireUser("trainer");
  const id = Number(form.get("userId"));
  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!u) return { error: "Deze persoon bestaat niet meer." };
  if (u.role === "trainer" && !me.isAdmin && u.id !== me.id) return { error: "Alleen de beheerder kan trainers uitnodigen." };
  const email = displayEmail(u.email);
  if (!email) return { error: "Vul eerst een e-mailadres in bij Gegevens en klik Opslaan." };
  const link = await createToken(u.id, "invite", me.id);
  if (!mailConfigured()) {
    return { ok: "Mail is nog niet ingesteld. Kopieer de link hieronder en stuur hem zelf (WhatsApp, mail). Hij werkt 14 dagen.", link };
  }
  try {
    await sendMail(
      email,
      "Je account voor de PT Hub van Fysiotherapie Nagtzaam",
      layout({
        title: `Welkom bij de PT Hub, ${u.name.split(" ")[0]}!`,
        paragraphs: [
          `${me.name} heeft een account voor je klaargezet. In de PT Hub zie je je trainingsschema, log je je trainingen en volg je je voortgang.`,
          "Klik op de knop, kies een wachtwoord en ga akkoord met de voorwaarden. Daarna ben je meteen ingelogd.",
          `Je logt voortaan in met: ${email}`,
        ],
        button: { label: "Wachtwoord aanmaken", href: link },
        footer: "Deze link werkt 14 dagen en maar één keer. Niet aangevraagd? Dan kun je deze mail negeren.",
      }),
    );
  } catch (e) {
    console.error("Uitnodiging versturen mislukt", e);
    return { error: "De mail kon niet worden verstuurd (controleer de SMTP-instellingen). Kopieer de link en stuur hem zelf.", link };
  }
  return { ok: `Uitnodiging verstuurd naar ${email}.`, link };
}

/** Wachtwoord vergeten: altijd dezelfde melding, zodat niemand kan uitzoeken welke adressen bestaan. */
export async function requestReset(_: FormResult, form: FormData): Promise<FormResult> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const done = { ok: "Als dit e-mailadres bij ons bekend is, ontvang je binnen een paar minuten een mail met een link. Kijk ook in je spam." };
  if (!email.includes("@")) return { error: "Vul je e-mailadres in." };
  if (!mailConfigured()) return { error: "Mail is nog niet ingesteld. Vraag je trainer om een nieuwe link." };
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!u) return done;
  // Maximaal één mail per 2 minuten per persoon.
  const [recent] = await db
    .select({ id: invites.id })
    .from(invites)
    .where(and(eq(invites.userId, u.id), eq(invites.purpose, "reset"), gt(invites.createdAt, new Date(Date.now() - 120_000))))
    .orderBy(desc(invites.createdAt))
    .limit(1);
  if (recent) return done;
  const link = await createToken(u.id, "reset", null);
  try {
    await sendMail(
      email,
      "Nieuw wachtwoord voor de PT Hub",
      layout({
        title: "Nieuw wachtwoord kiezen",
        paragraphs: [`Hoi ${u.name.split(" ")[0]}, je vroeg om een nieuw wachtwoord voor de PT Hub.`, "Klik op de knop en kies een nieuw wachtwoord."],
        button: { label: "Nieuw wachtwoord kiezen", href: link },
        footer: "Deze link werkt 24 uur en maar één keer. Niet aangevraagd? Negeer deze mail; je oude wachtwoord blijft werken.",
      }),
    );
  } catch (e) {
    console.error("Reset-mail mislukt", e);
  }
  return done;
}

export async function acceptInvite(_: FormResult, form: FormData): Promise<FormResult> {
  const token = String(form.get("token") ?? "");
  const row = await findInvite(token);
  if (!row) return { error: "Deze link is verlopen of al gebruikt. Vraag je trainer om een nieuwe." };
  const pw = String(form.get("password") ?? "");
  const repeat = String(form.get("repeat") ?? "");
  if (pw.length < 10) return { error: "Kies een wachtwoord van minstens 10 tekens." };
  if (pw !== repeat) return { error: "De twee wachtwoorden zijn niet hetzelfde." };
  const needsTerms = row.user.termsVersion !== TERMS_VERSION;
  if (needsTerms && form.get("terms") !== "on") return { error: "Vink aan dat je akkoord gaat met de algemene voorwaarden en de privacyverklaring." };
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(pw), ...(needsTerms ? { termsVersion: TERMS_VERSION, termsAcceptedAt: new Date() } : {}) })
    .where(eq(users.id, row.user.id));
  await db.update(invites).set({ usedAt: new Date() }).where(eq(invites.id, row.invite.id));
  await startSession(row.user);
  redirect(row.user.role === "trainer" ? "/trainer" : "/dashboard?welkom=1");
}
