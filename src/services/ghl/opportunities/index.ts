
import { GHLCredentials, GHLOpportunity } from "@/types/ghl";
import { primaryOpportunityService } from "./primary";
import { alternativeOpportunityService } from "./alternative";
import { toast } from "sonner";

export const opportunitiesService = {
  getOpportunities: async (credentials: GHLCredentials): Promise<GHLOpportunity[]> => {
    let opportunities: GHLOpportunity[] = [];
    
    // Try to load from cache first for instant view
    try {
      const cachedOpportunities = localStorage.getItem('ghl_opportunities_list');
      if (cachedOpportunities) {
        const cached = JSON.parse(cachedOpportunities);
        const cachedTime = cached && cached.timestamp ? new Date(cached.timestamp) : null;
        const now = new Date();
        // Use cache if less than 5 minutes old
        if (cachedTime && now.getTime() - cachedTime.getTime() < 5 * 60 * 1000) {
          console.log("Using cached opportunities list");
          if (cached.opportunities) {
            opportunities = cached.opportunities;
          }
        }
      }
    } catch (e) {
      console.error("Error reading cached opportunities list:", e);
    }
    
    // Fetch fresh data regardless of cache
    try {
      const freshOpportunities = await primaryOpportunityService.getOpportunities(credentials);
      
      // Cache the opportunities list
      try {
        localStorage.setItem('ghl_opportunities_list', JSON.stringify({
          opportunities: freshOpportunities,
          timestamp: new Date().toISOString()
        }));
      } catch (e) {
        console.error("Error caching opportunities list:", e);
      }
      
      return freshOpportunities;
    } catch (primaryError) {
      console.error("Error fetching opportunities from primary endpoint:", primaryError);
      
      if (opportunities && opportunities.length > 0) {
        toast.error("Using cached data. Refresh for latest opportunities.");
        return opportunities;
      }
      
      try {
        const alternativeOpportunities = await alternativeOpportunityService.getOpportunities(credentials);
        
        // Cache the opportunities list
        try {
          localStorage.setItem('ghl_opportunities_list', JSON.stringify({
            opportunities: alternativeOpportunities,
            timestamp: new Date().toISOString()
          }));
        } catch (e) {
          console.error("Error caching opportunities list:", e);
        }
        
        return alternativeOpportunities;
      } catch (alternativeError) {
        console.error("Both primary and alternative endpoints failed:", alternativeError);
        toast.error("Failed to fetch opportunities from GHL.");
        return opportunities;
      }
    }
  },

  getOpportunityById: async (credentials: GHLCredentials, opportunityId: string): Promise<GHLOpportunity | null> => {
    // Try to get from cache first for instant result
    try {
      const cachedOpportunity = localStorage.getItem(`ghl_opportunity_${opportunityId}`);
      if (cachedOpportunity) {
        const parsed = JSON.parse(cachedOpportunity);
        console.log("Using cached opportunity data initially for", opportunityId);
        // Return cached data immediately but still fetch in background
        setTimeout(() => {
          opportunitiesService.refreshOpportunityById(credentials, opportunityId);
        }, 100);

        // Guard for object, return null if missing id
        if (parsed && parsed.id) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error reading cache:", e);
    }
    
    // If not in cache, try to find it in the opportunities list cache
    try {
      const cachedOpportunities = localStorage.getItem('ghl_opportunities_list');
      if (cachedOpportunities) {
        const cached = JSON.parse(cachedOpportunities);
        if (cached && cached.opportunities && Array.isArray(cached.opportunities)) {
          const foundOpportunity = (cached.opportunities as GHLOpportunity[]).find((opp) => opp && opp.id === opportunityId);
          if (foundOpportunity && foundOpportunity.id) {
            console.log("Found opportunity in cached list:", foundOpportunity);

            setTimeout(() => {
              opportunitiesService.refreshOpportunityById(credentials, opportunityId);
            }, 100);

            return foundOpportunity;
          }
        }
      }
    } catch (e) {
      console.error("Error searching cached opportunities list:", e);
    }
    
    // If not found in any cache, fetch from API
    return opportunitiesService.refreshOpportunityById(credentials, opportunityId);
  },
  
  refreshOpportunityById: async (credentials: GHLCredentials, opportunityId: string): Promise<GHLOpportunity | null> => {
    try {
      const opp = await primaryOpportunityService.getOpportunityById(credentials, opportunityId);
      if (opp && opp.id) return opp;
    } catch (error) {
      console.error("Error fetching opportunity details:", error);
      try {
        const opp = await alternativeOpportunityService.getOpportunityByIdFromPipelines(credentials, opportunityId);
        if (opp && opp.id) return opp;
      } catch (secondError) {
        console.error("Both primary and alternative approaches failed to fetch opportunity:", secondError);
        toast.error("Failed to fetch opportunity details.");
        return null;
      }
    }
    return null;
  }
};
