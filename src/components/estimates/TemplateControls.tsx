import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/ui/rich-text-editor";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TextTemplate = Pick<
  Database["public"]["Tables"]["estimate_text_templates"]["Row"],
  "id" | "name" | "html"
>;

function buildSuggestedName(existingCount: number) {
  return `Template ${existingCount + 1}`;
}

export function TemplateControls({
  scope,
  value,
  onChange,
  disabled,
  confirmOnLoad = true,
  editorType = "richtext",
  onAfterUpdate,
}: {
  scope: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  confirmOnLoad?: boolean;
  /** Determines which editor to use in the manage dialog (textarea vs rich text). */
  editorType?: "textarea" | "richtext";
  /** Called after template is updated - use to trigger form save so content persists on refresh */
  onAfterUpdate?: () => void;
}) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TextTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplateIdx, setSelectedTemplateIdx] = useState<string>("");

  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [pendingHtml, setPendingHtml] = useState("");

  // Template management dialog state (view/update/delete).
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [manageMode, setManageMode] = useState<"view" | "edit">("view");
  const [manageSelectedId, setManageSelectedId] = useState<string | null>(null);
  const [manageName, setManageName] = useState("");
  const [manageHtml, setManageHtml] = useState("");

  const selectedTemplate = selectedTemplateId ? templates.find((t) => t.id === selectedTemplateId) : null;

  const suggestedName = useMemo(() => buildSuggestedName(templates.length), [templates.length]);

  useEffect(() => {
    let cancelled = false;
    const fetchTemplates = async () => {
      const { data, error } = await supabase
        .from("estimate_text_templates")
        .select("id,name,html")
        .eq("scope", scope)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.warn("Failed to load templates from Supabase", error);
        toast({ title: "Could not load templates", description: error.message, variant: "destructive" });
        return;
      }

      setTemplates(
        (data as TextTemplate[]).map((t) => ({
          id: t.id,
          name: t.name || "",
          html: t.html || "",
        })),
      );
    };
    fetchTemplates();
    return () => {
      cancelled = true;
    };
  }, [scope, toast]);

  // Normalize HTML for comparison (editors may produce slightly different markup)
  const normalizeHtml = useCallback((s: string) => {
    return (s || "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/>\s+</g, "><");
  }, []);

  // Best-effort re-select if value matches a template html (useful on refresh)
  useEffect(() => {
    if (!value || templates.length === 0) return;
    const n = normalizeHtml(value);
    const idx = templates.findIndex((t) => {
      const th = t.html || "";
      return th === value || normalizeHtml(th) === n;
    });
    if (idx === -1) return;
    const t = templates[idx];
    if (!t?.id) return;
    setSelectedTemplateId(t.id);
    setSelectedTemplateIdx(String(idx));
  }, [templates, value, normalizeHtml]);

  const openSaveDialog = () => {
    setPendingHtml(value || "");
    setTemplateName(selectedTemplate?.name || suggestedName);
    setIsSaveOpen(true);
  };

  const saveNew = async (name: string, html: string) => {
    const { data, error } = await supabase
      .from("estimate_text_templates")
      .insert({
        name: name.trim(),
        html,
        scope,
      } as Database["public"]["Tables"]["estimate_text_templates"]["Insert"])
      .select("id,name,html")
      .single();

    if (error) {
      console.error("Failed to save template", error);
      toast({ title: "Failed to save template", description: error.message, variant: "destructive" });
      return;
    }

    const inserted = data as Partial<TextTemplate> | null;
    setTemplates((prev) => [
      ...prev,
      {
        id: inserted?.id || crypto.randomUUID(),
        name: inserted?.name || name.trim(),
        html: inserted?.html || html,
      },
    ]);
    toast({ title: "Template saved", description: "Added to your templates." });
  };

  const updateExisting = async (id: string, html: string, name?: string): Promise<boolean> => {
    const payload: Database["public"]["Tables"]["estimate_text_templates"]["Update"] = name?.trim()
      ? { html, name: name.trim() }
      : { html };
    const { error } = await supabase.from("estimate_text_templates").update(payload).eq("id", id);
    if (error) {
      console.error("Failed to update template", error);
      toast({ title: "Failed to update template", description: error.message, variant: "destructive" });
      return false;
    }

    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, html, ...(name?.trim() ? { name: name.trim() } : {}) } : t))
    );
    toast({ title: "Template updated", description: "Your changes were saved." });
    return true;
  };

  const openManageDialog = () => {
    const initialId =
      (selectedTemplateId && templates.some((t) => t.id === selectedTemplateId) ? selectedTemplateId : null) ||
      templates[0]?.id ||
      null;

    const initial = initialId ? templates.find((t) => t.id === initialId) : null;

    setManageMode("view");
    setManageSelectedId(initialId);
    setManageName(initial?.name || "");
    setManageHtml(initial?.html || "");
    setIsManageOpen(true);
  };

  const selectForManage = (id: string, mode: "view" | "edit") => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setManageSelectedId(id);
    setManageMode(mode);
    setManageName(t.name || "");
    setManageHtml(t.html || "");
  };

  const saveManageUpdate = async () => {
    if (!manageSelectedId) return;
    if (!manageName.trim()) {
      toast({ title: "Name required", description: "Please enter a template name.", variant: "destructive" });
      return;
    }

    const ok = await updateExisting(manageSelectedId, manageHtml, manageName);
    if (!ok) return;

    // Keep the current editor field in sync if this is the currently selected template.
    if (manageSelectedId === selectedTemplateId) {
      onChange(manageHtml || "");
    }

    onAfterUpdate?.();
    setManageMode("view");
  };

  const deleteManageTemplate = async (id: string) => {
    const remaining = templates.filter((t) => t.id !== id);
    if (!window.confirm("Are you sure you want to delete this template?")) return;

    const { error } = await supabase.from("estimate_text_templates").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete template", error);
      toast({ title: "Failed to delete template", description: error.message, variant: "destructive" });
      return;
    }

    setTemplates((prev) => prev.filter((t) => t.id !== id));

    if (selectedTemplateId === id) {
      setSelectedTemplateId(null);
      setSelectedTemplateIdx("");
      onChange("");
      onAfterUpdate?.();
    }

    if (manageSelectedId === id) {
      const next = remaining[0] || null;
      setManageSelectedId(next?.id || null);
      setManageMode("view");
      setManageName(next?.name || "");
      setManageHtml(next?.html || "");
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Button type="button" variant="outline" size="sm" onClick={openSaveDialog} disabled={disabled}>
        Save Template
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={openManageDialog} disabled={disabled}>
        Manage Templates
      </Button>
      <Select
        value={selectedTemplateIdx}
        onValueChange={(idx) => {
          const t = templates[Number(idx)];
          if (!t) return;
          if (confirmOnLoad && value && value !== t.html) {
            if (!window.confirm("Are you sure you want to use this template?")) return;
          }
          setSelectedTemplateId(t.id);
          setSelectedTemplateIdx(String(idx));
          onChange(t.html || "");
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Load template" />
        </SelectTrigger>
        <SelectContent className="z-50 bg-background">
          {templates.length === 0 ? (
            <SelectItem value="__none__" disabled>
              No templates
            </SelectItem>
          ) : (
            templates.map((t, i) => (
              <SelectItem key={t.id || i} value={String(i)}>
                {t.name || `Template ${i + 1}`}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Save template</DialogTitle>
            <DialogDescription>Enter template name and choose how to save.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor={`template-name-${scope}`} className="text-sm font-medium">
                Template name
              </Label>
              <Input
                id={`template-name-${scope}`}
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder={suggestedName}
                className="w-full min-w-0"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={!selectedTemplateId}
                onClick={async () => {
                  if (!selectedTemplateId) return;
                  if (!templateName.trim()) {
                    toast({
                      title: "Name required",
                      description: "Please enter a template name.",
                      variant: "destructive",
                    });
                    return;
                  }
                  const ok = await updateExisting(selectedTemplateId, pendingHtml, templateName);
                  setIsSaveOpen(false);
                  if (ok) onAfterUpdate?.();
                }}
              >
                Update template
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={async () => {
                  if (!templateName.trim()) {
                    toast({
                      title: "Name required",
                      description: "Please enter a template name.",
                      variant: "destructive",
                    });
                    return;
                  }
                  await saveNew(templateName.trim(), pendingHtml);
                  setIsSaveOpen(false);
                }}
              >
                Save as new
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="sm:max-w-[980px]">
          <DialogHeader>
            <DialogTitle>Templates</DialogTitle>
            <DialogDescription>View, update, or delete templates for this scope.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6 py-2">
            <div className="min-w-0">
              <div className="flex items-center justify-between mb-3">
                <Label className="font-medium">Template list</Label>
                <span className="text-xs text-muted-foreground">{templates.length} total</span>
              </div>

              <ScrollArea className="h-[520px] pr-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[160px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2}>
                          <div className="text-sm text-muted-foreground">No templates for this scope.</div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      templates.map((t) => {
                        const isSelected = t.id === manageSelectedId;
                        return (
                          <TableRow key={t.id} className={isSelected ? "bg-muted/50" : undefined}>
                            <TableCell className="align-middle">
                              <button
                                type="button"
                                className="text-left hover:underline"
                                onClick={() => selectForManage(t.id, "view")}
                              >
                                {t.name || "(Untitled)"}
                              </button>
                            </TableCell>
                            <TableCell className="align-middle">
                              <div className="flex items-center gap-1 justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => selectForManage(t.id, "view")}
                                  className={isSelected && manageMode === "view" ? "bg-muted" : undefined}
                                  aria-label="View template"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => selectForManage(t.id, "edit")}
                                  className={isSelected && manageMode === "edit" ? "bg-muted" : undefined}
                                  aria-label="Update template"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteManageTemplate(t.id)}
                                  aria-label="Delete template"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            <div className="min-w-0 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Scope (read-only)</Label>
                <Input value={scope} disabled className="w-full" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Template name</Label>
                <Input
                  value={manageName}
                  onChange={(e) => setManageName(e.target.value)}
                  disabled={manageMode === "view"}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Content</Label>
                {manageSelectedId ? (
                  editorType === "textarea" ? (
                    <Textarea
                      value={manageHtml}
                      disabled={manageMode === "view"}
                      onChange={(e) => setManageHtml(e.target.value)}
                      className="min-h-[220px]"
                    />
                  ) : (
                    <div className={manageMode === "view" ? "pointer-events-none opacity-60" : undefined}>
                      <RichTextEditor
                        value={manageHtml}
                        onChange={manageMode === "view" ? undefined : (html) => setManageHtml(html)}
                        compact
                      />
                    </div>
                  )
                ) : (
                  <div className="text-sm text-muted-foreground">Select a template to view or edit.</div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                {manageMode === "edit" && (
                  <Button type="button" variant="outline" onClick={saveManageUpdate} disabled={!manageSelectedId}>
                    Save changes
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => setIsManageOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

