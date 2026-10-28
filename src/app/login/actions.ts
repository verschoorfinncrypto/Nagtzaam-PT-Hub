"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, users } from "@/db";
import { checkPassword, endSession, startSession } from "@/lib/auth";

// Eenvoudige rem op brute force, per proces.
const attempts = new Map<string, { n: number; until: number }>();

export async function login(_: { error: string }, form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const now = Date.now();
  const a = attempts.get(email);
  if (a && a.until > now) return { error: "Te veel pogingen. Probeer het over een paar minuten opnieuw." };

  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const ok = u ? await checkPassword(password, u.passwordHash) : false;
  if (!u || !ok) {
    const n = (a?.n ?? 0) + 1;
    attempts.set(email, { n, until: n >= 5 ? now + 5 * 60_000 : 0 });
    return { error: "E-mail of wachtwoord klopt niet." };
  }
  attempts.delete(email);
  await startSession(u);
  redirect(u.role === "trainer" ? "/trainer" : "/dashboard");
}

export async function logout() {
  endSession();
  redirect("/login");
}
