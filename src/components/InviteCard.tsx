"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { sendInvite, type InviteResult } from "@/lib/invites";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Bezig…" : label}</button>;
}

export function InviteCard({ userId, email, canLogin, mailReady }: { userId: number; email: string | null; canLogin: boolean; mailReady: boolean }) {
  const [state, action] = useFormState<InviteResult, FormData>(sendInvite, {});
  const [copied, setCopied] = useState(false);
  const label = mailReady ? (canLogin ? "Nieuwe inloglink mailen" : "Uitnodiging mailen") : "Uitnodigingslink maken";
  return (
    <form action={action} className="stack">
      <input type="hidden" name="userId" value={userId} />
      <p className="body-sm">
        {canLogin
          ? "Deze cliënt kan al inloggen. Wachtwoord vergeten? Stuur een nieuwe link; het oude wachtwoord blijft werken tot er een nieuw is gekozen."
          : email
            ? `${email} krijgt een mail met een knop. Daar kiest de cliënt zelf een wachtwoord en gaat akkoord met de voorwaarden.`
            : "Vul eerst een e-mailadres in bij Gegevens hieronder en klik Opslaan."}
      </p>
      {!mailReady && <p className="hint">De hub kan nog niet zelf mailen (SMTP niet ingesteld). Je krijgt een link die je zelf kunt doorsturen.</p>}
      {state.error && <p className="error" role="alert">{state.error}</p>}
      {state.ok && <p className="notice" role="status">{state.ok}</p>}
      {state.link && (
        <div className="invite-link">
          <input readOnly value={state.link} aria-label="Uitnodigingslink" onFocus={(e) => e.target.select()} />
          <button
            type="button"
            className="btn"
            onClick={() => {
              navigator.clipboard?.writeText(state.link!).then(() => setCopied(true), () => setCopied(false));
            }}
          >
            {copied ? "Gekopieerd ✓" : "Kopieer link"}
          </button>
        </div>
      )}
      <div className="actions">
        <Submit label={label} />
      </div>
    </form>
  );
}
