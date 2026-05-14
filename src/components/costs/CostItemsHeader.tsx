
import React from "react";
import { CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList } from "lucide-react";

interface CostItemsHeaderProps {
  onAddClick: () => void;
  onPresetsClick: () => void;
  isLoading: boolean;
  localIsLoading: boolean;
}

const CostItemsHeader: React.FC<CostItemsHeaderProps> = ({
  onAddClick,
  onPresetsClick,
  isLoading,
  localIsLoading
}) => {
  return (
    <div className="flex justify-between items-center">
      <div>
        <CardTitle className="text-lg font-semibold">Cost Items</CardTitle>
        <CardDescription>Track all expenses for this job</CardDescription>
      </div>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          onClick={onPresetsClick} 
          disabled={isLoading || localIsLoading}
        >
          <ClipboardList className="h-4 w-4 mr-1" />
          Apply Presets
        </Button>
        <Button 
          onClick={onAddClick} 
          disabled={isLoading || localIsLoading}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Cost
        </Button>
      </div>
    </div>
  );
};

export default CostItemsHeader;
