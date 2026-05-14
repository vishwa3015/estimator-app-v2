import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RichTextEditor from "@/components/ui/rich-text-editor";
import { EstimateDocument } from "@/types/estimate-items";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Database } from "@/integrations/supabase/types";
interface IntroductionEditorProps {
  estimate: EstimateDocument;
  setEstimate: React.Dispatch<React.SetStateAction<EstimateDocument>>;
}

const IntroductionEditor: React.FC<IntroductionEditorProps> = ({ estimate, setEstimate }) => {
  const [templates, setTemplates] = React.useState<string[]>([]);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = React.useState<string>("");
  const { toast } = useToast();

  React.useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('estimate_text_templates')
        .select('html')
        .eq('scope', 'introduction')
        .order('created_at', { ascending: true });
      if (error) {
        console.warn('Failed to load intro templates', error);
        toast({ title: 'Could not load templates', description: error.message, variant: 'destructive' });
        return;
      }
      setTemplates((data || []).map((t: Database['public']['Tables']['estimate_text_templates']['Row']) => t.html || ''));
    };
    load();
  }, [toast]);

  const handleSaveTemplate = async () => {
    const html = estimate.introductionRichText || "";
    const name = `Intro Template ${templates.length + 1}`;
    const { error } = await supabase
      .from('estimate_text_templates')
      .insert({ 
        name, 
        html, 
        scope: 'introduction'
      } as Database['public']['Tables']['estimate_text_templates']['Insert']);
    if (error) {
      toast({ title: 'Failed to save template', description: error.message, variant: 'destructive' });
      return;
    }
    setTemplates(prev => [...prev, html]);
    toast({ title: 'Template saved', description: 'Added to your templates.' });
  };

  const handleLoadTemplate = (indexStr: string) => {
    setSelectedTemplateIndex(indexStr);
    const idx = parseInt(indexStr, 10);
    if (!Number.isNaN(idx) && templates[idx]) {
      setEstimate(prev => ({ ...prev, introductionRichText: templates[idx] }));
    }
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0">
        <CardTitle>Introduction</CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-3">
        <div className="flex gap-2 items-center">
          <Button type="button" variant="outline" onClick={handleSaveTemplate}>Save as Template</Button>
          <Select value={selectedTemplateIndex} onValueChange={handleLoadTemplate}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Load template" />
            </SelectTrigger>
            <SelectContent className="z-50 bg-background">
              {templates.length === 0 ? (
                <SelectItem value="__none__" disabled>No templates saved</SelectItem>
              ) : templates.map((_, i) => (
                <SelectItem key={i} value={String(i)}>Template {i + 1}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <RichTextEditor
          value={estimate.introductionRichText || ""}
          onChange={(html) => setEstimate(prev => ({ ...prev, introductionRichText: html }))}
        />
      </CardContent>
    </Card>
  );
};

export default IntroductionEditor;
