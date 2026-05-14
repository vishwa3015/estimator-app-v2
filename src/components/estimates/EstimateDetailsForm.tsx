import React, { useEffect, useState } from "react";
import { EstimateDocument } from "@/types/estimate-items";
import { GHLCredentials } from "@/types/ghl";
import { ghlService } from "@/services/ghl";
import { useTemplateSelector } from "@/hooks/use-template-selector";
import { sectionService, EstimateSection } from "@/services/estimates/section-service";
import EstimateBasicInfo from "./EstimateBasicInfo";
import EstimateSections from "./EstimateSections";
import IntroductionEditor from "./IntroductionEditor";
import InspectionEditor from "./InspectionEditor";
import QuoteDetailsLandmark from "./QuoteDetailsLandmark";
import AuthorizationEditor from "./AuthorizationEditor";
import WarrantyEditor from "./WarrantyEditor";
import CustomPagesEditor from "./CustomPagesEditor";
import { Button } from "@/components/ui/button";
import { PDFPreviewDialog } from "@/components/pdf/PDFPreviewDialog";
import { useToast } from "@/components/ui/use-toast";

interface EstimateDetailsFormProps {
  estimate: EstimateDocument;
  setEstimate: (estimate: EstimateDocument) => void;
  enableTax: boolean;
  setEnableTax: (enable: boolean) => void;
  selectedTemplateId: string;
  handleSelectTemplate: (templateId: string) => void;
  credentials: GHLCredentials;
  onSectionsReady?: (sections: EstimateSection[]) => void; // Callback to notify parent when sections are ready
}

const EstimateDetailsForm: React.FC<EstimateDetailsFormProps> = ({
  estimate,
  setEstimate,
  enableTax,
  setEnableTax,
  selectedTemplateId,
  handleSelectTemplate,
  credentials,
  onSectionsReady,
}) => {
  const {
    sectionToggles,
    activeSection,
    setActiveSection,
    handleSectionToggle,
    handleSectionFileUpload,
    primaryImage,
    setPrimaryImage,
    certificationLogo,
    setCertificationLogo,
    sectionFiles,
  } = useTemplateSelector(credentials, estimate.contactId);

  const { toast } = useToast();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sections, setSections] = useState<EstimateSection[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(true);

  // Load sections from database or create default ones for local state
  useEffect(() => {
    const loadSections = async () => {
      try {
        setIsLoadingSections(true);

        // For new estimates (without ID), always use local state
        // For existing estimates, check if we should load from database
        if (estimate.id && !estimate.id.includes('temp-')) {
          // Existing estimate - load from database
          const estimateSections = await sectionService.initializeSectionsForExistingEstimate(estimate.id);
          setSections(estimateSections);
        } else {
          // New estimate or temporary estimate - create default sections in local state
          const defaultSections = sectionService.createDefaultSectionsForLocalState();
          setSections(defaultSections);
        }

        // Notify parent that sections are ready
        if (onSectionsReady) {
          onSectionsReady(sections);
        }
      } catch (error) {
        console.error('Error loading sections:', error);
        toast({
          title: 'Error loading sections',
          description: 'Failed to load estimate sections. Using default sections.',
          variant: 'destructive',
        });
        // Fallback to default sections
        const defaultSections = sectionService.createDefaultSectionsForLocalState();
        setSections(defaultSections);
      } finally {
        setIsLoadingSections(false);
      }
    };

    loadSections();
  }, [estimate.id, toast]);

  // Handle sections change in local state
  const handleSectionsChange = (updatedSections: EstimateSection[]) => {
    setSections(updatedSections);
    // No database call here - everything stays in local state
  };

  // Handle section reordering in local state
  const handleSectionReorder = (sourceIndex: number, destinationIndex: number) => {
    const reorderedSections = sectionService.updateSectionOrderInLocalState(
      sections,
      sourceIndex,
      destinationIndex
    );
    setSections(reorderedSections);
  };

  // Handle section toggle in local state
  const handleSectionToggleLocal = (sectionId: string) => {
    const toggledSections = sectionService.toggleSectionEnabledInLocalState(
      sections,
      sectionId
    );
    setSections(toggledSections);
    // Also update the legacy section toggles for compatibility
    handleSectionToggle(sectionId);
  };

  // Handle section deletion in local state
  const handleSectionDelete = (sectionId: string) => {
    const updatedSections = sectionService.deleteSectionFromLocalState(
      sections,
      sectionId
    );
    setSections(updatedSections);
  };

  const handleViewPage = () => {
    if (!activeSection) return;
    const file = sectionFiles[activeSection];
    if (file && file.type === "application/pdf") {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setIsPreviewOpen(true);
    } else {
      toast({
        title: "No PDF to preview",
        description: "Upload a PDF for this section to preview.",
        variant: "destructive",
      });
    }
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  useEffect(() => {
    const fetchContactDetails = async () => {
      if (estimate.contactId && credentials) {
        try {
          const contact = await ghlService.getContactById(
            credentials,
            estimate.contactId
          );
          if (contact) {
            setEstimate({
              ...estimate,
              contactPhone: contact.phone || estimate.contactPhone,
              contactEmail: contact.email || estimate.contactEmail,
              contactAddress: contact.location?.address || estimate.contactAddress,
            });
          }
        } catch (error) {
          console.error("Error fetching contact details:", error);
        }
      }
    };

    fetchContactDetails();
  }, [estimate.contactId, credentials, setEstimate]);

  const handleAddCustomPage = () => {
    const newSections = sectionService.addCustomSectionToLocalState(
      sections,
      'New Custom Page',
      {
        requireAcknowledgement: false,
        pageType: 'text'
      }
    );

    setSections(newSections);

    // Set the new custom section as active
    const newSection = newSections[newSections.length - 1];
    setActiveSection(newSection.id);
  };

  // Get the active section object
  const activeSectionObj = sections.find(s => s.id === activeSection);

  if (isLoadingSections) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading sections...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[280px_1fr] gap-6">
        <div className="space-y-4 pl-3">
          <EstimateSections
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            sectionToggles={sectionToggles}
            handleSectionToggle={handleSectionToggleLocal}
            sectionFiles={sectionFiles}
            sections={sections}
            onSectionsChange={handleSectionsChange}
            onSectionReorder={handleSectionReorder}
            onSectionDelete={handleSectionDelete}
            onAddCustomPage={handleAddCustomPage}
          />
        </div>

        <div className="border rounded-md p-4 min-h-[500px]">
          <div className="flex items-center justify-end mb-3">
            {activeSection && (
              <Button variant="outline" size="sm" onClick={handleViewPage}>
                View Page
              </Button>
            )}
          </div>

          {activeSectionObj ? (
            (() => {
              switch (activeSectionObj.section_type) {
                case 'details':
                  return <EstimateBasicInfo estimate={estimate} setEstimate={setEstimate} />;
                case 'introduction':
                  return <IntroductionEditor estimate={estimate} setEstimate={setEstimate} />;
                case 'inspection':
                  return <InspectionEditor estimate={estimate} setEstimate={setEstimate} />;
                case 'quoteDetails':
                  return <QuoteDetailsLandmark estimate={estimate} setEstimate={setEstimate} />;
                case 'authorizationPage':
                  return <AuthorizationEditor estimate={estimate} setEstimate={setEstimate} />;
                case 'warranty':
                  return <WarrantyEditor estimate={estimate} setEstimate={setEstimate} />;
                case 'custom':
                  return <CustomPagesEditor
                    estimate={estimate}
                    setEstimate={setEstimate}
                    activeSection={activeSection}
                    sections={sections}
                    onSectionsChange={handleSectionsChange}
                  />;
                default:
                  return (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Select a section to edit
                    </div>
                  );
              }
            })()
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a section to edit
            </div>
          )}
        </div>
      </div>
      <PDFPreviewDialog
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        previewUrl={previewUrl}
        activeSection={activeSection}
      />
    </div>
  );
};

export default EstimateDetailsForm;
