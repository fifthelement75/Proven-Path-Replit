import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useAuthContext } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, BarChart, Bar, XAxis, YAxis, Cell } from "recharts";
import { Link } from "wouter";
import { FileText, MessageSquare, Lightbulb, UserPlus } from "lucide-react";

interface DepartmentStat {
  department: string;
  avgScore: number;
  employeeCount: number;
}

interface CompanyHealth {
  employeeCount: number;
  reviewCount: number;
  feedbackCount: number;
  avgOverallScore: number | null;
  avgTechnicalScore: number | null;
  avgCommunicationScore: number | null;
  avgProblemSolvingScore: number | null;
  avgTeamworkScore: number | null;
  avgLeadershipScore: number | null;
  departmentBreakdown: DepartmentStat[];
}

interface EmployeeSummary {
  employeeId: number;
  name: string;
  role: string;
  department: string;
  reviewCount: number;
  lastReviewType: string | null;
  lastReviewPeriod: string | null;
  lastReviewScore: number | null;
  lastReviewDate: string | null;
  feedbackCount: number;
  lastFeedbackType: string | null;
  lastFeedbackDate: string | null;
  hasDevPlan: boolean;
  devPlanSkillsTotal: number;
  devPlanSkillsCompleted: number;
  devPlanGeneratedAt: string | null;
  lastActivityAt: string;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function scoreColor(score: number | null) {
  if (score == null) return "text-muted-foreground";
  if (score >= 4) return "text-green-600";
  if (score >= 3) return "text-yellow-600";
  return "text-red-600";
}

function ScoreDisplay({ score, label }: { score: number | null; label: string }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${scoreColor(score)}`}>
        {score != null ? score.toFixed(1) : "—"}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

const REVIEW_TYPE_LABEL: Record<string, string> = {
  self: "Self",
  peer: "Peer",
  manager: "Manager",
};

const radarChartConfig = {
  score: { label: "Avg Score", color: "hsl(221 83% 53%)" },
};

const barChartConfig = {
  avgScore: { label: "Avg Score", color: "hsl(221 83% 53%)" },
};

export default function DashboardPage() {
  const { user } = useAuthContext();

  const { data: company, isLoading: loadingCompany } = useQuery({
    queryKey: ["company"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/companies/me"), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load company");
      return res.json();
    },
  });

  const { data: health, isLoading: loadingHealth } = useQuery<CompanyHealth>({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/companies/me/health"), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load health");
      return res.json();
    },
  });

  const { data: summaries, isLoading: loadingSummaries } = useQuery<EmployeeSummary[]>({
    queryKey: ["employeeSummaries"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/companies/me/employee-summaries"), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load summaries");
      return res.json();
    },
  });

  const radarData = health ? [
    { subject: "Technical", A: health.avgTechnicalScore || 0 },
    { subject: "Communication", A: health.avgCommunicationScore || 0 },
    { subject: "Problem Solving", A: health.avgProblemSolvingScore || 0 },
    { subject: "Teamwork", A: health.avgTeamworkScore || 0 },
    { subject: "Leadership", A: health.avgLeadershipScore || 0 },
  ] : [];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{company?.name || user?.companyName}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Performance overview</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Employees", value: health?.employeeCount ?? "—", loading: loadingHealth },
            { label: "Reviews", value: health?.reviewCount ?? "—", loading: loadingHealth },
            { label: "Feedback Sessions", value: health?.feedbackCount ?? "—", loading: loadingHealth },
            { label: "Avg Score", value: health?.avgOverallScore != null ? health.avgOverallScore.toFixed(1) + "/5" : "—", loading: loadingHealth },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-3">
                {stat.loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Competency Averages</CardTitle>
              <CardDescription>Average scores across all employees</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHealth ? (
                <Skeleton className="h-48 w-full" />
              ) : health?.reviewCount === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  No reviews yet
                </div>
              ) : (
                <ChartContainer config={radarChartConfig} className="h-[220px] w-full">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                    <Radar name="Avg" dataKey="A" stroke="var(--color-score)" fill="var(--color-score)" fillOpacity={0.3} />
                  </RadarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Department breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Department Scores</CardTitle>
              <CardDescription>Average performance by department</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHealth ? (
                <Skeleton className="h-48 w-full" />
              ) : !health?.departmentBreakdown?.length ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  No data yet
                </div>
              ) : (
                <ChartContainer config={barChartConfig} className="h-[220px] w-full">
                  <BarChart data={health.departmentBreakdown} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                    <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v: unknown) => (v as number).toFixed(1)} />} />
                    <Bar dataKey="avgScore" name="Avg Score" radius={[3, 3, 0, 0]}>
                      {health.departmentBreakdown.map((_, i) => (
                        <Cell key={i} fill={`hsl(${210 + i * 40} 83% ${50 + i * 5}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Score breakdown */}
        {health && health.reviewCount > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Score Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
                <ScoreDisplay score={health.avgOverallScore} label="Overall" />
                <ScoreDisplay score={health.avgTechnicalScore} label="Technical" />
                <ScoreDisplay score={health.avgCommunicationScore} label="Communication" />
                <ScoreDisplay score={health.avgProblemSolvingScore} label="Problem Solving" />
                <ScoreDisplay score={health.avgTeamworkScore} label="Teamwork" />
                <ScoreDisplay score={health.avgLeadershipScore} label="Leadership" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Employee Activity Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Employee Activity Summary</CardTitle>
            <CardDescription>Latest feedback, reviews, and development plan progress per employee</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingSummaries ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !summaries?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No employees yet.{" "}
                <Link href="/employees">
                  <span className="text-primary hover:underline cursor-pointer">Add employees</span>
                </Link>{" "}
                to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="hidden md:table-cell">Reviews</TableHead>
                    <TableHead className="hidden lg:table-cell">Last Review</TableHead>
                    <TableHead className="hidden md:table-cell">Feedback</TableHead>
                    <TableHead className="hidden lg:table-cell">Last Session</TableHead>
                    <TableHead>Dev Plan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.map(emp => (
                    <TableRow key={emp.employeeId} className="hover:bg-muted/30">
                      <TableCell>
                        <Link href={`/employees/${emp.employeeId}`}>
                          <div className="cursor-pointer group">
                            <div className="font-medium text-sm group-hover:text-primary transition-colors">{emp.name}</div>
                            <div className="text-xs text-muted-foreground">{emp.role} · {emp.department}</div>
                          </div>
                        </Link>
                      </TableCell>

                      <TableCell className="hidden md:table-cell">
                        {emp.reviewCount > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <FileText size={13} className="text-muted-foreground shrink-0" />
                            <span className="text-sm">{emp.reviewCount}</span>
                            {emp.lastReviewScore != null && (
                              <span className={`text-xs font-semibold ${scoreColor(emp.lastReviewScore)}`}>
                                ({emp.lastReviewScore.toFixed(1)})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </TableCell>

                      <TableCell className="hidden lg:table-cell">
                        {emp.lastReviewType ? (
                          <div>
                            <Badge variant="outline" className="text-xs capitalize">
                              {REVIEW_TYPE_LABEL[emp.lastReviewType] ?? emp.lastReviewType}
                            </Badge>
                            {emp.lastReviewPeriod && (
                              <div className="text-xs text-muted-foreground mt-0.5">{emp.lastReviewPeriod}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="hidden md:table-cell">
                        {emp.feedbackCount > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <MessageSquare size={13} className="text-muted-foreground shrink-0" />
                            <span className="text-sm">{emp.feedbackCount}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </TableCell>

                      <TableCell className="hidden lg:table-cell">
                        {emp.lastFeedbackType ? (
                          <div>
                            <div className="text-xs font-medium">{emp.lastFeedbackType}</div>
                            {emp.lastFeedbackDate && (
                              <div className="text-xs text-muted-foreground">
                                {new Date(emp.lastFeedbackDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {emp.hasDevPlan ? (
                          <div className="space-y-1 min-w-[80px]">
                            <div className="flex items-center gap-1.5">
                              <Lightbulb size={13} className="text-primary shrink-0" />
                              <span className="text-xs text-muted-foreground">
                                {emp.devPlanSkillsCompleted}/{emp.devPlanSkillsTotal}
                              </span>
                            </div>
                            <Progress
                              value={emp.devPlanSkillsTotal > 0 ? (emp.devPlanSkillsCompleted / emp.devPlanSkillsTotal) * 100 : 0}
                              className="h-1.5"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <UserPlus size={12} className="shrink-0" />
                            No plan
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
