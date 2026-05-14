CREATE TABLE IF NOT EXISTS public.product_suppliers_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location_id TEXT,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_product_suppliers_v2_location_id
ON public.product_suppliers_v2(location_id);

-- Unique constraint
ALTER TABLE public.product_suppliers_v2
ADD CONSTRAINT product_suppliers_v2_unique_name_location
UNIQUE (name, location_id);

-- Update trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (important!)
DROP TRIGGER IF EXISTS update_product_suppliers_v2_updated_at
ON public.product_suppliers_v2;

-- Attach trigger
CREATE TRIGGER update_product_suppliers_v2_updated_at
BEFORE UPDATE ON public.product_suppliers_v2
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();