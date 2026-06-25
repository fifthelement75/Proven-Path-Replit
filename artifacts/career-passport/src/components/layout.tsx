import { type ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProfileDialog } from "@/components/profile-dialog";
import { WelcomeTrialDialog } from "@/components/welcome-trial-dialog";
import { LogOut, Settings, FileText, Shield, CreditCard, Menu, MapPin } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { getToken } from "@/lib/auth";
import logoUrl from "@assets/ProvenPath_Logo_1777768672978.png";

function getInitials(name?: string | null, email?: string | null): string {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

interface LayoutProps {
  children: ReactNode;
}

interface Notification {
  id: number;
  message: string;
  type: string;
  read: boolean;
  relatedEmployeeId: number | null;
  createdAt: string;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function NotificationBell({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/notifications"), { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { mutate: markAllRead } = useMutation({
    mutationFn: async () => {
      await fetch(getApiUrl("/notifications/read-all"), { method: "POST", headers: authHeaders() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", userId] }),
  });

  const { mutate: markRead } = useMutation({
    mutationFn: async (id: number) => {
      await fetch(getApiUrl(`/notifications/${id}/read`), { method: "PATCH", headers: authHeaders() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", userId] }),
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleOpen() {
    setOpen(v => !v);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={() => markAllRead()} className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 20).map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`px-4 py-3 border-b last:border-b-0 cursor-default hover:bg-accent/50 transition-colors ${!n.read ? "bg-blue-50/60" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                    {n.read && <div className="w-2 h-2 mt-1.5 shrink-0" />}
                    <div>
                      <p className="text-xs leading-relaxed">{n.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthContext();
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const [profileOpen, setProfileOpen] = useState(false);
  const [welcomeTrial, setWelcomeTrial] = useState<{ trialEndsAt: string | null } | null>(null);
  const { state: tourState, startTour } = useOnboarding();
  const autoStarted = useRef(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pp_welcome_trial");
      if (raw) {
        sessionStorage.removeItem("pp_welcome_trial");
        const parsed = JSON.parse(raw) as { trialEndsAt?: string | null };
        setWelcomeTrial({ trialEndsAt: parsed.trialEndsAt ?? null });
      }
    } catch {
      // ignore
    }
  }, []);

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";

  useEffect(() => {
    if (!autoStarted.current && isAdmin && !tourState.active && !tourState.dismissed) {
      autoStarted.current = true;
      const t = setTimeout(startTour, 1800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isAdmin]);

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
    { href: "/candidates", label: "Interviews" },
    { href: "/settings", label: "Settings" },
  ];

  const employeeNavItems = myProfile
    ? [{ href: `/employees/${myProfile.id}`, label: "My Profile" }]
    : [];

  const managerNavItems = [
    { href: "/employees", label: "Employees" },
    ...(myProfile ? [{ href: `/employees/${myProfile.id}`, label: "My Profile" }] : []),
  ];

  const navItems = isAdmin ? adminNavItems : isManager ? managerNavItems : employeeNavItems;

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location]);

  const allMobileNavItems = isAdmin && myProfile
    ? [...adminNavItems, { href: `/employees/${myProfile.id}`, label: "My Profile" }]
    : navItems;

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f8ff]">
      <header className="border-b bg-card shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-8 min-w-0">
            {user && allMobileNavItems.length > 0 && (
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="md:hidden inline-flex items-center justify-center h-11 w-11 -ml-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="Open navigation menu"
                    data-testid="button-mobile-nav"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <SheetHeader className="px-5 py-4 border-b text-left">
                    <SheetTitle className="flex items-center">
                      <img src={logoUrl} alt="ProvenPath" className="h-7 w-auto" />
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col p-3 gap-1">
                    {allMobileNavItems.map(item => {
                      const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
                      return (
                        <Link key={item.href} href={item.href}>
                          <span
                            onClick={() => setMobileNavOpen(false)}
                            className={`block px-4 py-3 text-base rounded-md font-medium cursor-pointer ${
                              isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                            }`}
                          >
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                    {user?.role === "admin" && (
                      <Link href="/billing">
                        <span
                          onClick={() => setMobileNavOpen(false)}
                          className={`block px-4 py-3 text-base rounded-md font-medium cursor-pointer ${
                            location === "/billing" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                          }`}
                        >
                          Billing & subscription
                        </span>
                      </Link>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
            )}
            <Link href={isAdmin ? "/dashboard" : (myProfile ? `/employees/${myProfile.id}` : "/dashboard")}>
              <img src={logoUrl} alt="ProvenPath" className="h-8 w-auto cursor-pointer" />
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
          <div className="flex items-center gap-2">
            {user && <NotificationBell userId={user.id} />}
            <span className="text-sm text-muted-foreground hidden lg:block max-w-[180px] truncate">
              {isAdmin ? user?.companyName : user?.email}
            </span>
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="Open account menu"
                    data-testid="button-account-menu"
                  >
                    <Avatar className="h-9 w-9 border border-border hover:opacity-90 transition-opacity">
                      {user.profilePhotoUrl ? (
                        <AvatarImage src={user.profilePhotoUrl} alt={user.name || user.email} />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {getInitials(user.name || (isAdmin ? user.companyName : null), user.email)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium truncate">
                        {user.name || (isAdmin ? user.companyName : user.email)}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setProfileOpen(true)} data-testid="menu-profile-settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Profile settings
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onSelect={startTour}>
                      <MapPin className="h-4 w-4 mr-2" />
                      Take a tour
                    </DropdownMenuItem>
                  )}
                  {user?.role === "admin" && (
                    <DropdownMenuItem asChild data-testid="menu-billing">
                      <Link href="/billing">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Billing & subscription
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href="/terms" target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4 mr-2" />
                      Terms of Service
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="/privacy" target="_blank" rel="noopener noreferrer">
                      <Shield className="h-4 w-4 mr-2" />
                      Privacy Policy
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={handleLogout}
                    className="text-destructive focus:text-destructive"
                    data-testid="menu-sign-out"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <WelcomeTrialDialog
        open={welcomeTrial !== null}
        trialEndsAt={welcomeTrial?.trialEndsAt ?? null}
        onOpenChange={(open) => {
          if (!open) setWelcomeTrial(null);
        }}
      />
    </div>
  );
}
