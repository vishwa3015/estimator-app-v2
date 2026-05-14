
import { JobCost } from "@/types/ghl";

export const EXPENSE_COLORS = {
  'Materials': '#4ade80',
  'Labor': '#60a5fa',
  'Subcontractor': '#f97316',
  'Misc': '#a78bfa',
  'Commission': '#f43f5e',
  'Marketing': '#facc15'
} as const;

export interface JobReportData {
  totalExpenses: number;
  totalJobValue: number;
  totalProfit: number;
  marginPercent: number;
  expensesByType: Record<string, number>;
}

export const prepareChartData = (jobReportData: JobReportData) => {
  // Ensure we have non-null values to prevent chart rendering issues
  const safeJobReportData = {
    totalExpenses: jobReportData?.totalExpenses ?? 0,
    totalJobValue: jobReportData?.totalJobValue ?? 0,
    totalProfit: jobReportData?.totalProfit ?? 0,
    expensesByType: jobReportData?.expensesByType ?? {}
  };

  const summaryData = [{
    name: "Summary",
    expenses: Number(safeJobReportData.totalExpenses),
    revenue: Number(safeJobReportData.totalJobValue),
    profit: Number(safeJobReportData.totalProfit)
  }];

  const expensesByTypeData = Object.entries(safeJobReportData.expensesByType)
    .map(([type, amount]) => ({
      name: type,
      value: Number(amount)
    }))
    .filter(item => item.value > 0);

  return {
    summaryData,
    expensesByTypeData
  };
};
