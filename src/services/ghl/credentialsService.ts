
import { toast } from "sonner";
import { GHLCredentials } from "@/types/ghl";
import { API_BASE_URL, getHeaders } from "./config";

export const credentialsService = {
  validateCredentials: async (credentials: GHLCredentials): Promise<boolean> => {
    try {

      const response = await fetch(`${API_BASE_URL}/locations/${credentials.companyId}`, {
        method: "GET",
        headers: getHeaders(credentials) 
      });

      if (!response.ok) {
        console.error("Error validating credentials:", response.status, response.statusText);
        const errorData = await response.json();
        console.error("Error data:", errorData);
        throw new Error(`Invalid credentials (${response.status}): ${errorData.msg || 'Unknown error'}`);
      }

      return true;
    } catch (error) {
      console.error("Error validating credentials:", error);
      toast.error("Failed to validate GHL credentials. Please check your API key and Location ID.");
      return false;
    }
  },

  getLocationDetails: async (credentials: GHLCredentials): Promise<{ name: string } | null> => {
    try {
      console.log("Fetching location details...");
      const locationResponse = await fetch(`${API_BASE_URL}/locations/${credentials.companyId}`, {
        method: "GET",
        headers: getHeaders(credentials)
      });

      if (!locationResponse.ok) {
        console.error("Error fetching location details:", locationResponse.status, locationResponse.statusText);
        return null;
      }

      const locationData = await locationResponse.json();
      console.log("Location details:", locationData);

      if (locationData && locationData.location) {
        return {
          name: locationData.location.name,
          ...locationData.location
        };
      } else if (locationData && locationData.name) {
        return {
          name: locationData.name,
          ...locationData
        };
      }

      return null;
    } catch (error) {
      console.error("Error fetching location details:", error);
      return null;
    }
  }
};
