import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, UnauthorizedError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { CustomerCredentialInput } from "@workspace/api-client-react";

export function CustomerCredentialDialog({ provider, label, requirements, onClose, onConnected }: {
  provider: "otter" | "icims"; label: string; requirements?: string; onClose: () => void; onConnected: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const name = provider === "otter" ? "Otter.ai" : "iCIMS";
  const clear = () => { setApiKey(""); setPassword(""); setUsername(""); setCustomerId(""); };
  async function connect(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const body: CustomerCredentialInput = {
      provider, consent: true, accountLabel: label,
      ...(provider === "otter" ? { apiKey } : { customerId, username, password }),
    };
    try {
      const response = await apiFetch("/integrations/credentials", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not verify this account.");
      clear();
      toast({ title: `${name} connected`, description: "The live API read check passed. Open Data exchange for supported read operations." });
      onConnected(); onClose();
    } catch (err) {
      if (!(err instanceof UnauthorizedError)) setError((err as Error).message);
    } finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) { clear(); onClose(); } }}>
    <DialogContent onInteractOutside={event => { if (busy) event.preventDefault(); }} className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Connect your company’s {name} account</DialogTitle>
        <DialogDescription>Credentials are encrypted on the server, never returned to the browser, and used only for your company in this environment.</DialogDescription>
      </DialogHeader>
      <p className="text-sm">{requirements || (provider === "otter"
        ? "Requires an Otter Enterprise workspace with Public API access. Create a dedicated API key under Integrations → Developer."
        : "Requires provisioned iCIMS API integration credentials, a customer ID, and Integration User group Search/Profiles read permissions. Developer-portal logins and OAuth-only accounts are not supported.")}</p>
      <a className="text-sm underline" target="_blank" rel="noopener noreferrer" href={provider === "otter"
        ? "https://help.otter.ai/hc/en-us/articles/36130822688279-Otter-ai-Public-API"
        : "https://developer-community.icims.com/getting-started/integrating-icims"}>Provider setup requirements</a>
      <form onSubmit={connect} className="space-y-4" autoComplete="off">
        {provider === "otter" ? <div className="space-y-2">
          <Label htmlFor="customer-api-key">Otter Enterprise API key</Label>
          <Input id="customer-api-key" type="password" autoComplete="new-password" required maxLength={4096} value={apiKey} onChange={e => setApiKey(e.target.value)} disabled={busy} />
        </div> : <>
          <div className="space-y-2"><Label htmlFor="icims-customer">iCIMS customer ID</Label>
            <Input id="icims-customer" inputMode="numeric" pattern="[1-9][0-9]{0,11}" required value={customerId} onChange={e => setCustomerId(e.target.value)} disabled={busy} /></div>
          <div className="space-y-2"><Label htmlFor="icims-user">API integration username (not your portal login)</Label>
            <Input id="icims-user" required maxLength={500} autoComplete="off" value={username} onChange={e => setUsername(e.target.value)} disabled={busy} /></div>
          <div className="space-y-2"><Label htmlFor="icims-password">API integration password</Label>
            <Input id="icims-password" type="password" autoComplete="new-password" required maxLength={4096} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></div>
        </>}
        <p className="text-xs text-muted-foreground">This adapter supports reads only. Connecting performs a read-only permission check and does not automatically import data. Use a dedicated, least-privilege integration credential. Disconnect removes it from Proven Path; revoke it in {name} to invalidate the credential everywhere.</p>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} required disabled={busy} className="mt-1" />
          I am authorized to connect this company’s account and allow Proven Path to read the data accessible to this credential.</label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => { clear(); onClose(); }}>Cancel</Button>
          <Button type="submit" disabled={busy || !consent}>{busy ? "Verifying API access…" : "Verify and connect"}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
