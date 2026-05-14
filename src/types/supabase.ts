
import { PostgrestError } from "@supabase/supabase-js";

// Define the typedSupabaseQuery function to help with type safety
export function typedSupabaseQuery<T>(query: Promise<T>): Promise<T> {
  return query as Promise<T>;
}

// Define a helper type for typed database operations
export interface Database {
  public: {
    Tables: {
      estimates: {
        Row: {
          id: string;
          location_id: string;
          opportunity_id: string;
          type: string;
          category: string;
          amount: number;
          notes: string;
          payment_method: string;
          sales_person_id?: string;
          description: string;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id: string;
          location_id: string;
          opportunity_id: string;
          type: string;
          category: string;
          amount: number;
          notes?: string;
          payment_method: string;
          sales_person_id?: string;
          description: string;
          created_at?: string;
          created_by?: string;
        };
        Update: {
          id?: string;
          location_id?: string;
          opportunity_id?: string;
          type?: string;
          category?: string;
          amount?: number;
          notes?: string;
          payment_method?: string;
          sales_person_id?: string;
          description?: string;
          created_at?: string;
          created_by?: string;
        };
      };
      estimate_documents: {
        Row: {
          id: string;
          location_id: string;
          opportunity_id: string;
          contact_id?: string;
          title: string;
          number: string;
          status: string;
          date: string;
          expiration_date?: string;
          subtotal: number;
          tax_rate: number;
          tax_amount: number;
          total: number;
          payload: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          location_id: string;
          opportunity_id: string;
          contact_id?: string;
          title?: string;
          number?: string;
          status?: string;
          date?: string;
          expiration_date?: string;
          subtotal?: number;
          tax_rate?: number;
          tax_amount?: number;
          total?: number;
          payload: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          location_id?: string;
          opportunity_id?: string;
          contact_id?: string;
          title?: string;
          number?: string;
          status?: string;
          date?: string;
          expiration_date?: string;
          subtotal?: number;
          tax_rate?: number;
          tax_amount?: number;
          total?: number;
          payload: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
      };
      estimate_sections: {
        Row: {
          id: string;
          estimate_id: string;
          section_type: string;
          title: string;
          enabled: boolean;
          section_order: number;
          custom_page_data?: Record<string, unknown>;
          file_storage_path?: string;
          file_name?: string;
          file_size?: number;
          file_type?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          estimate_id: string;
          section_type: string;
          title: string;
          enabled?: boolean;
          section_order: number;
          custom_page_data?: Record<string, unknown>;
          file_storage_path?: string;
          file_name?: string;
          file_size?: number;
          file_type?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          estimate_id?: string;
          section_type?: string;
          title?: string;
          enabled?: boolean;
          section_order?: number;
          custom_page_data?: Record<string, unknown>;
          file_storage_path?: string;
          file_name?: string;
          file_size?: number;
          file_type?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      estimate_text_templates: {
        Row: {
          id: string;
          name: string;
          html: string;
          scope: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          html: string;
          scope: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          html?: string;
          scope?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      financial_report_view: {
        Row: {
          id: string;
          location_id: string;
          opportunity_id: string;
          type: string;
          category: string;
          amount: number;
          notes?: string;
          payment_method: string;
          sales_person_id?: string;
          description: string;
          created_at: string;
          created_by?: string;
          date?: string;
          expense_item_count?: number;
          total_expenses?: number;
          expenses_by_type?: Record<string, number>;
        };
      };
    };
    Functions: {
      set_location_config: {
        Args: {
          loc_id: string;
        };
        Returns: void;
      };
    };
  };

  product_suppliers_v2: {
    Row: {
      id: string;
      name: string;
      contact_name: string | null;
      email: string | null;
      phone: string | null;
      location_id: string | null;
      is_active: boolean;
      description: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      name: string;
      contact_name?: string | null;
      email?: string | null;
      phone?: string | null;
      location_id?: string | null;
      is_active?: boolean;
      description?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      name?: string;
      contact_name?: string | null;
      email?: string | null;
      phone?: string | null;
      location_id?: string | null;
      is_active?: boolean;
      description?: string | null;
      created_at?: string;
      updated_at?: string;
    };
  };
}