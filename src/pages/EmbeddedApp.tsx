
import { useState, useEffect } from "react";
import { GHLCredentials } from "@/types/ghl";
import Jobs from "@/components/Jobs";
import GHLConnect from "@/components/GHLConnect";

const EmbeddedApp = () => {
  const [credentials, setCredentials] = useState<GHLCredentials | null>(null);
  
  // Handle connecting with credentials
  const handleConnect = (creds: GHLCredentials) => {
    setCredentials(creds);
    // Store in localStorage for persistence
    localStorage.setItem("smartroofing_credentials", JSON.stringify(creds));
  };

  // Handle disconnecting
  const handleDisconnect = () => {
    setCredentials(null);
    localStorage.removeItem("smartroofing_credentials");
  };

  // Check for stored credentials on mount
  useEffect(() => {
    const storedCredentials = localStorage.getItem("smartroofing_credentials");
    if (storedCredentials) {
      try {
        setCredentials(JSON.parse(storedCredentials));
      } catch (error) {
        console.error("Failed to parse stored credentials:", error);
        localStorage.removeItem("smartroofing_credentials");
      }
    }
  }, []);

  return (
    <div className="embedded-app">
      {credentials ? (
        <Jobs credentials={credentials} onDisconnect={handleDisconnect} />
      ) : (
        <GHLConnect onConnect={handleConnect} />
      )}
    </div>
  );
};

export default EmbeddedApp;
