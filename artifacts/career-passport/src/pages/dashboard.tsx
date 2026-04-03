import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthContext } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Link } from "wouter";

function authHeaders() {
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

  const { data: health, isLoading: loadingHealth } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/companies/me/health"), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load health");
      return res.json();
    },
  });

  const { data: activity, isLoading: loadingActivity } = useQuery({
    queryKey: ["activity"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/companies/me/activity"), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load activity");
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
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                    <Radar name="Avg" dataKey="A" stroke="hsl(221 83% 53%)" fill="hsl(221 83% 53%)" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
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
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={health.departmentBreakdown} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                    <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => v.toFixed(1)} />
                    <Bar dataKey="avgScore" name="Avg Score" radius={[3, 3, 0, 0]}>
                      {health.departmentBreakdown.map((_: any, i: number) => (
                        <Cell key={i} fill={`hsl(${210 + i * 40} 83% ${50 + i * 5}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
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

        {/* Activity feed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !activity?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No activity yet. <Link href="/employees"><span className="text-primary hover:underline cursor-pointer">Add employees</span></Link> to get started.
              </div>
            ) : (
              <div className="divide-y">
                {(activity as any[]).map((item: any) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-medium text-sm">{item.employeeName}</span>
                      <span className="text-muted-foreground text-sm"> — {item.description}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {item.type.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
