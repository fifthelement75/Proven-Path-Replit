import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import EmployeesPage from "@/pages/employees";
import EmployeeDetailPage from "@/pages/employee-detail";
import SharePage from "@/pages/share";
import SettingsPage from "@/pages/settings";
import MyProfileRedirect from "@/pages/my-profile";
import PeerReviewPage from "@/pages/peer-review";
import SelfReflectionPage from "@/pages/self-reflection";
import CandidatesPage from "@/pages/candidates";
import CandidateDetailPage from "@/pages/candidate-detail";
import BillingPage from "@/pages/billing";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuthContext();
  if (!isAuthenticated) return <Redirect to="/login" />;
  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, user } = useAuthContext();
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (user?.role !== "admin") return <Redirect to="/employees/me" />;
  return <Component />;
}

function PublicOnlyRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, user } = useAuthContext();
  if (isAuthenticated) {
    if (user?.role === "employee" || user?.role === "manager") {
      return <Redirect to="/employees/me" />;
    }
    return <Redirect to="/dashboard" />;
  }
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/login" component={() => <PublicOnlyRoute component={LoginPage} />} />
      <Route path="/register" component={() => <PublicOnlyRoute component={RegisterPage} />} />
      <Route path="/dashboard" component={() => <AdminRoute component={DashboardPage} />} />
      <Route path="/employees" component={() => <AdminRoute component={EmployeesPage} />} />
      <Route path="/employees/me" component={() => <PrivateRoute component={MyProfileRedirect} />} />
      <Route path="/employees/:id" component={() => <PrivateRoute component={EmployeeDetailPage} />} />
      <Route path="/settings" component={() => <AdminRoute component={SettingsPage} />} />
      <Route path="/billing" component={() => <AdminRoute component={BillingPage} />} />
      <Route path="/candidates" component={() => <AdminRoute component={CandidatesPage} />} />
      <Route path="/candidates/:id" component={() => <AdminRoute component={CandidateDetailPage} />} />
      <Route path="/share/:token" component={SharePage} />
      <Route path="/peer-review/:token" component={PeerReviewPage} />
      <Route path="/self-reflection/:token" component={SelfReflectionPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
