import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/alert";
import { getApiUrl } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { BEHAVIORAL_SKILL_CATEGORIES, BEHAVIORAL_SKILL_BY_KEY } from "@/lib/behavioral-skills";

interface ReviewItem {
  id: number;
  employeeId: number;
  reviewType: string;
  period: string;
  technicalScore: number | null;
  communicationScore: number | null;
  problemSolvingScore: number | null;
  teamworkScore: number | null;
  leadershipScore: number | null;
  overallScore: number | null;
  strengths: string | null;
  areasToImprove: string | null;
  goals: string | null;
  recommendation: string | null;
  behavioralScores: Record<string, number> | null;
  createdAt: string;
}

interface FeedbackEntry {
  id: number;
  employeeId: number;
  meetingType: string;
  meetingDate: string;
  whatWentWell: string | null;
  areasToImprove: string | null;
  actionItems: string | null;
  nextSteps: string | null;
  employeeResponse: string | null;
  createdAt: string;
}

interface DevPlanSkill {
  id: number;
  devPlanId: number;
  skillName: string;
  description: string | null;
  priority: number;
  timeline: string | null;
  resources: string | null;
  nextSteps: string | null;
  completed: boolean;
}

interface ScoreHistoryItem {
  id: number;
  period: string;
  reviewType: string;
  overallScore: number | null;
}

interface PeerReviewRequest {
  id: number;
  peerEmail: string;
  peerName: string | null;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  token: string;
}

interface PeerReview {
  id: number;
  requestId: number;
  peerEmail: string;
  personalPlanningScore: string | null;
  personalPlanningComment: string | null;
  trackPlanningScore: string | null;
  trackPlanningComment: string | null;
  solutionDrivenScore: string | null;
  solutionDrivenComment: string | null;
  teamLeadershipScore: string | null;
  teamLeadershipComment: string | null;
  persuasionScore: string | null;
  persuasionComment: string | null;
  crossFunctionalScore: string | null;
  crossFunctionalComment: string | null;
  businessAlignmentScore: string | null;
  businessAlignmentComment: string | null;
  customerCentricScore: string | null;
  customerCentricComment: string | null;
  dataInformedScore: string | null;
  dataInformedComment: string | null;
  promotionRecommendation: string | null;
  strengths: string | null;
  areasToImprove: string | null;
  submittedAt: string;
}

type ExpiresIn = "7days" | "30days" | "never";

interface FeedbackFormData {
  meetingType: string;
  meetingDate: string;
  whatWentWell: string;
  areasToImprove: string;
  actionItems: string;
  nextSteps: string;
}

function authHeaders(): Record<string, string> {
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

const REVIEW_TYPES: { value: string; label: string }[] = [
  { value: "manager", label: "Manager review" },
  { value: "self", label: "Self-reflection (request from employee)" },
  { value: "peer", label: "Peer review (request from colleagues)" },
];

const REVIEW_TYPE_LABEL: Record<string, string> = {
  self: "Self-reflection",
  peer: "Peer",
  manager: "Manager review",
};

const RECOMMENDATION_OPTIONS = [
  { value: "promotable", label: "Promotable" },
  { value: "meets_expectations", label: "Meets Expectations" },
  { value: "needs_improvement", label: "Needs Improvement" },
];

const SCORE_LABEL: Record<string, { label: string; color: string }> = {
  needs_improvement: { label: "Needs Improvement", color: "bg-red-100 text-red-800 border-red-200" },
  meets_expectations: { label: "Meets Expectations", color: "bg-blue-100 text-blue-800 border-blue-200" },
  often_exceeds: { label: "Often Exceeds", color: "bg-purple-100 text-purple-800 border-purple-200" },
  exceptional: { label: "Exceptional", color: "bg-green-100 text-green-800 border-green-200" },
  na: { label: "N/A", color: "bg-gray-100 text-gray-600 border-gray-200" },
};

function recommendationBadge(rec: string | null) {
  if (!rec) return null;
  const colors: Record<string, string> = {
    promotable: "bg-green-100 text-green-800 border-green-200",
    meets_expectations: "bg-blue-100 text-blue-800 border-blue-200",
    needs_improvement: "bg-orange-100 text-orange-800 border-orange-200",
  };
  const labels: Record<string, string> = {
    promotable: "Promotable",
    meets_expectations: "Meets Expectations",
    needs_improvement: "Needs Improvement",
  };
  return (
    <Badge className={`text-xs ${colors[rec] ?? "bg-gray-100 text-gray-800"}`}>
      {labels[rec] ?? rec}
    </Badge>
  );
}

function priorityLabel(priority: number): { label: string; className: string } {
  if (priority === 1) return { label: "High", className: "bg-red-100 text-red-800 border-red-200" };
  if (priority === 2) return { label: "Medium", className: "bg-yellow-100 text-yellow-800 border-yellow-200" };
  return { label: "Low", className: "bg-green-100 text-green-800 border-green-200" };
}

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

function RequestPeerReviewDialog({ open, onClose, employeeId, employeeName }: { open: boolean; onClose: () => void; employeeId: number; employeeName: string }) {
  const queryClient = useQueryClient();
  const [emails, setEmails] = useState("");
  const [expiresIn, setExpiresIn] = useState("30");
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ peerEmail: string; token: string; emailSent: boolean; emailError?: string }[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const peerEmails = emails.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean);
      if (!peerEmails.length) throw new Error("Enter at least one peer email");
      const res = await fetch(getApiUrl(`/employees/${employeeId}/peer-review-requests`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          peerEmails,
          expiresInDays: expiresIn === "never" ? null : Number(expiresIn),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      return res.json();
    },
    onSuccess: (data) => {
      setCreated(data.map((r: { peerEmail: string; token: string; emailSent: boolean; emailError?: string }) => ({
        peerEmail: r.peerEmail,
        token: r.token,
        emailSent: r.emailSent,
        emailError: r.emailError,
      })));
      queryClient.invalidateQueries({ queryKey: ["peerReviewRequests", employeeId] });
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  function getLink(token: string) {
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
    return `${window.location.origin}${base}/peer-review/${token}`;
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(getLink(token));
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)]">
        <DialogHeader className="min-w-0">
          <DialogTitle>Request Peer Reviews</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2 min-w-0">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            Peer reviews collect <strong>soft skills feedback</strong> from colleagues. Each peer will be emailed a private link to a confidential form.
          </div>

          {!created.length ? (
            <>
              <p className="text-sm text-muted-foreground">Requesting peer reviews for <strong>{employeeName}</strong></p>
              {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</p>}
              <div className="space-y-1.5">
                <Label>Peer emails</Label>
                <Textarea
                  placeholder="Enter emails separated by commas or new lines:&#10;alice@company.com&#10;bob@company.com"
                  value={emails}
                  onChange={e => setEmails(e.target.value)}
                  rows={4}
                  className="text-sm font-mono"
                />
                <p className="text-xs text-muted-foreground">Enter one email per line, or separate with commas</p>
              </div>
              <div className="space-y-1.5">
                <Label>Link expires in</Label>
                <Select value={expiresIn} onValueChange={setExpiresIn}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="never">Never expires</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={() => mutate()} disabled={isPending}>
                  {isPending ? "Sending..." : "Send invitations"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              {created.every(r => r.emailSent) ? (
                <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded border border-green-200">
                  Invitation email{created.length > 1 ? "s" : ""} sent to {created.length} peer{created.length > 1 ? "s" : ""}. Copy links below as a backup.
                </p>
              ) : (
                <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded border border-amber-200">
                  {created.length} request{created.length > 1 ? "s" : ""} created. Some emails could not be sent — please share the links below manually.
                </p>
              )}
              <div className="space-y-2">
                {created.map(r => (
                  <div key={r.token} className="rounded-lg border bg-muted/30 p-3 space-y-2 min-w-0">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <p className="text-sm font-medium truncate min-w-0 flex-1">{r.peerEmail}</p>
                      {r.emailSent
                        ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 shrink-0 font-medium">Email sent</span>
                        : <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 shrink-0 font-medium">Email failed</span>}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex-1 min-w-0 px-2.5 py-1.5 rounded border bg-background text-xs font-mono text-muted-foreground truncate">
                        {getLink(r.token)}
                      </div>
                      <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={() => copyLink(r.token)}>
                        {copied === r.token ? "Copied!" : "Copy link"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button onClick={onClose}>Done</Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddReviewDialog({ open, onClose, employeeId, employeeEmail, employeeName }: { open: boolean; onClose: () => void; employeeId: number; employeeEmail: string; employeeName: string }) {
  const queryClient = useQueryClient();
  const [reviewType, setReviewType] = useState<string>("manager");

  // Manager-review form state
  const [form, setForm] = useState({
    period: new Date().toISOString().slice(0, 7),
    technicalScore: "3", communicationScore: "3", problemSolvingScore: "3", teamworkScore: "3", leadershipScore: "3",
    strengths: "", areasToImprove: "", goals: "", recommendation: "",
  });
  const [behavioral, setBehavioral] = useState<Record<string, number>>({});
  const [error, setError] = useState("");

  // Self-reflection request state
  const [reflectionForm, setReflectionForm] = useState({
    employeeEmail: employeeEmail || "",
    period: `${new Date().getFullYear()} Self-reflection`,
    message: "",
    expiresInDays: "14",
  });
  const [reflectionError, setReflectionError] = useState("");
  const [reflectionResult, setReflectionResult] = useState<{ emailSent: boolean; emailError?: string; reflectionLink?: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Peer-review request state
  const [peerEmails, setPeerEmails] = useState("");
  const [peerExpiresIn, setPeerExpiresIn] = useState("30");
  const [peerError, setPeerError] = useState("");
  const [peerCreated, setPeerCreated] = useState<{ peerEmail: string; token: string; emailSent: boolean; emailError?: string }[]>([]);
  const [peerCopied, setPeerCopied] = useState<string | null>(null);

  function getPeerLink(token: string) {
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
    return `${window.location.origin}${base}/peer-review/${token}`;
  }

  function copyPeerLink(token: string) {
    navigator.clipboard.writeText(getPeerLink(token));
    setPeerCopied(token);
    setTimeout(() => setPeerCopied(null), 2000);
  }

  function handleClose() {
    setError("");
    setReflectionError("");
    setReflectionResult(null);
    setPeerError("");
    setPeerCreated([]);
    setPeerEmails("");
    onClose();
  }

  const { mutate: createReview, isPending: savingReview } = useMutation({
    mutationFn: async () => {
      const data = {
        reviewType: "manager",
        period: form.period,
        technicalScore: parseInt(form.technicalScore),
        communicationScore: parseInt(form.communicationScore),
        problemSolvingScore: parseInt(form.problemSolvingScore),
        teamworkScore: parseInt(form.teamworkScore),
        leadershipScore: parseInt(form.leadershipScore),
        strengths: form.strengths,
        areasToImprove: form.areasToImprove,
        goals: form.goals,
        recommendation: form.recommendation,
        behavioralScores: behavioral,
      };
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
      handleClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const { mutate: sendReflectionRequest, isPending: sendingRequest } = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl(`/employees/${employeeId}/self-reflection-requests`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          employeeEmail: reflectionForm.employeeEmail,
          period: reflectionForm.period,
          message: reflectionForm.message || null,
          expiresInDays: parseInt(reflectionForm.expiresInDays) || 14,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send request");
      return json as { emailSent: boolean; emailError?: string; reflectionLink?: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["selfReflectionRequests", employeeId] });
      setReflectionResult(data);
    },
    onError: (err: Error) => setReflectionError(err.message),
  });

  const { mutate: sendPeerRequests, isPending: sendingPeer } = useMutation({
    mutationFn: async () => {
      const list = peerEmails.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean);
      if (!list.length) throw new Error("Enter at least one peer email");
      const res = await fetch(getApiUrl(`/employees/${employeeId}/peer-review-requests`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          peerEmails: list,
          expiresInDays: peerExpiresIn === "never" ? null : Number(peerExpiresIn),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      return res.json();
    },
    onSuccess: (data) => {
      setPeerCreated(data.map((r: { peerEmail: string; token: string; emailSent: boolean; emailError?: string }) => ({
        peerEmail: r.peerEmail,
        token: r.token,
        emailSent: r.emailSent,
        emailError: r.emailError,
      })));
      queryClient.invalidateQueries({ queryKey: ["peerReviewRequests", employeeId] });
      setPeerError("");
    },
    onError: (err: Error) => setPeerError(err.message),
  });

  const dialogTitle =
    reviewType === "self" ? "Request Self-Reflection"
    : reviewType === "peer" ? "Request Peer Reviews"
    : "Add Performance Review";

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5 mt-2">
          <Label>Review type</Label>
          <Select value={reviewType} onValueChange={v => { setReviewType(v); setError(""); setReflectionError(""); setReflectionResult(null); setPeerError(""); setPeerCreated([]); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REVIEW_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {reviewType === "peer" ? (
          peerCreated.length ? (
            <div className="mt-4 space-y-3">
              {peerCreated.every(r => r.emailSent) ? (
                <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded border border-green-200">
                  Invitation email{peerCreated.length > 1 ? "s" : ""} sent to {peerCreated.length} peer{peerCreated.length > 1 ? "s" : ""}. Copy links below as a backup.
                </p>
              ) : (
                <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded border border-amber-200">
                  {peerCreated.length} request{peerCreated.length > 1 ? "s" : ""} created. Some emails could not be sent — please share the links below manually.
                </p>
              )}
              <div className="space-y-2">
                {peerCreated.map(r => (
                  <div key={r.token} className="rounded-lg border bg-muted/30 p-3 space-y-2 min-w-0">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <p className="text-sm font-medium truncate min-w-0 flex-1">{r.peerEmail}</p>
                      {r.emailSent
                        ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 shrink-0 font-medium">Email sent</span>
                        : <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 shrink-0 font-medium">Email failed</span>}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex-1 min-w-0 px-2.5 py-1.5 rounded border bg-background text-xs font-mono text-muted-foreground truncate">
                        {getPeerLink(r.token)}
                      </div>
                      <Button size="sm" type="button" variant="outline" className="h-8 text-xs shrink-0" onClick={() => copyPeerLink(r.token)}>
                        {peerCopied === r.token ? "Copied!" : "Copy link"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button onClick={handleClose}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <form
              onSubmit={e => { e.preventDefault(); setPeerError(""); sendPeerRequests(); }}
              className="space-y-4 mt-4"
            >
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                Peer reviews collect <strong>soft skills feedback</strong> from colleagues. Each peer will be emailed a private link to a confidential form.
              </div>
              <p className="text-sm text-muted-foreground">Requesting peer reviews for <strong>{employeeName}</strong></p>
              {peerError && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{peerError}</p>}
              <div className="space-y-1.5">
                <Label>Peer emails</Label>
                <Textarea
                  placeholder={"Enter emails separated by commas or new lines:\nalice@company.com\nbob@company.com"}
                  value={peerEmails}
                  onChange={e => setPeerEmails(e.target.value)}
                  rows={4}
                  className="text-sm font-mono"
                />
                <p className="text-xs text-muted-foreground">Enter one email per line, or separate with commas</p>
              </div>
              <div className="space-y-1.5">
                <Label>Link expires in</Label>
                <Select value={peerExpiresIn} onValueChange={setPeerExpiresIn}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="never">Never expires</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={sendingPeer}>{sendingPeer ? "Sending..." : "Send invitations"}</Button>
              </DialogFooter>
            </form>
          )
        ) : reviewType === "self" ? (
          reflectionResult ? (
            <div className="mt-4 space-y-3">
              <div className="p-3 rounded border bg-green-50 border-green-200 text-sm text-green-900">
                ✅ Self-reflection request created for <strong>{employeeName}</strong>.
                {reflectionResult.emailSent
                  ? " An email with the link has been sent."
                  : " The email could not be sent — share the link manually below."}
              </div>
              {!reflectionResult.emailSent && reflectionResult.emailError && (
                <p className="text-xs text-muted-foreground">Email error: {reflectionResult.emailError}</p>
              )}
              {reflectionResult.reflectionLink && (
                <div className="space-y-1.5">
                  <Label>Self-reflection link</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={reflectionResult.reflectionLink} className="font-mono text-xs" onFocus={e => e.currentTarget.select()} />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(reflectionResult.reflectionLink!);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                      }}
                    >
                      {linkCopied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Anyone with this link can submit the self-reflection — share it directly with the employee only.</p>
                </div>
              )}
              <DialogFooter>
                <Button onClick={handleClose}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <form
              onSubmit={e => { e.preventDefault(); setReflectionError(""); sendReflectionRequest(); }}
              className="space-y-4 mt-4"
            >
              <div className="text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded">
                Sends <strong>{employeeName}</strong> an email with a private link to complete a self-reflection (hard skills + behavioral skills + reflections). Their answers feed directly into the AI development plan.
              </div>
              {reflectionError && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{reflectionError}</p>}
              <div className="space-y-1.5">
                <Label>Employee email</Label>
                <Input
                  type="email"
                  value={reflectionForm.employeeEmail}
                  onChange={e => setReflectionForm(f => ({ ...f, employeeEmail: e.target.value }))}
                  placeholder="employee@company.com"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Period label</Label>
                  <Input
                    value={reflectionForm.period}
                    onChange={e => setReflectionForm(f => ({ ...f, period: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Link expires in</Label>
                  <Select value={reflectionForm.expiresInDays} onValueChange={v => setReflectionForm(f => ({ ...f, expiresInDays: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Optional message to {employeeName.split(" ")[0] || "the employee"}</Label>
                <Textarea
                  rows={3}
                  value={reflectionForm.message}
                  onChange={e => setReflectionForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="e.g. Take 10 minutes this week — I'd love your honest reflection ahead of our next 1:1."
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={sendingRequest}>{sendingRequest ? "Sending..." : "Send request"}</Button>
              </DialogFooter>
            </form>
          )
        ) : (
          <form onSubmit={e => { e.preventDefault(); createReview(); }} className="space-y-4 mt-4">
            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Period (YYYY-MM)</Label>
                <Input value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} placeholder="2024-Q4" required />
              </div>
              <div className="space-y-1.5">
                <Label>Manager Recommendation</Label>
                <Select value={form.recommendation} onValueChange={v => setForm(f => ({ ...f, recommendation: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {RECOMMENDATION_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Hard skills (1–5)</Label>
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

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Behavioral skills (1–5)</Label>
                <p className="text-xs text-muted-foreground">Optional — leave blank if you don't have a view yet.</p>
              </div>
              {BEHAVIORAL_SKILL_CATEGORIES.map(cat => (
                <div key={cat.id} className="rounded border p-3 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{cat.title}</div>
                  {cat.skills.map(skill => (
                    <div key={skill.key} className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground flex-1 min-w-0" title={skill.description}>{skill.label}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setBehavioral(b => ({ ...b, [skill.key]: b[skill.key] === n ? 0 : n }))}
                            className={`w-7 h-7 rounded text-xs font-medium border transition-colors ${
                              behavioral[skill.key] === n
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
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={savingReview}>{savingReview ? "Saving..." : "Save review"}</Button>
            </DialogFooter>
          </form>
        )}
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
    mutationFn: async (data: FeedbackFormData) => {
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
  const [expiresIn, setExpiresIn] = useState<ExpiresIn>("7days");
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
            <Select value={expiresIn} onValueChange={v => setExpiresIn(v as ExpiresIn)}>
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

const PEER_QUESTIONS = [
  { scoreKey: "personalPlanningScore", commentKey: "personalPlanningComment", label: "Personal planning" },
  { scoreKey: "trackPlanningScore", commentKey: "trackPlanningComment", label: "Track planning" },
  { scoreKey: "solutionDrivenScore", commentKey: "solutionDrivenComment", label: "Solution driven" },
  { scoreKey: "teamLeadershipScore", commentKey: "teamLeadershipComment", label: "Team leadership" },
  { scoreKey: "persuasionScore", commentKey: "persuasionComment", label: "Persuasion" },
  { scoreKey: "crossFunctionalScore", commentKey: "crossFunctionalComment", label: "Cross-functional" },
  { scoreKey: "businessAlignmentScore", commentKey: "businessAlignmentComment", label: "Business alignment" },
  { scoreKey: "customerCentricScore", commentKey: "customerCentricComment", label: "Customer-centric" },
  { scoreKey: "dataInformedScore", commentKey: "dataInformedComment", label: "Data-informed" },
];

const PROMO_REC_LABELS: Record<string, { label: string; color: string }> = {
  yes: { label: "Ready for promotion", color: "bg-green-100 text-green-800 border-green-200" },
  no: { label: "Not yet ready", color: "bg-red-100 text-red-800 border-red-200" },
  unsure: { label: "Unsure", color: "bg-gray-100 text-gray-700 border-gray-200" },
};

function PeerResponseDetail({ review }: { review: PeerReview }) {
  const answeredQuestions = PEER_QUESTIONS.filter(
    q => review[q.scoreKey as keyof PeerReview] || review[q.commentKey as keyof PeerReview]
  );

  return (
    <div className="mt-3 pt-3 border-t space-y-4">
      {answeredQuestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Competency Scores</p>
          <div className="space-y-2">
            {answeredQuestions.map(q => {
              const score = review[q.scoreKey as keyof PeerReview] as string | null;
              const comment = review[q.commentKey as keyof PeerReview] as string | null;
              if (!score) return null;
              const scoreInfo = SCORE_LABEL[score];
              return (
                <div key={q.scoreKey} className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-36 shrink-0">{q.label}</span>
                    <Badge className={`text-xs border ${scoreInfo?.color ?? "bg-gray-100 text-gray-600"}`}>
                      {scoreInfo?.label ?? score}
                    </Badge>
                  </div>
                  {comment && (
                    <p className="text-xs text-muted-foreground ml-[152px] italic">"{comment}"</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {review.promotionRecommendation && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Promotion Recommendation</p>
          <Badge className={`text-xs border ${PROMO_REC_LABELS[review.promotionRecommendation]?.color ?? "bg-gray-100 text-gray-600"}`}>
            {PROMO_REC_LABELS[review.promotionRecommendation]?.label ?? review.promotionRecommendation}
          </Badge>
        </div>
      )}

      {review.strengths && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Strengths</p>
          <p className="text-sm text-muted-foreground border-l-2 border-green-300 pl-3">{review.strengths}</p>
        </div>
      )}

      {review.areasToImprove && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Areas to Improve</p>
          <p className="text-sm text-muted-foreground border-l-2 border-orange-300 pl-3">{review.areasToImprove}</p>
        </div>
      )}
    </div>
  );
}

function PeerReviewsTab({ employeeId, employeeName }: { employeeId: number; employeeName: string }) {
  const queryClient = useQueryClient();
  const [requestOpen, setRequestOpen] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);
  const [actionState, setActionState] = useState<Record<number, { kind: "nudged" | "error"; message: string } | undefined>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const NUDGE_MIN_DAYS = 3;

  const { mutate: nudgeRequest } = useMutation({
    mutationFn: async (requestId: number) => {
      setBusyId(requestId);
      const res = await fetch(getApiUrl(`/employees/${employeeId}/peer-review-requests/${requestId}/nudge`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to send reminder");
      return { requestId, ...data };
    },
    onSuccess: ({ requestId }) => {
      setActionState(s => ({ ...s, [requestId]: { kind: "nudged", message: "Reminder sent" } }));
      setBusyId(null);
    },
    onError: (err: Error, requestId) => {
      setActionState(s => ({ ...s, [requestId]: { kind: "error", message: err.message } }));
      setBusyId(null);
    },
  });

  const { mutate: deleteRequest } = useMutation({
    mutationFn: async (requestId: number) => {
      setBusyId(requestId);
      const res = await fetch(getApiUrl(`/employees/${employeeId}/peer-review-requests/${requestId}`), {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete request");
      return requestId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["peerReviewRequests", employeeId] });
      setBusyId(null);
    },
    onError: (err: Error, requestId) => {
      setActionState(s => ({ ...s, [requestId]: { kind: "error", message: err.message } }));
      setBusyId(null);
    },
  });

  const { data: requests = [], isLoading: loadingRequests } = useQuery<PeerReviewRequest[]>({
    queryKey: ["peerReviewRequests", employeeId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/employees/${employeeId}/peer-review-requests`), { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: reviews = [], isLoading: loadingReviews } = useQuery<PeerReview[]>({
    queryKey: ["peerReviews", employeeId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/employees/${employeeId}/peer-reviews`), { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const completedCount = requests.filter(r => r.status === "completed").length;
  const pendingCount = requests.filter(r => r.status === "pending").length;

  const reviewByRequestId = new Map(reviews.map(r => [r.requestId, r]));

  const scoreCounts = PEER_QUESTIONS.map(q => {
    const tally: Record<string, number> = {};
    for (const r of reviews) {
      const val = r[q.scoreKey as keyof PeerReview] as string | null;
      if (val) tally[val] = (tally[val] || 0) + 1;
    }
    return { ...q, tally };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Peer Reviews</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Soft skill feedback from colleagues — private and confidential</p>
        </div>
        <Button size="sm" onClick={() => setRequestOpen(true)}>Request Peer Reviews</Button>
      </div>

      {requests.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Requested", value: requests.length, color: "text-foreground" },
            { label: "Completed", value: completedCount, color: "text-green-600" },
            { label: "Pending", value: pendingCount, color: "text-yellow-600" },
          ].map(s => (
            <Card key={s.label}><CardContent className="py-3 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent></Card>
          ))}
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium mb-2">Review Requests</h4>
        {loadingRequests || loadingReviews ? <Skeleton className="h-24 w-full" /> : requests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No peer review requests yet. Click "Request Peer Reviews" to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {requests.map(r => {
              const response = reviewByRequestId.get(r.id);
              const isCompleted = r.status === "completed" && !!response;
              const isExpanded = expandedRequestId === r.id;
              const isPending = r.status === "pending";
              const isExpired = r.status === "expired";
              const daysSinceRequest = Math.floor(
                (Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24)
              );
              const canNudge = isPending;
              const canDelete = !isCompleted;
              const showActions = canDelete || canNudge;
              const nudgeRecommended = isPending && daysSinceRequest >= NUDGE_MIN_DAYS;
              const status = actionState[r.id];
              const isBusy = busyId === r.id;
              return (
                <div
                  key={r.id}
                  className={`rounded-lg border bg-card transition-shadow ${isCompleted ? "cursor-pointer hover:shadow-sm" : ""}`}
                  onClick={() => isCompleted && setExpandedRequestId(isExpanded ? null : r.id)}
                >
                  <div className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{r.peerEmail}</span>
                        {r.peerName && <span className="text-xs text-muted-foreground">({r.peerName})</span>}
                        {isCompleted && (
                          <span className="text-xs text-muted-foreground">{isExpanded ? "▲" : "▼"}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Requested {new Date(r.createdAt).toLocaleDateString()}
                        {r.expiresAt && ` · Expires ${new Date(r.expiresAt).toLocaleDateString()}`}
                        {response && ` · Submitted ${new Date(response.submittedAt).toLocaleDateString()}`}
                        {isPending && !nudgeRecommended && ` · Recommended to nudge after ${NUDGE_MIN_DAYS - daysSinceRequest} more day${NUDGE_MIN_DAYS - daysSinceRequest === 1 ? "" : "s"}`}
                      </div>
                      {status && (
                        <p
                          className={`text-xs mt-1 ${status.kind === "nudged" ? "text-green-600" : "text-destructive"}`}
                        >
                          {status.message}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {showActions && (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {canNudge && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={isBusy}
                              onClick={() => nudgeRequest(r.id)}
                            >
                              {isBusy ? "Sending..." : "Nudge"}
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={isBusy}
                              onClick={() => {
                                if (window.confirm(`Delete the peer review invite for ${r.peerEmail}? This cannot be undone.`)) {
                                  deleteRequest(r.id);
                                }
                              }}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      )}
                      <Badge className={
                        r.status === "completed" ? "bg-green-100 text-green-800 border-green-200" :
                        isExpired ? "bg-gray-100 text-gray-600" :
                        "bg-yellow-100 text-yellow-800 border-yellow-200"
                      }>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  {isExpanded && response && (
                    <div className="px-3 pb-4">
                      <PeerResponseDetail review={response} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {reviews.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Aggregated Results ({reviews.length} response{reviews.length > 1 ? "s" : ""})</h4>
          <div className="space-y-3">
            {scoreCounts.filter(q => Object.keys(q.tally).length > 0).map(q => (
              <Card key={q.scoreKey}>
                <CardContent className="py-3">
                  <p className="text-sm font-medium mb-2">{q.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(q.tally).map(([score, count]) => (
                      <Badge key={score} className={`text-xs ${SCORE_LABEL[score]?.color ?? ""}`}>
                        {SCORE_LABEL[score]?.label ?? score} ({count})
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {reviews.some(r => r.promotionRecommendation) && (
              <Card>
                <CardContent className="py-3">
                  <p className="text-sm font-medium mb-2">Promotion recommendation</p>
                  <div className="flex gap-3">
                    {["yes", "no", "unsure"].map(v => {
                      const c = reviews.filter(r => r.promotionRecommendation === v).length;
                      return c > 0 ? (
                        <div key={v} className="text-center">
                          <div className="text-lg font-bold">{c}</div>
                          <div className="text-xs text-muted-foreground capitalize">{v === "yes" ? "Ready" : v === "no" ? "Not yet" : "Unsure"}</div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {reviews.filter(r => r.strengths).length > 0 && (
              <Card>
                <CardContent className="py-3">
                  <p className="text-sm font-medium mb-2">Key strengths mentioned</p>
                  <ul className="space-y-1">
                    {reviews.filter(r => r.strengths).map(r => (
                      <li key={r.id} className="text-sm text-muted-foreground border-l-2 border-green-300 pl-3">
                        {r.strengths}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {reviews.filter(r => r.areasToImprove).length > 0 && (
              <Card>
                <CardContent className="py-3">
                  <p className="text-sm font-medium mb-2">Areas to improve</p>
                  <ul className="space-y-1">
                    {reviews.filter(r => r.areasToImprove).map(r => (
                      <li key={r.id} className="text-sm text-muted-foreground border-l-2 border-orange-300 pl-3">
                        {r.areasToImprove}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {!loadingReviews && reviews.length === 0 && requests.length > 0 && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No peer reviews submitted yet. Responses will appear here once peers complete their forms.
          </CardContent>
        </Card>
      )}

      <RequestPeerReviewDialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        employeeId={employeeId}
        employeeName={employeeName}
      />
    </div>
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
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
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

          <div className="grid grid-cols-3 gap-3 text-center">
            {["high", "medium", "low"].map(lvl => {
              const count = (plan.skills ?? []).filter((s: DevPlanSkill) => {
                const p = s.priority;
                return lvl === "high" ? p === 1 : lvl === "medium" ? p === 2 : p >= 3;
              }).length;
              const colors: Record<string, string> = { high: "text-red-600", medium: "text-yellow-600", low: "text-green-600" };
              return (
                <div key={lvl} className="bg-muted/40 rounded-lg p-3">
                  <div className={`text-xl font-bold ${colors[lvl]}`}>{count}</div>
                  <div className="text-xs text-muted-foreground capitalize">{lvl} priority</div>
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            {(plan.skills ?? []).map((skill: DevPlanSkill) => {
              const { label, className } = priorityLabel(skill.priority);
              const resourceList = skill.resources ? skill.resources.split(",").map((r: string) => r.trim()).filter(Boolean) : [];
              const nextStepList = skill.nextSteps ? skill.nextSteps.split(".").map((s: string) => s.trim()).filter(Boolean) : [];
              return (
                <Card key={skill.id} className={skill.completed ? "opacity-60" : ""}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={skill.completed}
                        onCheckedChange={(checked) => toggleSkill({ skillId: skill.id, completed: !!checked })}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`font-medium text-sm ${skill.completed ? "line-through text-muted-foreground" : ""}`}>{skill.skillName}</span>
                          <Badge className={`text-xs ${className}`}>{label}</Badge>
                          {skill.timeline && <Badge variant="secondary" className="text-xs">{skill.timeline}</Badge>}
                        </div>
                        {skill.description && <p className="text-sm text-muted-foreground mb-2">{skill.description}</p>}
                        {nextStepList.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-medium mb-1">Next steps</p>
                            <ul className="space-y-0.5">
                              {nextStepList.map((step, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                  <span className="mt-0.5 w-1 h-1 rounded-full bg-muted-foreground shrink-0 inline-block" />
                                  {step}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {resourceList.length > 0 && (
                          <div>
                            <p className="text-xs font-medium mb-1">Resources</p>
                            <div className="flex flex-wrap gap-1.5">
                              {resourceList.map((res, i) => (
                                <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{res}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackCard({ entry, employeeId, onResponded }: { entry: FeedbackEntry; employeeId: number; onResponded: () => void }) {
  const [responding, setResponding] = useState(false);
  const [responseText, setResponseText] = useState(entry.employeeResponse || "");
  const [error, setError] = useState("");

  const { mutate: submitResponse, isPending } = useMutation({
    mutationFn: async (employeeResponse: string) => {
      const res = await fetch(getApiUrl(`/employees/${employeeId}/feedback/${entry.id}/respond`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ employeeResponse }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save response");
      return res.json();
    },
    onSuccess: () => { setResponding(false); setError(""); onResponded(); },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline">{MEETING_TYPES.find(m => m.value === entry.meetingType)?.label || entry.meetingType}</Badge>
          <span className="text-sm text-muted-foreground">{entry.meetingDate}</span>
        </div>
        {entry.whatWentWell && <p className="text-sm mb-1"><span className="font-medium">What went well: </span><span className="text-muted-foreground">{entry.whatWentWell}</span></p>}
        {entry.areasToImprove && <p className="text-sm mb-1"><span className="font-medium">Areas to improve: </span><span className="text-muted-foreground">{entry.areasToImprove}</span></p>}
        {entry.actionItems && <p className="text-sm mb-1"><span className="font-medium">Action items: </span><span className="text-muted-foreground">{entry.actionItems}</span></p>}
        {entry.nextSteps && <p className="text-sm mb-1"><span className="font-medium">Next steps: </span><span className="text-muted-foreground">{entry.nextSteps}</span></p>}
        {entry.employeeResponse && !responding && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-1">Employee response</p>
            <p className="text-sm text-muted-foreground">{entry.employeeResponse}</p>
            <Button variant="ghost" size="sm" className="mt-1 h-7 px-2 text-xs" onClick={() => { setResponseText(entry.employeeResponse || ""); setResponding(true); }}>Edit response</Button>
          </div>
        )}
        {!entry.employeeResponse && !responding && (
          <div className="mt-3 pt-3 border-t">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setResponding(true)}>Add employee response</Button>
          </div>
        )}
        {responding && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <Label className="text-xs font-medium">Employee response</Label>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Textarea value={responseText} onChange={e => setResponseText(e.target.value)} rows={3} placeholder="Employee's perspective..." className="text-sm" />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" disabled={isPending} onClick={() => submitResponse(responseText)}>
                {isPending ? "Saving..." : "Save response"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setResponding(false); setError(""); }}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TimelineEvent {
  date: string;
  type: "review" | "feedback";
  label: string;
  badge: string;
  score?: number | null;
  recommendation?: string | null;
  details: string[];
}

function TimelineTab({ reviews, feedback }: { reviews: ReviewItem[]; feedback: FeedbackEntry[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const events: TimelineEvent[] = [
    ...reviews.map(r => ({
      date: r.createdAt,
      type: "review" as const,
      label: `${r.reviewType.charAt(0).toUpperCase() + r.reviewType.slice(1)} Review — ${r.period}`,
      badge: r.reviewType,
      score: r.overallScore,
      recommendation: r.recommendation,
      details: [
        r.strengths ? `Strengths: ${r.strengths}` : "",
        r.areasToImprove ? `Areas to improve: ${r.areasToImprove}` : "",
        r.goals ? `Goals: ${r.goals}` : "",
      ].filter(Boolean),
    })),
    ...feedback.map(f => ({
      date: f.meetingDate,
      type: "feedback" as const,
      label: `${MEETING_TYPES.find(m => m.value === f.meetingType)?.label ?? f.meetingType}`,
      badge: "feedback",
      score: null,
      recommendation: null,
      details: [
        f.whatWentWell ? `What went well: ${f.whatWentWell}` : "",
        f.areasToImprove ? `Areas to improve: ${f.areasToImprove}` : "",
        f.actionItems ? `Action items: ${f.actionItems}` : "",
        f.nextSteps ? `Next steps: ${f.nextSteps}` : "",
      ].filter(Boolean),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          No reviews or feedback sessions yet. Add some to see a performance timeline.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-4 pl-10">
        {events.map((event, i) => {
          const key = `${event.type}-${i}`;
          const isOpen = expanded === key;
          const dotColor = event.type === "review" ? "bg-primary" : "bg-muted-foreground";
          return (
            <div key={key} className="relative">
              <div className={`absolute -left-6 top-3 w-3 h-3 rounded-full border-2 border-background ${dotColor}`} />
              <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setExpanded(isOpen ? null : key)}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <Badge variant="outline" className="capitalize text-xs shrink-0">{event.badge}</Badge>
                      <span className="text-sm font-medium truncate">{event.label}</span>
                      {event.recommendation && recommendationBadge(event.recommendation)}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {event.score != null && (
                        <span className="text-sm font-bold">{event.score.toFixed(1)}<span className="text-xs text-muted-foreground font-normal">/5</span></span>
                      )}
                      <span className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString()}</span>
                      <span className="text-xs text-muted-foreground">{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </div>
                  {isOpen && event.details.length > 0 && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      {event.details.map((d, j) => (
                        <p key={j} className="text-xs text-muted-foreground">{d}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
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
  const [peerOpen, setPeerOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: employee, isLoading: loadingEmployee } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/employees/${employeeId}`), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: reviews = [], isLoading: loadingReviews } = useQuery<ReviewItem[]>({
    queryKey: ["reviews", employeeId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/employees/${employeeId}/reviews`), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: feedback = [], isLoading: loadingFeedback } = useQuery<FeedbackEntry[]>({
    queryKey: ["feedback", employeeId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/employees/${employeeId}/feedback`), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: scoreHistory = [] } = useQuery<ScoreHistoryItem[]>({
    queryKey: ["scoreHistory", employeeId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/employees/${employeeId}/score-history`), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { mutate: deleteEmployee } = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl(`/employees/${employeeId}`), { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); navigate("/employees"); },
  });

  const avgReviewScores = reviews.length ? {
    technicalScore: reviews.reduce((s, r) => s + (r.technicalScore || 0), 0) / reviews.filter(r => r.technicalScore).length || null,
    communicationScore: reviews.reduce((s, r) => s + (r.communicationScore || 0), 0) / reviews.filter(r => r.communicationScore).length || null,
    problemSolvingScore: reviews.reduce((s, r) => s + (r.problemSolvingScore || 0), 0) / reviews.filter(r => r.problemSolvingScore).length || null,
    teamworkScore: reviews.reduce((s, r) => s + (r.teamworkScore || 0), 0) / reviews.filter(r => r.teamworkScore).length || null,
    leadershipScore: reviews.reduce((s, r) => s + (r.leadershipScore || 0), 0) / reviews.filter(r => r.leadershipScore).length || null,
  } : null;

  const radarData = avgReviewScores ? [
    { subject: "Technical", A: avgReviewScores.technicalScore || 0 },
    { subject: "Communication", A: avgReviewScores.communicationScore || 0 },
    { subject: "Problem Solving", A: avgReviewScores.problemSolvingScore || 0 },
    { subject: "Teamwork", A: avgReviewScores.teamworkScore || 0 },
    { subject: "Leadership", A: avgReviewScores.leadershipScore || 0 },
  ] : [];

  const chartData = scoreHistory.filter(r => r.overallScore != null).map(r => ({
    period: r.period,
    score: parseFloat((r.overallScore as number).toFixed(2)),
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
            <Button variant="outline" size="sm" onClick={() => setPeerOpen(true)}>Request peer reviews</Button>
            <Button size="sm" onClick={() => setReviewOpen(true)}>Add review</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-muted-foreground">Email</div><div className="text-sm font-medium truncate">{employee.email}</div></CardContent></Card>
          <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-muted-foreground">Start date</div><div className="text-sm font-medium">{employee.startDate}</div></CardContent></Card>
          <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-muted-foreground">Manager</div><div className="text-sm font-medium">{employee.managerName || "—"}</div></CardContent></Card>
          <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-muted-foreground">Reviews</div><div className="text-sm font-medium">{employee.reviewCount}</div></CardContent></Card>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
            <TabsTrigger value="feedback">Feedback ({feedback.length})</TabsTrigger>
            <TabsTrigger value="peer-reviews">Peer Reviews</TabsTrigger>
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

          <TabsContent value="timeline" className="mt-4">
            {loadingReviews || loadingFeedback
              ? <Skeleton className="h-48 w-full" />
              : <TimelineTab reviews={reviews} feedback={feedback} />
            }
          </TabsContent>

          <TabsContent value="reviews" className="mt-4 space-y-3">
            {loadingReviews ? <Skeleton className="h-32 w-full" /> : reviews.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No reviews yet.</CardContent></Card>
            ) : reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{REVIEW_TYPE_LABEL[review.reviewType] ?? review.reviewType}</Badge>
                      <span className="text-sm font-medium">{review.period}</span>
                      {review.recommendation && recommendationBadge(review.recommendation)}
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
                        <div key={label as string} className="text-center">
                          <div className="text-sm font-medium">{score}</div>
                          <div className="text-xs text-muted-foreground">{label}</div>
                        </div>
                      )
                    ))}
                  </div>
                  {review.behavioralScores && Object.keys(review.behavioralScores).length > 0 && (
                    <div className="mb-3 rounded border bg-muted/30 p-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Behavioral skills (1–5)</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {Object.entries(review.behavioralScores).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground truncate">{BEHAVIORAL_SKILL_BY_KEY[k]?.label ?? k}</span>
                            <span className="font-medium text-foreground tabular-nums shrink-0 ml-2">{v}/5</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
            ) : feedback.map((entry) => (
              <FeedbackCard
                key={entry.id}
                entry={entry}
                employeeId={employeeId}
                onResponded={() => queryClient.invalidateQueries({ queryKey: ["feedback", employeeId] })}
              />
            ))}
          </TabsContent>

          <TabsContent value="peer-reviews" className="mt-4">
            <PeerReviewsTab employeeId={employeeId} employeeName={employee.name} />
          </TabsContent>

          <TabsContent value="devplan" className="mt-4">
            <DevPlanTab employeeId={employeeId} />
          </TabsContent>
        </Tabs>

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

      <AddReviewDialog open={reviewOpen} onClose={() => setReviewOpen(false)} employeeId={employeeId} employeeEmail={employee.email ?? ""} employeeName={employee.name} />
      <AddFeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} employeeId={employeeId} />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} employeeId={employeeId} />
      <RequestPeerReviewDialog open={peerOpen} onClose={() => setPeerOpen(false)} employeeId={employeeId} employeeName={employee.name} />
    </Layout>
  );
}
