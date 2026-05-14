
import React from "react";
import { useFinancialReport } from "@/hooks/use-financial-report";
import ReportHeader from "@/components/reporting/ReportHeader";
import DateRangePicker from "@/components/DateRangePicker";
import ExpenseFilters from "@/components/reporting/ExpenseFilters";
import ReportCharts from "@/components/reporting/ReportCharts";
import ReportMetricsGrid from "@/components/reporting/ReportMetricsGrid";

const Reporting = () => {
  const {
    dateRange,
    setDateRange,
    filterType,
    setFilterType,
    filterDescription,
    setFilterDescription,
    availableDescriptions,
    isLoading,
    reportData,
    handleFilterTypeChange,
    handleSearchTermChange
  } = useFinancialReport();

  // Debug logs to check the data
  console.log("Report data:", reportData);

  if (isLoading) {
    return (
      <div className="container mx-auto py-4 px-4 sm:py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Ensure we have numeric values for the chart data
  const chartData = [{
    name: "Summary",
    expenses: Number(reportData?.totalExpenses || 0),
    revenue: Number(reportData?.totalJobValues || 0),
    profit: Number(reportData?.totalProfit || 0)
  }];

  // Process expenses by type data, ensuring we filter out any zero values
  const expensesByTypeData = Object.entries(reportData?.expensesByType || {})
    .map(([type, amount]) => ({
      name: type,
      value: Number(amount || 0)
    }))
    .filter(item => item.value > 0);

  return (
    <div className="container mx-auto py-4 px-4 sm:py-8">
      <ReportHeader onExportCSV={() => {}} />
      
      <div className="mb-6">
        <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
      </div>
      
      <ExpenseFilters
        filterType={filterType}
        setFilterType={setFilterType}
        filterDescription={filterDescription}
        setFilterDescription={setFilterDescription}
        availableDescriptions={availableDescriptions}
        onFilterTypeChange={handleFilterTypeChange}
        onSearchTermChange={handleSearchTermChange}
      />
      
      <ReportMetricsGrid reportData={reportData} />
      
      <ReportCharts
        chartData={chartData}
        expensesByTypeData={expensesByTypeData}
      />
    </div>
  );
};

export default Reporting;
