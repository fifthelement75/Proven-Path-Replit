import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, UnauthorizedError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CalendarClock, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import type {
  IntegrationSyncStatus, IntegrationSyncConfig, IntegrationSyncCommand, IntegrationSyncField,
  ProviderAction, ExchangeDetails, IntegrationConnection,
} from "@workspace/api-client-react";

const LOCAL_FIELDS: Record<string, string[]> = {
  hris: ["name", "email", "role", "department", "level", "startDate"],
  ats: ["name", "email", "role"],
};
const FIELD_LABEL: Record<string, string> = {
  name: "Name", email: "Email", role: "Role", department: "Department", level: "Level", startDate: "Start date", remoteId: "Remote ID",
};
type PaginationMode = "single" | "page" | "offset" | "cursor";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "The sync request failed.");
  return data as T;
}

function when(v?: string | null) {
  if (!v) return "Never";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "Unknown" : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v : typeof v === "number" || typeof v === "boolean" ? String(v) : JSON.stringify(v);
}

export function useIntegrationSyncStatus(id: number, enabled = true) {
  return useQuery({
    queryKey: ["integration-sync", id],
    queryFn: () => call<IntegrationSyncStatus>(`/integrations/sync/${id}`),
    refetchInterval: 15000, retry: false, enabled,
  });
}

/** Compact inline status shown on each HRIS/ATS connection row in Settings. */
export function IntegrationSyncSummary({ connection, onOpen }: { connection: IntegrationConnection; onOpen: () => void }) {
  const status = useIntegrationSyncStatus(connection.id);
  const s = status.data;
  const pending = (s?.writes ?? []).filter(w => w.status === "needs_review" || w.status === "dispatched").length;
  return (
    <div data-testid={`status-sync-${connection.id}`} className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {status.isLoading ? <span className="text-muted-foreground">Checking automatic sync…</span>
        : status.isError ? <span className="text-red-700">Sync status unavailable: {(status.error as Error).message}</span>
        : <>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${s?.enabled ? "bg-teal-50 text-teal-800 ring-teal-200" : "bg-slate-50 text-slate-600 ring-slate-200"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${s?.enabled ? "bg-teal-600" : "bg-slate-400"}`} />
            Auto sync {s?.enabled ? "on" : "off"}
          </span>
          <span className="text-muted-foreground">Last {when(s?.lastSyncAt)}</span>
          {s?.enabled && <span className="text-muted-foreground">Next {when(s?.nextSyncAt)}</span>}
          {(s?.issues?.length ?? 0) > 0 && <span className="text-amber-800">{s!.issues!.length} issue{s!.issues!.length === 1 ? "" : "s"}</span>}
          {pending > 0 && <span className="text-amber-800">{pending} write{pending === 1 ? "" : "s"} to reconcile</span>}
        </>}
      <button type="button" data-testid={`button-configure-sync-${connection.id}`} onClick={onOpen}
        className="font-medium text-primary underline-offset-2 hover:underline">Configure sync</button>
    </div>
  );
}

type SyncCommandBody = IntegrationSyncCommand;
type PreviewRow = { remoteId?: string | null; values?: Record<string, unknown>; ownership?: Record<string, string>; error?: string };

type FieldDraft = { source: string; owner: "provider" | "local" };

export function IntegrationSync({ connection, onClose }: { connection: IntegrationConnection; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const category = connection.category === "ats" ? "ats" : "hris";
  const localFields = LOCAL_FIELDS[category];
  const verified = connection.status === "connected";
  const status = useIntegrationSyncStatus(connection.id);
  const exchange = useQuery({
    queryKey: ["integration-exchange-actions", connection.id],
    queryFn: () => call<ExchangeDetails>(`/integrations/exchange/${connection.id}`),
    enabled: verified, retry: false,
  });
  const reads = (exchange.data?.actions ?? []).filter(a => !a.write);
  // Automatic sync only offers stable-record updates. Creating candidates or
  // appending notes remains a separately confirmed manual Data exchange.
  const automaticKeys: Record<string, string> = { bamboohr: "bamboohr-update-employee", workday: "workday-change-business-title" };
  const writes = (exchange.data?.actions ?? []).filter(a => a.write && a.key === automaticKeys[connection.provider]);

  const [actionKey, setActionKey] = useState("");
  const [props, setProps] = useState("{}");
  const [fields, setFields] = useState<Record<string, FieldDraft>>({});
  const [interval, setIntervalMin] = useState("60");
  const [mode, setMode] = useState<PaginationMode>("single");
  const [pageProp, setPageProp] = useState("");
  const [nextPath, setNextPath] = useState("");
  const [pageSize, setPageSize] = useState("");
  const [updatedAtPath, setUpdatedAtPath] = useState("");
  const [updatedSinceProp, setUpdatedSinceProp] = useState("");
  const [outKey, setOutKey] = useState("");
  const [outProps, setOutProps] = useState("{}");
  const [outFields, setOutFields] = useState<Record<string, string>>({});
  const [outApproved, setOutApproved] = useState(false);
  const [preview, setPreview] = useState<{ id: string; rows: PreviewRow[]; config: IntegrationSyncConfig; draft: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [initFor, setInitFor] = useState<number | null>(null);

  // Prefill from saved config once.
  useEffect(() => {
    const c = status.data?.config;
    if (!status.data || initFor === connection.id) return;
    setInitFor(connection.id);
    if (!c) return;
    setActionKey(c.actionKey); setProps(JSON.stringify(c.props ?? {}, null, 2));
    setFields(Object.fromEntries(Object.entries(c.fields ?? {}).map(([k, f]) => [k, { source: f.source, owner: f.owner }])));
    setIntervalMin(String(c.intervalMinutes)); setMode(c.pagination.mode);
    setPageProp(c.pagination.prop ?? ""); setNextPath(c.pagination.nextPath ?? ""); setPageSize(c.pagination.pageSize ? String(c.pagination.pageSize) : "");
    setUpdatedAtPath(c.updatedAtPath ?? "");
    setUpdatedSinceProp(c.updatedSinceProp ?? "");
    if (c.outbound) { setOutKey(c.outbound.actionKey); setOutProps(JSON.stringify(c.outbound.props ?? {}, null, 2)); setOutFields(c.outbound.fields ?? {}); }
  }, [status.data, initFor, connection.id]);

  const draft = JSON.stringify([actionKey, props, fields, interval, mode, pageProp, nextPath, pageSize, updatedAtPath, updatedSinceProp, outKey, outProps, outFields]);
  // Any edit after previewing invalidates the reviewed draft.
  useEffect(() => {
    if (preview && preview.draft !== draft) { setPreview(null); setOutApproved(false); }
  }, [draft, preview]);

  const action: ProviderAction | undefined = reads.find(a => a.key === actionKey);
  const outAction: ProviderAction | undefined = writes.find(a => a.key === outKey);
  const localOwned = useMemo(() => localFields.filter(f => fields[f]?.source && fields[f].owner === "local"), [fields, localFields]);

  function buildConfig(): IntegrationSyncConfig {
    if (!actionKey) throw new Error("Choose a read operation.");
    let parsedProps: Record<string, unknown>; let parsedOut: Record<string, unknown>;
    try { parsedProps = JSON.parse(props || "{}"); } catch { throw new Error("Read operation props must be valid JSON."); }
    const mapped: Record<string, IntegrationSyncField> = {};
    for (const f of localFields) if (fields[f]?.source.trim()) mapped[f] = { source: fields[f].source.trim(), owner: fields[f].owner };
        const minutes = Number(interval);
    if (!Number.isInteger(minutes) || minutes < 15 || minutes > 1440) throw new Error("Interval must be a whole number between 15 and 1440 minutes.");
    const pagination: IntegrationSyncConfig["pagination"] = { mode };
    if (mode !== "single") {
      if (pageProp.trim()) pagination.prop = pageProp.trim();
      if (nextPath.trim()) pagination.nextPath = nextPath.trim();
      if (pageSize) { const n = Number(pageSize); if (!Number.isInteger(n) || n < 1 || n > 250) throw new Error("Page size must be 1 to 250."); pagination.pageSize = n; }
    }
    const config: IntegrationSyncConfig = { actionKey, props: parsedProps, fields: mapped, intervalMinutes: minutes, pagination };
    if (updatedAtPath.trim()) config.updatedAtPath = updatedAtPath.trim();
    if (updatedSinceProp.trim()) config.updatedSinceProp = updatedSinceProp.trim();
    if (outKey) {
      try { parsedOut = JSON.parse(outProps || "{}"); } catch { throw new Error("Outbound props must be valid JSON."); }
      const of = Object.fromEntries(Object.entries(outFields).filter(([, v]) => v));
      for (const v of Object.values(of)) if (v !== "remoteId" && !localOwned.includes(v)) throw new Error(`Only Proven Path-owned fields can be sent outbound. "${v}" is provider-owned or unmapped.`);
      if (Object.keys(of).length === 0) throw new Error("Map at least one outbound field, or remove the outbound operation.");
      config.outbound = { actionKey: outKey, props: parsedOut, fields: of };
    }
    return config;
  }

  async function command(body: SyncCommandBody, label: string) {
    setBusy(label); setError("");
    try {
      const data = await call<IntegrationSyncStatus>(`/integrations/sync/${connection.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      qc.setQueryData(["integration-sync", connection.id], (old: IntegrationSyncStatus | undefined) => ({ ...(old ?? {}), ...data }));
      await qc.invalidateQueries({ queryKey: ["integration-sync", connection.id] });
      return data;
    } catch (err) {
      if (!(err instanceof UnauthorizedError)) setError((err as Error).message);
      return null;
    } finally { setBusy(null); }
  }

  async function runPreview() {
    let config: IntegrationSyncConfig;
    try { config = buildConfig(); } catch (e) { setError((e as Error).message); return; }
    setOutApproved(false);
    const data = await command({ command: "preview", config }, "preview");
    if (data?.previewId) setPreview({ id: data.previewId, rows: (data.preview ?? []) as PreviewRow[], config, draft });
    else if (data) setError("The provider returned no preview to approve. Nothing was enabled.");
  }
  async function approve() {
    if (!preview) return;
    if (preview.config.outbound && !outApproved) { setError("Confirm the outbound write approval, or remove the outbound operation and preview again."); return; }
    if (!window.confirm(`Enable automatic sync every ${preview.config.intervalMinutes} minutes using exactly the reviewed configuration?`)) return;
    const data = await command({ command: "approve", previewId: preview.id, ...(preview.config.outbound ? { confirmOutbound: true } : {}) }, "approve");
    if (data) { setPreview(null); toast({ title: "Automatic sync enabled", description: "The approved configuration is now scheduled." }); }
  }
  async function disable() {
    if (!window.confirm("Disable automatic sync? Already-imported records stay in Proven Path.")) return;
    if (await command({ command: "disable" }, "disable")) toast({ title: "Automatic sync disabled" });
  }
  async function runNow() {
    if (await command({ command: "run" }, "run")) toast({ title: "Sync started", description: "Status refreshes every 15 seconds." });
  }
  async function reconcile(writeId: number, resolution: "applied" | "not_applied") {
    const msg = resolution === "applied"
      ? "Confirm you checked the provider and this change IS present there."
      : "Confirm you checked the provider and this change is NOT present. This write will not be retried automatically.";
    if (!window.confirm(msg)) return;
    if (await command({ command: "reconcile", writeId, resolution }, `rec-${writeId}`)) toast({ title: "Write reconciled" });
  }

  const s = status.data;
  const pendingWrites = (s?.writes ?? []).filter(w => w.status === "needs_review" || w.status === "dispatched");
  const sel = "w-full rounded-md border bg-background p-2 text-sm";

  return <Dialog open onOpenChange={o => { if (!o && !busy) onClose(); }}>
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Automatic sync · {connection.provider}</DialogTitle>
        <DialogDescription>
          Opt-in scheduled import of {category === "hris" ? "employees" : "candidates"} using an operation you choose and review. Each field has one owner; there is no general two-way sync. Manual Data exchange remains available.
        </DialogDescription>
      </DialogHeader>

      {error && <div role="alert" data-testid="text-sync-error" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {/* Status */}
      <section className="rounded-lg border bg-slate-50/70 p-4 space-y-3">
        {status.isLoading ? <div className="space-y-2"><div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" /><div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" /></div>
          : status.isError ? <div className="flex items-center justify-between gap-3 text-sm text-red-800"><span>{(status.error as Error).message}</span><Button size="sm" variant="outline" onClick={() => status.refetch()}>Retry</Button></div>
          : <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${s?.enabled ? "bg-teal-600" : "bg-slate-400"}`} />
                <span className="font-medium" data-testid="status-sync-enabled">{s?.enabled ? "Enabled" : "Disabled"}</span>
                {status.isFetching && <RefreshCw size={12} className="animate-spin text-muted-foreground" />}
              </div>
              <div className="flex gap-2">
                {s?.enabled && <Button size="sm" variant="outline" data-testid="button-sync-run" disabled={!!busy || !verified} onClick={runNow}>
                  {busy === "run" ? <Loader2 size={14} className="mr-1 animate-spin" /> : <RefreshCw size={14} className="mr-1" />}Run now</Button>}
                {s?.enabled && <Button size="sm" variant="ghost" data-testid="button-sync-disable" className="text-destructive" disabled={!!busy} onClick={disable}>Disable</Button>}
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
              <div><dt className="text-muted-foreground">Last sync</dt><dd data-testid="text-sync-last">{when(s?.lastSyncAt)}</dd></div>
              <div><dt className="text-muted-foreground">Next sync</dt><dd data-testid="text-sync-next">{s?.enabled ? when(s?.nextSyncAt) : "Not scheduled"}</dd></div>
              <div><dt className="text-muted-foreground">Interval</dt><dd>{s?.config ? `${s.config.intervalMinutes} min` : "Not configured"}</dd></div>
            </dl>
            {s?.message && <p className="text-sm">{s.message}</p>}
            {!verified && <p className="text-xs text-amber-800">This account is not verified ({connection.status}). Previews and runs are unavailable; you can still disable sync.</p>}
          </>}
      </section>

      {/* Issues */}
      {(s?.issues?.length ?? 0) > 0 && <section className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-medium"><AlertTriangle size={14} className="text-amber-700" />Issues</h3>
        <div className="max-h-48 divide-y overflow-y-auto rounded-md border text-sm">
          {s!.issues!.map((i, idx) => <div key={idx} data-testid={`row-sync-issue-${idx}`} className="p-2.5">
            <p>{str(i.message) || "Unspecified issue"}</p>
            <p className="text-xs text-muted-foreground">External ID: {str(i.remoteId) || "unavailable"}{i.createdAt ? ` · ${when(str(i.createdAt))}` : ""}</p>
          </div>)}
        </div>
        <p className="text-xs text-muted-foreground">Existing records whose values differ from the provider are held as conflicts and are not overwritten. Resolve them through Data exchange, then the next sync proceeds.</p>
      </section>}

      {/* Write ledger */}
      {(s?.writes?.length ?? 0) > 0 && <section className="space-y-2">
        <h3 className="text-sm font-medium">Outbound write ledger</h3>
        <div className="max-h-56 divide-y overflow-y-auto rounded-md border text-sm">
          {s!.writes!.map((w, idx) => { const id = Number(w.id); const open = w.status === "needs_review" || w.status === "dispatched";
            return <div key={idx} data-testid={`row-sync-write-${idx}`} className="flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><p className="font-medium">{str(w.status)}{w.field ? ` · ${str(w.field)}` : ""}</p>
                <p className="text-xs text-muted-foreground break-words">External ID: {str(w.remoteId) || "unavailable"}{w.message ? ` · ${str(w.message)}` : ""}</p></div>
              {open && Number.isFinite(id) && <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => reconcile(id, "applied")}>Applied at provider</Button>
                <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => reconcile(id, "not_applied")}>Not applied</Button>
              </div>}
            </div>; })}
        </div>
        {pendingWrites.length > 0 && <p className="text-xs text-muted-foreground">Writes whose outcome is uncertain are never retried automatically. Check the record in {connection.provider}, then mark it. Marking “Not applied” closes it without resending.</p>}
      </section>}

      {/* Config */}
      <section className="space-y-4 border-t pt-4">
        <h3 className="font-medium">{s?.config ? "Change configuration" : "Configure"}</h3>
        {!verified ? <p className="text-sm text-muted-foreground">Reauthorize this connection before previewing a sync configuration.</p>
          : exchange.isLoading ? <p className="text-sm text-muted-foreground">Loading provider operations…</p>
          : exchange.isError ? <p className="text-sm text-red-700">{(exchange.error as Error).message}</p>
          : reads.length === 0 ? <p className="text-sm text-muted-foreground">This provider has no supported read operation for automatic sync. Use Data exchange for what it does support.</p>
          : <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="sync-action">Read operation</Label>
              <select id="sync-action" data-testid="select-sync-action" className={sel} value={actionKey} onChange={e => { setActionKey(e.target.value); setPreview(null); }}>
                <option value="">Choose…</option>{reads.map(a => <option key={a.key} value={a.key}>{a.name}</option>)}
              </select></div>
            <div className="space-y-1"><Label htmlFor="sync-interval">Interval (minutes, 15–1440)</Label>
              <Input id="sync-interval" data-testid="input-sync-interval" type="number" min={15} max={1440} value={interval} onChange={e => setIntervalMin(e.target.value)} /></div>
          </div>
          {action && <div className="space-y-1"><Label htmlFor="sync-props">Operation props (JSON)</Label>
            <textarea id="sync-props" className="min-h-20 w-full rounded-md border p-2 font-mono text-xs" value={props} onChange={e => setProps(e.target.value)} />
            <p className="text-xs text-muted-foreground">Accepts: {action.props.map(p => `${p.name}${p.optional ? "" : "*"} (${p.type})`).join(", ") || "none"}</p></div>}

          <div className="space-y-2">
            <Label>Field mapping and ownership</Label>
            <p className="text-xs text-muted-foreground">Source is a dotted provider path (e.g. <code>work.title</code>) or a normalized field such as <code>$name</code>. Provider-owned fields are imported; Proven Path-owned fields are never overwritten and may be sent outbound. Leave blank to skip; no defaults are invented.</p>
            <p className="text-xs text-muted-foreground" data-testid="text-sync-email-rule">{category === "hris"
              ? "Email is required to create new employees. Rows without a mapped email can only update employees already linked to the provider record; others are reported as issues."
              : "Email is optional for candidates. Records are deduplicated by the provider's stable remote ID."}</p>
            <div className="divide-y rounded-md border">
              {localFields.map(f => <div key={f} className="grid grid-cols-1 items-center gap-2 p-2 sm:grid-cols-[120px_1fr_150px]">
                <span className="text-sm font-medium">{FIELD_LABEL[f]}</span>
                <Input data-testid={`input-sync-field-${f}`} placeholder={`$${f}`} value={fields[f]?.source ?? ""}
                  onChange={e => setFields(v => ({ ...v, [f]: { source: e.target.value, owner: v[f]?.owner ?? "provider" } }))} />
                <select data-testid={`select-sync-owner-${f}`} className={sel} value={fields[f]?.owner ?? "provider"}
                  onChange={e => setFields(v => ({ ...v, [f]: { source: v[f]?.source ?? "", owner: e.target.value as FieldDraft["owner"] } }))}>
                  <option value="provider">Provider owns</option><option value="local">Proven Path owns</option>
                </select>
              </div>)}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="sync-mode">Pagination</Label>
              <select id="sync-mode" className={sel} value={mode} onChange={e => setMode(e.target.value as PaginationMode)}>
                <option value="single">Single request</option><option value="page">Page number</option><option value="offset">Offset</option><option value="cursor">Cursor</option>
              </select></div>
            <div className="space-y-1"><Label htmlFor="sync-updated">Updated-at path (optional)</Label>
              <Input id="sync-updated" placeholder="updated_at" value={updatedAtPath} onChange={e => setUpdatedAtPath(e.target.value)} />
              <Label htmlFor="sync-since">Provider updated-since input (optional)</Label>
              <Input id="sync-since" placeholder="updatedAfter" value={updatedSinceProp} onChange={e => setUpdatedSinceProp(e.target.value)} />
              <p className="text-xs text-muted-foreground">If the read operation supports it, send the last completed timestamp as ISO 8601. Otherwise, pages are scanned and unchanged records are filtered locally.</p>
              <p className="text-xs text-muted-foreground">Enables incremental high-water filtering. Without it every run reads the full result.</p></div>
            {mode !== "single" && <>
              <div className="space-y-1"><Label htmlFor="sync-pprop">Page/offset/cursor prop</Label><Input id="sync-pprop" value={pageProp} onChange={e => setPageProp(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="sync-psize">Page size (1–250)</Label><Input id="sync-psize" type="number" value={pageSize} onChange={e => setPageSize(e.target.value)} /></div>
              {mode === "cursor" && <div className="space-y-1 sm:col-span-2"><Label htmlFor="sync-next">Next cursor path</Label><Input id="sync-next" placeholder="meta.next_cursor" value={nextPath} onChange={e => setNextPath(e.target.value)} /></div>}
            </>}
          </div>

          <details className="rounded-md border p-3" open={!!outKey}>
            <summary className="cursor-pointer text-sm font-medium">Outbound updates (optional)</summary>
            <div className="mt-3 space-y-3">
              <p className="text-xs text-muted-foreground">Only verified updates targeting an existing remote record can be scheduled. Create-candidate and append-note operations remain in manually confirmed Data exchange.</p>
              {writes.length === 0 ? <p className="text-sm text-muted-foreground">This provider has no verified automatic update operation. Sync is import-only.</p> : <>
                <select data-testid="select-sync-outbound" className={sel} value={outKey} onChange={e => { setOutKey(e.target.value); setOutFields({}); setPreview(null); }}>
                  <option value="">No outbound writes</option>{writes.map(a => <option key={a.key} value={a.key}>{a.name}</option>)}
                </select>
                {outAction && <>
                  <textarea aria-label="Outbound props" className="min-h-16 w-full rounded-md border p-2 font-mono text-xs" value={outProps} onChange={e => setOutProps(e.target.value)} />
                  {localOwned.length === 0 && <p className="text-xs text-amber-800">Mark at least one mapped field as Proven Path-owned to send it.</p>}
                  <div className="divide-y rounded-md border">
                    {outAction.props.map(p => <div key={p.name} className="grid grid-cols-1 items-center gap-2 p-2 sm:grid-cols-2">
                      <span className="text-sm">{p.label}{p.optional ? "" : " *"}</span>
                      <select className={sel} value={outFields[p.name] ?? ""} onChange={e => setOutFields(v => ({ ...v, [p.name]: e.target.value }))}>
                        <option value="">Not mapped</option><option value="remoteId">Remote ID</option>
                        {localOwned.map(f => <option key={f} value={f}>{FIELD_LABEL[f]}</option>)}
                      </select>
                    </div>)}
                  </div>
                </>}
              </>}
            </div>
          </details>

          <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">
            On the first sync, existing Proven Path records whose values differ from the provider are reported as conflicts and left unchanged until you reconcile them manually via Data exchange. Records missing required values are reported, not filled with placeholders.
          </div>

          <Button data-testid="button-sync-preview" disabled={!!busy || !actionKey} onClick={runPreview}>
            {busy === "preview" && <Loader2 size={14} className="mr-1 animate-spin" />}Preview provider data</Button>
        </>}
      </section>

      {preview && <section className="space-y-3 border-t pt-4">
        <h3 className="flex items-center gap-1.5 font-medium"><ShieldCheck size={16} className="text-teal-700" />Review before enabling</h3>
        {preview.rows.length === 0 ? <p className="text-sm text-muted-foreground">The provider returned no rows for this configuration.</p> :
          <div className="max-h-64 overflow-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-100"><tr>{["remoteId", ...Object.keys(preview.config.fields)].map(k =>
                <th key={k} className="p-2 text-left font-medium">{FIELD_LABEL[k] ?? k}{preview.config.fields[k] ? <span className="block font-normal text-muted-foreground">{preview.config.fields[k].owner === "local" ? "Proven Path owns" : "Provider owns"}</span> : null}</th>)}</tr></thead>
              <tbody className="divide-y">{preview.rows.slice(0, 50).map((r, i) => r.error
                ? <tr key={i} data-testid={`row-sync-preview-${i}`} className="bg-red-50/60">
                    <td className="p-2 align-top">{str(r.remoteId) || <span className="text-muted-foreground">unavailable</span>}</td>
                    <td colSpan={Object.keys(preview.config.fields).length || 1} className="p-2 text-red-800" data-testid={`text-sync-preview-error-${i}`}>{r.error}</td>
                  </tr>
                : <tr key={i} data-testid={`row-sync-preview-${i}`}>
                    <td className="p-2 align-top break-words">{str(r.remoteId) || <span className="text-muted-foreground">missing</span>}</td>
                    {Object.keys(preview.config.fields).map(k => <td key={k} className="p-2 align-top break-words">
                      {str(r.values?.[k]) || <span className="text-muted-foreground">missing</span>}
                      {r.ownership?.[k] && r.ownership[k] !== preview.config.fields[k].owner && <span className="block text-[10px] text-muted-foreground">{r.ownership[k]}</span>}
                    </td>)}
                  </tr>)}</tbody>
            </table>
          </div>}
        {preview.config.outbound && <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" data-testid="checkbox-sync-outbound-approve" className="mt-1" checked={outApproved} onChange={e => setOutApproved(e.target.checked)} />
          <span>I approve sending {Object.values(preview.config.outbound.fields).map(f => FIELD_LABEL[f] ?? f).join(", ")} to {connection.provider} via “{writes.find(w => w.key === preview.config.outbound!.actionKey)?.name ?? preview.config.outbound.actionKey}”. This changes data in that tool.</span>
        </label>}
        <div className="flex flex-wrap items-center gap-2">
          <Button data-testid="button-sync-approve" disabled={!!busy} onClick={approve}>
            {busy === "approve" ? <Loader2 size={14} className="mr-1 animate-spin" /> : <CalendarClock size={14} className="mr-1" />}Approve and enable</Button>
          <Button variant="ghost" onClick={() => setPreview(null)}>Discard preview</Button>
          <span className="text-xs text-muted-foreground">Approval applies to exactly this reviewed draft. Editing the form requires a new preview.</span>
        </div>
      </section>}

      {(s?.runs?.length ?? 0) > 0 && <section className="space-y-1 border-t pt-4">
        <h3 className="text-sm font-medium">Recent sync runs</h3>
        {s!.runs!.slice(0, 10).map((r, i) => <p key={i} className="text-xs text-muted-foreground">
          {when(str(r.createdAt ?? r.startedAt))} · <span className="text-foreground">{str(r.status)}</span>{r.message ? ` · ${str(r.message)}` : ""}
        </p>)}
      </section>}
    </DialogContent>
  </Dialog>;
}
