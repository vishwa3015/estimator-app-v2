
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EstimateDocument, EstimateLineItem, PricingOption } from "@/types/estimate-items";
import EstimateDetailsForm from "./EstimateDetailsForm";
import EstimateAcceptance from "./EstimateAcceptance";
import { GHLCredentials } from "@/types/ghl";
import { EstimateSection } from "@/services/estimates/section-service";

interface EstimateDetailsTabProps {
  estimate: EstimateDocument;
  setEstimate: React.Dispatch<React.SetStateAction<EstimateDocument>>;
  enableTax: boolean;
  setEnableTax: (enable: boolean) => void;
  selectedTemplateId: string;
  handleSelectTemplate: (templateId: string) => void;
  handleLineItemsChange: (lineItems: EstimateLineItem[]) => void;
  handleAcceptEstimate: (notes: string, signature: string | null) => void;
  credentials: GHLCredentials;
  onSectionsReady?: (sections: EstimateSection[]) => void; // Add callback for sections
}

const EstimateDetailsTab: React.FC<EstimateDetailsTabProps> = ({
  estimate,
  setEstimate,
  enableTax,
  setEnableTax,
  selectedTemplateId,
  handleSelectTemplate,
  handleLineItemsChange,
  handleAcceptEstimate,
  credentials,
  onSectionsReady
}) => {
  // Store sections for later batch saving
  const [sections, setSections] = useState<EstimateSection[]>([]);

  // Initialize pricing options if they don't exist
  useEffect(() => {
    if (!estimate.pricingOptions || estimate.pricingOptions.length === 0) {
      const defaultOptions: PricingOption[] = [
        {
          id: crypto.randomUUID(),
          label: "Option 1",
          lineItems: [],
          subtotal: 0,
          taxRate: estimate.taxRate,
          taxAmount: 0,
          total: 0,
          profitMargin: 20,
          costTotal: 0
        },
        {
          id: crypto.randomUUID(),
          label: "Option 2",
          lineItems: [],
          subtotal: 0,
          taxRate: estimate.taxRate,
          taxAmount: 0,
          total: 0,
          profitMargin: 25,
          costTotal: 0
        },
        {
          id: crypto.randomUUID(),
          label: "Option 3",
          lineItems: [],
          subtotal: 0,
          taxRate: estimate.taxRate,
          taxAmount: 0,
          total: 0,
          profitMargin: 30,
          costTotal: 0
        }
      ];
      
      setEstimate(prev => ({
        ...prev,
        pricingOptions: defaultOptions
      }));
    }
  }, [estimate, setEstimate]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inclusions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <EstimateDetailsForm
            estimate={estimate}
            setEstimate={setEstimate}
            enableTax={enableTax}
            setEnableTax={setEnableTax}
            selectedTemplateId={selectedTemplateId}
            handleSelectTemplate={handleSelectTemplate}
            credentials={credentials}
            onSectionsReady={(readySections) => {
              // Store sections for later batch saving
              setSections(readySections);
              if (onSectionsReady) {
                onSectionsReady(readySections);
              }
            }}
          />
        </CardContent>
      </Card>
      {estimate.status === 'sent' && (
        <Card>
          <CardContent className="py-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">Ready to approve this estimate?</h3>
                <p className="text-sm text-muted-foreground">
                  Click the button to accept and sign this estimate.
                </p>
              </div>
              <EstimateAcceptance onAccept={handleAcceptEstimate} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EstimateDetailsTab;
