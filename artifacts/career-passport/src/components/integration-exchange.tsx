import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch, UnauthorizedError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { ProviderAction as Action, ExchangeRun as Run, ExchangeResult, ExchangeSources } from "@workspace/api-client-react";

export function IntegrationExchange({ connection, onClose }: {
  connection: { id: number; provider: string; category: string }; onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [actions, setActions] = useState<Action[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [sources, setSources] = useState<ExchangeSources>({ employees: [], candidates: [], meetings: [] });
  const [actionKey, setActionKey] = useState("");
  const [fields, setFields] = useState<Record<string,string>>({});
  const [defaults, setDefaults] = useState<Record<string,string>>({});
  const [employeeId, setEmployeeId] = useState("");
  const [last, setLast] = useState<ExchangeResult | null>(null);
  const [imported, setImported] = useState<Record<string,boolean>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const action = actions.find(a => a.key === actionKey);
  const base = `/integrations/exchange/${connection.id}`;

  async function read(path: string, options?: RequestInit) {
    const res = await apiFetch(path, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "The integration request failed.");
    return data;
  }
  async function load() {
    try {
      const [detail, sourceData] = await Promise.all([read(base), read("/integrations/exchange/sources")]);
      setActions(detail.actions); setRuns(detail.runs); setSources(sourceData);
    } catch (err) { if (!(err instanceof UnauthorizedError)) setError((err as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [connection.id]);

  function fillFromSource(key: string) {
    const [kind, id] = key.split(":");
    const source = sources[kind as keyof typeof sources]?.find(s => s.id === Number(id));
    if (!source || !action) return;
    const [firstName, ...lastName] = source.name.split(" ");
    const summary = `${source.name}${source.role ? ` — ${source.role}` : ""}${source.email ? `\n${source.email}` : ""}${source.notes ? `\n\n${source.notes}` : ""}`;
    const suggested: Record<string,string | undefined> = {
      name: source.name, firstName, lastName: lastName.join(" "), email: source.email ?? undefined,
      proposedBusinessTitle: source.role ?? undefined, note: summary, comment: summary,
    };
    setFields(previous => {
      const next = { ...previous };
      for (const p of action.props) if (suggested[p.name]) next[p.name] = suggested[p.name]!;
      return next;
    });
  }

  async function runAction() {
    if (!action) return;
    if (action.write && !window.confirm(`Send the displayed fields to ${connection.provider}? This changes data in that external tool. Check the recipient record IDs before continuing.`)) return;
    setBusy(true); setError("");
    try {
      const props: Record<string,unknown> = {};
      for (const p of action.props) {
        const value = fields[p.name];
        if (value === undefined || value === "") continue;
        props[p.name] = p.type === "integer" ? Number(value)
          : p.type === "boolean" ? value === "true"
          : p.type === "object" || p.type.endsWith("[]") ? JSON.parse(value) : value;
      }
      const data = await read(`${base}/run`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: action.key, props, confirmWrite: action.write, requestId: crypto.randomUUID() }),
      });
      setLast(data); setImported({});
      toast({ title: action.write ? "Sent to tool" : "Read completed", description: "Review the result below. Reads do not modify Proven Path until you import a record." });
      await load();
    } catch (err) {
      if (!(err instanceof UnauthorizedError)) setError(err instanceof SyntaxError ? "Array and object fields must contain valid JSON." : (err as Error).message);
      await load();
    } finally { setBusy(false); }
  }

  async function importRow(index: number) {
    if (!last) return;
    if (!window.confirm("Import this record into Proven Path? Matching employee or candidate records may be updated. No external records will be changed.")) return;
    setBusy(true); setError("");
    try {
      const data = await read(`${base}/import`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: last.run.id, index, employeeId: employeeId ? Number(employeeId) : undefined,
          defaults: Object.fromEntries(Object.entries(defaults).filter(([,v]) => v.trim())),
        }),
      });
      setImported(previous => ({ ...previous, [`${last.run.id}:${index}`]: true }));
      toast({ title: data.alreadyImported ? "Already imported" : "Imported into Proven Path", description: "This record will not be duplicated by importing it again." });
      await queryClient.invalidateQueries();
      await load();
    } catch (err) { if (!(err instanceof UnauthorizedError)) setError((err as Error).message); }
    finally { setBusy(false); }
  }

  async function viewRun(runId: number) {
    setBusy(true);
    try { setLast(await read(`${base}/runs/${runId}`)); setImported({}); }
    catch (err) { if (!(err instanceof UnauthorizedError)) setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Data exchange · {connection.provider}</DialogTitle>
        <DialogDescription>
          Run a provider-supported operation using your company’s authorized account. Reads are reviewed before importing.
          Writes require confirmation. This is manual exchange, not background synchronization.
        </DialogDescription>
      </DialogHeader>
      {loading ? <p className="text-sm">Loading provider operations…</p> : <>
        {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {actions.length === 0 ? <p className="text-sm text-muted-foreground">Authorization is available, but no supported exchange operations are configured for this tool yet.</p> : <>
          <div className="space-y-2">
            <Label>Operation</Label>
            <Select value={actionKey} onValueChange={key => { setActionKey(key); setFields({}); setLast(null); }}>
              <SelectTrigger><SelectValue placeholder="Choose what to read or send" /></SelectTrigger>
              <SelectContent>{actions.map(a => <SelectItem key={a.key} value={a.key}>{a.write ? "Send" : "Read"} · {a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {action?.write && <div className="space-y-2 rounded-md border p-3">
            <Label>Populate fields from a Proven Path record (optional)</Label>
            <Select onValueChange={fillFromSource}>
              <SelectTrigger><SelectValue placeholder="Choose a company record" /></SelectTrigger>
              <SelectContent>
                {sources.employees.map(s => <SelectItem key={`e${s.id}`} value={`employees:${s.id}`}>Employee · {s.name}</SelectItem>)}
                {sources.candidates.map(s => <SelectItem key={`c${s.id}`} value={`candidates:${s.id}`}>Candidate · {s.name}</SelectItem>)}
                {sources.meetings.map(s => <SelectItem key={`m${s.id}`} value={`meetings:${s.id}`}>Meeting note · {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Only matching fields are populated. Review every field and enter external tool IDs, not Proven Path IDs.</p>
          </div>}
          {action && <div className="space-y-4">
            {action.props.map(p => <div className="space-y-1" key={p.name}>
              <Label htmlFor={`exchange-${p.name}`}>{p.label}{p.optional ? " (optional)" : " *"}</Label>
              {p.type === "boolean" ? <select id={`exchange-${p.name}`} className="w-full rounded-md border p-2" value={fields[p.name] ?? ""}
                onChange={e => setFields(v => ({ ...v, [p.name]: e.target.value }))}>
                <option value="">Select…</option><option value="true">Yes</option><option value="false">No</option>
              </select> : p.type === "object" || p.type.endsWith("[]") || /note|comment|content/i.test(p.name) ?
                <textarea id={`exchange-${p.name}`} className="w-full min-h-24 rounded-md border p-2 text-sm" value={fields[p.name] ?? ""}
                  placeholder={p.type === "object" ? '{"field":"value"}' : p.type.endsWith("[]") ? '["value"]' : ""}
                  onChange={e => setFields(v => ({ ...v, [p.name]: e.target.value }))} /> :
                <Input id={`exchange-${p.name}`} type={p.type === "integer" ? "number" : "text"} value={fields[p.name] ?? ""}
                  onChange={e => setFields(v => ({ ...v, [p.name]: e.target.value }))} />}
              {p.description && <p className="text-xs text-muted-foreground break-words">{p.description}</p>}
            </div>)}
            <Button disabled={busy} onClick={runAction}>{busy ? "Working…" : action.write ? "Review and send to tool" : "Read from tool"}</Button>
            <p className="text-xs text-muted-foreground">
              Available operations depend on the tool’s API, your plan and granted permissions. Granola and some HRIS connections are read-only.
              Use page, offset, or cursor fields when available; a result is not a claim that your entire account has been imported.
            </p>
          </div>}
        </>}
        {last && <section className="space-y-3 border-t pt-4">
          <h3 className="font-medium">Result · {last.run.status}</h3>
          {last.run.message && <p className="text-sm">{last.run.message}</p>}
          {last.run.status === "succeeded" && last.run.direction === "inbound" && last.rows.length > 0 && <>
            <div className="space-y-2 rounded-md bg-slate-50 p-3">
              <p className="text-sm font-medium">Import reviewed records</p>
              {connection.category === "meeting" ? <><Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Employee who should receive the meeting note" /></SelectTrigger>
                <SelectContent>{sources.employees.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select><Label htmlFor="import-meeting-date">Meeting date (only if missing or incorrect at the provider)</Label>
                <Input id="import-meeting-date" type="date" value={defaults.meetingDate ?? ""}
                  onChange={e => setDefaults(v => ({ ...v, meetingDate: e.target.value }))} /></> : <>
                <p className="text-xs text-muted-foreground">Fill missing values below. Values entered here override provider values for the record you import. Existing employee and candidate matches use company email.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(connection.category === "hris" ? ["name","email","role","department","level","startDate"] : ["name","role"]).map(field =>
                    <div key={field}><Label htmlFor={`import-${field}`}>{field === "startDate" ? "Start date (YYYY-MM-DD)" : field}</Label>
                      <Input id={`import-${field}`} value={defaults[field] ?? ""} onChange={e => setDefaults(v => ({ ...v, [field]: e.target.value }))} /></div>)}
                </div>
              </>}
            </div>
            <div className="max-h-64 overflow-y-auto divide-y rounded-md border">
              {last.rows.map((row, index) => <div className="p-3 flex items-start justify-between gap-3" key={`${row.remoteId}:${index}`}>
                <div className="min-w-0 text-sm"><p className="font-medium">{row.name || row.title || row.remoteId || "Record without stable ID"}</p>
                  {row.email && <p className="text-muted-foreground">{row.email}</p>}
                  {row.summary && <p className="text-muted-foreground whitespace-pre-wrap">{row.summary.slice(0,350)}</p>}
                  <p className="text-xs text-muted-foreground">External ID: {row.remoteId ?? "unavailable"}</p>
                </div>
                <Button variant="outline" size="sm" disabled={busy || !row.remoteId || imported[`${last.run.id}:${index}`]}
                  onClick={() => importRow(index)}>{imported[`${last.run.id}:${index}`] ? "Imported" : "Import"}</Button>
              </div>)}
            </div>
          </>}
          <details><summary className="cursor-pointer text-sm">Provider response (first 30,000 characters)</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(last.run.result, null, 2)?.slice(0,30000)}</pre>
          </details>
        </section>}
        {runs.length > 0 && <section className="border-t pt-4 space-y-2">
          <h3 className="font-medium">Recent exchanges</h3>
          {runs.map(run => <div key={run.id} className="flex justify-between gap-3 text-sm">
            <span className="break-words">{run.actionKey} · {run.status}<span className="block text-xs text-muted-foreground">{new Date(run.createdAt).toLocaleString()}</span></span>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => viewRun(run.id)}>View result</Button>
          </div>)}
        </section>}
      </>}
    </DialogContent>
  </Dialog>;
}
