import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, UnauthorizedError, getApiUrl } from "@/lib/api";
import { CheckCircle2, Loader2, Plug, KeyRound, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getToken } from "@/lib/auth";

type IntegrationOption = { value: string; label: string };

interface Connection {
  id: number;
  category: string;
  provider: string;
  status: string;
  accountLabel: string | null;
  connectedAt: string;
}

interface IntegrationCardProps {
  category: string;
  title: string;
  description: string;
  options: IntegrationOption[];
  placeholder: string;
  labelPlaceholder: string;
  connection?: Connection;
  onChanged: () => void;
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function IntegrationCard({
  category,
  title,
  description,
  options,
  placeholder,
  labelPlaceholder,
  connection,
  onChanged,
}: IntegrationCardProps) {
  const [selected, setSelected] = useState("");
  const [accountLabel, setAccountLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const connectedOption = connection
    ? options.find((o) => o.value === connection.provider)
    : undefined;

  async function handleConnect() {
    if (!selected) {
      toast({ title: "Select a provider first", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch("/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, provider: selected, accountLabel: accountLabel.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Could not connect", description: data.message || "Please try again.", variant: "destructive" });
        return;
      }
      toast({
        title: "Connected",
        description: `${options.find((o) => o.value === selected)?.label} is now connected.`,
      });
      setSelected("");
      setAccountLabel("");
      onChanged();
    } catch (err) {
      if (err instanceof UnauthorizedError) return;
      toast({ title: "Could not connect", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    try {
      const res = await apiFetch("/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Could not disconnect", description: data.message || "Please try again.", variant: "destructive" });
        return;
      }
      toast({ title: "Disconnected", description: `${connectedOption?.label ?? "Integration"} has been disconnected.` });
      onChanged();
    } catch (err) {
      if (err instanceof UnauthorizedError) return;
      toast({ title: "Could not disconnect", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
          {connection && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <CheckCircle2 size={13} />
              Connected
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {connection ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <p className="font-medium text-foreground">{connectedOption?.label ?? connection.provider}</p>
              <p className="text-muted-foreground">
                {connection.accountLabel ? `${connection.accountLabel} · ` : ""}
                Connected {formatDate(connection.connectedAt)}
              </p>
            </div>
            <Button onClick={handleDisconnect} variant="outline" disabled={busy} className="shrink-0">
              {busy ? <Loader2 size={15} className="mr-1.5 animate-spin" /> : null}
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={accountLabel}
                onChange={(e) => setAccountLabel(e.target.value)}
                placeholder={labelPlaceholder}
                className="flex-1"
              />
            </div>
            <Button onClick={handleConnect} variant="outline" disabled={busy} className="self-start">
              {busy ? <Loader2 size={15} className="mr-1.5 animate-spin" /> : <Plug size={15} className="mr-1.5" />}
              Connect
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExportCard() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await apiFetch("/companies/me/export");
      if (!res.ok) {
        toast({ title: "Export not yet available", description: "Data export is on the roadmap.", variant: "default" });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "proven-path-export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof UnauthorizedError) return;
      toast({ title: "Coming Soon", description: "Data export is on the roadmap." });
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Export Data</CardTitle>
        <CardDescription className="text-sm">Download all company performance data as CSV for external analysis.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleExport} disabled={exporting} variant="outline">
          {exporting ? "Exporting..." : "Download CSV"}
        </Button>
      </CardContent>
    </Card>
  );
}

const HRIS_OPTIONS: IntegrationOption[] = [
  { value: "workday", label: "Workday" },
  { value: "bamboohr", label: "BambooHR" },
  { value: "adp", label: "ADP Workforce Now" },
  { value: "rippling", label: "Rippling" },
  { value: "gusto", label: "Gusto" },
];

const ATS_OPTIONS: IntegrationOption[] = [
  { value: "greenhouse", label: "Greenhouse" },
  { value: "lever", label: "Lever" },
  { value: "ashby", label: "Ashby" },
  { value: "icims", label: "iCIMS" },
];

const MEETING_OPTIONS: IntegrationOption[] = [
  { value: "fireflies", label: "Fireflies.ai" },
  { value: "granola", label: "Granola" },
  { value: "otter", label: "Otter.ai" },
  { value: "notion", label: "Notion" },
];

interface SyncKeyInfo {
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

function SyncKeyCard() {
  const { toast } = useToast();
  const [info, setInfo] = useState<SyncKeyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const endpoint = getApiUrl("/integrations/sync/employees");

  async function load() {
    try {
      const res = await apiFetch("/integrations/sync-key");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setInfo(data.syncKey ?? null);
    } catch (err) {
      if (err instanceof UnauthorizedError) return;
      toast({ title: "Could not load sync key", description: "Please refresh the page.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate(rotate: boolean) {
    setWorking(true);
    try {
      const res = await apiFetch("/integrations/sync-key", { method: "POST" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setRevealedKey(data.key);
      await load();
      toast({ title: rotate ? "Sync key rotated" : "Sync key generated", description: "Copy it now — it won't be shown again." });
    } catch (err) {
      if (err instanceof UnauthorizedError) return;
      toast({ title: "Could not generate key", description: "Please try again.", variant: "destructive" });
    } finally {
      setWorking(false);
    }
  }

  async function revoke() {
    if (!window.confirm("Revoke this sync key? Any HRIS/ATS system using it will stop being able to push updates.")) return;
    setWorking(true);
    try {
      const res = await apiFetch("/integrations/sync-key", { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      setRevealedKey(null);
      setInfo(null);
      toast({ title: "Sync key revoked" });
    } catch (err) {
      if (err instanceof UnauthorizedError) return;
      toast({ title: "Could not revoke key", description: "Please try again.", variant: "destructive" });
    } finally {
      setWorking(false);
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard?.writeText(text).then(
      () => toast({ title: `${label} copied` }),
      () => toast({ title: "Copy failed", description: "Copy it manually.", variant: "destructive" }),
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-muted-foreground" />
          <CardTitle className="text-base">Automated Employee Sync</CardTitle>
        </div>
        <CardDescription className="text-sm">
          Generate a secure key so your HRIS/ATS (or a tool like Merge or Finch) can push employee updates to Proven Path automatically. Records are matched and updated by email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Endpoint (HTTP POST)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted px-3 py-2 rounded break-all">{endpoint}</code>
            <Button type="button" variant="outline" size="sm" onClick={() => copy(endpoint, "Endpoint URL")}>
              <Copy size={14} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Send the key as <code className="text-[11px]">Authorization: Bearer &lt;key&gt;</code> with a JSON body:{" "}
            <code className="text-[11px]">{`{ "employees": [{ "email": "...", "name": "...", "role": "...", "department": "...", "level": "...", "startDate": "YYYY-MM-DD", "managerEmail": "..." }] }`}</code>
          </p>
        </div>

        {revealedKey && (
          <div className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-800">Your new sync key — copy it now, it won't be shown again:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white px-3 py-2 rounded break-all border">{revealedKey}</code>
              <Button type="button" variant="outline" size="sm" onClick={() => copy(revealedKey, "Sync key")}>
                <Copy size={14} />
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> Loading...
          </div>
        ) : info ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 size={16} className="text-green-600" />
              <span>
                Active key <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{info.keyPrefix}…</code>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Created {formatDate(info.createdAt)} · {info.lastUsedAt ? `Last used ${formatDate(info.lastUsedAt)}` : "Not used yet"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" disabled={working} onClick={() => generate(true)}>
                {working ? "Working..." : "Rotate key"}
              </Button>
              <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={working} onClick={revoke}>
                Revoke
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" disabled={working} onClick={() => generate(false)}>
            {working ? "Generating..." : "Generate sync key"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  userRole: string;
}

interface Invitation {
  id: number;
  email: string;
  userRole: string;
  status: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
}

const ACCESS_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Manager",
  employee: "Team Member",
};

function accessBadgeClass(role: string): string {
  if (role === "admin") return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (role === "manager") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-muted text-muted-foreground";
}

function inviteStatusClass(status: string): string {
  if (status === "accepted") return "bg-green-50 text-green-700 border-green-200";
  if (status === "expired") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "revoked") return "bg-red-50 text-red-700 border-red-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

function TeamCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members = [], isLoading: membersLoading } = useQuery<TeamMember[]>({
    queryKey: ["team-members"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/employees"), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load team");
      return res.json();
    },
  });

  const { data: invitations = [], isLoading: invitesLoading } = useQuery<Invitation[]>({
    queryKey: ["invitations"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/invitations"), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load invitations");
      return res.json();
    },
  });

  const { mutate: revoke, isPending: revoking } = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(getApiUrl(`/invitations/${id}`), { method: "DELETE", headers: authHeaders() });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to revoke invitation");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast({ title: "Invitation revoked" });
    },
    onError: (err: Error) => toast({ title: "Could not revoke", description: err.message, variant: "destructive" }),
  });

  const pendingInvites = invitations.filter(i => i.status === "pending");
  const otherInvites = invitations.filter(i => i.status !== "pending");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Team members</CardTitle>
        <CardDescription className="text-sm">
          People with access to your organization, and pending invitations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Members ({members.length})
          </h3>
          {membersLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
              <Loader2 size={14} className="animate-spin" /> Loading members...
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No members yet.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {members.map(m => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 ${accessBadgeClass(m.userRole)}`}>
                    {ACCESS_LABELS[m.userRole] || m.userRole}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Pending invitations ({pendingInvites.length})
          </h3>
          {invitesLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
              <Loader2 size={14} className="animate-spin" /> Loading invitations...
            </div>
          ) : pendingInvites.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No pending invitations. Invite people from the Employees page.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {pendingInvites.map(inv => (
                <li key={inv.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{inv.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {ACCESS_LABELS[inv.userRole] || inv.userRole}
                      {inv.expiresAt && ` · expires ${formatDate(inv.expiresAt)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-xs ${inviteStatusClass(inv.status)}`}>Pending</Badge>
                    <Button variant="ghost" size="sm" disabled={revoking} onClick={() => revoke(inv.id)}>
                      Revoke
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {otherInvites.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              History
            </h3>
            <ul className="divide-y rounded-md border">
              {otherInvites.map(inv => (
                <li key={inv.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{inv.email}</div>
                    <div className="text-xs text-muted-foreground">{ACCESS_LABELS[inv.userRole] || inv.userRole}</div>
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 capitalize ${inviteStatusClass(inv.status)}`}>
                    {inv.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  async function loadConnections() {
    try {
      const res = await apiFetch("/integrations");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setConnections(Array.isArray(data.connections) ? data.connections : []);
    } catch (err) {
      if (err instanceof UnauthorizedError) return;
      toast({ title: "Could not load integrations", description: "Please refresh the page.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byCategory = (category: string) => connections.find((c) => c.category === category);

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <div data-onboarding="settings-header">
          <h1 className="text-2xl font-bold">Integrations & Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Connect Proven Path to your existing HR and talent tools.</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 size={16} className="animate-spin" />
            Loading integrations...
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Organization</h2>
              <TeamCard />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">HR Information Systems</h2>
              <IntegrationCard
                category="hris"
                title="HRIS Integration"
                description="Sync employee records and org structure automatically."
                options={HRIS_OPTIONS}
                placeholder="Select HRIS provider..."
                labelPlaceholder="Account or workspace (optional)"
                connection={byCategory("hris")}
                onChanged={loadConnections}
              />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Applicant Tracking</h2>
              <IntegrationCard
                category="ats"
                title="ATS Integration"
                description="Pull candidate profiles and hiring pipeline data."
                options={ATS_OPTIONS}
                placeholder="Select ATS provider..."
                labelPlaceholder="Account or workspace (optional)"
                connection={byCategory("ats")}
                onChanged={loadConnections}
              />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Automated Sync</h2>
              <SyncKeyCard />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Meeting & Coaching Tools</h2>
              <IntegrationCard
                category="meeting"
                title="Meeting Intelligence"
                description="Auto-import 1:1 notes and action items from your meeting tool."
                options={MEETING_OPTIONS}
                placeholder="Select meeting tool..."
                labelPlaceholder="Account or workspace (optional)"
                connection={byCategory("meeting")}
                onChanged={loadConnections}
              />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Data & Reporting</h2>
              <ExportCard />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
