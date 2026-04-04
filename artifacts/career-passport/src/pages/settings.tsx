import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";
import { getToken } from "@/lib/auth";

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface IntegrationCardProps {
  title: string;
  description: string;
  options: { value: string; label: string }[];
  placeholder: string;
}

function IntegrationCard({ title, description, options, placeholder }: IntegrationCardProps) {
  const [selected, setSelected] = useState("");
  const { toast } = useToast();

  function handleConnect() {
    if (!selected) {
      toast({ title: "Select a provider first", variant: "destructive" });
      return;
    }
    toast({
      title: "Coming Soon",
      description: `${options.find(o => o.value === selected)?.label} integration is on the roadmap.`,
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleConnect} variant="outline">Connect</Button>
        </div>
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
      const res = await fetch(getApiUrl("/companies/me/export"), {
        headers: authHeaders(),
      });
      if (!res.ok) {
        toast({ title: "Export not yet available", description: "Data export is on the roadmap.", variant: "default" });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "career-passport-export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
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

export default function SettingsPage() {
  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">Integrations & Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Connect Career Passport to your existing HR and talent tools.</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">HR Information Systems</h2>
          <IntegrationCard
            title="HRIS Integration"
            description="Sync employee records and org structure automatically."
            options={[
              { value: "workday", label: "Workday" },
              { value: "bamboohr", label: "BambooHR" },
              { value: "adp", label: "ADP Workforce Now" },
              { value: "rippling", label: "Rippling" },
              { value: "gusto", label: "Gusto" },
            ]}
            placeholder="Select HRIS provider..."
          />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Applicant Tracking</h2>
          <IntegrationCard
            title="ATS Integration"
            description="Pull candidate profiles and hiring pipeline data."
            options={[
              { value: "greenhouse", label: "Greenhouse" },
              { value: "lever", label: "Lever" },
              { value: "ashby", label: "Ashby" },
              { value: "icims", label: "iCIMS" },
            ]}
            placeholder="Select ATS provider..."
          />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Meeting & Coaching Tools</h2>
          <IntegrationCard
            title="Meeting Intelligence"
            description="Auto-import 1:1 notes and action items from your meeting tool."
            options={[
              { value: "fireflies", label: "Fireflies.ai" },
              { value: "granola", label: "Granola" },
              { value: "otter", label: "Otter.ai" },
              { value: "notion", label: "Notion" },
            ]}
            placeholder="Select meeting tool..."
          />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Data & Reporting</h2>
          <ExportCard />
        </div>
      </div>
    </Layout>
  );
}
