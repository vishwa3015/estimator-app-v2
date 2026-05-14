import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { FormValues, SectionConfig, EstimateConfigData } from "@/types/estimate-items";

export interface SaveEstimateOptions {
  formValues: FormValues;
  sectionUpdates: SectionConfig[];
  opportunityId: string;
  contactId?: string;
  configId?: string;
  title?: string;
  estimateId?: string;
  templateId?: string;
  selectedOpportunityId?: string;
  locationId?: string;
}

export interface SavedEstimate {
  id: string;
  template_id: string | null;
  renderer_key: string | null;
  config_data: EstimateConfigData | null;
  form_data: FormValues | null;
  opportunity_id: string;
  selected_opportunity_id: string | null;
  locationId?: string | null;
  contact_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface EstimateV2QueryResult {
  id: string;
  template_id: string | null;
  form_data: Json;
  config_data: Json | null;
  opportunity_id: string;
  selected_opportunity_id: string | null;
  contact_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  estimate_templates: { renderer_key: string | null; name?: string } | null;
}

export const estimateServiceV2 = {

  async saveEstimate({
    formValues,
    sectionUpdates,
    opportunityId,
    contactId,
    configId,
    title,
    estimateId,
    templateId,
    selectedOpportunityId,
     locationId,
  }: SaveEstimateOptions): Promise<SavedEstimate> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("User not authenticated");

    let resolvedConfigId = configId;
    if (!resolvedConfigId) {
      const { data: configs, error: configError } = await supabase
        .from("estimate_configurations_v2")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (configError) throw new Error(`Failed to fetch config: ${configError.message}`);
      resolvedConfigId = configs?.[0]?.id;
      if (!resolvedConfigId) throw new Error("No active estimate configuration found");
    }

    const estimateTitle =
      title || formValues?.["1"]?.report_type || "New Estimate";

    if (estimateId) {

      const { data, error } = await supabase
        .from("estimate_documents_v2")
        .update({
          form_data: formValues as unknown as Json,
          config_data: { sections: sectionUpdates, title: estimateTitle } as unknown as Json,
          updated_at: new Date().toISOString(),
          selected_opportunity_id: selectedOpportunityId ?? null,
        })
        .eq("id", estimateId)
        .select(`
          id,
          template_id,
          form_data,
          config_data,
          opportunity_id,
          selected_opportunity_id,
          contact_id,
          status,
          created_at,
          updated_at,
          estimate_templates (
            renderer_key
          )
        `)
        .single();

      if (error) throw new Error(`Failed to update estimate: ${error.message}`);

      const typedUpdate = data as unknown as EstimateV2QueryResult;
      return {
        ...typedUpdate,
        renderer_key: typedUpdate.estimate_templates?.renderer_key ?? null,
      } as unknown as SavedEstimate;
    }

    const insertPayload: {
      user_id: string;
      config_id: string;
      opportunity_id: string;
      contact_id: string | null;
      location_id: string | null;
      form_data: Json;
      config_data: Json;
      status: string;
      selected_opportunity_id: string | null;
      template_id?: string;
    } = {
      user_id: user.id,
      config_id: resolvedConfigId,
      opportunity_id: opportunityId,
      contact_id: contactId ?? null,
      location_id: locationId ?? null,
      form_data: formValues as unknown as Json,
      config_data: { sections: sectionUpdates, title: estimateTitle } as unknown as Json,
      status: "draft",
      selected_opportunity_id: selectedOpportunityId ?? null,
    };

    if (templateId) {
      insertPayload.template_id = templateId;
    }

    const { data, error } = await supabase
      .from("estimate_documents_v2")
      .insert(insertPayload)
      .select(`
        id,
        template_id,
        form_data,
        config_data,
        opportunity_id,
        contact_id,
        status,
        selected_opportunity_id,
        created_at,
        updated_at,
        estimate_templates (
          renderer_key
        )
      `)
      .single();

    if (error) throw new Error(`Failed to create estimate: ${error.message}`);

    const typedData = data as unknown as EstimateV2QueryResult;
    return {
      ...data,
      renderer_key: typedData.estimate_templates?.renderer_key ?? null,
    } as unknown as SavedEstimate;
  },

  async getEstimate(estimateId: string): Promise<SavedEstimate | null> {
    const { data, error } = await supabase
      .from("estimate_documents_v2")
      .select(`
        id,
        template_id,
        form_data,
        config_data,
        opportunity_id,
        selected_opportunity_id,
        contact_id,
        status,
        created_at,
        updated_at,
        estimate_templates (
          renderer_key
        )
      `)
      .eq("id", estimateId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch estimate: ${error.message}`);
    }

    const typedData = data as unknown as EstimateV2QueryResult;
    return {
      ...data,
      renderer_key: typedData.estimate_templates?.renderer_key ?? null,
    } as unknown as SavedEstimate;
  },

  async getEstimatesForOpportunity(opportunityId: string): Promise<SavedEstimate[]> {
    const { data, error } = await supabase
      .from("estimate_documents_v2")
      .select(`
        id,
        template_id,
        form_data,
        config_data,
        opportunity_id,
        contact_id,
        selected_opportunity_id,
        status,
        created_at,
        updated_at,
        estimate_templates (
          renderer_key,
          name
        )
      `)
      .eq("opportunity_id", opportunityId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch estimates: ${error.message}`);

    return (data ?? []).map((d) => {
      const row = d as unknown as EstimateV2QueryResult;
      return {
        ...d,
        renderer_key: row.estimate_templates?.renderer_key ?? null,
      } as unknown as SavedEstimate;
    });
  },


  async deleteEstimate(estimateId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Step 1: Get the estimate to access its data
      const { data: estimate, error: fetchError } = await supabase
        .from('estimate_documents_v2')
        .select('*')
        .eq('id', estimateId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch estimate: ${fetchError.message}`);
      }

      if (!estimate) {
        throw new Error('Estimate not found');
      }

      const filePaths: string[] = [];

      // Step 2: Collect all file paths from form_data
      const extractFilePaths = (obj: Record<string, unknown>, currentPath: string = '') => {
        if (!obj || typeof obj !== 'object') return;

        for (const key in obj) {
          const value = obj[key];

          // Check for file_storage_path property (uploaded files)
          if (key === 'file_storage_path' && typeof value === 'string' && value) {
            // Handle both relative paths and full URLs
            let filePath = value;

            // If it's a full Supabase URL, extract the path
            if (value.includes('supabase.co/storage/v1/object/public/')) {
              const match = value.match(/\/estimate-files\/(.+)$/);
              if (match) {
                filePath = `estimate-files/${match[1]}`;
              }
            } else {
              // It's a relative path, normalize it
              filePath = value.startsWith('/') ? value.substring(1) : value;
              // Ensure it has the estimate-files prefix if it's not already there
              if (!filePath.startsWith('estimate-files/')) {
                filePath = `estimate-files/${filePath}`;
              }
            }

            // Exclude files in PDF-Metadata folder
            if (!filePath.includes('/PDF-Metadata/')) {
              filePaths.push(filePath);
            }
          }
          // Also check if value is a storage URL string (legacy support)
          else if (typeof value === 'string' && value.includes('supabase.co/storage/v1/object/public/')) {
            const match = value.match(/\/estimate-files\/(.+)$/);
            if (match) {
              const filePath = `estimate-files/${match[1]}`;
              // Exclude files in PDF-Metadata folder
              if (!filePath.includes('/PDF-Metadata/')) {
                filePaths.push(filePath);
              }
            }
          }
          // Recurse into nested objects and arrays
          else if (typeof value === 'object' && value !== null) {
            extractFilePaths(value as Record<string, unknown>, currentPath ? `${currentPath}.${key}` : key);
          }
        }
      };

      if (estimate.form_data) {
        extractFilePaths(estimate.form_data as unknown as Record<string, unknown>);
      }

      // Step 3: Delete estimate PDF if it exists
      const estimatePdfPath = `estimate-files/estimates/${estimate.opportunity_id}/${estimateId}/${estimateId}-estimate.pdf`;
      filePaths.push(estimatePdfPath);

      // Step 4: Delete all files from storage
      await Promise.all(
        filePaths.map((filePath) =>
          supabase.storage
            .from('estimate-files')
            .remove([filePath.replace('estimate-files/', '')])
        )
      );

      const { error } = await supabase
        .from("estimate_documents_v2")
        .delete()
        .eq("id", estimateId);

      if (error) throw new Error(error.message);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("deleteEstimate error:", err);
      return { success: false, error: message };
    }
  }
};