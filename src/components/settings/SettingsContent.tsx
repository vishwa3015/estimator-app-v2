/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useCallback } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { locationService } from "@/services/estimates/location-service";
import { supabase } from "@/integrations/supabase/client";
import defaultConfig from "../../configs/estimatesEditorConfig";
import SettingsEstimatesSidebar from "./editor/SettingsEstimatesSidebar";
// import SettingsEstimatesContainer from "./editor/SettingsEstimatesContainer";
import { Button } from "../ui/button";
import { ArrowLeft, Copy, FileText, Trash2Icon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EstimatesContainer from "./editor/SettingsEstimatesContainer";

interface ConfigSection {
  id: number;
  [key: string]: unknown;
}

interface ConfigData {
  sections: ConfigSection[];
  formValues?: Record<string, unknown> | null;
  title?: string;
}

interface Configuration {
  id: string;
  config_name: string;
  config_data: ConfigData;
  form_values: Record<string, unknown>;
  location_id: string;
  user_id: string | null;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ModalConfig {
  open: boolean;
  mode: "create" | "clone";
  sourceName?: string;
  sourceConfig?: Configuration;
}

const formatDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const getStatusChipClasses = (isActive: boolean): string =>
  isActive
    ? "bg-green-100 text-green-700"
    : "bg-gray-100 text-gray-600";

const SettingsContent: React.FC = () => {
  const { toast } = useToast();

  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [editingConfig, setEditingConfig] = useState<Configuration | null>(null);
  const [activeSection, setActiveSection] = useState<number | string>(1);
  const [sectionUpdates, setSectionUpdates] = useState<ConfigSection[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});

  const [isLoadingConfigurations, setIsLoadingConfigurations] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState<string>("");
  const [modalConfig, setModalConfig] = useState<ModalConfig>({ open: false, mode: "create" });
  const [inputName, setInputName] = useState<string>("");

  const openCreateModal = () => {
    setInputName("");
    setModalConfig({ open: true, mode: "create" });
  };

  const openCloneModal = (config: Configuration) => {
    setInputName(`${config.config_name} (Copy)`);
    setModalConfig({ open: true, mode: "clone", sourceName: config.config_name, sourceConfig: config });
  };

  const closeModal = () => {
    setModalConfig({ open: false, mode: "create" });
    setInputName("");
  };
  
  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async (): Promise<void> => {
    setIsLoadingConfigurations(true);
    setError("");
    try {
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
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error(error);
          setError(error.message);
          return;
        }

      setConfigurations((data as unknown as Configuration[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
    } finally {
      setIsLoadingConfigurations(false);
    }
  };

  const handleModalConfirm = async (): Promise<void> => {
    if (!inputName.trim()) return;
    setIsLoadingConfigurations(true);
    const isClone = modalConfig.mode === "clone";
    try {
      const { data: inserted, error: insertError } = await supabase
        .from("estimate_configurations_v2")
        .insert({
            user_id: null,
            location_id: locationId,
            config_name: inputName.trim(),
            config_data: isClone
              ? modalConfig.sourceConfig!.config_data
              : { ...defaultConfig, formValues: null },
            form_values: isClone
              ? modalConfig.sourceConfig!.form_values
              : defaultConfig.formValues,
            version: 1,
            is_active: true,
        })
        .select("*")
        .single();

      if (insertError) {
        console.error(insertError);
        setError(insertError.message);
        toast({
          title: "Error",
          description: insertError.message,
          variant: "destructive",
        });
        return;
      }

      if (!inserted) {
        throw new Error("Insert returned no data.");
      }
      const newConfig = inserted as unknown as Configuration;
      setConfigurations((prev) => [newConfig, ...prev]);
      closeModal();

      toast({
        title: isClone ? "Cloned" : "Created",
        description: `"${newConfig.config_name}" was ${isClone ? "cloned" : "created"} successfully.`,
      });

      if (!isClone) openEditor(newConfig);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      console.error(err);
      setError(message);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsLoadingConfigurations(false);
    }
  };

  const openEditor = (config: Configuration): void => {
    setEditingConfig(config);
    setSectionUpdates(config?.config_data?.sections || []);
    setFormValues(config?.form_values || {});
    setActiveSection(1);
  };

  const handleBack = (): void => {
    setEditingConfig(null);
    fetchConfigurations();
  };

  const handleConfigSave = async (): Promise<void> => {
    if (!editingConfig) return;
    setSaving(true);
    try {
      const updatePayload = {
        config_data: { sections: sectionUpdates },
        form_values: formValues,
      } as unknown as Record<string, unknown>;

      const { error: updateError } = await supabase
        .from("estimate_configurations_v2")
        .update(updatePayload)
        .eq("id", editingConfig.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      toast({ title: "Saved", description: "Configuration saved successfully." });
      handleBack();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      console.error(err);
      setError(message);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /** Save config without navigating away - used after template update so content persists on refresh */
  const saveConfigForTemplateUpdate = useCallback(async () => {
    if (!editingConfig) return;
    setSaving(true);
    try {
      const updatePayload = {
        config_data: { sections: sectionUpdates },
        form_values: formValues,
      } as unknown as Record<string, unknown>;

      const { error: updateError } = await supabase
        .from("estimate_configurations_v2")
        .update(updatePayload)
        .eq("id", editingConfig.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      toast({ title: "Saved", description: "Changes saved.", duration: 2000 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      console.error(err);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [editingConfig, sectionUpdates, formValues]);

  const handleDelete = async (configId: string): Promise<void> => {
    const target = configurations.find((c) => c.id === configId);
    if (!target) {
      toast({
        title: "Error",
        description: "Selected configuration not found.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete "${target.config_name}"?`)) return;

    setDeletingId(configId);
    try {
      const { error: deleteError } = await supabase
        .from("estimate_configurations_v2")
        .delete()
        .eq("id", configId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setConfigurations((prev) => prev.filter((c) => c.id !== configId));
      toast({ title: "Deleted", description: `"${target.config_name}" was deleted.` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const visibleSections = useCallback(
    () => sectionUpdates.filter((s) => s.id !== 4),
    [sectionUpdates]
  );

  if (error) return <div className="p-4 text-red-500">{error}</div>;

  if (editingConfig) {
  return (
    <div className="container max-w-6xl mx-auto p-4 space-y-6">
          <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleBack}><ArrowLeft className="h-4 w-4" />Back</Button>
            <h1 className="text-2xl font-bold">{editingConfig.config_name}</h1>
          </div>
          <Button onClick={handleConfigSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm pt-8 mt-4">
            <div className="p-0 grid grid-cols-[280px_1fr] gap-6">
              <SettingsEstimatesSidebar
                sections={visibleSections()}
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                setSectionUpdates={setSectionUpdates}
                sectionUpdates={visibleSections()}
              />
              <EstimatesContainer
                activeSection={activeSection}
                setSectionUpdates={setSectionUpdates}
                sectionUpdates={sectionUpdates}
                locationId={locationId}
                setActiveSection={setActiveSection}
                formValues={formValues}
                setFormValues={setFormValues}
                onSaveRequested={saveConfigForTemplateUpdate}
              />
            </div>
          </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-4 space-y-6">

      {modalConfig.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-sm shadow-xl space-y-4">
            <h2 className="text-lg font-semibold">
              {modalConfig.mode === "clone" ? "Name your cloned estimate template" : "Name your estimate template"}
            </h2>
            {modalConfig.mode === "clone" && (
              <p className="text-sm text-muted-foreground">
                Cloning:{" "}
                <span className="font-medium text-foreground">{modalConfig.sourceName}</span>
              </p>
            )}
            <input
              autoFocus
              type="text"
              placeholder={
                modalConfig.mode === "clone"
                  ? "e.g. Standard Roofing Copy"
                  : "e.g. Standard Roofing, Premium Package"
              }
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleModalConfirm()}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                onClick={handleModalConfirm}
                disabled={!inputName.trim() || isLoadingConfigurations}
              >
                {modalConfig.mode === "clone" ? "Clone" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Button className="gap-2" onClick={openCreateModal}>
          <FileText className="h-4 w-4" />
          Create Estimate Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved Estimate Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingConfigurations ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : configurations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No Estimate Templates yet</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {configurations.map((config) => (
                <div
                  key={config.id}
                  className="border rounded-2xl p-5 bg-white shadow hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <h2 className="text-base font-semibold text-gray-800 leading-snug">
                      {config.config_name}
                    </h2>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openCloneModal(config)}
                        className="px-3 py-1 text-sm rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                        title="Clone"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <Button
                        onClick={() => openEditor(config)}
                        className="px-3 py-1 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                      >
                        Edit
                      </Button>
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="px-3 py-1 text-sm rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                      >
                        <Trash2Icon className="h-4 w-4"/>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      <span className="font-medium text-gray-700">Last Updated:</span>{" "}
                      {formatDate(config.updated_at)}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700">Created:</span>{" "}
                      {formatDate(config.created_at)}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-700">Status:</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusChipClasses(config.is_active)}`}
                      >
                        {config.is_active ? "active" : "inactive"}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium text-gray-700">Version:</span>{" "}
                      {config.version}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsContent;
