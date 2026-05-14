
import React from "react";
import { CostItem, JobCost } from "@/types/ghl";
import JobValueCard from "./costs/JobValueCard";
import CostItems from "./costs/CostItems";

interface CostItemListProps {
  jobCost: JobCost;
  onUpdateJobValue: (value: number) => void;
  onAddCostItem: (costItem: Omit<CostItem, "id">) => void;
  onUpdateCostItem: (costItem: CostItem) => void;
  onDeleteCostItem: (costItemId: string) => void;
  isLoading?: boolean;
}

const CostItemList: React.FC<CostItemListProps> = ({
  jobCost,
  onUpdateJobValue,
  onAddCostItem,
  onUpdateCostItem,
  onDeleteCostItem,
  isLoading = false
}) => {
  return (
    <div className="space-y-4">
      <JobValueCard
        jobValue={jobCost.jobValue}
        profit={jobCost.profit}
        marginPercent={jobCost.marginPercent}
        totalCost={jobCost.totalCost}
        isManuallyModified={!!jobCost.isJobValueManuallyModified}
        manuallyModifiedDate={jobCost.jobValueManuallyModifiedDate}
        onUpdateJobValue={onUpdateJobValue}
      />
      
      <CostItems
        jobCost={jobCost}
        onAddCostItem={onAddCostItem}
        onUpdateCostItem={onUpdateCostItem}
        onDeleteCostItem={onDeleteCostItem}
        isLoading={isLoading}
      />
    </div>
  );
};

export default CostItemList;
