
import React from "react";
import FinancialSummaryChart from "./FinancialSummaryChart";
import ExpensesByTypeChart from "./ExpensesByTypeChart";
import { EXPENSE_COLORS } from "@/utils/jobReportCharts";

interface ReportChartsProps {
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
}

const ReportCharts = ({ chartData, expensesByTypeData }: ReportChartsProps) => {
  return (
    <div className="grid gap-6 md:grid-cols-2 mb-8">
      <FinancialSummaryChart chartData={chartData} />
      <ExpensesByTypeChart 
        expensesByTypeData={expensesByTypeData} 
        formatCurrency={(value) => 
          new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(value)
        }
        expenseColors={EXPENSE_COLORS}
      />
    </div>
  );
};

export default ReportCharts;
