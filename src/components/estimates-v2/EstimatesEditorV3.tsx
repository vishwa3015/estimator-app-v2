/* eslint-disable @typescript-eslint/no-explicit-any */
import { locationService } from "@/services/estimates/location-service";
import EstimatesContainer from "./EstimatesContainer";
import EstimatesSidebar from "./EstimatesSidebar";
import { useEffect, useState, useRef, useCallback } from "react";
import EstimateEditorError from "../estimates/EstimateEditorError";
import { supabase } from "@/integrations/supabase/client";
import defaultConfig from "../../configs/estimatesEditorConfig";
import { EstimatesActionsHandler } from "./EstimatesActionsHandler";
import { useParams } from "react-router-dom";
import { useEstimateData } from "@/hooks/use-estimate-data";
import { useToast } from "@/hooks/use-toast";
import { estimateServiceV2 } from "@/services/estimates/estimate-service-v2";
import EstimateHeader from "../estimates/EstimateHeader";
import OpportunitySelector from "../estimates/OpportunitySelector";
import { Json } from "@/integrations/supabase/types";
import { FormValues, SectionConfig } from "@/types/estimate-items";

interface EstimateRecord {
  id: string;
  form_data?: FormValues;
  config_data?: {
    title?: string;
    sections?: SectionConfig[];
  };
  selected_opportunity_id?: string;
  docusign_status?: string;
  change_request_reason?: string;
}

interface ConfigSection {
  id: number;
  type?: string;
  title?: string;
  enabled?: boolean;
  hide?: boolean;
  sections?: unknown[];
  sortOrder?: number;
}

interface Configuration {
  id: string;
  config_name?: string;
  config_data?: {
    title?: string;
    sections?: SectionConfig[];
  };
  form_values?: FormValues;
  show_material_data_entry?: boolean;
}


export default function EstimatesEditorV3({ handleBackToJob }) {
  const { estimateId } = useParams();
  const { isLoading, estimate } = useEstimateData();

  const typedEstimate = estimate as EstimateRecord | null;

  const isLocked = typedEstimate?.docusign_status === "completed";

  const [error, setError] = useState("");
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string | number>(1);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<FormValues>({});
  const { toast } = useToast();
  const [sectionUpdates, setSectionUpdates] = useState<SectionConfig[]>([]);
  const { contactId } = useParams();
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const formValuesInitializedRef = useRef(false);

  // Auto-save refs
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');
  const isSavingRef = useRef<boolean>(false);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | undefined>();


  const hasDataChanged = useCallback(() => {
    const currentData = JSON.stringify({ formValues, sectionUpdates });
    return currentData !== lastSavedDataRef.current;
  }, [formValues, sectionUpdates]);

  const performAutoSave = useCallback(async (overrideFormValues?: FormValues, overrideSectionUpdates?: SectionConfig[]) => {
    if (isLocked) return;
    const dataToSave = {
      formValues: overrideFormValues ?? formValues,
      sectionUpdates: overrideSectionUpdates ?? sectionUpdates,
    };
    const dataStr = JSON.stringify(dataToSave);
    if (!estimateId || isSavingRef.current) return;
    if (!overrideFormValues && !overrideSectionUpdates && !hasDataChanged()) return;

    try {
      isSavingRef.current = true;

      await estimateServiceV2.saveEstimate({
        formValues: dataToSave.formValues,
        sectionUpdates: dataToSave.sectionUpdates,
        opportunityId: contactId || "",
        contactId: contactId,
        locationId: locationId || undefined, // ← ADD
        configId: configuration?.id,
        title: typedEstimate?.config_data?.title || "Auto-saved Estimate",
        estimateId: estimateId,
        selectedOpportunityId: selectedOpportunityId,
      });

      lastSavedDataRef.current = dataStr;
      setFormValues(dataToSave.formValues);
      setSectionUpdates(dataToSave.sectionUpdates);

      toast({
        title: "Auto-saved",
        description: "Changes saved successfully",
        duration: 2000,
      });
    } catch (error) {
      console.error('Auto-save error:', error);
      toast({
        title: "Auto-save failed",
        description: "Your changes could not be saved automatically",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      isSavingRef.current = false;
    }
  }, [estimateId, formValues, sectionUpdates, contactId, configuration?.id, estimate, hasDataChanged, toast, isLocked, selectedOpportunityId, typedEstimate,]);

  // Function to reset auto-save timer
  const resetAutoSaveTimer = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setInterval(() => {
      if (hasDataChanged()) {
        performAutoSave();
      }
    }, 60000);
  }, [hasDataChanged, performAutoSave]);


  // Periodic auto-save effect (every 60 seconds)
  useEffect(() => {
    if (!estimateId) return;

    resetAutoSaveTimer();

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [estimateId, resetAutoSaveTimer]);

  useEffect(() => {
    if (typedEstimate?.id) {
      const loadedFormValues = typedEstimate.form_data ?? {};
      const loadedSectionUpdates = typedEstimate.config_data?.sections ?? [];

      setSectionUpdates(loadedSectionUpdates);
      setFormValues(loadedFormValues);
      formValuesInitializedRef.current = true;

      if (typedEstimate.selected_opportunity_id) {
        setSelectedOpportunityId(typedEstimate.selected_opportunity_id);
      }

      // Initialize the lastSavedDataRef with the loaded data to prevent false positives
      lastSavedDataRef.current = JSON.stringify({
        formValues: loadedFormValues,
        sectionUpdates: loadedSectionUpdates
      });
    }
  }, [typedEstimate]);

  useEffect(() => {
    async function fetchOrCreateConfiguration() {
      setLoading(true);
      try {
        const locationId = await locationService.getLocationContext();
        if (!locationId) {
          setError("You are not authorized to access this page. Please login.");
          return;
        }
        setLocationId(locationId);
        // Step 1: Try to fetch existing configs
        const { data, error } = await supabase
          .from("estimate_configurations_v2")
          .select("*")
          .eq("location_id", locationId)
          // .limit(1);
          .order("created_at", { ascending: false });

        if (error) {
          console.error(error);
          setError(error.message);
          return;
        }

        let config: Configuration;

        // Step 2: If not found, create new one
        if (!data || data.length === 0) {
          const insertPayload = {
            user_id: null,
            location_id: locationId,
            config_name: "Default Configuration",
            config_data: { ...defaultConfig, formValues: null }, // your default config object
            form_values: defaultConfig.formValues,
            version: 1,
            is_active: true,
          };

          const { data: inserted, error: insertError } = await supabase
            .from("estimate_configurations_v2")
            .insert(insertPayload)
            .select("*") // return the inserted row
            .single();

          if (insertError) {
            console.error(insertError);
            setError(insertError.message);
            return;
          }

          config = inserted as Configuration;
        } else {
          config = data[0] as Configuration;
        }

        // Step 3: Migrate configuration to add missing sections
        let migratedConfig = config;
        const sections: SectionConfig[] = config?.config_data?.sections ?? [];
        const sectionIds = sections.map((s) => s.id);

        // Check if Measurements Report section (id: 4) is missing
        if (!sectionIds.includes(4)) {
          console.log('Migrating configuration: Adding Measurements Report section');
          const newSection: SectionConfig = {
            "id": 4,
            "type": "default",
            "title": "Measurements Report",
            "enabled": false,
            "hide": false,
            "sections": [
              {
                "fields": [
                  {
                    "name": "home_address",
                    "type": "text",
                    "label": "Home Address",
                    "value": "",
                    "default": "",
                    "placeholder": "Enter the property address"
                  }
                ]
              }
            ],
            "sortOrder": 5.5
          };

          // Insert the new section after Inspection (id: 5)
          const updatedSections = [...sections, newSection].sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));

          // Update config_data
          const updatedConfigData = {
            ...config.config_data,
            sections: updatedSections
          };

          // Update form_values
          const updatedFormValues = {
            ...config.form_values,
            "4": { "home_address": "" }
          };

          // Save updated configuration
          const { error: updateError } = await supabase
            .from("estimate_configurations_v2")
            .update({
              config_data: updatedConfigData as unknown as Json,
              form_values: updatedFormValues as unknown as Json,
              updated_at: new Date().toISOString()
            })
            .eq('id', config.id);

          if (updateError) {
            console.error('Error migrating configuration:', updateError);
          } else {
            console.log('Configuration migrated successfully');
            migratedConfig = {
              ...config,
              config_data: updatedConfigData,
              form_values: updatedFormValues
            };
          }
        }

        const allConfigs = (data ?? [migratedConfig]) as Configuration[];
        setConfiguration(migratedConfig);
        setConfigurations(allConfigs);
        setSectionUpdates(migratedConfig?.config_data?.sections);

        if (!formValuesInitializedRef.current) {
          setFormValues(migratedConfig?.form_values || {});
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unexpected error";
        console.error(err);
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchOrCreateConfiguration();
  }, []);

  const handleConfigSelect = (configId: string) => {
    const selected = configurations.find(c => c.id === configId);
    if (!selected) return;
    setConfiguration(selected);
    setSectionUpdates(selected?.config_data?.sections || []);

    if (!formValuesInitializedRef.current && (!typedEstimate || !typedEstimate.id)) {
      setFormValues(selected?.form_values ?? {});
    }
  };

  if (error) {
    return <EstimateEditorError message={error} />;
  }

  if (loading || isLoading || sectionUpdates.length <= 0 || !locationId) {
    return <h1>Loading...</h1>;
  }

  return (
    <>
      <EstimatesActionsHandler
        formValues={formValues}
        sectionUpdates={sectionUpdates}
        opportunityId={contactId || ""}
        contactId={contactId}
        configId={configuration?.id}
        handleBackToJob={handleBackToJob}
        estimateId={estimateId}
        selectedOpportunityId={selectedOpportunityId}
        locationId={locationId}
      >
        {({ handleSave, handleDelete }) => (
          <>
            <EstimateHeader
              title={!estimateId ? "Create Estimate" : "Update Estimate"}
              onSave={handleSave}
              onDelete={handleDelete}
              opportunityId={contactId || ""}
              contactId={contactId}
              formValues={formValues}
              sectionUpdates={sectionUpdates}
              configId={configuration?.id}
              onCancel={handleBackToJob}
              configurations={configurations}
              onConfigSelect={handleConfigSelect}
              isLocked={isLocked}
              selectedOpportunityId={selectedOpportunityId}
            />

            {typedEstimate?.change_request_reason && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-3" role="alert">
                <span className="block sm:inline">{typedEstimate.change_request_reason}</span>
              </div>
            )}

            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 mt-4">
              <OpportunitySelector
                locationId={locationId}
                contactId={contactId || ""}
                value={selectedOpportunityId}
                onChange={(id, opp) => {
                  setSelectedOpportunityId(id);
                  setFormValues(prev => ({ ...prev, opportunityId: id, opportunityName: opp.name }));
                }}
                disabled={isLocked}
              />
            </div>

            <div className="rounded-lg border bg-card text-card-foreground shadow-sm pt-8 mt-4">
              <div className="p-0 grid grid-cols-[280px_1fr] gap-6">
                <EstimatesSidebar
                  sections={configuration?.config_data?.sections}
                  activeSection={activeSection}
                  setActiveSection={setActiveSection}
                  setSectionUpdates={setSectionUpdates}
                  sectionUpdates={sectionUpdates}
                  showMaterialDataEntry={configuration?.show_material_data_entry ?? false}
                  isLocked={isLocked}
                />
                <EstimatesContainer
                  activeSection={activeSection}
                  setSectionUpdates={setSectionUpdates}
                  sectionUpdates={sectionUpdates}
                  locationId={locationId}
                  setActiveSection={setActiveSection}
                  formValues={formValues}
                  setFormValues={setFormValues}
                  onResetAutoSaveTimer={resetAutoSaveTimer}
                  onSaveRequested={performAutoSave}
                  isLocked={isLocked}
                />
              </div>
            </div>
          </>
        )}
      </EstimatesActionsHandler>
    </>
  );
}