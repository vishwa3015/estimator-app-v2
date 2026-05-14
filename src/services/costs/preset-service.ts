
import { v4 as uuidv4 } from "uuid";
import { JobCost } from "@/types/ghl";
import { jobCostService } from "./job-cost-service";
import { costCalculator } from "./calculator";
import { presetGenerator } from "./presets";

export const presetService = {
  applyPresets: async (opportunityId: string, selectedPresetIds: string[] = []): Promise<JobCost> => {
    const allCosts = await jobCostService.getJobCosts();
    const jobCost = allCosts[opportunityId];
    
    if (!jobCost) {
      throw new Error("Job cost not found");
    }
    
    const presetItems = presetGenerator.getPresetItems(jobCost.jobValue);
    
    const itemsToAdd = selectedPresetIds.length > 0 
      ? presetItems.filter(item => selectedPresetIds.includes(item.id))
      : presetItems;
    
    for (const item of itemsToAdd) {
      const { id, ...costItem } = item;
      jobCost.costItems.push({
        ...costItem,
        id: uuidv4()
      });
    }
    
    const recalculated = costCalculator.recalculateTotals(jobCost);
    jobCost.totalCost = recalculated.totalCost;
    jobCost.profit = recalculated.profit;
    jobCost.marginPercent = recalculated.marginPercent;
    jobCost.lastUpdated = new Date().toISOString();
    
    allCosts[opportunityId] = jobCost;
    await jobCostService.saveJobCosts(allCosts);
    return jobCost;
  }
};
