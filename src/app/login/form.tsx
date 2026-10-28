"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? "Bezig…" : "Inloggen"}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useFormState(login, { error: "" });
  return (
    <form action={action} className="stack">
      <label className="field">
        <span className="label">E-mail</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        <span className="label">Wachtwoord</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <Submit />
    </form>
  );
}
