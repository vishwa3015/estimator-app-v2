-- Create table for user-specific text templates used in Custom Pages
CREATE TABLE IF NOT EXISTS public.estimate_text_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  html TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL DEFAULT 'custom_page_text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.estimate_text_templates ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_estimate_text_templates_user ON public.estimate_text_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_estimate_text_templates_created_at ON public.estimate_text_templates(created_at);

-- Trigger to maintain updated_at
CREATE TRIGGER trg_estimate_text_templates_updated_at
BEFORE UPDATE ON public.estimate_text_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function to set user_id automatically on insert when not provided
CREATE OR REPLACE FUNCTION public.set_user_id_if_null()
RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Trigger to set user_id before insert
CREATE TRIGGER trg_estimate_text_templates_set_user
BEFORE INSERT ON public.estimate_text_templates
FOR EACH ROW EXECUTE FUNCTION public.set_user_id_if_null();

-- RLS Policies: user can manage only their own templates
CREATE POLICY "Templates are viewable by owner"
ON public.estimate_text_templates
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Templates can be inserted by owner"
ON public.estimate_text_templates
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Templates can be updated by owner"
ON public.estimate_text_templates
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Templates can be deleted by owner"
ON public.estimate_text_templates
FOR DELETE
USING (user_id = auth.uid());