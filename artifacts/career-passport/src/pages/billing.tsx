import { useEffect, useState, useRef } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Sparkles, AlertTriangle, Loader2, Tag, XCircle } from "lucide-react";
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

  const [promoCode, setPromoCode] = useState("");
  const [promoState, setPromoState] = useState<"idle" | "validating" | "valid" | "applying" | "applied" | "error">("idle");
  const [promoMessage, setPromoMessage] = useState("");
  const [promoTrialEnd, setPromoTrialEnd] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  async function handleValidatePromo(): Promise<void> {
    if (!promoCode.trim()) return;
    setPromoState("validating");
    setPromoMessage("");
    try {
      const res = await fetch(getApiUrl("/promo/validate"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setPromoState("valid");
        setPromoMessage(data.message);
      } else {
        setPromoState("error");
        setPromoMessage(data.message || "Invalid or expired code.");
      }
    } catch {
      setPromoState("error");
      setPromoMessage("Could not validate code. Try again.");
    }
  }

  async function handleApplyPromo(): Promise<void> {
    setPromoState("applying");
    try {
      const res = await fetch(getApiUrl("/promo/apply"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setPromoState("applied");
        setPromoMessage(data.message);
        setPromoTrialEnd(data.trialEndsAt ?? null);
        await load();
      } else {
        setPromoState("error");
        setPromoMessage(data.message || "Failed to apply code.");
      }
    } catch {
      setPromoState("error");
      setPromoMessage("Failed to apply promo code. Try again.");
    }
  }

  function resetPromo() {
    setPromoCode("");
    setPromoState("idle");
    setPromoMessage("");
    setPromoTrialEnd(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

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

  const alreadySubscribed = status?.subscriptionActive || status?.trialActive;
  const promoApplied = promoState === "applied";
  const promoValid = promoState === "valid";

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
                {promoApplied ? (
                  <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <AlertTitle>Promo code applied!</AlertTitle>
                    <AlertDescription>
                      {promoMessage}
                      {promoTrialEnd && (
                        <span className="block mt-0.5 text-xs text-emerald-700">
                          Your free month runs until {new Date(promoTrialEnd).toLocaleDateString()}.
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                ) : status?.subscriptionActive ? (
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
                  ) : !promoApplied ? (
                    <Button onClick={startCheckout} disabled={working}>
                      {working ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Subscribe — $9.99 / month
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {!alreadySubscribed && !promoApplied && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Tag className="h-4 w-4" />
                    Promo Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      placeholder="Have a code?"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value.toUpperCase());
                        if (promoState !== "idle") setPromoState("idle");
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleValidatePromo(); }}
                      disabled={promoState === "validating" || promoState === "applying" || promoValid}
                      className="font-mono tracking-widest uppercase placeholder:tracking-normal placeholder:font-normal placeholder:normal-case"
                    />
                    {promoValid ? (
                      <>
                        <Button
                          onClick={handleApplyPromo}
                          disabled={promoState === "applying"}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                        >
                          {promoState === "applying" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate"}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={resetPromo} className="shrink-0">
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={handleValidatePromo}
                        disabled={!promoCode.trim() || promoState === "validating"}
                        className="shrink-0"
                      >
                        {promoState === "validating" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                      </Button>
                    )}
                  </div>

                  {promoValid && (
                    <p className="text-sm text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      {promoMessage} — Click <strong>Activate</strong> to start your free month.
                    </p>
                  )}
                  {promoState === "error" && (
                    <p className="text-sm text-destructive flex items-center gap-1.5">
                      <XCircle className="h-4 w-4" />
                      {promoMessage}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

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
