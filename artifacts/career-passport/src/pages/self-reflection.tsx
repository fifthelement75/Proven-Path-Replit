import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiUrl } from "@/lib/api";
import { BEHAVIORAL_SKILL_CATEGORIES } from "@/lib/behavioral-skills";

interface ReflectionRequest {
  requestId: number;
  employeeId: number;
  employeeName: string;
  employeeRole: string;
  employeeDepartment: string;
  companyName: string;
  period: string;
  message: string | null;
  expiresAt: string | null;
}

const HARD_SKILLS = [
  { key: "technicalScore", label: "Technical skills", description: "Depth and quality of work in your craft." },
  { key: "communicationScore", label: "Communication", description: "How clearly you share ideas, written and verbal." },
  { key: "problemSolvingScore", label: "Problem solving", description: "How you break down and resolve hard problems." },
  { key: "teamworkScore", label: "Teamwork", description: "How you collaborate, support and trust your team." },
  { key: "leadershipScore", label: "Leadership", description: "How you take ownership and lift others." },
];

function ScoreRow({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5 mt-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`w-9 h-9 text-sm font-medium rounded-md border transition-all ${
            value === n
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:bg-accent"
          }`}
          aria-label={`Score ${n}`}
        >
          {n}
        </button>
      ))}
      <span className="text-xs text-muted-foreground self-center pl-2">1 = Low · 5 = Exceptional</span>
    </div>
  );
}

export default function SelfReflectionPage() {
  const params = useParams<{ token: string }>();
  const token = params.token!;

  const [hard, setHard] = useState<Record<string, number | null>>({});
  const [behavioral, setBehavioral] = useState<Record<string, number>>({});
  const [strengths, setStrengths] = useState("");
  const [areasToImprove, setAreasToImprove] = useState("");
  const [goals, setGoals] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const { data: request, isLoading, error } = useQuery<ReflectionRequest>({
    queryKey: ["self-reflection", token],
    retry: false,
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/self-reflection/${token}`));
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load");
      }
      return res.json();
    },
  });

  const { mutate: submit, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl(`/self-reflection/${token}/submit`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...hard,
          behavioralScores: behavioral,
          strengths,
          areasToImprove,
          goals,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
    onError: (err: Error) => setSubmitError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    submit();
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !request) {
    const msg = (error as Error)?.message || "Invalid link";
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="text-4xl mb-4">🔗</div>
            <h2 className="text-lg font-semibold mb-2">
              {msg.includes("expired") ? "Link Expired" : msg.includes("already") ? "Already Submitted" : "Invalid Link"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {msg.includes("expired")
                ? "This self-reflection link has expired. Please ask your manager to send a new one."
                : msg.includes("already")
                ? "You have already submitted your self-reflection for this request."
                : "This link is not valid. Please check the URL or ask your manager to resend it."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-lg font-semibold mb-2">Thank you, {request.employeeName.split(" ")[0]}!</h2>
            <p className="text-muted-foreground text-sm">
              Your self-reflection has been submitted. Your manager will see it alongside other inputs to your development plan.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-primary text-sm">Proven Path</span>
            <span className="text-muted-foreground text-sm">·</span>
            <Badge variant="outline" className="text-xs">Self-Reflection</Badge>
          </div>
          <h1 className="text-2xl font-bold mt-2">Self-Reflection</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>{request.employeeName}</strong> — {request.employeeRole}, {request.employeeDepartment}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Period: {request.period}</p>
          {request.message && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
              <strong>Note from your manager:</strong>
              <p className="mt-1 whitespace-pre-wrap">{request.message}</p>
            </div>
          )}
          <div className="mt-3 p-3 bg-muted/50 border border-border rounded-lg text-xs text-muted-foreground">
            Take 10 minutes to reflect honestly. Your responses help shape your personalized development plan.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Hard skills (1–5)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {HARD_SKILLS.map((s, i) => (
                <div key={s.key} className={i > 0 ? "pt-4 border-t" : ""}>
                  <Label className="text-sm font-medium">{s.label}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                  <ScoreRow
                    value={hard[s.key] ?? null}
                    onChange={(v) => setHard((h) => ({ ...h, [s.key]: v }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {BEHAVIORAL_SKILL_CATEGORIES.map((cat) => (
            <Card key={cat.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{cat.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {cat.skills.map((skill, i) => (
                  <div key={skill.key} className={i > 0 ? "pt-4 border-t" : ""}>
                    <Label className="text-sm font-medium">{skill.label}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{skill.description}</p>
                    <ScoreRow
                      value={behavioral[skill.key] ?? null}
                      onChange={(v) => setBehavioral((b) => ({ ...b, [skill.key]: v }))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Reflections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label className="text-sm font-medium">What are your key strengths?</Label>
                <Textarea
                  placeholder="What have you done particularly well in this period?"
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  rows={3}
                  className="mt-2 text-sm"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Where do you want to grow?</Label>
                <Textarea
                  placeholder="What skills or behaviors do you want to improve?"
                  value={areasToImprove}
                  onChange={(e) => setAreasToImprove(e.target.value)}
                  rows={3}
                  className="mt-2 text-sm"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Goals for the next period</Label>
                <Textarea
                  placeholder="What do you want to accomplish next?"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  rows={3}
                  className="mt-2 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {submitError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {submitError}
            </div>
          )}

          <Button type="submit" disabled={isPending} className="w-full" size="lg">
            {isPending ? "Submitting..." : "Submit Self-Reflection"}
          </Button>

          <p className="text-center text-xs text-muted-foreground pb-8">
            Your responses go to your manager and feed into your AI-generated development plan.
          </p>
        </form>
      </div>
    </div>
  );
}
