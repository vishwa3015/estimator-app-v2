CREATE TABLE
  IF NOT EXISTS public.product_supplier_variants_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    product_id UUID NOT NULL REFERENCES public.products_v2 (id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.product_suppliers_v2 (id) ON DELETE CASCADE,
    -- Variant fields
    variant_name TEXT,
    variant_type public.variant_type_enum NOT NULL DEFAULT 'default',
    sku TEXT,
    unit_of_measure TEXT,
    color_hex TEXT,
    material TEXT,
    size TEXT,
    weight NUMERIC,
    -- Price fields
    price NUMERIC NOT NULL DEFAULT 0,
    is_preferred BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT NOW (),
      updated_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT NOW (),
      UNIQUE (product_id, supplier_id, variant_name)
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_psv_product_id ON public.product_supplier_variants_v2 (product_id);

CREATE INDEX IF NOT EXISTS idx_psv_supplier_id ON public.product_supplier_variants_v2 (supplier_id);

CREATE INDEX IF NOT EXISTS idx_psv_sku ON public.product_supplier_variants_v2 (sku)
WHERE
  sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_psv_product_active ON public.product_supplier_variants_v2 (product_id, is_active);

-- unique 
CREATE UNIQUE INDEX IF NOT EXISTS idx_psv_product_supplier_variant_sku ON public.product_supplier_variants_v2 (product_id, supplier_id, variant_type, sku)
WHERE
  sku IS NOT NULL
  AND is_active = true;

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_product_supplier_variants_v2_updated_at ON public.product_supplier_variants_v2;

CREATE TRIGGER update_product_supplier_variants_v2_updated_at BEFORE
UPDATE ON public.product_supplier_variants_v2 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column ();

-- RLS 
ALTER TABLE public.product_supplier_variants_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their product supplier variants" ON public.product_supplier_variants_v2;

DROP POLICY IF EXISTS "Users can insert their product supplier variants" ON public.product_supplier_variants_v2;

DROP POLICY IF EXISTS "Users can update their product supplier variants" ON public.product_supplier_variants_v2;

DROP POLICY IF EXISTS "Users can delete their product supplier variants" ON public.product_supplier_variants_v2;

CREATE POLICY "Users can view their product supplier variants" ON public.product_supplier_variants_v2 FOR
SELECT
  USING (
    product_id IN (
      SELECT
        id
      FROM
        public.products_v2
      WHERE
        location_id = (
          SELECT
            location_id
          FROM
            user_profiles
          WHERE
            id = auth.uid ()
        )
    )
  );

CREATE POLICY "Users can insert their product supplier variants" ON public.product_supplier_variants_v2 FOR INSERT
WITH
  CHECK (
    product_id IN (
      SELECT
        id
      FROM
        public.products_v2
      WHERE
        location_id = (
          SELECT
            location_id
          FROM
            user_profiles
          WHERE
            id = auth.uid ()
        )
    )
  );

CREATE POLICY "Users can update their product supplier variants" ON public.product_supplier_variants_v2 FOR
UPDATE USING (
  product_id IN (
    SELECT
      id
    FROM
      public.products_v2
    WHERE
      location_id = (
        SELECT
          location_id
        FROM
          user_profiles
        WHERE
          id = auth.uid ()
      )
  )
);

CREATE POLICY "Users can delete their product supplier variants" ON public.product_supplier_variants_v2 FOR DELETE USING (
  product_id IN (
    SELECT
      id
    FROM
      public.products_v2
    WHERE
      location_id = (
        SELECT
          location_id
        FROM
          user_profiles
        WHERE
          id = auth.uid ()
      )
  )
);