
import React from "react";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import EstimatePDFGenerator from "./EstimatePDFGenerator";

interface EstimateActionsProps {
  onSave: () => void;
  onDelete?: () => Promise<{ success: boolean }>;
  opportunityId: string;
  contactId?: string;
  formValues?: Record<string, unknown>;
  sectionUpdates?: Record<string, unknown>[];
  configId?: string;
  isLocked?: boolean;
  selectedOpportunityId?: string;
}

const EstimateActions: React.FC<EstimateActionsProps> = ({
  onSave,
  onDelete,
  opportunityId,
  contactId,
  formValues,
  sectionUpdates,
  configId,
  isLocked = false,
  selectedOpportunityId,
}) => {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={onSave}
        className="gap-2"
        disabled={isLocked}
      >
        <Save size={16} />
        Save
      </Button>

      <EstimatePDFGenerator
        opportunityId={opportunityId}
        contactId={contactId}
        formValues={formValues}
        sectionUpdates={sectionUpdates}
        configId={configId}
        onDelete={onDelete}
        isLocked={isLocked}
        selectedOpportunityId={selectedOpportunityId}
      />
    </div>
  );
};

export default EstimateActions;
