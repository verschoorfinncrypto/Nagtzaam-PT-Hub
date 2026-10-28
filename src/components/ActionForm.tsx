"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { FormResult } from "@/lib/actions";

function Submit({ label, className }: { label: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className ?? "btn btn-primary"} disabled={pending}>
      {pending ? "Bezig…" : label}
    </button>
  );
}

export function ActionForm({
  action,
  children,
  submitLabel,
  submitClass,
  resetOnOk = false,
  className = "stack",
}: {
  action: (prev: FormResult, form: FormData) => Promise<FormResult>;
  children: React.ReactNode;
  submitLabel: string;
  submitClass?: string;
  resetOnOk?: boolean;
  className?: string;
}) {
  const [state, formAction] = useFormState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnOk) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state.error && <p className="error" role="alert">{state.error}</p>}
      {state.ok && <p className="notice" role="status">{state.ok}</p>}
      <div className="actions">
        <Submit label={submitLabel} className={submitClass} />
      </div>
    </form>
  );
}
