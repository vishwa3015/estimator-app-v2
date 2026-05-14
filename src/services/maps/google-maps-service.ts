import { supabase } from "@/integrations/supabase/client";

let cachedApiKey: string | null = null;

function getCurrentLocationId(): string {
  try {
    const stored = localStorage.getItem("smartroofing_credentials");
    if (!stored) {
      throw new Error("GHL credentials not found in localStorage");
    }

    const creds = JSON.parse(stored);
    const locationId = creds.companyId || creds.locationId;

    if (!locationId) {
      throw new Error("location_id / companyId missing from GHL credentials");
    }

    return locationId;
  } catch (err) {
    console.error("Failed to get location_id:", err);
    throw new Error("Unable to determine current location ID");
  }
}

const getGoogleMapsApiKey = async (): Promise<string> => {
  if (cachedApiKey) return cachedApiKey;

  const locationId = getCurrentLocationId();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("google_maps_api_key")
    .eq("location_id", locationId)
    .single();

  if (error) {
    console.error("Supabase error fetching Google Maps API key:", error);
    throw new Error("Failed to load Google Maps API key from profile");
  }

  if (!data?.google_maps_api_key) {
    throw new Error("Google Maps API key not configured for this location. Please add it in Settings.");
  }

  cachedApiKey = data.google_maps_api_key;
  return cachedApiKey;
};

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export const googleMapsService = {
  geocodeAddress: async (address: string): Promise<GeocodeResult> => {
    const apiKey = await getGoogleMapsApiKey();
    const encoded = encodeURIComponent(address);
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Geocoding request failed: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.results?.length) {
      throw new Error(`Geocoding failed: ${data.status} - ${data.error_message || "No results"}`);
    }

    const result = data.results[0];
    return {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
    };
  },

  clearCache: () => {
    cachedApiKey = null;
  },
};