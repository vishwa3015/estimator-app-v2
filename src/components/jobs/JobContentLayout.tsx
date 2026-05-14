
import React from "react";
import { GHLOpportunity, JobCost, CostItem, GHLCredentials } from "@/types/ghl";
import CostItemList from "../CostItemList";
import JobContent from "./JobContent";
import WelcomeCard from "./WelcomeCard";

interface JobContentLayoutProps {
  selectedOpportunity: GHLOpportunity | null;
  credentials: GHLCredentials;
  jobCost: JobCost | null;
  isLoading: boolean;
  isMobile: boolean;
  onUpdateJobValue: (value: number) => void;
  onAddCostItem: (costItem: Omit<CostItem, "id">) => void;
  onUpdateCostItem: (costItem: CostItem) => void;
  onDeleteCostItem: (costItemId: string) => void;
}

const JobContentLayout = ({
  selectedOpportunity,
  credentials,
  jobCost,
  isLoading,
  isMobile,
  onUpdateJobValue,
  onAddCostItem,
  onUpdateCostItem,
  onDeleteCostItem
}: JobContentLayoutProps) => {
  if (!selectedOpportunity || !jobCost) {
    return (
      <div className="max-w-4xl mx-auto">
        <WelcomeCard isLoading={isLoading} isMobile={isMobile} />
        {!isLoading && (
          <div className="mt-8 text-center">
            <p className="text-muted-foreground mb-4">No estimate selected</p>
          </div>
        )}
      </div>
    );
  }

  const shouldShowCostItems = jobCost.costItems.length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <JobContent 
        selectedOpportunity={selectedOpportunity}
        credentials={credentials}
        jobCost={jobCost}
      />
      {shouldShowCostItems && (
        <CostItemList 
          jobCost={jobCost}
          onUpdateJobValue={onUpdateJobValue}
          onAddCostItem={onAddCostItem}
          onUpdateCostItem={onUpdateCostItem}
          onDeleteCostItem={onDeleteCostItem}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default JobContentLayout;
