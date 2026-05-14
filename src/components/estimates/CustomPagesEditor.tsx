import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FileDropzone from "@/components/ui/file-dropzone";
import RichTextEditor from "@/components/ui/rich-text-editor";
import { EstimateDocument } from "@/types/estimate-items";
import { EstimateSection, sectionService } from "@/services/estimates/section-service";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Database } from "@/integrations/supabase/types";
import { fileUploadService } from "@/services/estimates/file-upload-service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CustomPagesEditorProps {
  estimate: EstimateDocument;
  setEstimate: React.Dispatch<React.SetStateAction<EstimateDocument>>;
  activeSection?: string;
  sections: EstimateSection[];
  onSectionsChange: (sections: EstimateSection[]) => void;
}

type TextTemplate = Pick<
  Database["public"]["Tables"]["estimate_text_templates"]["Row"],
  "id" | "name" | "html"
>;

const CustomPagesEditor: React.FC<CustomPagesEditorProps> = ({ 
  estimate, 
  setEstimate, 
  activeSection,
  sections,
  onSectionsChange
}) => {
  const [currentSection, setCurrentSection] = useState<EstimateSection | null>(null);
  const [textTemplates, setTextTemplates] = useState<TextTemplate[]>([]);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [pendingTemplateHtml, setPendingTemplateHtml] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplateIdx, setSelectedTemplateIdx] = useState<string>("");
  const { toast } = useToast();

  // Load the current section data from local state
  useEffect(() => {
    if (!activeSection) return;
    
    const section = sections.find(s => s.id === activeSection);
    if (section && section.section_type === 'custom') {
      setCurrentSection(section);
    }
  }, [activeSection, sections]);

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data, error } = await supabase
        .from('estimate_text_templates')
        .select('id,name,html')
        .eq('scope', 'custom_page_text')
        .order('created_at', { ascending: true });
      if (!error && data) {
        setTextTemplates(
          (data as TextTemplate[]).map((t) => ({
            id: t.id,
            name: t.name || "",
            html: t.html || "",
          }))
        );
      } else if (error) {
        console.warn('Failed to load templates from Supabase', error);
        toast({ title: 'Could not load templates', description: error.message, variant: 'destructive' });
      }
    };
    fetchTemplates();
  }, [toast]);

  const customPageData = currentSection?.custom_page_data;

  // If page refreshes with textHtml set, re-select matching template (best-effort by html match)
  useEffect(() => {
    const currentHtml: string = customPageData?.textHtml || "";
    if (!currentHtml || textTemplates.length === 0) return;

    const idx = textTemplates.findIndex((t) => (t.html || "") === currentHtml);
    if (idx === -1) return;

    const t = textTemplates[idx];
    if (!t?.id) return;

    setSelectedTemplateId(t.id);
    setSelectedTemplateIdx(String(idx));
  }, [customPageData?.textHtml, textTemplates]);

  const updateSection = (updates: Partial<EstimateSection>) => {
    if (!currentSection) return;

    // Update the current section in local state
    const updatedSection = { ...currentSection, ...updates };
    setCurrentSection(updatedSection);

    // Update the section in the parent's sections array
    const updatedSections = sections.map(section => 
      section.id === currentSection.id ? updatedSection : section
    );
    onSectionsChange(updatedSections);
  };

  const saveTextTemplate = async (html: string, name: string) => {
    const { data, error } = await supabase
      .from('estimate_text_templates')
      .insert({ 
        name: name.trim(), 
        html, 
        scope: 'custom_page_text'
      } as Database['public']['Tables']['estimate_text_templates']['Insert'])
      .select('id,name,html');
    if (error) {
      console.error('Failed to save template', error);
      toast({ title: 'Failed to save template', description: error.message, variant: 'destructive' });
      return;
    }
    // Re-fetch minimal row to ensure we have id/name/html consistent (Supabase insert return can vary by config)
    const inserted = Array.isArray(data) && data.length > 0
      ? (data[0] as Partial<TextTemplate>)
      : undefined;
    setTextTemplates((prev) => [
      ...prev,
      {
        id: inserted?.id || crypto.randomUUID(),
        name: inserted?.name || name.trim(),
        html: inserted?.html || html,
      },
    ]);
    toast({ title: 'Template saved', description: 'Added to your templates.' });
  };

  const updateTextTemplate = async (id: string, html: string, name?: string) => {
    const payload: Database["public"]["Tables"]["estimate_text_templates"]["Update"] = {
      html,
      ...(name !== undefined ? { name: name.trim() } : {}),
    };

    const { error } = await supabase
      .from("estimate_text_templates")
      .update(payload)
      .eq("id", id);

    if (error) {
      console.error("Failed to update template", error);
      toast({ title: "Failed to update template", description: error.message, variant: "destructive" });
      return;
    }

    setTextTemplates((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              html,
              ...(name !== undefined ? { name: name.trim() } : {}),
            }
          : t
      )
    );

    toast({ title: "Template updated", description: "Your changes were saved." });
  };

  const openSaveTemplateDialog = (html: string) => {
    const suggested = `Template ${textTemplates.length + 1}`;
    setPendingTemplateHtml(html);
    setTemplateName(suggested);
    setIsSaveTemplateOpen(true);
  };

  if (!currentSection) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">No custom page selected</div>
      </div>
    );
  }

  // customPageData already declared above

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 flex-row items-center justify-between">
        <CardTitle>Custom Page Editor</CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-4">
        <Card>
          <CardHeader className="grid gap-2">
            <Input 
              placeholder="Page title" 
              value={currentSection.title || ''} 
              onChange={(e) => updateSection({ title: e.target.value })} 
            />
            <div className="flex items-center gap-3">
              <Switch 
                checked={customPageData?.requireAcknowledgement || false} 
                onCheckedChange={(v) => updateSection({ 
                  custom_page_data: { 
                    ...customPageData, 
                    requireAcknowledgement: v 
                  } 
                })} 
              />
              <Label>Require customers to acknowledge this page</Label>
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              <div className="sm:col-span-1">
                <Label>Options</Label>
                <Select 
                  value={customPageData?.pageType || 'text'} 
                  onValueChange={(v: 'myPdfs' | 'sharedPdfs' | 'singleUsePdf' | 'text') => updateSection({ 
                    custom_page_data: { 
                      ...customPageData, 
                      pageType: v 
                    } 
                  })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="myPdfs">My PDFs</SelectItem>
                    <SelectItem value="sharedPdfs">Shared PDFs</SelectItem>
                    <SelectItem value="singleUsePdf">Single Use PDF</SelectItem>
                    <SelectItem value="text">Text Page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {customPageData?.pageType === 'myPdfs' && (
              <div className="text-sm text-muted-foreground">No PDFs available for selection.</div>
            )}
            {customPageData?.pageType === 'sharedPdfs' && (
              <div className="text-sm text-muted-foreground">No shared PDFs available.</div>
            )}
            {customPageData?.pageType === 'singleUsePdf' && (
              <div className="space-y-3">
                <FileDropzone 
                  accept="application/pdf" 
                  valueDataUrl={currentSection.file_storage_path ? fileUploadService.getFileUrl(currentSection.file_storage_path) : undefined}
                                  onChange={async (file, dataUrl) => {
                  if (file) {
                    // Validate file before upload
                    const validation = fileUploadService.validateFile(file);
                    if (!validation.valid) {
                      toast({ 
                        title: 'Invalid file', 
                        description: validation.error, 
                        variant: 'destructive' 
                      });
                      return;
                    }

                    // Upload file to storage and update section
                    const updatedSections = await sectionService.uploadFileForSection(
                      sections,
                      currentSection.id,
                      file,
                      estimate.id
                    );
                    onSectionsChange(updatedSections);
                    
                    toast({ 
                      title: 'File uploaded successfully', 
                      description: 'File has been saved to storage' 
                    });
                  } else {
                    // Remove file reference
                    const updatedSections = await sectionService.removeFileFromSection(
                      sections,
                      currentSection.id
                    );
                    onSectionsChange(updatedSections);
                    
                    toast({ 
                      title: 'File removed', 
                      description: 'File reference has been removed' 
                    });
                  }
                }} 
                />
                {currentSection.file_storage_path && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>File: {currentSection.file_name}</div>
                    <div>Size: {((currentSection.file_size || 0) / 1024).toFixed(1)} KB</div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileUploadService.downloadFile(
                          currentSection.file_storage_path!,
                          currentSection.file_name!
                        )}
                      >
                        Download
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const updatedSections = await sectionService.removeFileFromSection(
                            sections,
                            currentSection.id
                          );
                          onSectionsChange(updatedSections);
                        }}
                      >
                        Remove File
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {customPageData?.pageType === 'text' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => openSaveTemplateDialog(customPageData.textHtml || '')}
                  >
                    Save as New Template
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!selectedTemplateId}
                    onClick={async () => {
                      if (!selectedTemplateId) return;
                      const ok = window.confirm("Update the selected template with current content?");
                      if (!ok) return;
                      await updateTextTemplate(selectedTemplateId, customPageData.textHtml || "");
                    }}
                  >
                    Update Template
                  </Button>
                  <Select 
                    value={selectedTemplateIdx}
                    onValueChange={(idx) => {
                      const t = textTemplates[Number(idx)];
                      if (!t) return;
                      setSelectedTemplateId(t.id);
                      setSelectedTemplateIdx(String(idx));
                      updateSection({
                        custom_page_data: {
                          ...customPageData,
                          textHtml: t.html || "",
                        },
                      });
                    }}
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Load template" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-background">
                      {textTemplates.length === 0 ? (
                        <SelectItem value="__none__" disabled>No templates</SelectItem>
                      ) : textTemplates.map((t, i) => (
                        <SelectItem key={t.id || i} value={String(i)}>
                          {t.name || `Template ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Dialog open={isSaveTemplateOpen} onOpenChange={setIsSaveTemplateOpen}>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Save template</DialogTitle>
                      <DialogDescription>
                        Enter a name for this new template.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2 py-2">
                      <Label htmlFor="custom-page-template-name">Template name</Label>
                      <Input
                        id="custom-page-template-name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder={`Template ${textTemplates.length + 1}`}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsSaveTemplateOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={async () => {
                          const trimmed = templateName.trim();
                          if (!trimmed) {
                            toast({ title: "Name required", description: "Please enter a template name.", variant: "destructive" });
                            return;
                          }
                          await saveTextTemplate(pendingTemplateHtml, trimmed);
                          setIsSaveTemplateOpen(false);
                        }}
                      >
                        Save
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <RichTextEditor 
                  value={customPageData.textHtml || ''} 
                  onChange={(html) => updateSection({ 
                    custom_page_data: { 
                      ...customPageData, 
                      textHtml: html 
                    } 
                  })} 
                />
              </div>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default CustomPagesEditor;
