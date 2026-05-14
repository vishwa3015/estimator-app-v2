import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import EmbeddedApp from "@/pages/EmbeddedApp";
import JobReporting from "@/pages/JobReporting";
import Settings from "@/pages/Settings";
import EstimateEditor from "@/pages/EstimateEditor";
import EstimateAction from "@/pages/EstimateAction";
import { useLocationContext } from "@/hooks/use-location-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "./integrations/supabase/client";
import TemplatePreviewPage from "./components/ui/TemplatePreviewPage";
import AppFooter from "./components/AppFooter";

// Create a client for React Query
const queryClient = new QueryClient();

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || (event !== "INITIAL_SESSION" && !session)) {
          localStorage.removeItem("smartroofing_credentials");
          localStorage.removeItem("eagleview_auth_token");
          navigate("/auth", { replace: true });
        }
      }
    );

    const checkSession = async () => {
      const currentPath = window.location.pathname;
      if (currentPath === "/auth") return;

      const { data: { user }, error } = await supabase.auth.getUser();

      if (!user || error) {
        console.warn("Session invalid or expired:", error?.message);
        localStorage.removeItem("smartroofing_credentials");
        localStorage.removeItem("eagleview_auth_token");

        await supabase.auth.signOut();
        navigate("/auth", { replace: true });
      }
    };

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  return (
    <>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/embedded" element={<EmbeddedApp />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/job/:opportunityId" element={<JobReporting />} />
      <Route path="/create-estimate/:opportunityId" element={<EstimateEditor />} />
      <Route path="/create-estimate-for-contact/:contactId" element={<EstimateEditor />} />
      <Route path="/create-estimate-for-contact/:contactId/:estimateId" element={<EstimateEditor />} />
      <Route path="/estimates/:estimateId" element={<EstimateEditor />} />
      <Route path="/estimate-action/:estimateId" element={<EstimateAction />} />
      <Route path="/template-preview" element={<TemplatePreviewPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
     <AppFooter />
     </>
  );
}

function App() {
  // Initialize location context on app load
  useLocationContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppRoutes />
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
