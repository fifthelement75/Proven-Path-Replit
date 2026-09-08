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
import { trackEvent } from "@/lib/analytics";

interface ReviewRequest {
  requestId: number;
  employeeId: number;
  employeeName: string;
  employeeRole: string;
  employeeDepartment: string;
  peerEmail: string;
  peerName: string | null;
  expiresAt: string | null;
}

type Score = "needs_improvement" | "meets_expectations" | "often_exceeds" | "exceptional" | "na" | "";

const SCORE_OPTIONS: { value: Score; label: string; description: string; color: string }[] = [
  { value: "needs_improvement", label: "Needs Improvement", description: "Not currently effectively using this skill", color: "border-red-300 bg-red-50 text-red-800 hover:bg-red-100" },
  { value: "meets_expectations", label: "Meets Expectations", description: "Uses this skill effectively with their team", color: "border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100" },
  { value: "often_exceeds", label: "Often Exceeds", description: "Applies a wide range of strategies to challenges", color: "border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100" },
  { value: "exceptional", label: "Exceptional", description: "Models the way for fellow team members, capable of mentoring", color: "border-green-300 bg-green-50 text-green-800 hover:bg-green-100" },
  { value: "na", label: "N/A", description: "Not applicable", color: "border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100" },
];

const CATEGORIES = [
  {
    id: "cat1",
    title: "Project and Team Management",
    questions: [
      {
        id: "personalPlanning",
        label: "Personal planning and delivery",
        description: "Plans and delivers one's own work on time; communicates status and issues appropriately to key stakeholders",
      },
      {
        id: "trackPlanning",
        label: "Track-level planning and delivery",
        description: "Shows a clear understanding of the organization's planning and delivery process and can plan and estimate work effectively",
      },
      {
        id: "solutionDriven",
        label: "Solution driven and proactive",
        description: "Always seeks out support and collaboration from team members to share knowledge and remove barriers to complete tasks or goals",
      },
      {
        id: "teamLeadership",
        label: "Team leadership",
        description: "Effectively lead/mentors practice in core skills. Seeks out other team's strengths to improve their own work and build their own knowledge",
      },
    ],
  },
  {
    id: "cat2",
    title: "Collaboration",
    questions: [
      {
        id: "persuasion",
        label: "Persuasion and influence",
        description: "Able to effectively build consensus around their practice solutions. Actively listens, understands, and when appropriate, incorporates other people's points of view into the proposed solution. Uses a variety of communication strategies and tools, like workshops and design sessions, to achieve consensus",
      },
      {
        id: "crossFunctional",
        label: "Working with cross-functional teams",
        description: "Collaborates effectively with the triad and other stakeholders",
      },
    ],
  },
  {
    id: "cat3",
    title: "Strategic Thinking",
    questions: [
      {
        id: "businessAlignment",
        label: "Alignment with business goals",
        description: "Effectively aligns their work with product and organization objectives",
      },
      {
        id: "customerCentric",
        label: "Customer-centric thinking",
        description: "Applies research and customer needs to inform their decisions",
      },
      {
        id: "dataInformed",
        label: "Data-informed decision making",
        description: "Uses data to validate their work",
      },
    ],
  },
];

function ScoreSelector({ questionId, value, onChange }: { questionId: string; value: Score; onChange: (v: Score) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {SCORE_OPTIONS.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value === value ? "" : opt.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
            value === opt.value
              ? `${opt.color} ring-2 ring-offset-1 ring-current`
              : "border-border bg-background text-muted-foreground hover:bg-accent"
          }`}
          title={opt.description}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

type FormData = Record<string, Score | string>;

export default function PeerReviewPage() {
  const params = useParams<{ token: string }>();
  const token = params.token!;

  const [form, setForm] = useState<FormData>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const { data: request, isLoading, error } = useQuery<ReviewRequest>({
    queryKey: ["peer-review", token],
    retry: false,
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/peer-review/${token}`));
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load");
      }
      return res.json();
    },
  });

  const { mutate: submitReview, isPending } = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch(getApiUrl(`/peer-review/${token}/submit`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: () => {
      trackEvent("peer_review_submitted");
      setSubmitted(true);
    },
    onError: (err: Error) => setSubmitError(err.message),
  });

  function setScore(questionId: string, value: Score) {
    setForm(f => ({ ...f, [`${questionId}Score`]: value }));
  }

  function setComment(questionId: string, value: string) {
    setForm(f => ({ ...f, [`${questionId}Comment`]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    submitReview(form);
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
                ? "This peer review link has expired. Please ask the requester to send a new one."
                : msg.includes("already")
                ? "You have already submitted your peer review for this request."
                : "This link is not valid. Please check the URL or ask the requester to resend it."}
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
            <h2 className="text-lg font-semibold mb-2">Thank you for your feedback!</h2>
            <p className="text-muted-foreground text-sm">
              Your peer review for <strong>{request.employeeName}</strong> has been submitted. Your responses are kept private and will be used to support their growth.
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
            <Badge variant="outline" className="text-xs">Peer Review</Badge>
          </div>
          <h1 className="text-2xl font-bold mt-2">Peer Review</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reviewing <strong>{request.employeeName}</strong> — {request.employeeRole}, {request.employeeDepartment}
          </p>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            🔒 Your answers are kept private and will not be shared publicly with the employee.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {CATEGORIES.map(cat => (
            <Card key={cat.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{cat.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {cat.questions.map((q, qi) => (
                  <div key={q.id} className={qi > 0 ? "pt-5 border-t" : ""}>
                    <Label className="text-sm font-medium">{q.label}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{q.description}</p>
                    <ScoreSelector
                      questionId={q.id}
                      value={(form[`${q.id}Score`] as Score) || ""}
                      onChange={(v) => setScore(q.id, v)}
                    />
                    <div className="mt-2">
                      <Textarea
                        placeholder="Optional comment..."
                        value={(form[`${q.id}Comment`] as string) || ""}
                        onChange={e => setComment(q.id, e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Final Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label className="text-sm font-medium">Would you recommend this person for promotion?</Label>
                <div className="flex gap-2 mt-2">
                  {[
                    { v: "yes", label: "Yes" },
                    { v: "no", label: "No" },
                    { v: "unsure", label: "Unsure" },
                  ].map(opt => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, promotionRecommendation: f.promotionRecommendation === opt.v ? "" : opt.v }))}
                      className={`px-4 py-2 text-sm font-medium rounded-md border transition-all ${
                        form.promotionRecommendation === opt.v
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">What are this person's key strengths?</Label>
                <Textarea
                  placeholder="Describe what this person does particularly well..."
                  value={(form.strengths as string) || ""}
                  onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))}
                  rows={3}
                  className="mt-2 text-sm"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">What areas should this person improve?</Label>
                <Textarea
                  placeholder="Describe where this person could grow or develop..."
                  value={(form.areasToImprove as string) || ""}
                  onChange={e => setForm(f => ({ ...f, areasToImprove: e.target.value }))}
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
            {isPending ? "Submitting..." : "Submit Peer Review"}
          </Button>

          <p className="text-center text-xs text-muted-foreground pb-8">
            Your feedback is confidential and will only be seen by authorized managers.
          </p>
        </form>
      </div>
    </div>
  );
}
