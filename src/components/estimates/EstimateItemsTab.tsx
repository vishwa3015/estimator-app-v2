
import React from "react";
import EstimateLineItems from "./EstimateLineItems";
import { EstimateDocument, EstimateLineItem } from "@/types/estimate-items";

interface EstimateItemsTabProps {
  estimate: EstimateDocument;
  setEstimate: (estimate: EstimateDocument) => void;
  onLineItemsChange: (lineItems: EstimateLineItem[]) => void;
  enableTax: boolean;
  setEnableTax: (enable: boolean) => void;
}

const EstimateItemsTab: React.FC<EstimateItemsTabProps> = ({
  estimate,
  setEstimate,
  onLineItemsChange,
  enableTax,
  setEnableTax
}) => {
  return (
    <EstimateLineItems
      lineItems={estimate.lineItems}
      onLineItemsChange={onLineItemsChange}
      estimate={estimate}
      setEstimate={setEstimate}
      taxRate={estimate.taxRate}
      showTaxOption={true}
      enableTax={enableTax}
      setEnableTax={setEnableTax}
    />
  );
};

export default EstimateItemsTab;
