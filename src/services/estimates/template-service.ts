// src/services/templates/template-service.ts

import { supabase } from "@/integrations/supabase/client";

export interface EstimateTemplate {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  renderer_key: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LocationTemplatePreference {
  id: string;
  location_id: string;
  default_template_id: string | null;
  created_at: string;
  updated_at: string;
}

interface DocumentWithTemplate {
  template_id: string | null;
  estimate_templates: { renderer_key: string } | null;
}

export const templateService = {
  // Get all templates

  async getTemplates(locationId?: string): Promise<EstimateTemplate[]> {
    try {
      let query = supabase
        .from("estimate_templates")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (locationId) {
        query = query.or(`location_id.is.null,location_id.eq.${locationId}`);
      } else {
        query = query.is("location_id", null);
      }

      const { data, error } = await query;
      if (error) throw new Error(`Failed to fetch templates: ${error.message}`);
      return (data as EstimateTemplate[]) ?? [];
    } catch (error) {
      console.error("Error fetching templates:", error);
      return [];
    }
  },

  // Save upsert template
  async saveTemplate(template: Partial<EstimateTemplate>): Promise<EstimateTemplate> {
    try {
      const payload: Partial<EstimateTemplate> = {
        ...template,
        updated_at: new Date().toISOString(),
      };

      if (!template.id) {
        delete payload.id;
        payload.created_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from("estimate_templates")
        .upsert(payload as unknown as EstimateTemplate, { onConflict: "id" })
        .select()
        .single();

      if (error) throw new Error(`Failed to save template: ${error.message}`);
      return data as EstimateTemplate;
    } catch (error) {
      console.error("Error saving template:", error);
      throw error;
    }
  },

  async getTemplateByRendererKey(rendererKey: string): Promise<EstimateTemplate | null> {
    const { data, error } = await supabase
      .from("estimate_templates")
      .select("*")
      .eq("renderer_key", rendererKey)
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // not found
      throw new Error(`Failed to fetch template: ${error.message}`);
    }
    return data as EstimateTemplate;
  },

  async getTemplateById(id: string): Promise<EstimateTemplate | null> {
    const { data, error } = await supabase
      .from("estimate_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch template: ${error.message}`);
    }
    return data as EstimateTemplate;
  },


  async getLocationPreference(locationId: string): Promise<LocationTemplatePreference | null> {
    const { data, error } = await supabase
      .from("location_template_preferences")
      .select("*")
      .eq("location_id", locationId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // no row yet
      throw new Error(`Failed to fetch location preference: ${error.message}`);
    }
    return data as LocationTemplatePreference;
  },

  async getDefaultTemplateForLocation(locationId: string): Promise<EstimateTemplate | null> {
    const pref = await this.getLocationPreference(locationId);

    if (!pref?.default_template_id) {
      return this.getTemplateByRendererKey("standard");
    }

    return this.getTemplateById(pref.default_template_id);
  },

  async setDefaultTemplateForLocation(locationId: string, templateId: string): Promise<void> {
    const { error } = await supabase
      .from("location_template_preferences")
      .upsert(
        {
          location_id: locationId,
          default_template_id: templateId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "location_id" }
      );

    if (error) throw new Error(`Failed to set default template: ${error.message}`);
  },


  async getRendererKeyForDocument(documentId: string): Promise<string> {
    const { data, error } = await supabase
      .from("estimate_documents_v2")
      .select("template_id, estimate_templates(renderer_key)")
      .eq("id", documentId)
      .single();

    if (error || !data) return "standard";

    const rendererKey = (data as DocumentWithTemplate)?.estimate_templates?.renderer_key;
    return rendererKey ?? "standard";
  },
};