
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";

interface JobMetricsGridProps {
  jobValue: number;
  totalExpenses: number;
  totalProfit: number;
  marginPercent: number;
  expenseItemCount: number;
}

const JobMetricsGrid = ({
  jobValue,
  totalExpenses,
  totalProfit,
  marginPercent,
  expenseItemCount
}: JobMetricsGridProps) => {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4 px-4">
          <div className="text-2xl font-bold">{formatCurrency(Number(jobValue) || 0)}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Total Expenses</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4 px-4">
          <div className="text-2xl font-bold">{formatCurrency(Number(totalExpenses) || 0)}</div>
          <div className="text-xs text-muted-foreground">{expenseItemCount} expense items</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Profit</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4 px-4">
          <div className="text-2xl font-bold">{formatCurrency(Number(totalProfit) || 0)}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Margin</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4 px-4">
          <div className="text-2xl font-bold">{Number(marginPercent) || 0}%</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobMetricsGrid;
