import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Pencil, Search, Trash2 } from "lucide-react";
import RichTextEditor from "@/components/ui/rich-text-editor";
import { toast } from "sonner";

type TextTemplateRow = Pick<
  Database["public"]["Tables"]["estimate_text_templates"]["Row"],
  "id" | "name" | "html" | "scope"
>;

type EditorType = "textarea" | "richtext";

function inferEditorTypeFromScope(scope: string): EditorType {
  const s = (scope || "").toLowerCase();
  // Known scopes produced by `buildTemplateScope()` in the editors
  if (s.includes("textarea")) return "textarea";
  if (s.includes("richtext")) return "richtext";
  // Fallback: rich editor usually produces the same HTML stored in Supabase.
  return "richtext";
}

const TemplatesSettings = () => {
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TextTemplateRow[]>([]);

  const [query, setQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);

  const [selected, setSelected] = useState<TextTemplateRow | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftHtml, setDraftHtml] = useState("");

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => {
      return (
        (t.name || "").toLowerCase().includes(q) ||
        (t.scope || "").toLowerCase().includes(q)
      );
    });
  }, [templates, query]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("estimate_text_templates")
          .select("id,name,html,scope")
          .order("created_at", { ascending: true });

        if (cancelled) return;

        if (error) throw error;

        setTemplates(
          (data || []).map((t) => ({
            id: t.id,
            name: t.name || "",
            html: t.html || "",
            scope: t.scope || "",
          })),
        );
      } catch (err) {
        toast.error("Failed to load templates: " + (err instanceof Error ? err.message : String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openEdit = (t: TextTemplateRow) => {
    setSelected(t);
    setDraftName(t.name || "");
    setDraftHtml(t.html || "");
    setDialogOpen(true);
  };

  const updateTemplate = async () => {
    if (!selected || isUpdating) return;
    const trimmed = draftName.trim();
    if (!trimmed) {
      toast.error("Template name is required");
      return;
    }

    try {
      setIsUpdating(true);
      const payload: Database["public"]["Tables"]["estimate_text_templates"]["Update"] = {
        name: trimmed,
        html: draftHtml || "",
      };

      const { error } = await supabase
        .from("estimate_text_templates")
        .update(payload)
        .eq("id", selected.id);

      if (error) throw error;

      const next = templates.map((t) =>
        t.id === selected.id ? { ...t, name: trimmed, html: draftHtml } : t,
      );
      setTemplates(next);
      setDialogOpen(false);
      setSelected(null);
      toast.success("Template updated");
    } catch (err) {
      toast.error("Failed to update template: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (deletingTemplateId) return;
    if (!window.confirm("Are you sure you want to delete this template?")) return;

    try {
      setDeletingTemplateId(id);
      const { error } = await supabase
        .from("estimate_text_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setTemplates((prev) => prev.filter((t) => t.id !== id));

      if (selected?.id === id) {
        setDialogOpen(false);
        setSelected(null);
      }

      toast.success("Template deleted");
    } catch (err) {
      toast.error("Failed to delete template: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeletingTemplateId(null);
    }
  };

  const editorType: EditorType = selected ? inferEditorTypeFromScope(selected.scope) : "richtext";
  const getContentPreview = (html: string) => {
    const plain = (html || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!plain) return "—";
    return plain.length > 80 ? `${plain.slice(0, 80)}...` : plain;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Templates</CardTitle>
        <CardDescription>
          Manage template content used across estimate editors (view, update, delete).
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or scope..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <ScrollArea className="h-[520px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template name</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead className="w-[200px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Loading templates...
                    </TableCell>
                  </TableRow>
                ) : filteredTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <div className="py-6 text-sm text-muted-foreground">
                        No templates found.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name || "(Untitled)"}</TableCell>
                      <TableCell className="max-w-[280px]">
                        <span className="block truncate text-sm text-muted-foreground" title={getContentPreview(t.html || "")}>
                          {getContentPreview(t.html || "")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded break-all text-muted-foreground">
                          {t.scope}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 justify-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Update template"
                            onClick={() => openEdit(t)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Delete template"
                            disabled={Boolean(deletingTemplateId)}
                            onClick={() => deleteTemplate(t.id)}
                          >
                            {deletingTemplateId === t.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit template</DialogTitle>
            <DialogDescription>
              Scope is read-only. Edit content and save changes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Template name</Label>
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Scope (read-only)</Label>
              <Input value={selected?.scope || ""} disabled />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Content</Label>
              {editorType === "textarea" ? (
                <Textarea
                  value={draftHtml}
                  onChange={(e) => setDraftHtml(e.target.value)}
                  className="min-h-[180px] font-mono text-xs"
                />
              ) : (
                <div>
                  <RichTextEditor
                    value={draftHtml}
                    onChange={(html) => setDraftHtml(html)}
                    compact
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={updateTemplate} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TemplatesSettings;

