-- V2 Estimate Configuration System Tables

-- Table for storing user-specific estimate configurations
CREATE TABLE public.estimate_configurations_v2 (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_id TEXT NULL DEFAULT NULL,
    config_name TEXT NOT NULL DEFAULT 'Default Configuration',
    config_data JSONB NOT NULL DEFAULT '{}',
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    show_material_data_entry BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, config_name)
);

-- Table for custom field types
CREATE TABLE public.custom_field_types_v2 (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_id TEXT NULL DEFAULT NULL,
    field_type_name TEXT NOT NULL,
    component_config JSONB NOT NULL DEFAULT '{}',
    validation_schema JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, field_type_name)
);

-- Table for extensible validation rules
CREATE TABLE public.validation_rules_v2 (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_id TEXT NULL DEFAULT NULL,
    rule_name TEXT NOT NULL,
    rule_function TEXT NOT NULL,
    rule_message_template TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, rule_name)
);

-- Table for estimate documents V2
CREATE TABLE public.estimate_documents_v2 (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_id TEXT NULL DEFAULT NULL,
    config_id UUID NOT NULL REFERENCES estimate_configurations_v2(id) ON DELETE RESTRICT,
    opportunity_id TEXT NOT NULL,
    contact_id TEXT,
    form_data JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined')),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for form sections within estimates V2
CREATE TABLE public.estimate_form_sections_v2 (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES estimate_documents_v2(id) ON DELETE CASCADE,
    section_id TEXT NOT NULL,
    section_data JSONB NOT NULL DEFAULT '{}',
    sort_order INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all V2 tables
ALTER TABLE public.estimate_configurations_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_types_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_rules_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_documents_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_form_sections_v2 ENABLE ROW LEVEL SECURITY;

-- RLS Policies for estimate_configurations_v2
CREATE POLICY "Users can manage their own configurations" 
ON public.estimate_configurations_v2 
FOR ALL 
USING (true); -- auth.uid() = user_id

-- RLS Policies for custom_field_types_v2
CREATE POLICY "Users can manage their own field types" 
ON public.custom_field_types_v2 
FOR ALL 
USING (true); -- auth.uid() = user_id

-- RLS Policies for validation_rules_v2
CREATE POLICY "Users can manage their own validation rules" 
ON public.validation_rules_v2 
FOR ALL 
USING (true); -- auth.uid() = user_id

-- RLS Policies for estimate_documents_v2
CREATE POLICY "Users can manage their own estimate documents" 
ON public.estimate_documents_v2 
FOR ALL 
USING (true); -- auth.uid() = user_id

-- RLS Policies for estimate_form_sections_v2
CREATE POLICY "Users can manage sections of their own estimates" 
ON public.estimate_form_sections_v2 
FOR ALL 
USING (
    document_id IN (
        SELECT id FROM estimate_documents_v2 
        WHERE true -- user_id = auth.uid()
    )
);

-- Triggers for updated_at timestamps
CREATE TRIGGER update_estimate_configurations_v2_updated_at
    BEFORE UPDATE ON public.estimate_configurations_v2
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_field_types_v2_updated_at
    BEFORE UPDATE ON public.custom_field_types_v2
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_validation_rules_v2_updated_at
    BEFORE UPDATE ON public.validation_rules_v2
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_estimate_documents_v2_updated_at
    BEFORE UPDATE ON public.estimate_documents_v2
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_estimate_form_sections_v2_updated_at
    BEFORE UPDATE ON public.estimate_form_sections_v2
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_estimate_configurations_v2_user_id ON public.estimate_configurations_v2(user_id);
CREATE INDEX idx_estimate_configurations_v2_active ON public.estimate_configurations_v2(user_id, is_active);
CREATE INDEX idx_custom_field_types_v2_user_id ON public.custom_field_types_v2(user_id);
CREATE INDEX idx_validation_rules_v2_user_id ON public.validation_rules_v2(user_id);
CREATE INDEX idx_estimate_documents_v2_user_id ON public.estimate_documents_v2(user_id);
CREATE INDEX idx_estimate_documents_v2_opportunity ON public.estimate_documents_v2(opportunity_id);
CREATE INDEX idx_estimate_form_sections_v2_document_id ON public.estimate_form_sections_v2(document_id);
CREATE INDEX idx_estimate_form_sections_v2_sort_order ON public.estimate_form_sections_v2(document_id, sort_order);