
import { GHLCredentials, GHLOpportunity } from "@/types/ghl";
import { API_BASE_URL, getHeaders } from "../config";

export const primaryOpportunityService = {
getOpportunities: async (
  credentials: GHLCredentials
): Promise<GHLOpportunity[]> => {
  const allOpportunities: GHLOpportunity[] = [];
  let nextPageUrl: string | null =
    `${API_BASE_URL}/opportunities/search?location_id=${credentials.companyId}`;

  try {
    while (nextPageUrl) {
      const response = await fetch(nextPageUrl, {
        method: "GET",
        headers: getHeaders(credentials)
      });

      if (!response.ok) {
        console.error("GHL Search API error:", response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error("Error details:", errorData);
        throw new Error("Search endpoint failed");
      }

      const data = await response.json();
      console.log("Opportunities data from search endpoint:", data);

      if (!data || !Array.isArray(data.opportunities)) {
        console.warn("Unexpected data format from search endpoint");
        break;
      }

      const pageOpportunities: GHLOpportunity[] = data.opportunities.map(
        (opp: GHLOpportunity & { monetaryValue?: number }) => ({
          ...opp,
          value: opp.value ?? opp.monetaryValue ?? 0
        })
      );

      allOpportunities.push(...pageOpportunities);

      // Cache each opportunity
      pageOpportunities.forEach(opp => {
        try {
          localStorage.setItem(
            `ghl_opportunity_${opp.id}`,
            JSON.stringify({
              ...opp,
              cachedAt: new Date().toISOString()
            })
          );
        } catch (e) {
          console.error("Error caching opportunity:", e);
        }
      });

      // Pagination handling
      nextPageUrl = data?.meta?.nextPageUrl || null;
    }

    return allOpportunities;
  } catch (error) {
    console.error("Error in opportunity search service:", error);
    throw error;
  }
},

  getOpportunityById: async (credentials: GHLCredentials, opportunityId: string): Promise<GHLOpportunity | null> => {
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

    try {
      const response = await fetch(`${API_BASE_URL}/opportunities/${opportunityId}`, {
        method: "GET",
        headers: getHeaders(credentials)
      });

      if (!response.ok) {
        console.error("GHL API error fetching opportunity details:", response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error("Error details:", errorData);
        throw new Error("Primary endpoint failed");
      }

      const data = await response.json();
      console.log("Opportunity details:", data);
      const opportunity = data.opportunity || data || null;
      
      if (opportunity) {
        const processedOpportunity = {
          ...opportunity,
          value: opportunity.value || opportunity.monetaryValue || 0
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
      
      return null;
    } catch (error) {
      console.error("Error fetching opportunity by ID in primary service:", error);
      throw error;
    }
  }
};
