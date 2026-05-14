
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const setLocationContext = async (locationId: string): Promise<void> => {
  try {
    console.log('Setting location context with RPC function call:', locationId);
    
    // Store the location ID in localStorage as a fallback mechanism
    localStorage.setItem('current_location_id', locationId);
    
    // Try to call the RPC function, but don't fail if it doesn't exist
    const { error } = await supabase.rpc('set_location_config', { loc_id: locationId });
    
    if (error) {
      console.error('Error setting location context:', error);
      // We'll continue execution even if this fails
    }
  } catch (error) {
    console.error('Error in setLocationContext:', error);
    // We'll continue execution even if this fails
  }
};

export const getCurrentLocationId = (): string | null => {
  return localStorage.getItem('current_location_id');
};

// New React hook to automatically set location context when credentials are available
export const useLocationContext = () => {
  useEffect(() => {
    try {
      const credentials = localStorage.getItem("smartroofing_credentials");
      if (credentials) {
        const { companyId } = JSON.parse(credentials);
        if (companyId) {
          setLocationContext(companyId).catch(error => {
            console.error("Failed to set location context in hook:", error);
          });
        }
      }
    } catch (error) {
      console.error("Error in useLocationContext hook:", error);
    }
  }, []);
};
