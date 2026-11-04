"use client";

import { useFormState, useFormStatus } from "react-dom";
import { acceptInvite } from "@/lib/invites";

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Bezig…" : "Wachtwoord opslaan en inloggen"}</button>;
}

export function AcceptForm({ token, needsTerms }: { token: string; needsTerms: boolean }) {
  const [state, action] = useFormState(acceptInvite, {});
  return (
    <form action={action} className="stack">
      <input type="hidden" name="token" value={token} />
      <label className="field">
        <span className="label">Wachtwoord</span>
        <input name="password" type="password" autoComplete="new-password" minLength={10} required />
        <span className="hint">Minstens 10 tekens. Tip: een zinnetje, zoals &quot;ik-train-op-dinsdag&quot;.</span>
      </label>
      <label className="field">
        <span className="label">Nog een keer</span>
        <input name="repeat" type="password" autoComplete="new-password" minLength={10} required />
      </label>
      {needsTerms && (
        <label className="copy-row terms-row">
          <input type="checkbox" name="terms" required />
          <span>
            Ik ga akkoord met de{" "}
            <a href="/voorwaarden" target="_blank" rel="noreferrer">algemene voorwaarden</a> en de{" "}
            <a href="/privacy" target="_blank" rel="noreferrer">privacyverklaring</a> van Fysiotherapie Nagtzaam.
          </span>
        </label>
      )}
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <Submit />
    </form>
  );
}
