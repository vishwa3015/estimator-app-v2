-- Create formulas_v2 table
CREATE TABLE IF NOT EXISTS public.formulas_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  product_id UUID REFERENCES public.products_v2(id) ON DELETE CASCADE,
  formula_key TEXT NOT NULL,
  formula JSONB DEFAULT '{}'::jsonb,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on formulas_v2
ALTER TABLE public.formulas_v2 ENABLE ROW LEVEL SECURITY;

-- Create policies for formulas_v2
CREATE POLICY "Users can view formulas for their location"
  ON public.formulas_v2
  FOR SELECT
  USING (location_id = (
    SELECT location_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create formulas for their location"
  ON public.formulas_v2
  FOR INSERT
  WITH CHECK (location_id = (
    SELECT location_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update formulas for their location"
  ON public.formulas_v2
  FOR UPDATE
  USING (location_id = (
    SELECT location_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete formulas for their location"
  ON public.formulas_v2
  FOR DELETE
  USING (location_id = (
    SELECT location_id FROM user_profiles WHERE id = auth.uid()
  ));

-- Create indexes for better performance
CREATE INDEX idx_formulas_v2_location_id ON public.formulas_v2(location_id);
CREATE INDEX idx_formulas_v2_product_id ON public.formulas_v2(product_id);
CREATE INDEX idx_formulas_v2_formula_key ON public.formulas_v2(formula_key);

-- Create trigger for updated_at on formulas_v2
CREATE TRIGGER update_formulas_v2_updated_at
  BEFORE UPDATE ON public.formulas_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
