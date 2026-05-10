import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { getApiUrl } from "@/lib/api";
import logoUrl from "@assets/ProvenPath_Logo_1777766690823.png";
import sideImage from "@assets/windows-hNiNxhUfCfQ-unsplash_1777767280797.jpg";

export default function RegisterPage() {
  const { login } = useAuthContext();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [planParam, setPlanParam] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPlanParam(params.get("plan"));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!agreed) {
      setError("Please accept the Terms of Service and Privacy Policy to continue");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }
      // Persist token before any authenticated calls.
      login(data.token, data.user);

      if (planParam === "pro") {
        // Kick off Stripe checkout immediately.
        try {
          const co = await fetch(getApiUrl("/stripe/checkout"), {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.token}` },
          });
          const coData = await co.json();
          if (co.ok && coData.url) {
            window.location.href = coData.url;
            return;
          }
        } catch {
          // Fall through to welcome popup.
        }
      }

      // Stash trial info so the layout shows the welcome dialog on the next page
      // (PublicOnlyRoute will redirect us off /register the moment login() runs).
      if (data.trialJustStarted) {
        try {
          sessionStorage.setItem(
            "pp_welcome_trial",
            JSON.stringify({ trialEndsAt: data.trialEndsAt || null }),
          );
        } catch {
          // ignore storage failures (private mode, etc.)
        }
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(37,99,235,0.18)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 w-[30rem] h-[30rem] rounded-full bg-indigo-400/20 blur-[130px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-amber-200/25 blur-[100px]"
      />
      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div className="hidden lg:block relative">
          <div
            aria-hidden
            className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/10 via-indigo-300/10 to-amber-200/10 blur-xl"
          />
          <img
            src={sideImage}
            alt="Modern workspace"
            className="relative w-full h-[560px] object-cover rounded-2xl shadow-xl"
          />
        </div>

        <div className="flex flex-col">
        <Card className="w-full shadow-xl border-t-[#0f172903] border-r-[#0f172903] border-b-[#0f172903] border-l-[#0f172903]">
          <CardHeader className="text-center">
            <img src={logoUrl} alt="Proven Path" className="h-12 mx-auto mb-[20px]" />
            <CardTitle className="text-2xl">Create your company account</CardTitle>
            <CardDescription>
              {planParam === "pro"
                ? "Sign up and we'll take you straight to checkout for the Pro plan."
                : "Start your 7-day free trial — no credit card required."}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && <Alert variant="destructive">{error}</Alert>}
              <div className="space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="terms" checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} />
                <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground leading-snug cursor-pointer">
                  I agree to the{" "}
                  <a href="/terms" target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">
                    Privacy Policy
                  </a>
                  .
                </Label>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading || !agreed}>
                {loading ? "Creating account..." : planParam === "pro" ? "Create account & continue to checkout" : "Create account"}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link href="/login">
                  <span className="text-primary hover:underline cursor-pointer">Sign in</span>
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
        <p className="text-sm text-muted-foreground text-center mt-6">
          Learn more about the product features{" "}
          <a href="/" className="text-primary font-medium hover:underline">
            here
          </a>
          .
        </p>
        </div>
      </div>
    </div>
  );
}
