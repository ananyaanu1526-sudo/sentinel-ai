import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Analyzer from "./pages/Analyzer";
import Threats from "./pages/Threats";
import ThreatDetail from "./pages/ThreatDetail";
import Intelligence from "./pages/Intelligence";
import Extension from "./pages/Extension";
import NotFound from "./pages/NotFound";
import { AppLayout } from "./components/layout/AppLayout";

const queryClient = new QueryClient();

const Protected = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground mono">Initializing SOC…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<Protected><AppLayout /></Protected>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/analyzer" element={<Analyzer />} />
              <Route path="/threats" element={<Threats />} />
              <Route path="/threats/:id" element={<ThreatDetail />} />
              <Route path="/intelligence" element={<Intelligence />} />
              <Route path="/extension" element={<Extension />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
