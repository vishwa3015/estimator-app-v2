
import React from "react";
import FinancialSummaryChart from "@/components/reporting/FinancialSummaryChart";
import ExpensesByTypeChart from "@/components/reporting/ExpensesByTypeChart";
import { ExpenseType } from "@/types/ghl";

interface JobReportChartsProps {
  chartData: Array<{
    name: string;
    expenses: number;
    revenue: number;
    profit: number;
  }>;
  expensesByTypeData: Array<{
    name: string;
    value: number;
  }>;
  expenseColors: Record<ExpenseType, string>;
  formatCurrency: (value: number) => string;
}

const JobReportCharts = ({ 
  chartData, 
  expensesByTypeData, 
  expenseColors,
  formatCurrency 
}: JobReportChartsProps) => (
  <div className="grid gap-6 md:grid-cols-2 mb-8">
    <FinancialSummaryChart chartData={chartData} />
    <ExpensesByTypeChart 
      expensesByTypeData={expensesByTypeData} 
      formatCurrency={formatCurrency}
      expenseColors={expenseColors}
    />
  </div>
);

export default JobReportCharts;
