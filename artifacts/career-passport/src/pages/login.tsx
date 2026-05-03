import { useState } from "react";
import { Link } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { getApiUrl } from "@/lib/api";
import logoUrl from "@assets/ProvenPath_Logo_1777766690823.png";
import sideImage from "@assets/windows-hNiNxhUfCfQ-unsplash_1777767280797.jpg";

export default function LoginPage() {
  const { login } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
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

      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        {/* Image panel */}
        <div className="hidden lg:block relative">
          <div
            aria-hidden
            className="absolute -inset-4 -z-10 bg-gradient-to-tr from-primary/25 via-indigo-400/20 to-amber-200/30 blur-2xl opacity-70 rounded-[2rem]"
          />
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
            <img
              src={sideImage}
              alt="Two colleagues collaborating around a laptop"
              className="w-full h-[640px] object-cover block"
              loading="lazy"
            />
          </div>
        </div>

        {/* Form column */}
        <div className="w-full max-w-sm mx-auto lg:mx-0">
        <div className="flex flex-col items-center text-center mb-8">
          <img src={logoUrl} alt="ProvenPath" className="h-14 w-auto mb-2" />
          <p className="text-sm text-muted-foreground mt-1">Performance management platform</p>
        </div>
        <Card className="shadow-xl border-gray-200/80 backdrop-blur-sm bg-white/90">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your company credentials to continue</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" className="text-sm py-2">
                  {error}
                </Alert>
              )}
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
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Don't have an account?{" "}
                <Link href="/register">
                  <span className="text-primary hover:underline cursor-pointer">Register</span>
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
        <p className="text-sm text-muted-foreground text-center mt-6">
          Learn more about the product features{" "}
          <a href="/marketing/" className="text-primary font-medium hover:underline">
            here
          </a>
          .
        </p>
        </div>
      </div>
    </div>
  );
}
