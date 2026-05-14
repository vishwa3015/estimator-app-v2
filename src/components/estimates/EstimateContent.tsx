
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText } from "lucide-react";
import { EstimateDocument, EstimateLineItem } from "@/types/estimate-items";
import EstimateDetailsTab from "./EstimateDetailsTab";
import { GHLCredentials } from "@/types/ghl";
import { EstimateSection } from "@/services/estimates/section-service";

interface EstimateContentProps {
  estimate: EstimateDocument;
  setEstimate: (estimate: EstimateDocument) => void;
  enableTax: boolean;
  setEnableTax: (enable: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedTemplateId: string;
  handleSelectTemplate: (templateId: string) => void;
  handleLineItemsChange: (lineItems: EstimateLineItem[]) => void;
  handleAcceptEstimate: (notes: string, signature: string | null) => void;
  credentials: GHLCredentials;
  onSectionsReady?: (sections: EstimateSection[]) => void; // Add callback for sections
}

const EstimateContent: React.FC<EstimateContentProps> = ({
  estimate,
  setEstimate,
  enableTax,
  setEnableTax,
  activeTab,
  setActiveTab,
  selectedTemplateId,
  handleSelectTemplate,
  handleLineItemsChange,
  handleAcceptEstimate,
  credentials,
  onSectionsReady
}) => {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="w-full">
        <TabsTrigger value="details" className="w-full">
          <FileText size={16} className="mr-2" />
          Estimate Details
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="details">
        <EstimateDetailsTab
          estimate={estimate}
          setEstimate={setEstimate}
          enableTax={enableTax}
          setEnableTax={setEnableTax}
          selectedTemplateId={selectedTemplateId}
          handleSelectTemplate={handleSelectTemplate}
          handleLineItemsChange={handleLineItemsChange}
          handleAcceptEstimate={handleAcceptEstimate}
          credentials={credentials}
          onSectionsReady={onSectionsReady}
        />
      </TabsContent>
    </Tabs>
  );
};

export default EstimateContent;
