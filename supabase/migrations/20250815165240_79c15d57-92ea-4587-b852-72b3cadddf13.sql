-- Create trigger to set user_id automatically for estimate_text_templates
CREATE OR REPLACE FUNCTION public.set_user_id_on_template()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER set_user_id_on_template_trigger
  BEFORE INSERT ON public.estimate_text_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id_on_template();