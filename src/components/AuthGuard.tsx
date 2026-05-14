
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check if GHL credentials exist in localStorage
    const storedCredentials = localStorage.getItem("smartroofing_credentials");
    
    if (!storedCredentials && location.pathname !== '/auth') {
      // No credentials, redirect to auth page
      navigate('/auth', { replace: true });
    }
    
    setLoading(false);
  }, [navigate, location.pathname]);

  // Only show the loader when checking credentials and not on auth page
  if (loading && location.pathname !== '/auth') {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
