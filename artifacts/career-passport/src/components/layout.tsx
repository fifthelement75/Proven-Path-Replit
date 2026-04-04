import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface LayoutProps {
  children: ReactNode;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthContext();
  const [location] = useLocation();
  const queryClient = useQueryClient();

  const isAdmin = user?.role === "admin";
  const isEmployee = user?.role === "employee" || user?.role === "manager";

  const { data: myProfile } = useQuery<{ id: number } | null>({
    queryKey: ["employees", "me"],
    enabled: !!user,
    retry: false,
    queryFn: async () => {
      const res = await fetch(getApiUrl("/employees/me"), { headers: authHeaders() });
      if (res.status === 404) return null;
      if (!res.ok) return null;
      return res.json();
    },
  });

  function handleLogout() {
    logout();
    queryClient.clear();
  }

  const adminNavItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/employees", label: "Employees" },
    { href: "/settings", label: "Settings" },
  ];

  const employeeNavItems = myProfile
    ? [{ href: `/employees/${myProfile.id}`, label: "My Profile" }]
    : [];

  const navItems = isAdmin ? adminNavItems : employeeNavItems;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href={isAdmin ? "/dashboard" : (myProfile ? `/employees/${myProfile.id}` : "/dashboard")}>
              <span className="font-bold text-lg tracking-tight text-primary">Career Passport</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <Link key={item.href} href={item.href}>
                  <span className={`px-3 py-1.5 text-sm rounded-md transition-colors font-medium cursor-pointer ${
                    location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href))
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}>
                    {item.label}
                  </span>
                </Link>
              ))}
              {isAdmin && myProfile && (
                <Link href={`/employees/${myProfile.id}`}>
                  <span className={`px-3 py-1.5 text-sm rounded-md transition-colors font-medium cursor-pointer ${
                    location === `/employees/${myProfile.id}`
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}>
                    My Profile
                  </span>
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {isEmployee ? user?.email : user?.companyName}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
