import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, UnauthorizedError } from "@/lib/api";
import { CheckCircle2, Loader2, Plug } from "lucide-react";

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
