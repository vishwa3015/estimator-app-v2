
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { CostItem } from "@/types/ghl";

interface ExpenseDetailsTableProps {
  costItems: CostItem[];
  totalCost: number;
  onExportToCSV: () => void;
  onExportToPDF: () => void;
}

const ExpenseDetailsTable = ({
  costItems,
  totalCost,
  onExportToCSV,
  onExportToPDF
}: ExpenseDetailsTableProps) => {
  return (
    <div className="mt-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Expense Details</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={onExportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={onExportToPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Description</th>
                <th className="text-left p-2">Date</th>
                <th className="text-right p-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {costItems
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-2">{item.type}</td>
                    <td className="p-2">{item.description}</td>
                    <td className="p-2">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="p-2 text-right">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="p-2" colSpan={3}>Total</td>
                <td className="p-2 text-right">{formatCurrency(totalCost)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseDetailsTable;
