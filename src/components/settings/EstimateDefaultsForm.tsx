import React, { useEffect, useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { toast } from "@/components/ui/use-toast";
import SectionToggleList from "./SectionToggleList";
import SectionFieldConfig from "./SectionFieldConfig";
import { SECTION_CONFIGS } from "@/components/estimates/section-configs";
import { locationService } from "@/services/estimates/location-service";
import { supabase } from "@/integrations/supabase/client";
import defaultConfig from "../../configs/estimatesEditorConfig";
import EstimateEditorError from "../estimates/EstimateEditorError";

// Section types
export type SectionType = "text" | "file";

export interface EstimateSection {
  id: string;
  title: string;
  type: SectionType;
  enabled: boolean;
  value: string | File | null;
  isCustom?: boolean;
}

// Map SECTION_CONFIGS to EstimateSection type (for defaults)
function mapSectionConfigsToDefaults(): EstimateSection[] {
  return SECTION_CONFIGS.map((section) => ({
    id: section.id,
    title: section.label, // Use label as title
    type: "text",
    enabled: true,
    value: "",
    isCustom: false,
  }));
}

// Get system section ids to avoid name clash on add/remove/rename
const SYSTEM_SECTION_IDS = SECTION_CONFIGS.map((section) => section.id);

const EstimateDefaultsForm: React.FC = () => {
  const [error, setError] = useState("");
  const [configuration, setConfiguration] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sectionUpdates, setSectionUpdates] = useState([]);
  const [locationId, setLocationId] = useState(null);
  useEffect(() => {
    async function fetchOrCreateConfiguration() {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const userEmail = (user?.email || "").toLowerCase();

        const locationId = await locationService.getLocationContext();
        if (!locationId) {
          setError("You are not authorized to access this page. Please login.");
          return;
        }
        setLocationId(locationId);
        // Step 1: Try to fetch existing config
        const { data, error } = await supabase
          .from("estimate_configurations_v2")
          .select("*")
          .eq("location_id", locationId)
          .limit(1);

        if (error) {
          console.error(error);
          setError(error.message);
          return;
        }

        let config;

        // Step 2: If not found, create new one
        if (!data || data.length === 0) {
          const insertPayload = {
            user_id: null,
            location_id: locationId,
            config_name: "Default Configuration",
            config_data: defaultConfig, // your default config object
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

          config = inserted;
        } else {
          config = data[0];
        }

        // Step 3: Update state
        setConfiguration(config);
        setSectionUpdates(config?.config_data?.sections);
      } catch (err) {
        console.error(err);
        setError(err.message || "Unexpected error");
      } finally {
        setLoading(false);
      }
    }
    fetchOrCreateConfiguration();
  }, []);

  // Use SECTION_CONFIGS for built-in sections, add custom sections from storage
  const [sections, setSections] = useLocalStorage<EstimateSection[]>(
    "estimate_sections",
    mapSectionConfigsToDefaults()
  );
  // For backward compatibility: filter out any removed system sections or update them
  React.useEffect(() => {
    // If a system section is missing, re-add it
    const curIds = new Set(sections.map((sec) => sec.id));
    let changed = false;
    let updatedSections = [...sections];
    SECTION_CONFIGS.forEach((config) => {
      if (!curIds.has(config.id)) {
        changed = true;
        updatedSections.push({
          id: config.id,
          title: config.label, // Use label as title
          type: "text",
          enabled: true,
          value: "",
          isCustom: false,
        });
      }
    });
    // Remove legacy "system" sections not in SECTION_CONFIGS (but keep isCustom ones)
    const validSystemIds = new Set<string>(
      SECTION_CONFIGS.map((s) => s.id as string)
    );
    if (updatedSections.some((s) => !validSystemIds.has(s.id) && !s.isCustom)) {
      changed = true;
      updatedSections = updatedSections.filter(
        (s) => validSystemIds.has(s.id) || s.isCustom
      );
    }
    if (changed) setSections(updatedSections);
    // eslint-disable-next-line
  }, []);

  // Always select first enabled section
  const [activeSectionId, setActiveSectionId] = useState(
    () => sections.find((s) => s.enabled)?.id || (sections[0]?.id ?? "")
  );

  // Enable/disable section
  const handleToggle = (sectionId: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, enabled: !section.enabled }
          : section
      )
    );
    toast({
      title: "Section updated",
      description: "Section toggle saved.",
    });
  };

  // Edit section label (only allowed for custom/user-defined sections or allow for all? Here we allow rename for all.)
  const handleLabelChange = (sectionId: string, label: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, label } : section
      )
    );
  };

  // Add new (custom/user-defined) section
  const handleAddSection = (label: string, type: SectionType) => {
    // Avoid clashes with system ids
    const userSectionId = `${label
      .toLowerCase()
      .replace(/\s+/g, "-")}-${Date.now()}`;
    const newSection: EstimateSection = {
      id: userSectionId,
      title: label, // Use label as title
      type,
      enabled: true,
      value: type === "file" ? null : "",
      isCustom: true,
    };
    setSections((prev) => [...prev, newSection]);
    setActiveSectionId(userSectionId);
    toast({
      title: "Section added",
      description: `Section "${label}" has been added.`,
    });
  };

  // Updating section value/content
  const handleValueChange = (
    sectionId: string,
    value: string | File | null
  ) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, value } : section
      )
    );
    toast({
      title: "Section updated",
      description: "Section content saved.",
    });
  };

  // Remove section (only allow custom sections to be removed)
  const handleRemoveSection = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    // Prevent deleting core system sections (not isCustom)
    if (section && !section.isCustom) {
      toast({
        title: "Cannot remove default section",
        description: "This section is required for all estimates.",
        variant: "destructive",
      });
      return;
    }
    setSections((prev) => prev.filter((section) => section.id !== sectionId));
    // After remove, pick a new section
    const remaining = sections.filter(
      (section) => section.id !== sectionId && section.enabled
    );
    setActiveSectionId(remaining.length ? remaining[0].id : "");
    toast({
      title: "Section removed",
      description: "Section has been deleted.",
    });
  };

  if (error) {
    return <EstimateEditorError message={error} />;
  }

  if (loading) {
    return <h1>Loading...</h1>;
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <SectionToggleList
        setSectionUpdates={setSectionUpdates}
        sections={sectionUpdates}
        activeSectionId={activeSectionId}
        setActiveSectionId={setActiveSectionId}
        onToggle={handleToggle}
        onLabelChange={handleLabelChange}
        onAddSection={handleAddSection}
        onRemoveSection={handleRemoveSection}
      />
      <div className="border rounded-md p-4 min-h-[300px]">
        {activeSectionId ? (
          <SectionFieldConfig
            section={sectionUpdates.find((s) => s.id === activeSectionId)!}
            onValueChange={handleValueChange}
          />
        ) : (
          <div className="text-center text-muted-foreground">
            Select a section to edit its details.
          </div>
        )}
      </div>
    </div>
  );
};

export default EstimateDefaultsForm;
