import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { getApiUrl } from "@/lib/api";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

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
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SharePage() {
  const params = useParams<{ token: string }>();
  const token = params.token!;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["share", token],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/share/${token}`));
      if (!res.ok) throw new Error((await res.json()).error || "Not found");
      return res.json();
    },
    retry: 0,
  });

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Skeleton className="h-48 w-96" />
    </div>
  );

  if (isError || !data) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-xl font-bold text-foreground">Profile not found</h1>
        <p className="text-muted-foreground mt-2 text-sm">This share link may have expired or been revoked.</p>
      </div>
    </div>
  );

  const { employee, reviews, devPlan } = data;

  const avgScores = reviews.length ? {
    technicalScore: reviews.filter((r: any) => r.technicalScore).reduce((s: number, r: any) => s + r.technicalScore, 0) / reviews.filter((r: any) => r.technicalScore).length || null,
    communicationScore: reviews.filter((r: any) => r.communicationScore).reduce((s: number, r: any) => s + r.communicationScore, 0) / reviews.filter((r: any) => r.communicationScore).length || null,
    problemSolvingScore: reviews.filter((r: any) => r.problemSolvingScore).reduce((s: number, r: any) => s + r.problemSolvingScore, 0) / reviews.filter((r: any) => r.problemSolvingScore).length || null,
    teamworkScore: reviews.filter((r: any) => r.teamworkScore).reduce((s: number, r: any) => s + r.teamworkScore, 0) / reviews.filter((r: any) => r.teamworkScore).length || null,
    leadershipScore: reviews.filter((r: any) => r.leadershipScore).reduce((s: number, r: any) => s + r.leadershipScore, 0) / reviews.filter((r: any) => r.leadershipScore).length || null,
  } : null;

  const radarData = avgScores ? [
    { subject: "Technical", A: avgScores.technicalScore || 0 },
    { subject: "Communication", A: avgScores.communicationScore || 0 },
    { subject: "Problem Solving", A: avgScores.problemSolvingScore || 0 },
    { subject: "Teamwork", A: avgScores.teamworkScore || 0 },
    { subject: "Leadership", A: avgScores.leadershipScore || 0 },
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-primary">Career Passport</span>
          <Badge variant="secondary">Read-only profile</Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Employee header */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
            {employee.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{employee.name}</h1>
            <p className="text-muted-foreground">{employee.role}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">{employee.department}</Badge>
              <Badge variant="secondary">{employee.level}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-muted-foreground">Email</div><div className="text-sm font-medium">{employee.email}</div></CardContent></Card>
          <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-muted-foreground">Start date</div><div className="text-sm font-medium">{employee.startDate}</div></CardContent></Card>
          <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-muted-foreground">Reviews</div><div className="text-sm font-medium">{reviews.length}</div></CardContent></Card>
        </div>

        {reviews.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Competency Profile</CardTitle></CardHeader>
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
              <CardHeader className="pb-2"><CardTitle className="text-base">Average Scores</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {avgScores && <>
                  <ScoreBar label="Technical" value={avgScores.technicalScore} />
                  <ScoreBar label="Communication" value={avgScores.communicationScore} />
                  <ScoreBar label="Problem Solving" value={avgScores.problemSolvingScore} />
                  <ScoreBar label="Teamwork" value={avgScores.teamworkScore} />
                  <ScoreBar label="Leadership" value={avgScores.leadershipScore} />
                </>}
              </CardContent>
            </Card>
          </div>
        )}

        {devPlan && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Development Plan</h2>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <p className="text-sm leading-relaxed">{devPlan.summary}</p>
              </CardContent>
            </Card>
            <div className="space-y-3">
              {devPlan.skills?.map((skill: any) => (
                <Card key={skill.id} className={skill.completed ? "opacity-60" : ""}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <Checkbox checked={skill.completed} disabled />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-sm ${skill.completed ? "line-through text-muted-foreground" : ""}`}>{skill.skillName}</span>
                          <Badge variant="outline" className="text-xs">Priority {skill.priority}</Badge>
                          {skill.timeline && <Badge variant="secondary" className="text-xs">{skill.timeline}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{skill.description}</p>
                        {skill.nextSteps && <div className="mt-2 text-xs"><span className="font-medium">Next step: </span><span className="text-muted-foreground">{skill.nextSteps}</span></div>}
                        {skill.resources && <div className="mt-1 text-xs text-muted-foreground"><span className="font-medium">Resources: </span>{skill.resources}</div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {data.expiresAt && (
          <p className="text-xs text-muted-foreground text-center">
            This profile is shared until {new Date(data.expiresAt).toLocaleDateString()}
          </p>
        )}
      </main>
    </div>
  );
}
