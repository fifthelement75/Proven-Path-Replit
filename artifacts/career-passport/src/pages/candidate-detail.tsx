import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getApiUrl } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  ROLE_TEMPLATES, CANDIDATE_STATUSES, OVERALL_RECOMMENDATIONS, SCORE_LABELS,
  getTemplate, getAllSkillsForTemplate,
} from "@/data/roleTemplates";

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

interface Assessment {
  id: number;
  role: string;
  level: string;
  interviewDate: string;
  scores: string | null;
  feedback: string | null;
  overallRecommendation: string | null;
  overallScore: string | null;
  notes: string | null;
  createdAt: string;
}

interface CandidateDetail {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  roleApplyingFor: string;
  levelApplyingFor: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  assessments: Assessment[];
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

function InterviewAssessmentDialog({
  open, onClose, candidateId, defaultRole, defaultLevel,
}: {
  open: boolean; onClose: () => void;
  candidateId: number; defaultRole?: string; defaultLevel?: string;
}) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState(defaultRole || "");
  const [level, setLevel] = useState(defaultLevel || "");
  const [interviewDate, setInterviewDate] = useState(new Date().toISOString().split("T")[0]);
  const [overallRecommendation, setOverallRecommendation] = useState("");
  const [notes, setNotes] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const template = getTemplate(role, level);
  const skills = template ? getAllSkillsForTemplate(template) : [];

  const avgScore = skills.length
    ? (skills.filter(s => scores[s] > 0).reduce((a, s) => a + (scores[s] || 0), 0) /
       Math.max(1, skills.filter(s => scores[s] > 0).length)).toFixed(1)
    : null;
  const scoredCount = skills.filter(s => scores[s] > 0).length;

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!role || !level) throw new Error("Select role and level");
      if (scoredCount === 0) throw new Error("Score at least one skill");
      const res = await fetch(getApiUrl(`/candidates/${candidateId}/assessments`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ roleAssessed: role, level, interviewDate, scores, feedback, overallRecommendation, notes }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate", candidateId] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      setError("");
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const selectedRole = ROLE_TEMPLATES.find(r => r.role === role);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Interview Assessment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</p>}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Role <span className="text-destructive">*</span></Label>
              <Select value={role} onValueChange={v => { setRole(v); setLevel(""); setScores({}); setFeedback({}); }}>
                <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                <SelectContent>
                  {ROLE_TEMPLATES.map(r => <SelectItem key={r.role} value={r.role}>{r.roleLabel}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Level <span className="text-destructive">*</span></Label>
              <Select value={level} onValueChange={v => { setLevel(v); setScores({}); setFeedback({}); }} disabled={!selectedRole}>
                <SelectTrigger><SelectValue placeholder="Select level..." /></SelectTrigger>
                <SelectContent>
                  {selectedRole?.levels.map(l => <SelectItem key={l.level} value={l.level}>{l.levelLabel}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Interview date</Label>
              <Input type="date" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} />
            </div>
          </div>

          {template ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{template.levelLabel} — Skill Assessment</p>
                  <p className="text-xs text-muted-foreground">{scoredCount} of {skills.length} skills scored{avgScore && scoredCount > 0 ? ` · avg ${avgScore}/5` : ""}</p>
                </div>
                <div className="flex gap-1 items-center text-xs text-muted-foreground">
                  <span className="w-9 text-center">1</span>
                  <span className="w-9 text-center">2</span>
                  <span className="w-9 text-center">3</span>
                  <span className="w-9 text-center">4</span>
                  <span className="w-9 text-center">5</span>
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
                          <div className="mt-1.5 pl-0">
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
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground border rounded-lg">
              Select a role and level to see the skill assessment template
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutate()} disabled={isPending}>
            {isPending ? "Saving..." : "Save assessment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportToEmployeeDialog({
  open, onClose, candidateId, candidateName,
}: {
  open: boolean; onClose: () => void; candidateId: number; candidateName: string;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [importedScore, setImportedScore] = useState<number | null>(null);

  const { data: employees = [] } = useQuery<{ id: number; name: string; role: string }[]>({
    queryKey: ["employees", "list"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/employees"), { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const filtered = employees.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase())
  );

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!selectedEmployeeId) throw new Error("Select an employee first");
      const res = await fetch(getApiUrl(`/candidates/${candidateId}/import-to-employee`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ employeeId: selectedEmployeeId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Import failed");
      return res.json();
    },
    onSuccess: (data) => {
      setSuccess(true);
      setImportedScore(data.overallScore);
      queryClient.invalidateQueries({ queryKey: ["candidate", candidateId] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["reviews", selectedEmployeeId] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Interview Scores to Employee</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {success ? (
            <div className="py-4 text-center space-y-2">
              <div className="text-3xl">✅</div>
              <p className="font-medium">Import successful!</p>
              <p className="text-sm text-muted-foreground">
                Interview assessment for <strong>{candidateName}</strong> has been imported as a review
                {importedScore ? ` with an overall score of ${importedScore}/5` : ""}.
              </p>
              <p className="text-xs text-muted-foreground">Candidate status updated to Hired.</p>
              <Button onClick={onClose} className="mt-2">Done</Button>
            </div>
          ) : (
            <>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                This will create an "Interview" type review on the employee's profile using the latest assessment scores from <strong>{candidateName}</strong>.
              </div>
              {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</p>}
              <div className="space-y-1.5">
                <Label>Search employee</Label>
                <Input
                  placeholder="Search by name or role..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto rounded-lg border">
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4 text-center">No employees found</p>
                ) : filtered.map(e => (
                  <button
                    key={e.id}
                    onClick={() => setSelectedEmployeeId(e.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors ${selectedEmployeeId === e.id ? "bg-primary/10 border-l-2 border-primary" : ""}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                      {e.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{e.name}</div>
                      <div className="text-xs text-muted-foreground">{e.role}</div>
                    </div>
                  </button>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={() => mutate()} disabled={isPending || !selectedEmployeeId}>
                  {isPending ? "Importing..." : "Import scores"}
                </Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssessmentCard({ assessment }: { assessment: Assessment }) {
  const [expanded, setExpanded] = useState(false);

  const roleLabel = ROLE_TEMPLATES.find(r => r.role === assessment.role)?.roleLabel ?? assessment.role;
  const levelLabel = ROLE_TEMPLATES.find(r => r.role === assessment.role)?.levels.find(l => l.level === assessment.level)?.levelLabel ?? assessment.level;
  const rec = OVERALL_RECOMMENDATIONS.find(r => r.value === assessment.overallRecommendation);
  const scores: Record<string, number> = assessment.scores ? JSON.parse(assessment.scores) : {};
  const feedbackMap: Record<string, string> = assessment.feedback ? JSON.parse(assessment.feedback) : {};
  const template = getTemplate(assessment.role, assessment.level);
  const avg = assessment.overallScore ? parseFloat(assessment.overallScore) : null;

  const scoreColor = avg == null ? "" : avg >= 4 ? "text-green-600" : avg >= 3 ? "text-yellow-600" : "text-red-600";

  return (
    <Card>
      <CardContent className="pt-4">
        <div
          className="flex items-center justify-between cursor-pointer gap-4"
          onClick={() => setExpanded(v => !v)}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-sm">{roleLabel} · {levelLabel}</span>
              {rec && <Badge className={`text-xs ${rec.color}`}>{rec.label}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {assessment.interviewDate} · {Object.keys(scores).length} skills scored
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {avg != null && (
              <span className={`text-lg font-bold ${scoreColor}`}>
                {avg.toFixed(1)}<span className="text-xs text-muted-foreground font-normal">/5</span>
              </span>
            )}
            <span className="text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {template?.categories.map(cat => {
              const catScores = cat.skills.filter(s => scores[s] > 0);
              if (catScores.length === 0) return null;
              return (
                <div key={cat.category}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{cat.category}</p>
                  <div className="space-y-2">
                    {catScores.map(skill => (
                      <div key={skill} className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm">{skill}</span>
                            <Badge className={`text-xs shrink-0 ${SCORE_LABELS[scores[skill]]?.color ?? ""}`}>
                              {scores[skill]}/5 · {SCORE_LABELS[scores[skill]]?.label}
                            </Badge>
                          </div>
                          {feedbackMap[skill] && (
                            <p className="text-xs text-muted-foreground mt-0.5">{feedbackMap[skill]}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {assessment.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Interview notes</p>
                <p className="text-sm text-muted-foreground">{assessment.notes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const candidateId = parseInt(params.id!);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [assessOpen, setAssessOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editStatus, setEditStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const { data: candidate, isLoading } = useQuery<CandidateDetail>({
    queryKey: ["candidate", candidateId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/candidates/${candidateId}`), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load candidate");
      return res.json();
    },
  });

  const { mutate: updateStatus, isPending: updatingStatus } = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(getApiUrl(`/candidates/${candidateId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate", candidateId] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      setEditStatus(false);
    },
  });

  const { mutate: deleteCandidate } = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl(`/candidates/${candidateId}`), {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      navigate("/candidates");
    },
  });

  if (isLoading) return (
    <Layout>
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    </Layout>
  );

  if (!candidate) return (
    <Layout>
      <div className="text-center py-12 text-muted-foreground">Candidate not found.</div>
    </Layout>
  );

  const roleLabel = ROLE_TEMPLATES.find(r => r.role === candidate.roleApplyingFor)?.roleLabel ?? candidate.roleApplyingFor;
  const levelLabel = ROLE_TEMPLATES.find(r => r.role === candidate.roleApplyingFor)?.levels.find(l => l.level === candidate.levelApplyingFor)?.levelLabel;
  const si = CANDIDATE_STATUSES.find(s => s.value === candidate.status) ?? { label: candidate.status, color: "bg-gray-100 text-gray-700" };
  const canImport = candidate.status !== "rejected" && candidate.assessments.length > 0;

  const allScores = candidate.assessments.flatMap(a =>
    a.scores ? Object.values(JSON.parse(a.scores)) as number[] : []
  );
  const avgAllScores = allScores.length
    ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)
    : null;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <Link href="/candidates" className="mt-2 text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <ArrowLeft size={20} />
            </Link>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {candidate.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{candidate.name}</h1>
              <p className="text-muted-foreground text-sm">{roleLabel}{levelLabel ? ` · ${levelLabel}` : ""}</p>
              <div className="flex flex-wrap gap-2 mt-2 items-center">
                {!editStatus ? (
                  <>
                    <Badge className={`text-xs ${si.color}`}>{si.label}</Badge>
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                      onClick={() => { setNewStatus(candidate.status); setEditStatus(true); }}
                    >
                      Change status
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2 items-center">
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger className="h-7 text-xs w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CANDIDATE_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-7 text-xs" disabled={updatingStatus} onClick={() => updateStatus(newStatus)}>
                      {updatingStatus ? "..." : "Save"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditStatus(false)}>Cancel</Button>
                  </div>
                )}
                {candidate.source && <Badge variant="outline" className="text-xs">{candidate.source}</Badge>}
                {avgAllScores && (
                  <Badge variant="secondary" className="text-xs">Avg {avgAllScores}/5</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canImport && (
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                Import to employee profile
              </Button>
            )}
            <Button size="sm" onClick={() => setAssessOpen(true)}>
              Add interview assessment
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {candidate.email && <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-muted-foreground">Email</div><div className="text-sm font-medium truncate">{candidate.email}</div></CardContent></Card>}
          {candidate.phone && <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-muted-foreground">Phone</div><div className="text-sm font-medium">{candidate.phone}</div></CardContent></Card>}
          <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-muted-foreground">Assessments</div><div className="text-sm font-medium">{candidate.assessments.length}</div></CardContent></Card>
          <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-muted-foreground">Added</div><div className="text-sm font-medium">{new Date(candidate.createdAt).toLocaleDateString()}</div></CardContent></Card>
        </div>

        {candidate.notes && (
          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground font-medium mb-1">Notes</p>
              <p className="text-sm">{candidate.notes}</p>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-base font-semibold mb-3">Interview Assessments ({candidate.assessments.length})</h2>
          {candidate.assessments.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No assessments yet. Click "Add interview assessment" to evaluate this candidate.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {candidate.assessments.map(a => (
                <AssessmentCard key={a.id} assessment={a} />
              ))}
            </div>
          )}
        </div>

        {candidate.assessments.length > 1 && avgAllScores && (
          <Card className="bg-muted/30">
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground mb-2">Aggregate across {candidate.assessments.length} assessments</p>
              <div className="text-2xl font-bold">{avgAllScores}<span className="text-sm font-normal text-muted-foreground">/5</span></div>
            </CardContent>
          </Card>
        )}

        <div className="border-t pt-4">
          <button
            className="text-sm text-destructive hover:underline"
            onClick={() => { if (confirm(`Delete ${candidate.name}? This will also delete all their assessments.`)) deleteCandidate(); }}
          >
            Delete candidate
          </button>
        </div>
      </div>

      <InterviewAssessmentDialog
        open={assessOpen}
        onClose={() => setAssessOpen(false)}
        candidateId={candidateId}
        defaultRole={candidate.roleApplyingFor}
        defaultLevel={candidate.levelApplyingFor || undefined}
      />

      <ImportToEmployeeDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        candidateId={candidateId}
        candidateName={candidate.name}
      />
    </Layout>
  );
}
