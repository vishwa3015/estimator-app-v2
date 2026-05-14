import { useState, useEffect } from "react";
import Jobs from "@/components/Jobs";
import DashboardNav from "@/components/DashboardNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { GHLCredentials } from "@/types/ghl";
import { contactsService } from "@/services/ghl/contacts";

const Index = () => {
  const [credentials, setCredentials] = useState<GHLCredentials | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  useEffect(() => {
    const storedCredentials = localStorage.getItem("smartroofing_credentials");
    if (storedCredentials) {
      try {
        setCredentials(JSON.parse(storedCredentials));
      } catch (error) {
        console.error("Error parsing stored credentials:", error);
        localStorage.removeItem("smartroofing_credentials");
      }
    }
  }, []);
  
  const handleConnect = (newCredentials: GHLCredentials) => {
    setCredentials(newCredentials);
    localStorage.setItem("smartroofing_credentials", JSON.stringify(newCredentials));
  };
  
  const handleDisconnect = () => {
    contactsService.clearCache();
    setCredentials(null);
    localStorage.removeItem("smartroofing_credentials");
  };
  
  return (
    <div className={`min-h-screen bg-background ${!isMobile ? 'desktop-content' : ''}`}>
      {credentials ? (
        <>
          <div className={!isMobile ? 'p-4 desktop:p-6' : ''}>
            <DashboardNav />
          </div>
          <Jobs credentials={credentials} onDisconnect={handleDisconnect} />
        </>
      ) : (
        <div className="p-4">
          <p className="text-center mb-4 text-lg">Please go to the Auth page to connect your account.</p>
          <div className="flex justify-center">
            <button 
              className="px-4 py-2 rounded bg-primary text-white" 
              onClick={() => navigate('/auth')}
            >
              Go to Auth Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
