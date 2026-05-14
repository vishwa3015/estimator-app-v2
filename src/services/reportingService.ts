
import { costService } from "./costs";
import { JobCost, CostItem, ExpenseType } from "@/types/ghl";
import { isWithinInterval, parseISO } from "date-fns";

export interface ReportSummary {
  totalExpenses: number;
  totalJobValues: number;
  totalProfit: number;
  jobCount: number;
  expenseItemCount: number;
  averageMargin: number;
  expensesByType: Record<ExpenseType, number>;
}

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface FilterOptions {
  expenseType?: ExpenseType | null;
  description?: string | null;
}

export const reportingService = {
  getReportSummary: (dateRange: DateRange, filters?: FilterOptions): ReportSummary => {
    const { startDate, endDate } = dateRange;
    const allJobCosts = costService.getJobCosts();
    
    if (!startDate || !endDate) {
      return calculateSummary(Object.values(allJobCosts));
    }
    
    const filteredJobCosts = Object.values(allJobCosts).filter(jobCost => {
      return jobCost.costItems.some(item => {
        const itemDate = parseISO(item.date);
        return isWithinInterval(itemDate, { start: startDate, end: endDate });
      });
    });
    
    return calculateSummary(filteredJobCosts);
  },

  getDetailedExpenseData: (dateRange: DateRange, filters?: FilterOptions) => {
    const { startDate, endDate } = dateRange;
    const allJobCosts = costService.getJobCosts();
    let allExpenseItems: Array<CostItem & { jobId: string }> = [];
    
    Object.entries(allJobCosts).forEach(([jobId, jobCost]) => {
      jobCost.costItems.forEach(item => {
        if (!startDate || !endDate) {
          allExpenseItems.push({ ...item, jobId });
          return;
        }
        
        const itemDate = parseISO(item.date);
        if (isWithinInterval(itemDate, { start: startDate, end: endDate })) {
          allExpenseItems.push({ ...item, jobId });
        }
      });
    });
    
    if (filters) {
      if (filters.expenseType) {
        allExpenseItems = allExpenseItems.filter(item => item.type === filters.expenseType);
      }
      
      if (filters.description) {
        const searchTerm = filters.description.toLowerCase();
        allExpenseItems = allExpenseItems.filter(item => 
          item.description.toLowerCase().includes(searchTerm)
        );
      }
    }
    
    return allExpenseItems;
  },
  
  getUniqueDescriptions: (dateRange: DateRange, expenseType?: ExpenseType | null): string[] => {
    const allJobCosts = costService.getJobCosts();
    const { startDate, endDate } = dateRange;
    const descriptions = new Set<string>();
    
    Object.values(allJobCosts).forEach(jobCost => {
      jobCost.costItems.forEach(item => {
        if (startDate && endDate) {
          const itemDate = parseISO(item.date);
          if (!isWithinInterval(itemDate, { start: startDate, end: endDate })) {
            return;
          }
        }
        
        if (expenseType && item.type !== expenseType) {
          return;
        }
        
        descriptions.add(item.description);
      });
    });
    
    return Array.from(descriptions).sort();
  }
};

function calculateSummary(jobCosts: JobCost[]): ReportSummary {
  let totalExpenses = 0;
  let totalJobValues = 0;
  let totalProfit = 0;
  let expenseItemCount = 0;
  
  const expensesByType: Record<ExpenseType, number> = {
    'Materials': 0,
    'Labor': 0,
    'Subcontractor': 0,
    'Misc': 0,
    'Commission': 0,
    'Marketing': 0
  };
  
  jobCosts.forEach(job => {
    totalJobValues += job.jobValue;
    totalExpenses += job.totalCost;
    totalProfit += job.profit;
    expenseItemCount += job.costItems.length;
    
    job.costItems.forEach(item => {
      expensesByType[item.type] += item.amount;
    });
  });
  
  const jobCount = jobCosts.length;
  const averageMargin = jobCount > 0 
    ? (totalProfit / totalJobValues) * 100
    : 0;
  
  return {
    totalExpenses,
    totalJobValues,
    totalProfit,
    jobCount,
    expenseItemCount,
    averageMargin: Math.round(averageMargin * 100) / 100,
    expensesByType
  };
}
