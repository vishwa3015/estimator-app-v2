
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, ResponsiveContainer } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

interface FinancialSummaryChartProps {
  chartData: {
    name: string;
    expenses: number;
    revenue: number;
    profit: number;
  }[];
}

const FinancialSummaryChart = ({ chartData }: FinancialSummaryChartProps) => {
  const isMobile = useIsMobile();
  
  return (
    <Card className="desktop:desktop-card">
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`${isMobile ? 'h-[300px]' : 'h-[400px]'}`}>
          <ResponsiveContainer width="100%" height="100%">
            <ChartContainer
              config={{
                expenses: {
                  label: "Expenses",
                  color: "hsl(var(--muted-foreground))",
                },
                revenue: {
                  label: "Revenue",
                  color: "hsl(var(--primary))",
                },
                profit: {
                  label: "Profit",
                  color: "#4ade80", // Green color
                },
              }}
            >
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: isMobile ? 12 : 14 }}
                />
                <YAxis 
                  tickFormatter={(value) => 
                    new Intl.NumberFormat('en-US', {
                      notation: 'compact',
                      compactDisplay: 'short'
                    }).format(value)
                  } 
                  tick={{ fontSize: isMobile ? 12 : 14 }}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: isMobile ? 12 : 14 }} />
                <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" />
                <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--muted-foreground))" />
                <Bar dataKey="profit" name="Profit" fill="#4ade80" />
              </BarChart>
            </ChartContainer>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialSummaryChart;
