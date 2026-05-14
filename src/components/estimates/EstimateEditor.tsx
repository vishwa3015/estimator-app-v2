import React, { useState } from "react";
import { GHLOpportunity, GHLCredentials } from "@/types/ghl";
import { EstimateDocument } from "@/types/estimate-items";
import { toast } from "@/components/ui/use-toast";
import { useEstimate } from "@/hooks/use-estimate";
import EstimateHeader from "./EstimateHeader";
import EstimateContent from "./EstimateContent";
import { EstimateSection } from "@/services/estimates/section-service";

interface EstimateEditorProps {
  opportunity: GHLOpportunity;
  onSave: (estimate: EstimateDocument, sections?: EstimateSection[]) => Promise<void | { id?: string }>;
  onSend?: (estimate: EstimateDocument) => void;
  credentials: GHLCredentials;
}

const EstimateEditor: React.FC<EstimateEditorProps> = ({
  opportunity,
  onSave,
  onSend,
  credentials,
}) => {
  const {
    estimate,
    setEstimate,
    selectedTemplateId,
    enableTax,
    setEnableTax,
    activeTab,
    setActiveTab,
    selectedTemplate,
    handleLineItemsChange,
    handleSelectTemplate,
    handleAcceptEstimate,
    sectionFiles,
    sectionToggles,
  } = useEstimate(opportunity);

  // Store sections for saving
  const [sections, setSections] = useState<EstimateSection[]>([]);

  const handleSaveEstimate = async (title?: string) => {
    // Pass sections along with the estimate for saving
    const result = await onSave({
      ...estimate,
      title: title || estimate.title,
      updatedAt: new Date().toISOString(),
    }, sections);
    toast({
      title: "Estimate Saved",
      description: "The estimate has been saved successfully.",
    });
    return result;
  };

  const handleSendEstimate = () => {
    if (onSend) {
      onSend({
        ...estimate,
        status: "sent",
        updatedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="space-y-4">
      <EstimateHeader
        title={opportunity.name}
        onSave={handleSaveEstimate}
        opportunityId={opportunity.id || ""}
        contactId={estimate.contactEmail}
      />
      <EstimateContent
        estimate={estimate}
        setEstimate={setEstimate}
        enableTax={enableTax}
        setEnableTax={setEnableTax}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedTemplateId={selectedTemplateId}
        handleSelectTemplate={handleSelectTemplate}
        handleLineItemsChange={handleLineItemsChange}
        handleAcceptEstimate={handleAcceptEstimate}
        credentials={credentials}
        onSectionsReady={setSections}
      />
    </div>
  );
};

export default EstimateEditor;
