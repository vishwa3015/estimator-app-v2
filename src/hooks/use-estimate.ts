
import { useState, useEffect } from "react";
import { EstimateDocument, EstimateLineItem, PricingOption } from "@/types/estimate-items";
import { GHLOpportunity } from "@/types/ghl";
import { toast } from "@/components/ui/use-toast";
import { useEstimateTemplates } from "@/hooks/use-estimate-templates";
import { useTemplateSelector } from "@/hooks/use-template-selector";

export const useEstimate = (opportunity: GHLOpportunity) => {
  const { templates } = useEstimateTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("default");
  const [enableTax, setEnableTax] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  
  // Initialize default pricing options
  const defaultPricingOptions: PricingOption[] = [
    {
      id: crypto.randomUUID(),
      label: "Option 1",
      lineItems: [],
      subtotal: 0,
      taxRate: 8.25,
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
      taxRate: 8.25,
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
      taxRate: 8.25,
      taxAmount: 0,
      total: 0,
      profitMargin: 30,
      costTotal: 0
    }
  ];
  
  const [estimate, setEstimate] = useState<EstimateDocument>({
    id: `temp-${crypto.randomUUID()}`, // Use temp- prefix to identify new estimates
    opportunityId: opportunity.id,
    contactId: opportunity.contactId,
    contactEmail: opportunity.contact?.email || '',
    title: `${opportunity.name}`,
    number: `EST-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString(),
    lineItems: [],
    subtotal: 0,
    taxRate: 8.25,
    taxAmount: 0,
    total: 0,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pricingOptions: defaultPricingOptions
  });

  // Get the selected template
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  
  // Get section files and toggles from template selector
  const {
    sectionFiles,
    sectionToggles,
    handleSectionToggle,
    handleSectionFileUpload
  } = useTemplateSelector({ 
    apiKey: "",
    companyId: "" // Added the missing companyId property
  }, estimate.contactId);

  // Initialize estimate with template tax rate
  useEffect(() => {
    if (selectedTemplate && estimate.lineItems.length === 0) {
      setEstimate({
        ...estimate,
        taxRate: selectedTemplate.taxRate,
        terms: selectedTemplate.terms
      });
    }
  }, [selectedTemplate]);

  // Calculate totals when line items or tax settings change
  useEffect(() => {
    const subtotal = estimate.lineItems.reduce((sum, item) => sum + item.total, 0);
    let taxAmount = 0;
    if (enableTax) {
      const taxableAmount = estimate.lineItems
        .filter(item => item.taxable)
        .reduce((sum, item) => sum + item.total, 0);
      taxAmount = taxableAmount * (estimate.taxRate / 100);
    }
    const total = subtotal + taxAmount;
    
    setEstimate({
      ...estimate,
      subtotal,
      taxAmount,
      total,
      updatedAt: new Date().toISOString()
    });
  }, [estimate.lineItems, estimate.taxRate, enableTax]);

  // Log the current estimate state for debugging
  useEffect(() => {
    console.log("Current estimate state:", estimate);
  }, [estimate]);

  const handleLineItemsChange = (lineItems: EstimateLineItem[]) => {
    setEstimate({
      ...estimate,
      lineItems
    });
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setEstimate({
        ...estimate,
        taxRate: template.taxRate,
        terms: estimate.terms || template.terms
      });
    }
  };

  const handleAcceptEstimate = (notes: string, signature: string | null) => {
    setEstimate({
      ...estimate,
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
      acceptanceNotes: notes,
      signature,
      updatedAt: new Date().toISOString()
    });
    toast({
      title: "Estimate Accepted",
      description: "Thank you for accepting this estimate."
    });
  };

  return {
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
    handleSectionToggle,
    handleSectionFileUpload
  };
};
