-- Create estimate documents v2 table for storing estimate data
CREATE TABLE IF NOT EXISTS public.estimate_documents_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID,
    location_id TEXT NOT NULL,
    config_id UUID,
    form_data JSONB NOT NULL DEFAULT '{}',
    config_data JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft',
    opportunity_id TEXT NOT NULL,
    contact_id TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP
    WITH
        TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE NOT NULL DEFAULT now()
);

-- Migration: add lookup function for QM webhook
CREATE OR REPLACE FUNCTION find_estimate_by_qm_order(
  p_gaf_order_number TEXT,
  p_subscriber_order_number TEXT DEFAULT NULL
)
RETURNS TABLE(id UUID, location_id TEXT, contact_id TEXT, form_data JSONB)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, location_id, contact_id, form_data
  FROM estimate_documents_v2
  WHERE
    -- Primary: match by GAF order number (handles both string and numeric storage)
    (
      form_data->'4'->>'quickmeasure_gaf_order_number' = p_gaf_order_number
      OR (form_data->'4'->'quickmeasure_gaf_order_number')::text = p_gaf_order_number
    )
  UNION ALL
  SELECT id, location_id, contact_id, form_data
  FROM estimate_documents_v2
  WHERE
    -- Fallback: match by subscriber order number
    p_subscriber_order_number IS NOT NULL
    AND form_data->'4'->>'quickmeasure_subscriber_order_number' = p_subscriber_order_number
    AND NOT (
      form_data->'4'->>'quickmeasure_gaf_order_number' = p_gaf_order_number
      OR (form_data->'4'->'quickmeasure_gaf_order_number')::text = p_gaf_order_number
    )
  LIMIT 1;
$$;

-- Create estimate form sections v2 table for storing section data per estimate
CREATE TABLE IF NOT EXISTS public.estimate_form_sections_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    document_id UUID NOT NULL,
    section_id TEXT NOT NULL,
    section_data JSONB NOT NULL DEFAULT '{}',
    sort_order INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP
    WITH
        TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.estimate_documents_v2 ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.estimate_form_sections_v2 ENABLE ROW LEVEL SECURITY;

-- Create policies for estimate_documents_v2
CREATE POLICY "Users can manage their own estimate documents" ON public.estimate_documents_v2 FOR ALL USING (
    location_id = get_current_location_id ()
);

-- Create policies for estimate_form_sections_v2
CREATE POLICY "Users can manage sections of their own estimates" ON public.estimate_form_sections_v2 FOR ALL USING (
    document_id IN (
        SELECT id
        FROM estimate_documents_v2
        WHERE
            location_id = get_current_location_id ()
    )
);

-- Add triggers for updated_at
CREATE TRIGGER update_estimate_documents_v2_updated_at
  BEFORE UPDATE ON public.estimate_documents_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_estimate_form_sections_v2_updated_at
  BEFORE UPDATE ON public.estimate_form_sections_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();