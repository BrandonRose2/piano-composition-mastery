import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import CompositionDetail from "./pages/CompositionDetail";
import Landing from "./pages/Landing";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

/** Wraps protected routes — shows a loading spinner while auth resolves,
 *  then redirects to /login if the user is not authenticated. */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[oklch(0.08_0.016_265)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-[oklch(0.78_0.12_85)]" />
          <p className="text-sm font-mono text-[oklch(0.50_0.012_265)] tracking-widest uppercase">Loading</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to landing/login page
    navigate("/login");
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* Public landing / login page */}
      <Route path={"/login"} component={Landing} />

      {/* Protected routes */}
      <Route path={"/"}>
        <AuthGuard>
          <Home />
        </AuthGuard>
      </Route>
      <Route path={"/composition/:id"}>
        <AuthGuard>
          <CompositionDetail />
        </AuthGuard>
      </Route>

      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
