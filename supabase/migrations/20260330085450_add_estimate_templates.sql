-- 1. Master templates table (admin-defined, global)
CREATE TABLE IF NOT EXISTS public.estimate_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    renderer_key TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    location_id TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Per-location default template preference
CREATE TABLE IF NOT EXISTS public.location_template_preferences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    location_id TEXT NOT NULL UNIQUE,
    default_template_id UUID REFERENCES public.estimate_templates(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Add template_id to estimate_documents_v2
ALTER TABLE public.estimate_documents_v2
    ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.estimate_templates(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_estimate_templates_active
    ON public.estimate_templates(is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_estimate_templates_renderer_key
    ON public.estimate_templates(renderer_key);

CREATE INDEX IF NOT EXISTS idx_estimate_documents_v2_template
    ON public.estimate_documents_v2(template_id);

CREATE INDEX IF NOT EXISTS idx_location_template_preferences_location
    ON public.location_template_preferences(location_id);

-- RLS
ALTER TABLE public.estimate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_template_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active templates" ON public.estimate_templates;
CREATE POLICY "Anyone can read active templates"
    ON public.estimate_templates FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users manage location preferences" ON public.location_template_preferences;
CREATE POLICY "Users manage location preferences"
    ON public.location_template_preferences FOR ALL USING (true);

-- Triggers
DROP TRIGGER IF EXISTS update_estimate_templates_updated_at ON public.estimate_templates;
CREATE TRIGGER update_estimate_templates_updated_at
    BEFORE UPDATE ON public.estimate_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_location_template_preferences_updated_at ON public.location_template_preferences;
CREATE TRIGGER update_location_template_preferences_updated_at
    BEFORE UPDATE ON public.location_template_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default templates
INSERT INTO public.estimate_templates (name, description, thumbnail_url, renderer_key, is_active, sort_order)
VALUES
  ('Standard', 'Default standard template', null, 'standard', true, 0),
  ('Custom', 'Custom blue template', null, 'custom', true, 1)
ON CONFLICT (renderer_key) DO NOTHING;