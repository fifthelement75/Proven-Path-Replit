import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";

export default function MyProfileRedirect() {
  const [, navigate] = useLocation();
  const { user, isTeamPlan, isSubscriptionLoaded } = useAuthContext();

  const { data: profile, isLoading, isFetching, error, refetch } = useQuery<{ id: number } | null>({
    queryKey: ["employees", "me"],
    retry: false,
    enabled: !!user && user.role !== "admin",
    queryFn: async () => {
      const res = await apiFetch("/employees/me");
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
  });

  useEffect(() => {
    if (user?.role === "admin") {
      if (!isSubscriptionLoaded) return;
      navigate(isTeamPlan ? "/dashboard" : "/billing", { replace: true });
      return;
    }
    if (profile?.id) {
      navigate(`/employees/${profile.id}`, { replace: true });
    }
  }, [user?.role, isSubscriptionLoaded, isTeamPlan, profile, navigate]);

  if (user?.role === "admin" || isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center py-16">
          <h2 className="text-lg font-semibold mb-2">Unable to load your profile</h2>
          <p className="text-muted-foreground text-sm mb-4">
            There was a problem contacting the server. Check your connection and try again.
          </p>
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      </Layout>
    );
  }

  if (profile === null) {
    return (
      <Layout>
        <div className="text-center py-16">
          <h2 className="text-lg font-semibold mb-2">No employee profile linked</h2>
          <p className="text-muted-foreground text-sm">
            Your account is not linked to an employee record in this company. Contact your admin.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    </Layout>
  );
}
