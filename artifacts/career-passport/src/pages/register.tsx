import { useState } from "react";
import { Link } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { getApiUrl } from "@/lib/api";

export default function RegisterPage() {
  const { login } = useAuthContext();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
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
      login(data.token, data.user);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 overflow-hidden">
      {/* Subtle dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(37,99,235,0.18)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]"
      />

      {/* Soft radial color washes */}
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

      <a
        href="/marketing/"
        className="absolute top-4 right-4 z-20 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-full border border-gray-200/80 bg-white/70 backdrop-blur-sm shadow-sm hover:border-primary/40"
      >
        Learn more
        <span aria-hidden>→</span>
      </a>

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">Career Passport</h1>
          <p className="text-sm text-muted-foreground mt-1">Performance management platform</p>
        </div>
        <Card className="shadow-xl border-gray-200/80 backdrop-blur-sm bg-white/90">
          <CardHeader>
            <CardTitle>Create account</CardTitle>
            <CardDescription>Register your company to get started</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" className="text-sm py-2">
                  {error}
                </Alert>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Acme Corp"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  autoComplete="new-password"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create account"}
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
      </div>
    </div>
  );
}
