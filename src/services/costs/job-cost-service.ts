
import { v4 as uuidv4 } from "uuid";
import { JobCost } from "@/types/ghl";
import { jobCostStorage } from "./storage";
import { costCalculator } from "./calculator";
import { setLocationContext, getCurrentLocationId } from "@/hooks/use-location-context";

// Cache management
let jobCostsCache: Record<string, JobCost> = {};
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export const jobCostService = {
  getJobCosts: async (): Promise<Record<string, JobCost>> => {
    try {
      // Get credentials to set location context
      const credentials = localStorage.getItem("smartroofing_credentials");
      if (!credentials) {
        throw new Error("No credentials found");
      }
      
      const { companyId: locationId } = JSON.parse(credentials);
      
      // Set location context - will continue even if it fails
      console.log('Setting location context before getting job costs:', locationId);
      await setLocationContext(locationId);
      
      const now = Date.now();
      if (Object.keys(jobCostsCache).length === 0 || now - lastFetchTime > CACHE_DURATION) {
        try {
          jobCostsCache = await jobCostStorage.getJobCosts();
          lastFetchTime = now;
        } catch (error) {
          console.error("Error fetching job costs:", error);
          
          // Try to get from localStorage if available
          try {
            const localData = localStorage.getItem('job_costs_cache');
            if (localData) {
              jobCostsCache = JSON.parse(localData);
            }
          } catch (e) {
            console.error('Error reading from cache:', e);
          }
        }
      }
      return jobCostsCache;
    } catch (error) {
      console.error("Error in getJobCosts:", error);
      return jobCostsCache || {};
    }
  },
  
  saveJobCosts: async (jobCosts: Record<string, JobCost>): Promise<void> => {
    try {
      // Get credentials to set location context
      const credentials = localStorage.getItem("smartroofing_credentials");
      if (!credentials) {
        throw new Error("No credentials found");
      }
      
      const { companyId: locationId } = JSON.parse(credentials);
      
      // Set location context - will continue even if it fails
      console.log('Setting location context before saving job costs:', locationId);
      await setLocationContext(locationId);
      
      // Update in-memory cache
      jobCostsCache = { ...jobCosts };
      
      // Update local storage cache first as a fallback
      localStorage.setItem('job_costs_cache', JSON.stringify(jobCosts));
      
      // Try to save to the database
      try {
        await jobCostStorage.saveJobCosts(jobCosts);
      } catch (dbError) {
        console.error("Error saving to database, but in-memory and local cache are updated:", dbError);
      }
    } catch (error) {
      console.error("Error saving job costs:", error);
      throw error;
    }
  },
  
  getJobCostByOpportunityId: async (opportunityId: string): Promise<JobCost | null> => {
    try {
      // Get credentials to set location context
      const credentials = localStorage.getItem("smartroofing_credentials");
      if (!credentials) {
        throw new Error("No credentials found");
      }
      
      const { companyId: locationId } = JSON.parse(credentials);
      
      // Set location context - will continue even if it fails
      console.log('Setting location context before getting job cost by opportunity ID:', locationId);
      await setLocationContext(locationId);
      
      const allCosts = await jobCostService.getJobCosts();
      return allCosts[opportunityId] || null;
    } catch (error) {
      console.error(`Error fetching job cost for opportunity ${opportunityId}:`, error);
      return null;
    }
  },

  createOrUpdateJobCost: async (opportunityId: string, jobValue: number, isManualModification: boolean = false): Promise<JobCost> => {
    try {
      // Get credentials to set location context
      const credentials = localStorage.getItem("smartroofing_credentials");
      if (!credentials) {
        throw new Error("No credentials found");
      }
      
      const { companyId: locationId } = JSON.parse(credentials);
      
      // Set location context - will continue even if it fails
      console.log('Setting location context before creating/updating job cost:', locationId);
      await setLocationContext(locationId);
      
      const allCosts = await jobCostService.getJobCosts();
      const existingCost = allCosts[opportunityId];
      
      if (!existingCost) {
        const newJobCost: JobCost = {
          opportunityId,
          jobValue,
          costItems: [],
          totalCost: 0,
          profit: jobValue,
          marginPercent: 100,
          lastUpdated: new Date().toISOString(),
          isJobValueManuallyModified: isManualModification,
          jobValueManuallyModifiedDate: isManualModification ? new Date().toISOString() : undefined
        };
        
        allCosts[opportunityId] = newJobCost;
        await jobCostService.saveJobCosts(allCosts);
        return newJobCost;
      }
      
      if (existingCost.jobValue !== jobValue) {
        existingCost.jobValue = jobValue;
        existingCost.lastUpdated = new Date().toISOString();
        
        if (isManualModification) {
          existingCost.isJobValueManuallyModified = true;
          existingCost.jobValueManuallyModifiedDate = new Date().toISOString();
        }
        
        const recalculated = costCalculator.recalculateTotals(existingCost);
        existingCost.totalCost = recalculated.totalCost;
        existingCost.profit = recalculated.profit;
        existingCost.marginPercent = recalculated.marginPercent;
      }

      allCosts[opportunityId] = existingCost;
      await jobCostService.saveJobCosts(allCosts);
      return existingCost;
    } catch (error) {
      console.error(`Error creating/updating job cost for opportunity ${opportunityId}:`, error);
      // Return a default job cost object if we can't get or create one
      return {
        opportunityId,
        jobValue,
        costItems: [],
        totalCost: 0,
        profit: jobValue,
        marginPercent: 100,
        lastUpdated: new Date().toISOString()
      };
    }
  },
  
  syncJobCostWithOpportunityValue: async (opportunityId: string, jobValue: number): Promise<JobCost> => {
    try {
      // Get credentials to set location context
      const credentials = localStorage.getItem("smartroofing_credentials");
      if (!credentials) {
        throw new Error("No credentials found");
      }
      
      const { companyId: locationId } = JSON.parse(credentials);
      
      // Set location context - will continue even if it fails
      console.log('Setting location context before syncing job cost with opportunity value:', locationId);
      await setLocationContext(locationId);
      
      const allCosts = await jobCostService.getJobCosts();
      const existingCost = allCosts[opportunityId];
      
      if (!existingCost) {
        return jobCostService.createOrUpdateJobCost(opportunityId, jobValue);
      }
      
      if (existingCost.isJobValueManuallyModified) {
        return existingCost;
      }
      
      return jobCostService.createOrUpdateJobCost(opportunityId, jobValue);
    } catch (error) {
      console.error(`Error syncing job cost for opportunity ${opportunityId}:`, error);
      // Return a default job cost object if we can't sync
      return {
        opportunityId,
        jobValue,
        costItems: [],
        totalCost: 0,
        profit: jobValue,
        marginPercent: 100,
        lastUpdated: new Date().toISOString()
      };
    }
  }
};
