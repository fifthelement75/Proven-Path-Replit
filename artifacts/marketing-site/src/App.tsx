import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Pricing from "@/pages/Pricing";
import Contact from "@/pages/Contact";
import Signup from "@/pages/Signup";
import Privacy from "@/pages/Privacy";
import Placeholder from "@/pages/Placeholder";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/contact" component={Contact} />
      <Route path="/signup" component={Signup} />
      <Route path="/blog" component={() => <Placeholder title="Blog" />} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={() => <Placeholder title="Terms of Service" />} />
      <Route path="/security" component={() => <Placeholder title="Security" />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <ScrollToTop />
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
