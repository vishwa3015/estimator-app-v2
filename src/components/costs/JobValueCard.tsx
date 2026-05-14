
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Edit, DollarSign } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";

interface JobValueCardProps {
  jobValue: number;
  profit: number;
  marginPercent: number;
  totalCost: number;
  isManuallyModified: boolean;
  manuallyModifiedDate?: string;
  onUpdateJobValue: (value: number) => void;
}

const JobValueCard: React.FC<JobValueCardProps> = ({
  jobValue,
  profit,
  marginPercent,
  totalCost,
  isManuallyModified,
  manuallyModifiedDate,
  onUpdateJobValue,
}) => {
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [editValue, setEditValue] = useState(jobValue.toString());

  const handleJobValueSave = () => {
    const newValue = parseFloat(editValue);
    if (!isNaN(newValue) && newValue >= 0) {
      onUpdateJobValue(newValue);
    } else {
      setEditValue(jobValue.toString());
    }
    setIsEditingValue(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex justify-between items-center">
          <span>Job Value</span>
          <span className={`text-lg font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Profit: {formatCurrency(profit)} ({marginPercent.toFixed(1)}%)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          {isEditingValue ? (
            <>
              <div className="relative flex-1">
                <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8 number-input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                />
              </div>
              <Button onClick={handleJobValueSave}>Save</Button>
              <Button variant="outline" onClick={() => {
                setEditValue(jobValue.toString());
                setIsEditingValue(false);
              }}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <div className="bg-secondary px-4 py-2 rounded-md flex-1 text-lg font-medium">
                {formatCurrency(jobValue)}
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditingValue(true)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </>
          )}
        </div>
        
        <div className="mt-2 flex justify-between text-sm">
          <div className="text-muted-foreground">Total Costs: {formatCurrency(totalCost)}</div>
          <div className="text-muted-foreground">
            {isManuallyModified && manuallyModifiedDate ? (
              <span className="flex items-center">
                <Badge variant="outline" className="mr-2">Manually modified</Badge>
                {format(new Date(manuallyModifiedDate), 'MMM d, yyyy h:mm a')}
              </span>
            ) : (
              <span>Using opportunity value</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobValueCard;
