import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Send, Settings } from 'lucide-react';
import { useEstimateConfigV2 } from '@/hooks/use-estimate-config-v2';
import { FormSectionConfig } from '@/services/estimates/form-engine-v2';
import SortableSectionList from './SortableSectionList';
import FormFieldRenderer from './FormFieldRenderer';
import { useToast } from '@/components/ui/use-toast';
import { GHLOpportunity, GHLCredentials } from '@/types/ghl';

interface EstimateEditorV2Props {
  opportunity: GHLOpportunity;
  credentials: GHLCredentials;
  onSave?: (estimateData: EstimateData) => void;
  onSend?: (estimateData: EstimateData) => void;
}

interface EstimateData {
  opportunity_id: string;
  contact_id: string | undefined;
  form_data: Record<string, Record<string, unknown>>;
  sections: FormSectionConfig[];
  config_id: string | undefined;
  status: 'draft' | 'sent';
}

const EstimateEditorV2: React.FC<EstimateEditorV2Props> = ({
  opportunity,
  credentials,
  onSave,
  onSend
}) => {
  const {
    config,
    formEngine,
    isLoading,
    error,
    getSections,
    getSectionConfig,
    getSectionFields,
    validateSection,
    generateDefaultFormData
  } = useEstimateConfigV2();

  const [sections, setSections] = useState<FormSectionConfig[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, Record<string, unknown>>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Initialize sections and form data when config loads
  useEffect(() => {
    if (formEngine && config) {
      const configSections = getSections();
      setSections(configSections);
      
      if (configSections.length > 0 && !activeSectionId) {
        setActiveSectionId(configSections[0].id);
      }

      // Initialize form data for all sections
      const initialFormData: Record<string, Record<string, unknown>> = {};
      configSections.forEach(section => {
        initialFormData[section.id] = generateDefaultFormData(section.id);
      });
      setFormData(initialFormData);
    }
  }, [formEngine, config, getSections, generateDefaultFormData, activeSectionId]);

  // Handle section selection
  const handleSectionSelect = (sectionId: string) => {
    setActiveSectionId(sectionId);
  };

  // Handle section toggle
  const handleSectionToggle = (sectionId: string, enabled: boolean) => {
    setSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, enabled }
          : section
      )
    );
  };

  // Handle section reordering
  const handleSectionsReorder = (reorderedSections: FormSectionConfig[]) => {
    setSections(reorderedSections);
  };

  // Handle field value change
  const handleFieldChange = (sectionId: string, fieldName: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [fieldName]: value
      }
    }));

    // Clear validation errors for this field
    if (validationErrors[sectionId]) {
      setValidationErrors(prev => ({
        ...prev,
        [sectionId]: prev[sectionId].filter(error => !error.includes(fieldName))
      }));
    }
  };

  // Validate current section
  const validateCurrentSection = () => {
    if (!activeSectionId || !formEngine) return true;

    const sectionFormData = formData[activeSectionId] || {};
    const validation = validateSection(activeSectionId, sectionFormData);
    
    if (!validation.isValid) {
      setValidationErrors(prev => ({
        ...prev,
        [activeSectionId]: validation.errors
      }));
      return false;
    }

    // Clear errors for this section
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[activeSectionId];
      return newErrors;
    });
    
    return true;
  };

  // Save estimate
  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Validate all sections
      let hasErrors = false;
      const allErrors: Record<string, string[]> = {};

      sections.filter(s => s.enabled).forEach(section => {
        const sectionFormData = formData[section.id] || {};
        const validation = validateSection(section.id, sectionFormData);
        
        if (!validation.isValid) {
          hasErrors = true;
          allErrors[section.id] = validation.errors;
        }
      });

      if (hasErrors) {
        setValidationErrors(allErrors);
        toast({
          title: 'Validation Error',
          description: 'Please fix the errors before saving.',
          variant: 'destructive',
        });
        return;
      }

      // Prepare estimate data
      const estimateData = {
        opportunity_id: opportunity.id,
        contact_id: opportunity.contact?.id,
        form_data: formData,
        sections: sections,
        config_id: config?.id,
        status: 'draft'
      };

      if (onSave) {
        await onSave(estimateData);
      }

      toast({
        title: 'Estimate Saved',
        description: 'Your estimate has been saved successfully.',
      });

    } catch (error) {
      console.error('Error saving estimate:', error);
      toast({
        title: 'Save Error',
        description: 'Failed to save estimate. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Send estimate
  const handleSend = async () => {
    // First save, then send
    await handleSave();
    
    if (onSend) {
      const estimateData = {
        opportunity_id: opportunity.id,
        contact_id: opportunity.contact?.id,
        form_data: formData,
        sections: sections,
        config_id: config?.id,
        status: 'sent'
      };
      
      await onSend(estimateData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading estimate configuration...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const activeSection = getSectionConfig(activeSectionId);
  const activeSectionFields = getSectionFields(activeSectionId);
  const activeSectionFormData = formData[activeSectionId] || {};
  const activeSectionErrors = validationErrors[activeSectionId] || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left Panel - Sections List */}
      <div className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Estimate Sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SortableSectionList
              sections={sections}
              activeSectionId={activeSectionId}
              onSectionSelect={handleSectionSelect}
              onSectionToggle={handleSectionToggle}
              onSectionsReorder={handleSectionsReorder}
            />
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Section Editor */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">
                {activeSection?.label || 'Select a Section'}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={isSaving}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
            {activeSection?.description && (
              <p className="text-sm text-muted-foreground">
                {activeSection.description}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSection ? (
              <>
                {/* Validation Errors */}
                {activeSectionErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <ul className="list-disc pl-4">
                        {activeSectionErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Form Fields */}
                <div className="space-y-4">
                  {activeSectionFields.map((field) => {
                    const fieldError = activeSectionErrors.find(error => 
                      error.toLowerCase().includes(field.name.toLowerCase())
                    );

                    return (
                      <FormFieldRenderer
                        key={field.name}
                        field={field}
                        value={activeSectionFormData[field.name]}
                        onChange={(value) => handleFieldChange(activeSectionId, field.name, value)}
                        error={fieldError}
                      />
                    );
                  })}
                </div>

                {activeSectionFields.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No fields configured for this section.</p>
                    <p className="text-sm">Configure fields in the estimate settings.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Select a section from the list to edit its contents.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EstimateEditorV2;