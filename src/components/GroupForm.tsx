import { ActionForm } from "@/components/ActionForm";
import { saveGroup } from "@/lib/actions";

type Client = { client_id: number; client_name: string; trainer_id: number | null; trainer_name: string | null };

export function GroupForm({
  meId,
  trainers,
  clients,
  group,
}: {
  meId: number;
  trainers: { id: number; name: string }[];
  clients: Client[];
  group?: { id: number; name: string; schedule: string | null; notes: string | null; trainerId: number | null; memberIds: number[] };
}) {
  const sel = new Set(group?.memberIds ?? []);
  const mine = clients.filter((c) => c.trainer_id === meId);
  const others = clients.filter((c) => c.trainer_id !== meId);
  const row = (c: Client) => (
    <label key={c.client_id} className="copy-row">
      <input type="checkbox" name="memberId" value={c.client_id} defaultChecked={sel.has(c.client_id)} />
      <span>
        <b>{c.client_name}</b>
        {c.trainer_id !== meId && <span className="muted"> · {c.trainer_name ?? "nog niet gekoppeld"}</span>}
      </span>
    </label>
  );
  return (
    <ActionForm action={saveGroup} submitLabel={group ? "Groep opslaan" : "Groep aanmaken"}>
      {group && <input type="hidden" name="groupId" value={group.id} />}
      <div className="field-row">
        <label className="field">
          <span className="label">Naam</span>
          <input name="name" required maxLength={80} defaultValue={group?.name ?? ""} placeholder="Bijv. Knie-groep dinsdag" />
        </label>
        <label className="field">
          <span className="label">Vast moment (optioneel)</span>
          <input name="schedule" maxLength={60} defaultValue={group?.schedule ?? ""} placeholder="Bijv. di 18:00" />
        </label>
        <label className="field">
          <span className="label">Trainer</span>
          <select name="trainerId" defaultValue={group ? group.trainerId ?? "" : meId}>
            {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}{t.id === meId ? " (jij)" : ""}</option>)}
            <option value="">Geen vaste trainer</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span className="label">Notitie (optioneel)</span>
        <input name="notes" maxLength={1000} defaultValue={group?.notes ?? ""} placeholder="Bijv. zaal 2, max 8 personen" />
      </label>
      <fieldset className="copy-group">
        <legend className="label">Leden</legend>
        {clients.length === 0 && <p className="hint">Nog geen cliënten.</p>}
        {mine.length > 0 && <p className="body-sm muted">Mijn cliënten</p>}
        {mine.map(row)}
        {others.length > 0 && <p className="body-sm muted" style={{ marginTop: 8 }}>Overige cliënten</p>}
        {others.map(row)}
      </fieldset>
    </ActionForm>
  );
}
