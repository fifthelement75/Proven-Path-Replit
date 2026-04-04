import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiUrl } from "@/lib/api";
import { getToken } from "@/lib/auth";

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function MyProfileRedirect() {
  const [, navigate] = useLocation();

  const { data: profile, isLoading, error } = useQuery<{ id: number } | null>({
    queryKey: ["employees", "me"],
    retry: false,
    queryFn: async () => {
      const res = await fetch(getApiUrl("/employees/me"), { headers: authHeaders() });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
  });

  useEffect(() => {
    if (profile?.id) {
      navigate(`/employees/${profile.id}`, { replace: true });
    }
  }, [profile, navigate]);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Layout>
    );
  }

  if (error || profile === null) {
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
