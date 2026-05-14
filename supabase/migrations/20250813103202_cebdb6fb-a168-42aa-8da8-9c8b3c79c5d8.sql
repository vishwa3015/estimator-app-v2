-- Relax INSERT policy to avoid requiring client to send user_id explicitly
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'estimate_text_templates' 
      AND policyname = 'Templates can be inserted by owner'
  ) THEN
    DROP POLICY "Templates can be inserted by owner" ON public.estimate_text_templates;
  END IF;
END $$;

CREATE POLICY "Templates can be inserted when authenticated"
ON public.estimate_text_templates
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
