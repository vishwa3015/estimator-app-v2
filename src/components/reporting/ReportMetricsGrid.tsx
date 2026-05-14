
import React from "react";
import ReportSummaryCard from "@/components/ReportSummaryCard";
import { ChartBarIcon, DollarSignIcon, CalculatorIcon, Hash } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

interface ReportMetricsGridProps {
  reportData: {
    totalJobValues: number;
    jobCount: number;
    totalExpenses: number;
    expenseItemCount: number;
    totalProfit: number;
    averageMargin: number;
  };
}

const ReportMetricsGrid = ({ reportData }: ReportMetricsGridProps) => {
  // Ensure all values are safely converted to numbers
  const safeData = {
    totalJobValues: Number(reportData?.totalJobValues || 0),
    jobCount: Number(reportData?.jobCount || 0),
    totalExpenses: Number(reportData?.totalExpenses || 0),
    expenseItemCount: Number(reportData?.expenseItemCount || 0),
    totalProfit: Number(reportData?.totalProfit || 0),
    averageMargin: Number(reportData?.averageMargin || 0),
  };

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
      <ReportSummaryCard
        title="Total Revenue"
        value={formatCurrency(safeData.totalJobValues)}
        icon={DollarSignIcon}
        description={`From ${safeData.jobCount} jobs`}
      />
      <ReportSummaryCard
        title="Total Expenses"
        value={formatCurrency(safeData.totalExpenses)}
        icon={CalculatorIcon}
        description={`From ${safeData.expenseItemCount} expense items`}
      />
      <ReportSummaryCard
        title="Total Profit"
        value={formatCurrency(safeData.totalProfit)}
        icon={ChartBarIcon}
        description="Revenue minus expenses"
      />
      <ReportSummaryCard
        title="Average Margin"
        value={`${safeData.averageMargin.toFixed(2)}%`}
        icon={Hash}
        description="Profit as percentage of revenue"
      />
    </div>
  );
};

export default ReportMetricsGrid;
