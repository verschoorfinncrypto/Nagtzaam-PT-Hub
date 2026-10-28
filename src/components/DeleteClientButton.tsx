"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteClient } from "@/lib/actions";

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function Confirm({ name }: { name: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-sm btn-danger-solid" disabled={pending}>
      {pending ? "Verwijderen…" : `Ja, verwijder ${name.split(" ")[0]}`}
    </button>
  );
}

/** Prullenbakje met bevestiging in de pagina: eerst tikken, dan bevestigen. */
export function DeleteClientButton({ clientId, name, withLabel = false }: { clientId: number; name: string; withLabel?: boolean }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button
        type="button"
        className={withLabel ? "btn btn-sm btn-danger" : "icon-btn"}
        aria-label={`${name} verwijderen`}
        title="Cliënt verwijderen"
        onClick={() => setAsking(true)}
      >
        <TrashIcon />
        {withLabel && <span>Verwijderen</span>}
      </button>
    );
  }
  return (
    <form action={deleteClient} className="delete-confirm" role="alertdialog" aria-label={`${name} verwijderen?`}>
      <input type="hidden" name="clientId" value={clientId} />
      <span className="body-sm">
        <b>{name}</b> en alle trainingen, schema&apos;s en metingen definitief verwijderen?
      </span>
      <span className="actions">
        <Confirm name={name} />
        <button type="button" className="btn btn-sm" onClick={() => setAsking(false)} autoFocus>
          Annuleren
        </button>
      </span>
    </form>
  );
}
