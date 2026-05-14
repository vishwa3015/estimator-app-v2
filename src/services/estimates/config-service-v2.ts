import { supabase } from "@/integrations/supabase/client";
import { locationService } from "./location-service";
import type { Json } from "@/integrations/supabase/types";
import type {
  SectionConfig,
  EstimateConfigData,
  ComponentConfig,
  ValidationRuleConfig,
} from "@/types/estimate-items";


export interface EstimateConfigV2 {
  id: string;
  user_id: string | null;
  location_id: string | null;
  config_name: string;
  config_data: EstimateConfigData;
  form_values: Record<string, unknown> | null;
  show_material_data_entry: boolean;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldType {
  id: string;
  user_id: string;
  field_type_name: string;
  component_config: ComponentConfig;
  validation_schema: ValidationRuleConfig;
  created_at: string;
  updated_at: string;
}

export interface ValidationRule {
  id: string;
  user_id: string;
  rule_name: string;
  rule_function: string;
  rule_message_template: string;
  created_at: string;
  updated_at: string;
}

export const configServiceV2 = {
  // Get current user ID
  getCurrentUserId: async (): Promise<string | null> => {
    try {
      return await locationService.getLocationContext()
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  // Get user's active configuration
  getActiveConfig: async (): Promise<EstimateConfigV2 | null> => {
    try {
      const userId = await configServiceV2.getCurrentUserId();
      if (!userId) return null;

      const { data, error } = await supabase
        .from('estimate_configurations_v2')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching active config:', error);
        return null;
      }

      return data as EstimateConfigV2 | null;
    } catch (error) {
      console.error('Error in getActiveConfig:', error);
      return null;
    }
  },

  // Get or create default configuration
  getOrCreateDefaultConfig: async (): Promise<EstimateConfigV2> => {
    try {
      // First try to get existing active config
      let config = await configServiceV2.getActiveConfig();
      
      if (!config) {
        // Get current user ID
        const userId = await configServiceV2.getCurrentUserId();
        if (!userId) {
          throw new Error('User not authenticated');
        }

        const defaultConfigData: EstimateConfigData = await import(
          "@/configs/estimatesEditorConfig.js"
        ).then((m) => m.default as EstimateConfigData);

        const { data, error } = await supabase
          .from('estimate_configurations_v2')
          .insert({
            user_id: userId,
            config_name: "Default Configuration",
            config_data: defaultConfigData as unknown as Json,
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        config = data as EstimateConfigV2;
      }

      return config;
    } catch (error) {
      console.error('Error in getOrCreateDefaultConfig:', error);
      throw error;
    }
  },

  saveConfig: async (
    configData: EstimateConfigData,
    configName?: string
  ): Promise<EstimateConfigV2> => {
    try {
      const userId = await configServiceV2.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const existing = await configServiceV2.getActiveConfig();

      if (existing) {
        const { data, error } = await supabase
          .from("estimate_configurations_v2")
          .update({
            config_name: configName ?? existing.config_name,
            config_data: configData as unknown as Json,
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data as EstimateConfigV2;
      }

      const { data, error } = await supabase
        .from("estimate_configurations_v2")
        .insert({
          user_id: userId,
          config_name: configName ?? "Default Configuration",
          config_data: configData as unknown as Json,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      return data as EstimateConfigV2;
    } catch (error) {
      console.error("Error in saveConfig:", error);
      throw error;
    }
  },

  getAllConfigs: async (): Promise<EstimateConfigV2[]> => {
    try {
      const userId = await configServiceV2.getCurrentUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from("estimate_configurations_v2")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data as EstimateConfigV2[]) ?? [];
    } catch (error) {
      console.error("Error in getAllConfigs:", error);
      return [];
    }
  },

  getCustomFieldTypes: async (): Promise<CustomFieldType[]> => {
    try {
      const userId = await configServiceV2.getCurrentUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from("custom_field_types_v2")
        .select("*")
        .eq("user_id", userId)
        .order("field_type_name");

      if (error) throw error;

      return (data as unknown as CustomFieldType[]) ?? [];
    } catch (error) {
      console.error("Error fetching custom field types:", error);
      return [];
    }
  },

  saveCustomFieldType: async (
    fieldType: Omit<CustomFieldType, "id" | "user_id" | "created_at" | "updated_at">
  ): Promise<CustomFieldType> => {
    try {
      const userId = await configServiceV2.getCurrentUserId();
      if (!userId) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("custom_field_types_v2")
        .insert({
          field_type_name: fieldType.field_type_name,
          component_config: fieldType.component_config as unknown as Json,
          validation_schema: fieldType.validation_schema as unknown as Json,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      return data as unknown as CustomFieldType;
    } catch (error) {
      console.error("Error saving custom field type:", error);
      throw error;
    }
  },

  getValidationRules: async (): Promise<ValidationRule[]> => {
    try {
      const userId = await configServiceV2.getCurrentUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from("validation_rules_v2")
        .select("*")
        .eq("user_id", userId)
        .order("rule_name");

      if (error) throw error;

      return (data as ValidationRule[]) ?? [];
    } catch (error) {
      console.error("Error fetching validation rules:", error);
      return [];
    }
  },

  saveValidationRule: async (
    rule: Omit<ValidationRule, "id" | "user_id" | "created_at" | "updated_at">
  ): Promise<ValidationRule> => {
    try {
      const userId = await configServiceV2.getCurrentUserId();
      if (!userId) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("validation_rules_v2")
        .insert({ ...rule, user_id: userId })
        .select()
        .single();

      if (error) throw error;

      return data as ValidationRule;
    } catch (error) {
      console.error("Error saving validation rule:", error);
      throw error;
    }
  },
};