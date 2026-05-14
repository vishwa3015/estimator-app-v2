import { useEffect, useState } from "react";
import { GHLCredentials } from "@/types/ghl";

export const useLocalGHLCredentials = (): {
  credentials: GHLCredentials | null;
  loading: boolean;
} => {
  const [credentials, setCredentials] = useState<GHLCredentials | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("smartroofing_credentials");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCredentials({
          pit: parsed.pit,
          apikey: parsed.apikey,
          companyId: parsed.companyId,
        });
      } catch (e) {
        console.warn("Failed to parse smartroofing_credentials", e);
      }
    }
    setLoading(false);
  }, []);

  return { credentials, loading };
};