import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getApiUrl } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import {
  ROLE_TEMPLATES, OVERALL_RECOMMENDATIONS, SCORE_LABELS,
  getTemplate, getAllSkillsForTemplate,
} from "@/data/roleTemplates";

interface PanelInviteInfo {
  candidateName: string;
  role: string;
  level: string;
  interviewDate: string;
  panelistEmail: string;
  expiresAt: string | null;
}

function ScoreSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          title={SCORE_LABELS[n]?.description}
          className={`w-9 h-9 rounded text-sm font-medium border transition-all ${
            value === n
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border hover:border-primary/50 hover:bg-accent text-muted-foreground"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export default function PanelAssessmentPage() {
  const params = useParams<{ token: string }>();
  const token = params.token!;

  const [overallRecommendation, setOverallRecommendation] = useState("");
  const [notes, setNotes] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: invite, isLoading, error: loadError } = useQuery<PanelInviteInfo, Error>({
    queryKey: ["panel-assessment", token],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/panel-assessment/${token}`));
      if (!res.ok) throw new Error((await res.json()).error || "This assessment link is invalid or has expired.");
      return res.json();
    },
    retry: false,
  });

  const template = invite ? getTemplate(invite.role, invite.level) : undefined;
  const skills = template ? getAllSkillsForTemplate(template) : [];
  const scoredCount = skills.filter(s => scores[s] > 0).length;
  const avgScore = scoredCount > 0
    ? (skills.filter(s => scores[s] > 0).reduce((a, s) => a + (scores[s] || 0), 0) / scoredCount).toFixed(1)
    : null;

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (scoredCount === 0) throw new Error("Score at least one skill before submitting");
      const res = await fetch(getApiUrl(`/panel-assessment/${token}/submit`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores, feedback, overallRecommendation, notes }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to submit assessment");
      return res.json();
    },
    onSuccess: () => {
      trackEvent("panel_assessment_submitted", { scored_skill_count: scoredCount });
      setError("");
      setSubmitted(true);
    },
    onError: (err: Error) => setError(err.message),
  });

  const roleLabel = invite ? (ROLE_TEMPLATES.find(r => r.role === invite.role)?.roleLabel ?? invite.role) : "";
  const levelLabel = invite
    ? (ROLE_TEMPLATES.find(r => r.role === invite.role)?.levels.find(l => l.level === invite.level)?.levelLabel ?? invite.level)
    : "";

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-primary">Proven Path</h1>
          <p className="text-sm text-muted-foreground">Interview Panel Assessment</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : loadError ? (
          <Card>
            <CardContent className="py-12 text-center space-y-2">
              <p className="font-medium">Unable to open this assessment</p>
              <p className="text-sm text-muted-foreground">{loadError.message}</p>
            </CardContent>
          </Card>
        ) : submitted ? (
          <Card>
            <CardContent className="py-12 text-center space-y-2">
              <div className="text-3xl">✅</div>
              <p className="font-medium">Assessment submitted</p>
              <p className="text-sm text-muted-foreground">
                Thank you — your assessment of <strong>{invite!.candidateName}</strong> has been recorded and shared with the hiring team. You can close this page.
              </p>
            </CardContent>
          </Card>
        ) : invite ? (
          <>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-muted-foreground mb-1">You've been invited to assess</p>
                <p className="text-lg font-semibold">{invite.candidateName}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">{roleLabel} · {levelLabel}</Badge>
                  <Badge variant="outline" className="text-xs">Interviewed {invite.interviewDate}</Badge>
                </div>
                {invite.expiresAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    This link expires on {new Date(invite.expiresAt).toLocaleDateString()}.
                  </p>
                )}
              </CardContent>
            </Card>

            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</p>}

            {template ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{template.levelLabel} — Skill Assessment</p>
                    <p className="text-xs text-muted-foreground">{scoredCount} of {skills.length} skills scored{avgScore ? ` · avg ${avgScore}/5` : ""}</p>
                  </div>
                  <div className="flex gap-1 items-center text-xs text-muted-foreground">
                    {[1, 2, 3, 4, 5].map(n => <span key={n} className="w-9 text-center">{n}</span>)}
                  </div>
                </div>

                {template.categories.map((cat, ci) => (
                  <Card key={ci}>
                    <CardHeader className="pb-2 pt-3">
                      <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">{cat.category}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {cat.skills.map((skill, si) => (
                        <div key={si} className={si > 0 ? "pt-3 border-t" : ""}>
                          <div className="flex items-start justify-between gap-4">
                            <Label className="text-sm font-normal mt-0.5 flex-1">{skill}</Label>
                            <ScoreSelector
                              value={scores[skill] || 0}
                              onChange={v => setScores(s => ({ ...s, [skill]: v }))}
                            />
                          </div>
                          {scores[skill] > 0 && (
                            <div className="mt-1.5">
                              <div className="flex items-center gap-2 mb-1.5">
                                <Badge className={`text-xs ${SCORE_LABELS[scores[skill]]?.color}`}>
                                  {SCORE_LABELS[scores[skill]]?.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{SCORE_LABELS[scores[skill]]?.description}</span>
                              </div>
                              <Textarea
                                placeholder="Add a comment about this skill (optional)..."
                                value={feedback[skill] || ""}
                                onChange={e => setFeedback(f => ({ ...f, [skill]: e.target.value }))}
                                rows={1}
                                className="text-xs"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}

                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div className="space-y-1.5">
                      <Label>Overall recommendation</Label>
                      <div className="flex flex-wrap gap-2">
                        {OVERALL_RECOMMENDATIONS.map(r => (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => setOverallRecommendation(v => v === r.value ? "" : r.value)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
                              overallRecommendation === r.value
                                ? `${r.color} ring-2 ring-offset-1 ring-current`
                                : "border-border text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Interview notes</Label>
                      <Textarea
                        placeholder="Additional notes, observations, culture fit assessment..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end pb-8">
                  <Button onClick={() => mutate()} disabled={isPending || scoredCount === 0}>
                    {isPending ? "Submitting..." : "Submit assessment"}
                  </Button>
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  The skill template for this role is unavailable. Please contact the person who invited you.
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
