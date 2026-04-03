import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/alert";
import { getApiUrl } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const MEETING_TYPES = [
  { value: "one_on_one", label: "1:1 Meeting" },
  { value: "performance_check_in", label: "Performance Check-in" },
  { value: "project_debrief", label: "Project Debrief" },
  { value: "career_conversation", label: "Career Conversation" },
  { value: "other", label: "Other" },
];

const REVIEW_TYPES = ["self", "peer", "manager"];

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  const pct = (value / 5) * 100;
  const color = value >= 4 ? "bg-green-500" : value >= 3 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AddReviewDialog({ open, onClose, employeeId }: { open: boolean; onClose: () => void; employeeId: number }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    reviewType: "manager", period: new Date().toISOString().slice(0, 7),
    technicalScore: "3", communicationScore: "3", problemSolvingScore: "3", teamworkScore: "3", leadershipScore: "3",
    strengths: "", areasToImprove: "", goals: "",
  });
  const [error, setError] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(getApiUrl(`/employees/${employeeId}/reviews`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["scoreHistory", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
      onClose();
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Performance Review</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => { e.preventDefault(); mutate({ ...form, technicalScore: parseInt(form.technicalScore), communicationScore: parseInt(form.communicationScore), problemSolvingScore: parseInt(form.problemSolvingScore), teamworkScore: parseInt(form.teamworkScore), leadershipScore: parseInt(form.leadershipScore) }); }} className="space-y-4 mt-2">
          {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Review type</Label>
              <Select value={form.reviewType} onValueChange={v => setForm(f => ({ ...f, reviewType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REVIEW_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Period (YYYY-MM)</Label>
              <Input value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} placeholder="2024-Q4" required />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Scores (1-5)</Label>
            {[
              ["technicalScore", "Technical"],
              ["communicationScore", "Communication"],
              ["problemSolvingScore", "Problem Solving"],
              ["teamworkScore", "Teamwork"],
              ["leadershipScore", "Leadership"],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-32 shrink-0">{label}</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, [key]: String(n) }))}
                      className={`w-8 h-8 rounded text-sm font-medium border transition-colors ${
                        form[key as keyof typeof form] === String(n)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary/50 hover:bg-accent"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Strengths</Label>
            <Textarea value={form.strengths} onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))} rows={2} placeholder="What went well..." />
          </div>
          <div className="space-y-1.5">
            <Label>Areas to improve</Label>
            <Textarea value={form.areasToImprove} onChange={e => setForm(f => ({ ...f, areasToImprove: e.target.value }))} rows={2} placeholder="Growth opportunities..." />
          </div>
          <div className="space-y-1.5">
            <Label>Goals</Label>
            <Textarea value={form.goals} onChange={e => setForm(f => ({ ...f, goals: e.target.value }))} rows={2} placeholder="Goals for next period..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save review"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddFeedbackDialog({ open, onClose, employeeId }: { open: boolean; onClose: () => void; employeeId: number }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    meetingType: "one_on_one", meetingDate: new Date().toISOString().split("T")[0],
    whatWentWell: "", areasToImprove: "", actionItems: "", nextSteps: "",
  });
  const [error, setError] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(getApiUrl(`/employees/${employeeId}/feedback`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
      onClose();
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Feedback Session</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => { e.preventDefault(); mutate(form); }} className="space-y-4 mt-2">
          {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Meeting type</Label>
              <Select value={form.meetingType} onValueChange={v => setForm(f => ({ ...f, meetingType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEETING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Meeting date</Label>
              <Input type="date" value={form.meetingDate} onChange={e => setForm(f => ({ ...f, meetingDate: e.target.value }))} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>What went well</Label>
            <Textarea value={form.whatWentWell} onChange={e => setForm(f => ({ ...f, whatWentWell: e.target.value }))} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Areas to improve</Label>
            <Textarea value={form.areasToImprove} onChange={e => setForm(f => ({ ...f, areasToImprove: e.target.value }))} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Action items</Label>
            <Textarea value={form.actionItems} onChange={e => setForm(f => ({ ...f, actionItems: e.target.value }))} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Next steps</Label>
            <Textarea value={form.nextSteps} onChange={e => setForm(f => ({ ...f, nextSteps: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Log session"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ShareDialog({ open, onClose, employeeId }: { open: boolean; onClose: () => void; employeeId: number }) {
  const [expiresIn, setExpiresIn] = useState<"7days" | "30days" | "never">("7days");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl(`/employees/${employeeId}/share`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ expiresIn }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      return res.json();
    },
    onSuccess: (data) => {
      const token = data.token;
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
      setShareUrl(`${window.location.origin}${base}/share/${token}`);
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Employee Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</p>}
          <div className="space-y-1.5">
            <Label>Link expires in</Label>
            <Select value={expiresIn} onValueChange={v => setExpiresIn(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">7 days</SelectItem>
                <SelectItem value="30days">30 days</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!shareUrl ? (
            <Button onClick={() => mutate()} disabled={isPending} className="w-full">
              {isPending ? "Generating..." : "Generate share link"}
            </Button>
          ) : (
            <div className="space-y-2">
              <Label>Share URL</Label>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="text-xs" />
                <Button size="sm" variant="outline" onClick={handleCopy}>{copied ? "Copied!" : "Copy"}</Button>
              </div>
              <p className="text-xs text-muted-foreground">Anyone with this link can view this employee's profile (read-only)</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DevPlanTab({ employeeId }: { employeeId: number }) {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  const { data: plan, isLoading } = useQuery({
    queryKey: ["devplan", employeeId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/employees/${employeeId}/dev-plan`), { headers: authHeaders() });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { mutate: toggleSkill } = useMutation({
    mutationFn: async ({ skillId, completed }: { skillId: number; completed: boolean }) => {
      const res = await fetch(getApiUrl(`/employees/${employeeId}/dev-plan/skills/${skillId}/complete`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["devplan", employeeId] }),
  });

  async function handleGenerate() {
    setGenerating(true);
    setGenError("");
    try {
      const res = await fetch(getApiUrl(`/employees/${employeeId}/dev-plan/generate`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: "{}",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Generation failed");
      queryClient.invalidateQueries({ queryKey: ["devplan", employeeId] });
    } catch (err: any) {
      setGenError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">AI Development Plan</h3>
          {plan && <p className="text-xs text-muted-foreground mt-0.5">Generated {new Date(plan.generatedAt).toLocaleDateString()}</p>}
        </div>
        <Button variant={plan ? "outline" : "default"} size="sm" onClick={handleGenerate} disabled={generating}>
          {generating ? "Generating..." : plan ? "Regenerate" : "Generate plan"}
        </Button>
      </div>

      {generating && (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="text-muted-foreground text-sm">Generating development plan with AI...</div>
            <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
            </div>
          </CardContent>
        </Card>
      )}

      {genError && <Alert variant="destructive" className="text-sm">{genError}</Alert>}

      {!plan && !generating ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No development plan yet. Generate one based on this employee's reviews and feedback.
          </CardContent>
        </Card>
      ) : plan && (
        <div className="space-y-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <p className="text-sm leading-relaxed">{plan.summary}</p>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {plan.skills?.map((skill: any) => (
              <Card key={skill.id} className={skill.completed ? "opacity-60" : ""}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={skill.completed}
                      onCheckedChange={(checked) => toggleSkill({ skillId: skill.id, completed: !!checked })}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm ${skill.completed ? "line-through text-muted-foreground" : ""}`}>{skill.skillName}</span>
                        <Badge variant="outline" className="text-xs">Priority {skill.priority}</Badge>
                        {skill.timeline && <Badge variant="secondary" className="text-xs">{skill.timeline}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{skill.description}</p>
                      {skill.nextSteps && (
                        <div className="mt-2 text-xs">
                          <span className="font-medium">Next step: </span>
                          <span className="text-muted-foreground">{skill.nextSteps}</span>
                        </div>
                      )}
                      {skill.resources && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          <span className="font-medium">Resources: </span>{skill.resources}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const employeeId = parseInt(params.id!);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: employee, isLoading: loadingEmployee } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/employees/${employeeId}`), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: reviews = [], isLoading: loadingReviews } = useQuery<any[]>({
    queryKey: ["reviews", employeeId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/employees/${employeeId}/reviews`), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: feedback = [], isLoading: loadingFeedback } = useQuery<any[]>({
    queryKey: ["feedback", employeeId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/employees/${employeeId}/feedback`), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: scoreHistory = [] } = useQuery<any[]>({
    queryKey: ["scoreHistory", employeeId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/employees/${employeeId}/score-history`), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { mutate: deleteEmployee } = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl(`/employees/${employeeId}`), {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      navigate("/employees");
    },
  });

  const avgReviewScores = reviews.length ? {
    technicalScore: reviews.reduce((s: number, r: any) => s + (r.technicalScore || 0), 0) / reviews.filter((r: any) => r.technicalScore).length || null,
    communicationScore: reviews.reduce((s: number, r: any) => s + (r.communicationScore || 0), 0) / reviews.filter((r: any) => r.communicationScore).length || null,
    problemSolvingScore: reviews.reduce((s: number, r: any) => s + (r.problemSolvingScore || 0), 0) / reviews.filter((r: any) => r.problemSolvingScore).length || null,
    teamworkScore: reviews.reduce((s: number, r: any) => s + (r.teamworkScore || 0), 0) / reviews.filter((r: any) => r.teamworkScore).length || null,
    leadershipScore: reviews.reduce((s: number, r: any) => s + (r.leadershipScore || 0), 0) / reviews.filter((r: any) => r.leadershipScore).length || null,
  } : null;

  const radarData = avgReviewScores ? [
    { subject: "Technical", A: avgReviewScores.technicalScore || 0 },
    { subject: "Communication", A: avgReviewScores.communicationScore || 0 },
    { subject: "Problem Solving", A: avgReviewScores.problemSolvingScore || 0 },
    { subject: "Teamwork", A: avgReviewScores.teamworkScore || 0 },
    { subject: "Leadership", A: avgReviewScores.leadershipScore || 0 },
  ] : [];

  const chartData = scoreHistory.filter((r: any) => r.overallScore != null).map((r: any) => ({
    period: r.period,
    score: parseFloat(r.overallScore?.toFixed(2)),
    type: r.reviewType,
  }));

  if (loadingEmployee) return (
    <Layout>
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    </Layout>
  );

  if (!employee) return (
    <Layout>
      <div className="text-center py-12 text-muted-foreground">Employee not found.</div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {employee.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{employee.name}</h1>
              <p className="text-muted-foreground">{employee.role}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{employee.department}</Badge>
                <Badge variant="secondary">{employee.level}</Badge>
                {employee.latestScore != null && (
                  <Badge className={employee.latestScore >= 4 ? "bg-green-100 text-green-800 border-green-200" : employee.latestScore >= 3 ? "bg-yellow-100 text-yellow-800 border-yellow-200" : "bg-red-100 text-red-800 border-red-200"}>
                    {employee.latestScore.toFixed(1)} / 5
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>Share profile</Button>
            <Button variant="outline" size="sm" onClick={() => setFeedbackOpen(true)}>Log feedback</Button>
            <Button size="sm" onClick={() => setReviewOpen(true)}>Add review</Button>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-muted-foreground">Email</div><div className="text-sm font-medium truncate">{employee.email}</div></CardContent></Card>
          <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-muted-foreground">Start date</div><div className="text-sm font-medium">{employee.startDate}</div></CardContent></Card>
          <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-muted-foreground">Manager</div><div className="text-sm font-medium">{employee.managerName || "—"}</div></CardContent></Card>
          <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-muted-foreground">Reviews</div><div className="text-sm font-medium">{employee.reviewCount}</div></CardContent></Card>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
            <TabsTrigger value="feedback">Feedback ({feedback.length})</TabsTrigger>
            <TabsTrigger value="devplan">Dev Plan</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {reviews.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No reviews yet. Add a performance review to see score analytics.</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Competency Radar</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                        <Radar dataKey="A" stroke="hsl(221 83% 53%)" fill="hsl(221 83% 53%)" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Score Breakdown</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {avgReviewScores && <>
                      <ScoreBar label="Technical" value={avgReviewScores.technicalScore} />
                      <ScoreBar label="Communication" value={avgReviewScores.communicationScore} />
                      <ScoreBar label="Problem Solving" value={avgReviewScores.problemSolvingScore} />
                      <ScoreBar label="Teamwork" value={avgReviewScores.teamworkScore} />
                      <ScoreBar label="Leadership" value={avgReviewScores.leadershipScore} />
                    </>}
                  </CardContent>
                </Card>
                {chartData.length > 1 && (
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-2"><CardTitle className="text-base">Score History</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: number) => v.toFixed(1)} />
                          <Line type="monotone" dataKey="score" stroke="hsl(221 83% 53%)" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="mt-4 space-y-3">
            {loadingReviews ? <Skeleton className="h-32 w-full" /> : reviews.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No reviews yet.</CardContent></Card>
            ) : reviews.map((review: any) => (
              <Card key={review.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{review.reviewType}</Badge>
                      <span className="text-sm font-medium">{review.period}</span>
                    </div>
                    {review.overallScore != null && (
                      <span className="text-lg font-bold">{review.overallScore.toFixed(1)}<span className="text-xs text-muted-foreground font-normal">/5</span></span>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {[
                      ["Tech", review.technicalScore],
                      ["Comm", review.communicationScore],
                      ["PS", review.problemSolvingScore],
                      ["Team", review.teamworkScore],
                      ["Lead", review.leadershipScore],
                    ].map(([label, score]) => (
                      score != null && (
                        <div key={label} className="text-center">
                          <div className="text-sm font-medium">{score}</div>
                          <div className="text-xs text-muted-foreground">{label}</div>
                        </div>
                      )
                    ))}
                  </div>
                  {review.strengths && <p className="text-sm text-muted-foreground mb-1"><span className="font-medium text-foreground">Strengths: </span>{review.strengths}</p>}
                  {review.areasToImprove && <p className="text-sm text-muted-foreground mb-1"><span className="font-medium text-foreground">Areas to improve: </span>{review.areasToImprove}</p>}
                  {review.goals && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Goals: </span>{review.goals}</p>}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="feedback" className="mt-4 space-y-3">
            {loadingFeedback ? <Skeleton className="h-32 w-full" /> : feedback.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No feedback sessions logged yet.</CardContent></Card>
            ) : feedback.map((entry: any) => (
              <Card key={entry.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline">{MEETING_TYPES.find(m => m.value === entry.meetingType)?.label || entry.meetingType}</Badge>
                    <span className="text-sm text-muted-foreground">{entry.meetingDate}</span>
                  </div>
                  {entry.whatWentWell && <p className="text-sm mb-1"><span className="font-medium">What went well: </span><span className="text-muted-foreground">{entry.whatWentWell}</span></p>}
                  {entry.areasToImprove && <p className="text-sm mb-1"><span className="font-medium">Areas to improve: </span><span className="text-muted-foreground">{entry.areasToImprove}</span></p>}
                  {entry.actionItems && <p className="text-sm mb-1"><span className="font-medium">Action items: </span><span className="text-muted-foreground">{entry.actionItems}</span></p>}
                  {entry.nextSteps && <p className="text-sm"><span className="font-medium">Next steps: </span><span className="text-muted-foreground">{entry.nextSteps}</span></p>}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="devplan" className="mt-4">
            <DevPlanTab employeeId={employeeId} />
          </TabsContent>
        </Tabs>

        {/* Danger zone */}
        <div className="border-t pt-4">
          {!deleteConfirm ? (
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirm(true)}>
              Delete employee
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">This will permanently delete all data for {employee.name}.</span>
              <Button variant="destructive" size="sm" onClick={() => deleteEmployee()}>Confirm delete</Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
            </div>
          )}
        </div>
      </div>

      <AddReviewDialog open={reviewOpen} onClose={() => setReviewOpen(false)} employeeId={employeeId} />
      <AddFeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} employeeId={employeeId} />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} employeeId={employeeId} />
    </Layout>
  );
}
