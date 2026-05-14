
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { ExpenseType } from "@/types/ghl";

interface ExpensesByTypeChartProps {
  expensesByTypeData: {
    name: string;
    value: number;
  }[];
  formatCurrency: (value: number) => string;
  expenseColors: Record<ExpenseType, string>;
}

const ExpensesByTypeChart = ({ 
  expensesByTypeData, 
  formatCurrency,
  expenseColors
}: ExpensesByTypeChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses by Type</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {expensesByTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expensesByTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expensesByTypeData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={expenseColors[entry.name as ExpenseType] || '#8884d8'} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No expense data available for the selected filters.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpensesByTypeChart;
