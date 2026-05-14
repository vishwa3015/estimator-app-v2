-- Create a dedicated table for full EstimateDocument persistence without altering existing tables
-- This table stores core queryable fields and a JSONB payload for all rich/new fields

CREATE TABLE IF NOT EXISTS public.estimate_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  opportunity_id text NOT NULL,
  contact_id text,
  title text NOT NULL DEFAULT '',
  number text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  date timestamptz NOT NULL DEFAULT now(),
  expiration_date timestamptz,

  subtotal numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,

  -- Flexible container for all newly added nested fields (images, sections, custom pages, etc.)
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.estimate_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies following existing location scoping conventions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'estimate_documents' AND policyname = 'estimate_documents_select_policy'
  ) THEN
    CREATE POLICY "estimate_documents_select_policy"
    ON public.estimate_documents
    FOR SELECT
    USING (location_id = public.get_current_location_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'estimate_documents' AND policyname = 'estimate_documents_insert_policy'
  ) THEN
    CREATE POLICY "estimate_documents_insert_policy"
    ON public.estimate_documents
    FOR INSERT
    WITH CHECK (location_id = public.get_current_location_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'estimate_documents' AND policyname = 'estimate_documents_update_policy'
  ) THEN
    CREATE POLICY "estimate_documents_update_policy"
    ON public.estimate_documents
    FOR UPDATE
    USING (location_id = public.get_current_location_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'estimate_documents' AND policyname = 'estimate_documents_delete_policy'
  ) THEN
    CREATE POLICY "estimate_documents_delete_policy"
    ON public.estimate_documents
    FOR DELETE
    USING (location_id = public.get_current_location_id());
  END IF;
END $$;

-- Update timestamp trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_estimate_documents_updated_at'
  ) THEN
    CREATE TRIGGER update_estimate_documents_updated_at
    BEFORE UPDATE ON public.estimate_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_estimate_documents_opportunity_id ON public.estimate_documents (opportunity_id);
CREATE INDEX IF NOT EXISTS idx_estimate_documents_contact_id ON public.estimate_documents (contact_id);
CREATE INDEX IF NOT EXISTS idx_estimate_documents_status ON public.estimate_documents (status);
CREATE INDEX IF NOT EXISTS idx_estimate_documents_date ON public.estimate_documents (date);
CREATE INDEX IF NOT EXISTS idx_estimate_documents_payload ON public.estimate_documents USING GIN (payload);
