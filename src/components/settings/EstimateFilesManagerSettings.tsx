import React, { useEffect, useState } from "react";
import { locationService } from "@/services/estimates/location-service";
import { EstimateFilesManagerPanel } from "./EstimateFilesManagerPanel";

/**
 * Top-level Settings screen (alongside Default Values, Products, …).
 */
const EstimateFilesManagerSettings: React.FC = () => {
  const [locationId, setLocationId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      const id = await locationService.getLocationContext();
      if (cancelled) return;
      if (!id) {
        setError("You are not authorized to access this page. Please login.");
        setLocationId(null);
      } else {
        setLocationId(id);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8">Loading…</p>;
  }
  if (error) {
    return <div className="text-sm text-destructive py-8">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <EstimateFilesManagerPanel locationId={locationId} />
    </div>
  );
};

export default EstimateFilesManagerSettings;
