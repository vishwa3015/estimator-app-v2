
// Re-export types from GHL types
import type { JobCost, ExpenseType, PaymentMethod } from "@/types/ghl";

export type { JobCost, ExpenseType, PaymentMethod };

export interface JobCostStorage {
  getJobCosts: (opportunityId?: string) => Promise<Record<string, JobCost>>;
  saveJobCosts: (jobCosts: Record<string, JobCost>) => Promise<void>;
}

export interface CostCalculator {
  recalculateTotals: (jobCost: JobCost) => {
    totalCost: number;
    profit: number;
    marginPercent: number;
  };
}
