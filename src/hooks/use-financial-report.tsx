
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from "@/services/reportingService";
import { ExpenseType } from "@/types/ghl";
import { FinancialReportView } from "@/types/database";

// Type alias for better code readability
type PostgrestResponse<T> = { data: T | null; error: Error | null };

type ReportData = {
  totalExpenses: number;
  totalJobValues: number;
  totalProfit: number;
  jobCount: number;
  expenseItemCount: number;
  averageMargin: number;
  expensesByType: Record<string, number>;
};

export function useFinancialReport() {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });
  
  const [filterType, setFilterType] = useState<'All' | ExpenseType>('All');
  const [filterDescription, setFilterDescription] = useState<string>("");
  const [availableDescriptions, setAvailableDescriptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [reportData, setReportData] = useState<ReportData>({
    totalExpenses: 0,
    totalJobValues: 0,
    totalProfit: 0,
    jobCount: 0,
    expenseItemCount: 0,
    averageMargin: 0,
    expensesByType: {
      'Materials': 0,
      'Labor': 0,
      'Subcontractor': 0,
      'Misc': 0,
      'Commission': 0,
      'Marketing': 0
    }
  });
  
  useEffect(() => {
    const fetchReportData = async () => {
      setIsLoading(true);
      try {
        // Query the view directly without type conversion helper
        let query = supabase.from('financial_report_view').select('*');
        
        // Add date range filtering if dates are provided
        if (dateRange.startDate && dateRange.endDate) {
          query = query
            .gte('created_at', dateRange.startDate.toISOString())
            .lte('created_at', dateRange.endDate.toISOString());
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const aggregatedData = (data as FinancialReportView[]).reduce((acc: ReportData, item: FinancialReportView) => {
            acc.totalExpenses += Number(item.total_expenses || 0);
            acc.expenseItemCount += Number(item.expense_item_count || 0);
            
            // Merge expenses by type
            if (item.expenses_by_type) {
              Object.entries(item.expenses_by_type).forEach(([type, amount]) => {
                acc.expensesByType[type as ExpenseType] = (acc.expensesByType[type as ExpenseType] || 0) + Number(amount);
              });
            }
            
            // Increment job count
            acc.jobCount += 1;
            
            return acc;
          }, {
            totalExpenses: 0,
            totalJobValues: 0,
            totalProfit: 0,
            jobCount: 0,
            expenseItemCount: 0,
            averageMargin: 0,
            expensesByType: {
              'Materials': 0,
              'Labor': 0,
              'Subcontractor': 0,
              'Misc': 0,
              'Commission': 0,
              'Marketing': 0
            }
          });
          
          // Calculate average margin (we can't do this from the view, so set to 0)
          aggregatedData.averageMargin = 0;
          
          setReportData(aggregatedData);
        }
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchReportData();
  }, [dateRange]);
  
  return {
    dateRange,
    setDateRange,
    filterType,
    setFilterType,
    filterDescription,
    setFilterDescription,
    availableDescriptions,
    isLoading,
    reportData,
    handleFilterTypeChange: (type: ExpenseType | null) => {
      setFilterType(type ? type : 'All');
    },
    handleSearchTermChange: (term: string) => {
      setFilterDescription(term);
    }
  };
}
