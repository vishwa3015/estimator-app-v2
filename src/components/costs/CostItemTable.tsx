
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash, User } from "lucide-react";
import { CostItem, ExpenseType } from "@/types/ghl";
import { format } from "date-fns";
import { TYPE_ICONS } from './costUtils';

interface CostItemTableProps {
  costItems: CostItem[];
  onEditItem: (item: CostItem) => void;
  onDeleteItem: (id: string) => void;
  getSalesPersonName: (id?: string) => string;
  formatCurrency: (amount: number) => string;
}

const CostItemTable: React.FC<CostItemTableProps> = ({
  costItems,
  onEditItem,
  onDeleteItem,
  getSalesPersonName,
  formatCurrency,
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Description</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {costItems.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">
              <div>
                {item.type === 'Commission' && item.salesPersonId ? (
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    {getSalesPersonName(item.salesPersonId)}
                    {item.paymentMethod && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {item.paymentMethod === 'GrossProfit' ? 'Profit' : 'Sales'}
                      </Badge>
                    )}
                  </div>
                ) : (
                  item.description
                )}
              </div>
              {item.notes && (
                <div className="text-xs text-muted-foreground mt-1 truncate max-w-xs">
                  {item.notes}
                </div>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center">
                <span className="mr-2">{TYPE_ICONS[item.type || 'Misc']}</span>
                {item.type || 'Misc'}
              </div>
            </TableCell>
            <TableCell>{formatCurrency(item.amount)}</TableCell>
            <TableCell>{format(new Date(item.date), 'MMM d, yyyy')}</TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button variant="ghost" size="icon" onClick={() => onEditItem(item)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDeleteItem(item.id)}>
                  <Trash className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default CostItemTable;
