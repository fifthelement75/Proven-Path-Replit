import { useState, type FormEvent } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

type Status = "idle" | "submitting" | "success" | "error";

export default function Contact() {
  useDocumentMeta({
    title: "Book a Demo — Proven Path | Talk to Our HR Performance Experts",
    description:
      "See how Proven Path helps your HR team make data-driven hiring, promotion, and retention decisions. Book a personalized demo with our team today.",
    ogImage: "opengraph.jpg",
    canonicalPath: "/contact",
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, company, teamSize, message }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(typeof data?.error === "string" ? data.error : "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setFirstName("");
      setLastName("");
      setEmail("");
      setCompany("");
      setTeamSize("");
      setMessage("");
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please check your connection and try again.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="relative flex-1 pt-16 pb-14 md:pt-24 md:pb-24 overflow-hidden">
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

        <Container className="relative z-10">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Book a Demo
              </h1>
              <p className="text-xl text-gray-600">
                See how HR teams use Proven Path to hire smarter, develop faster, and retain longer. Tell us about your team and we'll set up a tailored walkthrough.
              </p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-200">
              {status === "success" ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex flex-col items-center text-center py-8"
                >
                  <div className="w-14 h-14 rounded-full bg-success/10 text-success flex items-center justify-center mb-4">
                    <CheckCircle2 size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Request received</h2>
                  <p className="text-gray-600 mb-6">
                    Thanks for reaching out. Our team will review your request and get back to you within one business day.
                  </p>
                  <Button variant="outline" onClick={() => setStatus("idle")}>
                    Send another message
                  </Button>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div role="alert" aria-live="assertive" className="sr-only-empty">
                    {status === "error" && errorMsg && (
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="Jane"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        autoComplete="given-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        autoComplete="family-name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Work Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jane@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name</Label>
                    <Input
                      id="company"
                      placeholder="Acme Inc."
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      required
                      autoComplete="organization"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teamSize">Team Size</Label>
                    <Input
                      id="teamSize"
                      placeholder="e.g. 50–200 employees"
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">What are you trying to solve?</Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us about your current performance and hiring process, the tools you use, and what you'd like to change..."
                      className="min-h-[120px]"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-lg"
                    disabled={status === "submitting"}
                  >
                    {status === "submitting" ? "Sending..." : "Request Demo"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
