
import { toast } from "sonner";
import { GHLCredentials, GHLOpportunity } from "@/types/ghl";
import { API_BASE_URL, getHeaders } from "../config";

type RawOpportunity = GHLOpportunity & { monetaryValue?: number };
interface Pipeline {
  id: string;
  name: string;
}

export const alternativeOpportunityService = {
  getOpportunities: async (credentials: GHLCredentials): Promise<GHLOpportunity[]> => {
    console.log("Trying alternative endpoint for opportunities...");
    
    const response = await fetch(`${API_BASE_URL}/opportunities/pipelines?locationId=${credentials.companyId}`, {
      method: "GET",
      headers: getHeaders(credentials)
    });

    if (!response.ok) {
      console.error("GHL API alternative endpoint error:", response.status, response.statusText);
      const errorData = await response.json().catch(() => ({}));
      console.error("Alternative endpoint error details:", errorData);
      toast.error("Failed to fetch opportunities from GHL.");
      return [];
    }

    const data = await response.json();
    console.log("Pipelines data from alternative endpoint:", data);
    
    if (data && Array.isArray(data.pipelines)) {
      let allOpportunities: GHLOpportunity[] = [];
      
      const opportunityPromises = (data.pipelines as Pipeline[]).map(async (pipeline) => {
        try {
          let pipelineOpportunities: RawOpportunity[] = [];
          let page = 1;
          let hasMore = true;
          const limit = 100;
          
          while (hasMore) {
            const pipelineResponse = await fetch(
              `${API_BASE_URL}/pipelines/${pipeline.id}/opportunities?locationId=${credentials.companyId}&limit=${limit}&page=${page}`, 
              {
                method: "GET",
                headers: getHeaders(credentials)
              }
            );
            
            if (!pipelineResponse.ok) {
              console.error(`Error fetching opportunities for pipeline ${pipeline.id}`);
              break;
            }
            
            const pipelineData = await pipelineResponse.json();
            console.log(`Opportunities for pipeline ${pipeline.id} (page ${page}):`, pipelineData);
            
            let pageOpportunities: RawOpportunity[] = [];
            if (pipelineData && Array.isArray(pipelineData.opportunities)) {
              pageOpportunities = pipelineData.opportunities;
            } else if (pipelineData && Array.isArray(pipelineData)) {
              pageOpportunities = pipelineData;
            } else {
              break;
            }
            
            pipelineOpportunities = [...pipelineOpportunities, ...pageOpportunities];
            
            // Cache opportunities by ID for faster access later
            pageOpportunities.forEach(opp => {
              try {
                localStorage.setItem(`ghl_opportunity_${opp.id}`, JSON.stringify({
                  ...opp,
                  value: opp.value || opp.monetaryValue || 0,
                  cachedAt: new Date().toISOString()
                }));
              } catch (e) {
                console.error("Error caching opportunity:", e);
              }
            });
            
            // Check if we should fetch more pages
            if (pageOpportunities.length < limit) {
              hasMore = false;
            } else {
              page++;
            }
          }
          
          return pipelineOpportunities.map((opp) => ({
            ...opp,
            value: opp.value || opp.monetaryValue || 0
          }));
        } catch (error) {
          console.error(`Error fetching opportunities for pipeline ${pipeline.id}:`, error);
          return [];
        }
      });
      
      const pipelineOpportunities = await Promise.all(opportunityPromises);
      
      pipelineOpportunities.forEach(opportunities => {
        allOpportunities = [...allOpportunities, ...opportunities];
      });
      
      return allOpportunities;
    }
    
    console.log("No pipelines or opportunities found in alternative approach");
    toast.error("No opportunities found in your GHL account.");
    return [];
  },

  getOpportunityByIdFromPipelines: async (credentials: GHLCredentials, opportunityId: string): Promise<GHLOpportunity | null> => {
    // First try to get from cache
    try {
      const cachedOpportunity = localStorage.getItem(`ghl_opportunity_${opportunityId}`);
      if (cachedOpportunity) {
        const parsed = JSON.parse(cachedOpportunity);
        const cachedTime = new Date(parsed.cachedAt);
        const now = new Date();
        // Use cache if less than 5 minutes old
        if (now.getTime() - cachedTime.getTime() < 5 * 60 * 1000) {
          console.log("Using cached opportunity data for", opportunityId);
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error reading cache:", e);
    }
    
    console.log(`Trying to find opportunity ${opportunityId} in pipelines...`);
    
    const pipelinesResponse = await fetch(`${API_BASE_URL}/opportunities/pipelines?locationId=${credentials.companyId}`, {
      method: "GET",
      headers: getHeaders(credentials)
    });
    
    if (!pipelinesResponse.ok) {
      console.error("Error fetching pipelines for opportunity search");
      return null;
    }
    
    const pipelinesData = await pipelinesResponse.json();
    
    if (!pipelinesData.pipelines || !Array.isArray(pipelinesData.pipelines)) {
      console.error("Invalid pipelines data format");
      return null;
    }
    
    // Try to find opportunity from cache first as a temporary result
    // while we search in background
    let cachedResult = null;
    try {
      // Try to load opportunity list from cache first
      const cachedOpportunities = localStorage.getItem('ghl_opportunities_list');
      if (cachedOpportunities) {
        const opportunities = JSON.parse(cachedOpportunities);
        const foundOpportunity = (opportunities as RawOpportunity[]).find((opp) => opp.id === opportunityId);
        if (foundOpportunity) {
          cachedResult = {
            ...foundOpportunity,
            value: foundOpportunity.value || foundOpportunity.monetaryValue || 0
          };
        }
      }
    } catch (e) {
      console.error("Error searching cache for opportunity:", e);
    }
    
    // Search each pipeline for the opportunity
    for (const pipeline of pipelinesData.pipelines as Pipeline[]) {
      try {
        const opportunitiesResponse = await fetch(
          `${API_BASE_URL}/pipelines/${pipeline.id}/opportunities?locationId=${credentials.companyId}&limit=100`,
          {
            method: "GET",
            headers: getHeaders(credentials)
          }
        );
        
        if (!opportunitiesResponse.ok) {
          console.error(`Error fetching opportunities for pipeline ${pipeline.id}`);
          continue;
        }
        
        const opportunitiesData = await opportunitiesResponse.json();
        
        if (opportunitiesData.opportunities && Array.isArray(opportunitiesData.opportunities)) {
          const foundOpportunity = (opportunitiesData.opportunities as RawOpportunity[]).find((opp) => opp.id === opportunityId);
          
          if (foundOpportunity) {
            console.log(`Found opportunity ${opportunityId} in pipeline ${pipeline.id}`, foundOpportunity);
            const processedOpportunity = {
              ...foundOpportunity,
              value: foundOpportunity.value || foundOpportunity.monetaryValue || 0
            };
            
            // Save to cache
            try {
              localStorage.setItem(`ghl_opportunity_${opportunityId}`, JSON.stringify({
                ...processedOpportunity,
                cachedAt: new Date().toISOString()
              }));
            } catch (e) {
              console.error("Error caching opportunity:", e);
            }
            
            return processedOpportunity;
          }
        }
      } catch (error) {
        console.error(`Error processing pipeline ${pipeline.id}:`, error);
      }
    }
    
    // If we have a cached result and couldn't find it in any pipeline, return the cached result
    if (cachedResult) {
      console.log("Using cached opportunity data as fallback:", cachedResult);
      return cachedResult;
    }
    
    console.error(`Opportunity ${opportunityId} not found in any pipeline`);
    return null;
  }
};
