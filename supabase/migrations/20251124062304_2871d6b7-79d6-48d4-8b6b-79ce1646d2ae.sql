-- Create product_categories_v2 table
CREATE TABLE IF NOT EXISTS public.product_categories_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  location_id TEXT NOT NULL,
  parent_id UUID REFERENCES public.product_categories_v2(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products_v2 table
CREATE TABLE IF NOT EXISTS public.products_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,      -- LEGACY: default/fallback price
  supplier TEXT,                         -- LEGACY: default/fallback supplier
  unit_of_measure TEXT,                  -- LEGACY: default/fallback unit_of_measure 
  quantity NUMERIC DEFAULT 0,
  tab TEXT[] DEFAULT '{}',
  sections TEXT[] DEFAULT '{}',
  wastage_percentage NUMERIC NOT NULL DEFAULT 0,
  item_type TEXT[] DEFAULT '{}',
  calculation JSONB DEFAULT '{}'::jsonb,
  category_id UUID REFERENCES public.product_categories_v2(id) ON DELETE SET NULL,
  location_id TEXT NOT NULL,
  tab_product_details JSONB DEFAULT NULL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on product_categories_v2
ALTER TABLE public.product_categories_v2 ENABLE ROW LEVEL SECURITY;

-- Create policies for product_categories_v2
CREATE POLICY "Users can view categories for their location"
  ON public.product_categories_v2
  FOR SELECT
  USING (location_id = (
    SELECT location_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create categories for their location"
  ON public.product_categories_v2
  FOR INSERT
  WITH CHECK (location_id = (
    SELECT location_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update categories for their location"
  ON public.product_categories_v2
  FOR UPDATE
  USING (location_id = (
    SELECT location_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete categories for their location"
  ON public.product_categories_v2
  FOR DELETE
  USING (location_id = (
    SELECT location_id FROM user_profiles WHERE id = auth.uid()
  ));

-- Enable RLS on products_v2
ALTER TABLE public.products_v2 ENABLE ROW LEVEL SECURITY;

-- Create policies for products_v2
CREATE POLICY "Users can view products for their location"
  ON public.products_v2
  FOR SELECT
  USING (location_id = (
    SELECT location_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create products for their location"
  ON public.products_v2
  FOR INSERT
  WITH CHECK (location_id = (
    SELECT location_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update products for their location"
  ON public.products_v2
  FOR UPDATE
  USING (location_id = (
    SELECT location_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete products for their location"
  ON public.products_v2
  FOR DELETE
  USING (location_id = (
    SELECT location_id FROM user_profiles WHERE id = auth.uid()
  ));

-- Create indexes for better performance
CREATE INDEX idx_products_v2_location_id ON public.products_v2(location_id);
CREATE INDEX idx_products_v2_category_id ON public.products_v2(category_id);
CREATE INDEX idx_product_categories_v2_location_id ON public.product_categories_v2(location_id);
CREATE INDEX idx_product_categories_v2_parent_id ON public.product_categories_v2(parent_id);
CREATE INDEX idx_estimate_configurations_v2_material_entry ON public.estimate_configurations_v2(location_id, show_material_data_entry);

-- Create trigger for updated_at on product_categories_v2
CREATE TRIGGER update_product_categories_v2_updated_at
  BEFORE UPDATE ON public.product_categories_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updated_at on products_v2
CREATE TRIGGER update_products_v2_updated_at
  BEFORE UPDATE ON public.products_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- LEGACY COLUMN COMMENTS
COMMENT ON COLUMN public.products_v2.price IS
'LEGACY FIELD: Default/fallback price used for estimates. Will be replaced by supplier_variant_prices_v2.';

COMMENT ON COLUMN public.products_v2.supplier IS
'LEGACY FIELD: Default/fallback supplier. Replaced by supplier_variant_prices_v2.';

COMMENT ON COLUMN public.products_v2.unit_of_measure IS
'LEGACY FIELD: Default/fallback unit of measure. Replaced by product_variants_v2.';