
import { JobCost } from "@/types/ghl";
import { CostCalculator } from "./types";

export const costCalculator: CostCalculator = {
  recalculateTotals: (jobCost: JobCost) => {
    const totalCost = jobCost.costItems.reduce((sum, item) => sum + item.amount, 0);
    const profit = jobCost.jobValue - totalCost;
    const marginPercent = jobCost.jobValue > 0 
      ? ((profit / jobCost.jobValue) * 100)
      : 0;
      
    return {
      totalCost,
      profit,
      marginPercent: Math.round(marginPercent * 100) / 100
    };
  }
};

