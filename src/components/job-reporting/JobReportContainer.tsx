
import React from "react";
import { format } from "date-fns";
import { downloadCSV, convertToCSV } from "@/utils/csvExport";
import { formatCurrency } from "@/utils/formatters";
import { toast } from "@/components/ui/use-toast";
import { JobCost } from "@/types/ghl";
import { EXPENSE_COLORS, prepareChartData } from "@/utils/jobReportCharts";
import JobReportHeader from "@/components/job-reporting/JobReportHeader";
import JobMetricsGrid from "@/components/job-reporting/JobMetricsGrid";
import ExpenseDetailsTable from "@/components/job-reporting/ExpenseDetailsTable";
import JobReportCharts from "@/components/job-reporting/JobReportCharts";
import NoExpenseData from "@/components/job-reporting/NoExpenseData";

interface JobReportContainerProps {
  jobCost: JobCost;
  jobName?: string;
  opportunityId: string;
  jobReportData: {
    totalExpenses: number;
    totalJobValue: number;
    totalProfit: number;
    marginPercent: number;
    expensesByType: Record<string, number>;
  };
}

const JobReportContainer = ({
  jobCost,
  jobName,
  opportunityId,
  jobReportData
}: JobReportContainerProps) => {
  const handleExportToCSV = () => {
    if (!jobCost || !jobCost.costItems) return;
    
    const headers = [
      { key: 'type', label: 'Type' },
      { key: 'description', label: 'Description' },
      { key: 'date', label: 'Date' },
      { key: 'amount', label: 'Amount' },
      { key: 'notes', label: 'Notes' }
    ];
    
    const data = jobCost.costItems.map(item => ({
      type: item.type,
      description: item.description,
      date: format(new Date(item.date), 'yyyy-MM-dd'),
      amount: item.amount.toFixed(2),
      notes: item.notes || ''
    }));
    
    const csvContent = convertToCSV(headers, data);
    const fileName = `job-expenses-${opportunityId}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    downloadCSV(csvContent, fileName);
    toast({
      title: "Export successful",
      description: `Exported ${data.length} expenses to ${fileName}`,
    });
  };

  // Ensure we have valid job report data before preparing chart data
  const safeJobReportData = {
    totalExpenses: Number(jobReportData?.totalExpenses || 0),
    totalJobValue: Number(jobReportData?.totalJobValue || 0),
    totalProfit: Number(jobReportData?.totalProfit || 0),
    marginPercent: Number(jobReportData?.marginPercent || 0),
    expensesByType: jobReportData?.expensesByType || {}
  };

  const { summaryData, expensesByTypeData } = prepareChartData(safeJobReportData);

  const hasCostItems = jobCost && jobCost.costItems && jobCost.costItems.length > 0;

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4">
      <JobReportHeader 
        opportunityId={opportunityId}
        jobName={jobName}
        onExportToPDF={handleExportToCSV}
        onExportToCSV={handleExportToCSV}
      />

      {!hasCostItems ? (
        <NoExpenseData />
      ) : (
        <>
          <JobMetricsGrid 
            jobValue={Number(safeJobReportData.totalJobValue)}
            totalExpenses={Number(safeJobReportData.totalExpenses)}
            totalProfit={Number(safeJobReportData.totalProfit)}
            marginPercent={Number(safeJobReportData.marginPercent)}
            expenseItemCount={jobCost.costItems.length}
          />

          <JobReportCharts 
            chartData={summaryData}
            expensesByTypeData={expensesByTypeData}
            expenseColors={EXPENSE_COLORS}
            formatCurrency={formatCurrency}
          />

          <ExpenseDetailsTable 
            costItems={jobCost.costItems}
            totalCost={jobCost.totalCost}
            onExportToCSV={handleExportToCSV}
            onExportToPDF={handleExportToCSV}
          />
        </>
      )}
    </div>
  );
};

export default JobReportContainer;
