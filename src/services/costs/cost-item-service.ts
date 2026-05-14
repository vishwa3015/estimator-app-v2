
import { v4 as uuidv4 } from "uuid";
import { CostItem, JobCost } from "@/types/ghl";
import { salesService } from "../salesService";
import { jobCostService } from "./job-cost-service";
import { costCalculator } from "./calculator";
import { setLocationContext, getCurrentLocationId } from "@/hooks/use-location-context";
import { supabase } from "@/integrations/supabase/client";

// Type alias for better code readability
type PostgrestResponse<T> = { error: Error | null; data?: T };

export const costItemService = {
  addCostItem: async (opportunityId: string, costItem: Omit<CostItem, "id">): Promise<JobCost> => {
    try {
      // Get credentials to set location context
      const credentials = localStorage.getItem("smartroofing_credentials");
      if (!credentials) {
        throw new Error("No credentials found");
      }
      
      const { companyId: locationId } = JSON.parse(credentials);
      
      // Set location context - will continue even if this fails
      console.log('Setting location context before adding cost item:', locationId);
      await setLocationContext(locationId);

      const allCosts = await jobCostService.getJobCosts();
      const jobCost = allCosts[opportunityId];
      
      if (!jobCost) {
        throw new Error("Job cost not found");
      }
      
      const newCostItem: CostItem = {
        ...costItem,
        id: uuidv4()
      };
      
      if (costItem.type === 'Commission' && costItem.salesPersonId) {
        const salesPerson = salesService.getSalesPersonById(costItem.salesPersonId);
        if (salesPerson) {
          const percentageMatch = costItem.notes?.match(/\((\d+(\.\d+)?)% of job value\)/);
          if (percentageMatch) {
            const percentage = parseFloat(percentageMatch[1]);
            if (costItem.paymentMethod === 'GrossSales') {
              newCostItem.amount = (jobCost.jobValue * percentage / 100);
            } else {
              const adjustedProfit = jobCost.profit + jobCost.costItems.reduce((sum, item) => sum + item.amount, 0);
              newCostItem.amount = (adjustedProfit * percentage / 100);
            }
          }
        }
      }
      
      jobCost.costItems.push(newCostItem);
      const recalculated = costCalculator.recalculateTotals(jobCost);
      jobCost.totalCost = recalculated.totalCost;
      jobCost.profit = recalculated.profit;
      jobCost.marginPercent = recalculated.marginPercent;
      jobCost.lastUpdated = new Date().toISOString();
      
      allCosts[opportunityId] = jobCost;
      
      // Save the costs - will continue even if DB actions fail
      try {
        await jobCostService.saveJobCosts(allCosts);
      } catch (saveError) {
        console.error("Error saving job costs to database, but will continue with in-memory update:", saveError);
      }
      
      return jobCost;
    } catch (error) {
      console.error("Error adding cost item:", error);
      throw error;
    }
  },

  updateCostItem: async (opportunityId: string, costItem: CostItem): Promise<JobCost> => {
    try {
      const credentials = localStorage.getItem("smartroofing_credentials");
      if (!credentials) {
        throw new Error("No credentials found");
      }
      
      const { companyId: locationId } = JSON.parse(credentials);
      
      // Will continue even if this fails
      await setLocationContext(locationId);

      const allCosts = await jobCostService.getJobCosts();
      const jobCost = allCosts[opportunityId];
      
      if (!jobCost) {
        throw new Error("Job cost not found");
      }
      
      const index = jobCost.costItems.findIndex(item => item.id === costItem.id);
      if (index === -1) {
        throw new Error("Cost item not found");
      }
      
      if (costItem.type === 'Commission' && costItem.salesPersonId) {
        const salesPerson = salesService.getSalesPersonById(costItem.salesPersonId);
        if (salesPerson) {
          const percentageMatch = costItem.notes?.match(/\((\d+(\.\d+)?)% of job value\)/);
          if (percentageMatch) {
            const percentage = parseFloat(percentageMatch[1]);
            if (costItem.paymentMethod === 'GrossSales') {
              costItem.amount = (jobCost.jobValue * percentage / 100);
            } else {
              const adjustedProfit = jobCost.profit + jobCost.costItems.reduce((sum, item) => sum + item.amount, 0);
              costItem.amount = (adjustedProfit * percentage / 100);
            }
          }
        }
      }
      
      jobCost.costItems[index] = costItem;
      const recalculated = costCalculator.recalculateTotals(jobCost);
      jobCost.totalCost = recalculated.totalCost;
      jobCost.profit = recalculated.profit;
      jobCost.marginPercent = recalculated.marginPercent;
      jobCost.lastUpdated = new Date().toISOString();
      
      allCosts[opportunityId] = jobCost;

      // Try to save but continue even if DB operations fail
      try {
        await jobCostService.saveJobCosts(allCosts);
      } catch (saveError) {
        console.error("Error saving job costs to database, but will continue with in-memory update:", saveError);
      }
      
      return jobCost;
    } catch (error) {
      console.error("Error updating cost item:", error);
      throw error;
    }
  },

  deleteCostItem: async (opportunityId: string, costItemId: string): Promise<JobCost> => {
    try {
      const credentials = localStorage.getItem("smartroofing_credentials");
      if (!credentials) {
        throw new Error("No credentials found");
      }
      
      const { companyId: locationId } = JSON.parse(credentials);
      
      // Will continue even if this fails
      await setLocationContext(locationId);

      const allCosts = await jobCostService.getJobCosts();
      const jobCost = allCosts[opportunityId];
      
      if (!jobCost) {
        throw new Error("Job cost not found");
      }
      
      jobCost.costItems = jobCost.costItems.filter(item => item.id !== costItemId);
      const recalculated = costCalculator.recalculateTotals(jobCost);
      jobCost.totalCost = recalculated.totalCost;
      jobCost.profit = recalculated.profit;
      jobCost.marginPercent = recalculated.marginPercent;
      jobCost.lastUpdated = new Date().toISOString();
      
      allCosts[opportunityId] = jobCost;
      
      // Try to save but continue even if DB operations fail
      try {
        await jobCostService.saveJobCosts(allCosts);
        
        // Use direct Supabase query for deletion - but don't fail if it doesn't work
        try {
          const { error } = await supabase
            .from('estimates')
            .delete()
            .eq('id', costItemId)
            .eq('location_id', locationId);
            
          if (error) {
            console.error("Error deleting estimate from Supabase:", error);
            // Continue anyway
          }
        } catch (dbError) {
          console.error("Database error when deleting estimate, but continuing:", dbError);
        }
      } catch (saveError) {
        console.error("Error saving job costs after deletion, but will continue with in-memory update:", saveError);
      }
      
      return jobCost;
    } catch (error) {
      console.error("Error deleting cost item:", error);
      throw error;
    }
  }
};
