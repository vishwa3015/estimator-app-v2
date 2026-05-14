-- Create table for estimate sections with sorting
CREATE TABLE IF NOT EXISTS public.estimate_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimate_documents(id) ON DELETE CASCADE,
  section_type text NOT NULL,
  title text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  section_order integer NOT NULL,
  custom_page_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure unique order per estimate
  UNIQUE(estimate_id, section_order)
);

-- Enable RLS
ALTER TABLE public.estimate_sections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "estimate_sections_select_policy"
ON public.estimate_sections
FOR SELECT
USING (
  estimate_id IN (
    SELECT id FROM public.estimate_documents 
    WHERE location_id = public.get_current_location_id()
  )
);

CREATE POLICY "estimate_sections_insert_policy"
ON public.estimate_sections
FOR INSERT
WITH CHECK (
  estimate_id IN (
    SELECT id FROM public.estimate_documents 
    WHERE location_id = public.get_current_location_id()
  )
);

CREATE POLICY "estimate_sections_update_policy"
ON public.estimate_sections
FOR UPDATE
USING (
  estimate_id IN (
    SELECT id FROM public.estimate_documents 
    WHERE location_id = public.get_current_location_id()
  )
);

CREATE POLICY "estimate_sections_delete_policy"
ON public.estimate_sections
FOR DELETE
USING (
  estimate_id IN (
    SELECT id FROM public.estimate_documents 
    WHERE location_id = public.get_current_location_id()
  )
);

-- Update timestamp trigger
CREATE TRIGGER update_estimate_sections_updated_at
BEFORE UPDATE ON public.estimate_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_estimate_sections_estimate_id ON public.estimate_sections (estimate_id);
CREATE INDEX idx_estimate_sections_order ON public.estimate_sections (estimate_id, section_order);
CREATE INDEX idx_estimate_sections_type ON public.estimate_sections (section_type);
