import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  panelistEmail?: string | null;
  interviewerName?: string | null;
}

interface PanelInvite {
  id: number;
  email: string;
  role: string;
  level: string;
  interviewDate: string;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}

interface PanelSummaryData {
  summary: {
    consensus?: string;
    disagreements?: string;
    overallRead?: string;
    suggestedRecommendation?: string;
    keyThemes?: string[];
  } | null;
  generatedAt: string | null;
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

function InvitePanelDialog({
  open, onClose, candidateId, defaultRole, defaultLevel,
}: {
  open: boolean; onClose: () => void;
  candidateId: number; defaultRole?: string; defaultLevel?: string;
}) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState(defaultRole || "");
  const [level, setLevel] = useState(defaultLevel || "");
  const [interviewDate, setInterviewDate] = useState(new Date().toISOString().split("T")[0]);
  const [emailsText, setEmailsText] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState<Array<{ email: string; emailSent: boolean; emailError?: string }> | null>(null);

  const selectedRole = ROLE_TEMPLATES.find(r => r.role === role);
  const parsedEmails = emailsText.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!role || !level) throw new Error("Select role and level");
      if (parsedEmails.length === 0) throw new Error("Enter at least one email address");
      const roleLabel = selectedRole
        ? `${selectedRole.roleLabel} · ${selectedRole.levels.find(l => l.level === level)?.levelLabel ?? level}`
        : role;
      const res = await fetch(getApiUrl(`/candidates/${candidateId}/panel-invites`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ roleAssessed: role, level, interviewDate, emails: parsedEmails, roleLabel }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to send invites");
      return res.json();
    },
    onSuccess: (data: Array<{ email: string; emailSent: boolean; emailError?: string }>) => {
      setError("");
      setResults(data);
      queryClient.invalidateQueries({ queryKey: ["panel-invites", candidateId] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleClose = () => {
    setResults(null);
    setEmailsText("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite Interview Panel</DialogTitle>
        </DialogHeader>
        {results ? (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              {results.filter(r => r.emailSent).length} of {results.length} invitation{results.length > 1 ? "s" : ""} sent successfully.
            </p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className="flex items-start justify-between gap-3 text-sm border rounded-md px-3 py-2">
                  <span className="truncate">{r.email}</span>
                  {r.emailSent ? (
                    <Badge className="text-xs bg-green-100 text-green-700 shrink-0">Sent</Badge>
                  ) : (
                    <div className="text-right shrink-0 max-w-[55%]">
                      <Badge className="text-xs bg-red-100 text-red-700">Not sent</Badge>
                      {r.emailError && <p className="text-xs text-muted-foreground mt-1">{r.emailError}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</p>}
            <p className="text-sm text-muted-foreground">
              Panelists receive an email with a secure link to complete the same interview assessment form — no account required. Their responses appear on this candidate's page.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Role <span className="text-destructive">*</span></Label>
                <Select value={role} onValueChange={v => { setRole(v); setLevel(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                  <SelectContent>
                    {ROLE_TEMPLATES.map(r => <SelectItem key={r.role} value={r.role}>{r.roleLabel}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Level <span className="text-destructive">*</span></Label>
                <Select value={level} onValueChange={setLevel} disabled={!selectedRole}>
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
            <div className="space-y-1.5">
              <Label>Panelist emails <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder={"jane@company.com\nmark@company.com"}
                value={emailsText}
                onChange={e => setEmailsText(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                One per line, or separated by commas.{parsedEmails.length > 0 ? ` ${parsedEmails.length} recipient${parsedEmails.length > 1 ? "s" : ""}.` : ""} Links expire in 7 days.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={() => mutate()} disabled={isPending}>
                {isPending ? "Sending..." : "Send invitations"}
              </Button>
            </DialogFooter>
          </div>
        )}
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
              {assessment.panelistEmail
                ? <> · <span className="text-primary">Panel: {assessment.panelistEmail}</span></>
                : assessment.interviewerName
                ? <> · {assessment.interviewerName}</>
                : <> · Internal</>}
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

const RECOMMENDATION_META: Record<string, { label: string; color: string }> = Object.fromEntries(
  OVERALL_RECOMMENDATIONS.map(r => [r.value, { label: r.label, color: r.color }])
);

function PanelSummaryTab({ candidateId, assessments }: { candidateId: number; assessments: Assessment[] }) {
  const queryClient = useQueryClient();
  const [aiError, setAiError] = useState("");

  const { data: summaryData } = useQuery<PanelSummaryData>({
    queryKey: ["panel-summary", candidateId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/candidates/${candidateId}/panel-summary`), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load panel summary");
      return res.json();
    },
  });

  const { mutate: generate, isPending: generating } = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl(`/candidates/${candidateId}/panel-summary/generate`), {
        method: "POST", headers: authHeaders(),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to generate summary");
      return res.json();
    },
    onSuccess: (data: PanelSummaryData) => {
      setAiError("");
      queryClient.setQueryData(["panel-summary", candidateId], data);
    },
    onError: (err: Error) => setAiError(err.message),
  });

  // Per-criterion aggregation across all assessments
  const perSkill = new Map<string, number[]>();
  const recTally = new Map<string, number>();
  const overallScores: number[] = [];
  for (const a of assessments) {
    if (a.scores) {
      for (const [skill, s] of Object.entries(JSON.parse(a.scores) as Record<string, number>)) {
        if (!perSkill.has(skill)) perSkill.set(skill, []);
        perSkill.get(skill)!.push(s);
      }
    }
    if (a.overallScore) overallScores.push(parseFloat(a.overallScore));
    if (a.overallRecommendation) recTally.set(a.overallRecommendation, (recTally.get(a.overallRecommendation) || 0) + 1);
  }
  const overallAvg = overallScores.length
    ? (overallScores.reduce((x, y) => x + y, 0) / overallScores.length).toFixed(1)
    : null;

  const skillRows = [...perSkill.entries()]
    .map(([skill, vals]) => ({
      skill,
      avg: vals.reduce((x, y) => x + y, 0) / vals.length,
      min: Math.min(...vals),
      max: Math.max(...vals),
      count: vals.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  if (assessments.length < 2) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          The panel summary becomes available once at least two assessments have been submitted.
        </CardContent>
      </Card>
    );
  }

  const summary = summaryData?.summary;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Overall average · {assessments.length} assessments</p>
            <div className="text-2xl font-bold">{overallAvg ?? "—"}<span className="text-sm font-normal text-muted-foreground">/5</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground mb-2">Recommendations</p>
            {recTally.size === 0 ? (
              <p className="text-sm text-muted-foreground">No recommendations given yet</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {[...recTally.entries()].sort((a, b) => b[1] - a[1]).map(([rec, count]) => {
                  const meta = RECOMMENDATION_META[rec];
                  return (
                    <Badge key={rec} className={`text-xs ${meta?.color ?? "bg-gray-100 text-gray-700"}`}>
                      {meta?.label ?? rec} × {count}
                    </Badge>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm font-medium">Average score per criterion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {skillRows.map(row => {
            const spread = row.max - row.min;
            return (
              <div key={row.skill}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate flex-1">{row.skill}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {spread >= 2 && (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                        Split {row.min}–{row.max}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{row.count} score{row.count > 1 ? "s" : ""}</span>
                    <span className="font-medium w-8 text-right">{row.avg.toFixed(1)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(row.avg / 5) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">AI panel analysis</CardTitle>
          <Button size="sm" variant="outline" onClick={() => generate()} disabled={generating}>
            {generating ? "Analyzing..." : summary ? "Regenerate" : "Generate analysis"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {aiError && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{aiError}</p>}
          {!summary && !generating && (
            <p className="text-sm text-muted-foreground">
              Generate an AI synthesis of all panel notes, scores, and recommendations — consensus, disagreements, and an overall read.
            </p>
          )}
          {generating && <p className="text-sm text-muted-foreground">Analyzing {assessments.length} assessments…</p>}
          {summary && !generating && (
            <>
              {summary.suggestedRecommendation && RECOMMENDATION_META[summary.suggestedRecommendation] && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Suggested outcome:</span>
                  <Badge className={`text-xs ${RECOMMENDATION_META[summary.suggestedRecommendation].color}`}>
                    {RECOMMENDATION_META[summary.suggestedRecommendation].label}
                  </Badge>
                </div>
              )}
              {summary.consensus && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Where the panel agrees</p>
                  <p className="text-sm">{summary.consensus}</p>
                </div>
              )}
              {summary.disagreements && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Where opinions diverge</p>
                  <p className="text-sm">{summary.disagreements}</p>
                </div>
              )}
              {summary.overallRead && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Overall read</p>
                  <p className="text-sm">{summary.overallRead}</p>
                </div>
              )}
              {summary.keyThemes && summary.keyThemes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {summary.keyThemes.map((t, i) => <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>)}
                </div>
              )}
              {summaryData?.generatedAt && (
                <p className="text-xs text-muted-foreground">Generated {new Date(summaryData.generatedAt).toLocaleString()}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const candidateId = parseInt(params.id!);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [assessOpen, setAssessOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
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

  const { data: panelInvites = [] } = useQuery<PanelInvite[]>({
    queryKey: ["panel-invites", candidateId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/candidates/${candidateId}/panel-invites`), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load panel invites");
      return res.json();
    },
    // Poll while invitations are outstanding so new panel responses appear without a manual refresh
    refetchInterval: q => (q.state.data ?? []).some(i => i.status === "pending") ? 30000 : false,
  });
  const pendingInvites = panelInvites.filter(i => i.status !== "completed");
  const completedInviteCount = panelInvites.filter(i => i.status === "completed").length;

  useEffect(() => {
    // A panelist just submitted — refresh the assessments list and clear any stale AI summary
    queryClient.invalidateQueries({ queryKey: ["candidate", candidateId] });
    queryClient.invalidateQueries({ queryKey: ["panel-summary", candidateId] });
  }, [completedInviteCount, candidateId, queryClient]);

  const { mutate: deleteInvite } = useMutation({
    mutationFn: async (inviteId: number) => {
      const res = await fetch(getApiUrl(`/candidates/${candidateId}/panel-invites/${inviteId}`), {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to remove invite");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["panel-invites", candidateId] }),
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
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
              Invite panel
            </Button>
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

        {pendingInvites.length > 0 && (
          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground font-medium mb-2">Pending panel invitations</p>
              <div className="space-y-1.5">
                {pendingInvites.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{inv.email}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {inv.status === "expired" ? (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Expired</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Awaiting response</Badge>
                      )}
                      <button
                        className="text-xs text-muted-foreground hover:text-destructive underline"
                        onClick={() => deleteInvite(inv.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-base font-semibold mb-3">Interview Assessments ({candidate.assessments.length})</h2>
          {candidate.assessments.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No assessments yet. Click "Add interview assessment" to evaluate this candidate, or "Invite panel" to collect assessments from panelists by email.
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="responses">
              <TabsList className="mb-3">
                <TabsTrigger value="responses">Individual responses</TabsTrigger>
                <TabsTrigger value="summary">Panel summary</TabsTrigger>
              </TabsList>
              <TabsContent value="responses">
                <div className="space-y-3">
                  {candidate.assessments.map(a => (
                    <AssessmentCard key={a.id} assessment={a} />
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="summary">
                <PanelSummaryTab candidateId={candidateId} assessments={candidate.assessments} />
              </TabsContent>
            </Tabs>
          )}
        </div>

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

      <InvitePanelDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
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
