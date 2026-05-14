import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertTriangle, Loader2, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EstimateTemplate, templateService } from "@/services/estimates/template-service";
import { isRendererKeyRegistered } from "@/Templateregistry";
import { useLocalGHLCredentials } from "@/services/ghl/getghlCredentials";


const openTemplatePreview = (template: EstimateTemplate) => {
  const params = new URLSearchParams({
    key: template.renderer_key,
    name: template.name,
  });
  window.open(`/template-preview?${params.toString()}`, "_blank", "noopener,noreferrer");
};


const DefaultTemplateSettings: React.FC = () => {
  const { toast } = useToast();

  const [templates, setTemplates] = useState<EstimateTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { credentials: ghlCredentials, loading: credentialsLoading } = useLocalGHLCredentials();
  const locationId = ghlCredentials?.companyId ?? null;

  useEffect(() => {
    if (credentialsLoading) return;
    if (!locationId) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const [templateList, pref] = await Promise.all([
          templateService.getTemplates(locationId),
          templateService.getLocationPreference(locationId),
        ]);
        setTemplates(templateList);
        const currentDefaultId = pref?.default_template_id ?? null;
        setSelectedTemplateId(currentDefaultId);
        setSavedTemplateId(currentDefaultId);
      } catch (err) {
        console.error("Failed to load templates:", err);
        toast({
          title: "Error",
          description: "Failed to load templates. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [locationId, credentialsLoading]);

  const handleSave = async () => {
    if (!locationId) {
      toast({ title: "Error", description: "No location ID found. Please log in again.", variant: "destructive" });
      return;
    }
    if (!selectedTemplateId) {
      toast({ title: "Select a template", description: "Please select a template before saving.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await templateService.setDefaultTemplateForLocation(locationId, selectedTemplateId);
      setSavedTemplateId(selectedTemplateId);
      toast({ title: "Saved", description: "Default template updated successfully." });
    } catch (err) {
      console.error("Failed to save template preference:", err);
      toast({ title: "Error", description: "Failed to save template preference. Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = selectedTemplateId !== savedTemplateId;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading templates…</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Default Template</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the default template for new estimates created in this location.
          You can still change the template when creating individual estimates.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">No templates available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const isSelected = selectedTemplateId === template.id;
            const isSaved = savedTemplateId === template.id;
            const isRegistered = isRendererKeyRegistered(template.renderer_key);

            return (
              <div key={template.id} className="flex flex-col gap-1">

                {/* ── Card ── */}
                <div
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={[
                    "relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-150 select-none",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/40 hover:shadow-sm bg-card",
                    !isRegistered ? "opacity-60" : "",
                  ].join(" ")}
                >
                  {/* ── Thumbnail area ── */}
                  <div className="w-full aspect-[4/3] rounded-md bg-muted mb-4 overflow-hidden flex items-center justify-center">
                    {template.thumbnail_url ? (
                      <img
                        src={template.thumbnail_url}
                        alt={template.name}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-8 w-8 text-muted-foreground/50" />
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {template.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── Name + badges ── */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate">{template.name}</p>
                      {template.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {isSaved && (
                        <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                          Current
                        </Badge>
                      )}
                      {!isRegistered && (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Dev pending
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* ── Renderer key ── */}
                  <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                    key: {template.renderer_key}
                  </p>

                  {/* ── Selected checkmark ── */}
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </div>

                {/* ── Preview button below card ── */}
                <button
                  onClick={() => openTemplatePreview(template)}
                  className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors py-1 rounded-md hover:bg-muted/50"
                >
                  <Eye className="h-3 w-3" />
                  Preview in new tab
                </button>

              </div>
            );
          })}
        </div>
      )}

      {/* ── Save button ── */}
      <div className="mt-6 flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges || !selectedTemplateId}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            "Save Default Template"
          )}
        </Button>
        {hasChanges && !isSaving && (
          <p className="text-xs text-muted-foreground">You have unsaved changes.</p>
        )}
        {!hasChanges && savedTemplateId && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Saved
          </p>
        )}
      </div>
    </div>
  );
};

export default DefaultTemplateSettings;