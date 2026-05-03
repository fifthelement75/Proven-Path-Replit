import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import { getToken, type SubscriptionStatus } from "@/lib/auth";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function BillingPage() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  async function load(): Promise<void> {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/stripe/subscription"), { headers: authHeaders() });
      if (res.ok) setStatus(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success") {
      toast({ title: "Subscription active", description: "Thanks! Your subscription is now active." });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (checkout === "cancel") {
      toast({ title: "Checkout cancelled", description: "You can subscribe any time.", variant: "default" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function startCheckout(): Promise<void> {
    setWorking(true);
    try {
      const res = await fetch(getApiUrl("/stripe/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast({ title: "Could not start checkout", description: data.error || "Try again later", variant: "destructive" });
        return;
      }
      window.location.href = data.url;
    } finally {
      setWorking(false);
    }
  }

  async function openPortal(): Promise<void> {
    setWorking(true);
    try {
      const res = await fetch(getApiUrl("/stripe/portal"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast({ title: "Could not open billing portal", description: data.error || "Try again", variant: "destructive" });
        return;
      }
      window.location.href = data.url;
    } finally {
      setWorking(false);
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground">Manage your Proven Path subscription</p>
        </div>

        {loading ? (
          <Card><CardContent className="py-8 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></CardContent></Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Current plan</CardTitle>
                    <CardDescription>{user?.companyName}</CardDescription>
                  </div>
                  <PlanBadge status={status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {status?.subscriptionActive ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Subscription active</AlertTitle>
                    <AlertDescription>You have full access to every feature on Proven Path.</AlertDescription>
                  </Alert>
                ) : status?.trialActive ? (
                  <Alert>
                    <Sparkles className="h-4 w-4" />
                    <AlertTitle>Free trial — {status.trialDaysRemaining} day{status.trialDaysRemaining === 1 ? "" : "s"} left</AlertTitle>
                    <AlertDescription>
                      Your trial ends on {status.trialEndsAt ? new Date(status.trialEndsAt).toLocaleDateString() : ""}. Subscribe to keep
                      full access afterward.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Trial expired</AlertTitle>
                    <AlertDescription>
                      Your free trial has ended. Subscribe to restore access to AI development plans, candidate scoring, peer reviews, and self-reflections.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  {status?.subscriptionActive ? (
                    <Button onClick={openPortal} disabled={working}>
                      {working ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage subscription"}
                    </Button>
                  ) : (
                    <Button onClick={startCheckout} disabled={working}>
                      {working ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Subscribe — $9.99 / month
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What's included with Pro</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
                {[
                  "AI development plans",
                  "Candidate interview scoring",
                  "360° peer reviews",
                  "Self-reflection requests",
                  "Unlimited verified references",
                  "Priority email support",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>{f}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}

function PlanBadge({ status }: { status: SubscriptionStatus | null }) {
  if (!status) return null;
  if (status.subscriptionActive) return <Badge className="bg-emerald-500 hover:bg-emerald-500">Pro</Badge>;
  if (status.trialActive) return <Badge variant="secondary">Trial</Badge>;
  return <Badge variant="destructive">Expired</Badge>;
}
