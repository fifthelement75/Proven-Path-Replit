import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { getApiUrl } from "@/lib/api";
import logoUrl from "@assets/ProvenPath_Logo_1777766690823.png";

interface InviteInfo {
  email: string;
  userRole: string;
  companyName: string;
  expiresAt: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Manager",
  employee: "Team Member",
};

export default function AcceptInvitePage() {
  const params = useParams();
  const token = params.token ?? "";
  const [, setLocation] = useLocation();
  const { login } = useAuthContext();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loadingInfo, setLoadingInfo] = useState(true);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingInfo(true);
      setLoadError("");
      try {
        const res = await fetch(getApiUrl(`/invitations/accept/${token}`));
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(data.error || "This invitation link is invalid");
          return;
        }
        setInfo(data);
      } catch {
        if (!cancelled) setLoadError("Network error. Please try again.");
      } finally {
        if (!cancelled) setLoadingInfo(false);
      }
    }
    if (token) load();
    else {
      setLoadError("This invitation link is invalid");
      setLoadingInfo(false);
    }
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(getApiUrl(`/invitations/accept/${token}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not accept the invitation");
        return;
      }
      login(data.token, data.user);
      setLocation("/employees/me");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
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
      <div className="relative z-10 w-full max-w-md">
        <Card className="w-full shadow-xl">
          <CardHeader className="text-center">
            <img src={logoUrl} alt="Proven Path" className="h-12 mx-auto mb-6" />
            <CardTitle className="text-2xl">Accept your invitation</CardTitle>
            <CardDescription>
              {loadingInfo
                ? "Loading your invitation…"
                : info
                  ? `You've been invited to join ${info.companyName} as ${ROLE_LABELS[info.userRole] || info.userRole}.`
                  : "We couldn't load this invitation."}
            </CardDescription>
          </CardHeader>

          {loadingInfo ? (
            <CardContent>
              <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
                Please wait…
              </div>
            </CardContent>
          ) : loadError ? (
            <CardContent className="space-y-4">
              <Alert variant="destructive">{loadError}</Alert>
              <Button variant="outline" className="w-full" onClick={() => setLocation("/login")}>
                Go to sign in
              </Button>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && <Alert variant="destructive">{error}</Alert>}
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input id="invite-email" type="email" value={info?.email ?? ""} disabled readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Your name</Label>
                  <Input
                    id="invite-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Jane Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-password">Create a password</Label>
                  <div className="relative">
                    <Input
                      id="invite-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                      placeholder="At least 6 characters"
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
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Setting up your account…" : "Accept invitation & continue"}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
