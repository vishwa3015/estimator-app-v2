-- Create estimates table
CREATE TABLE public.estimates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_person_id TEXT,
  description TEXT NOT NULL,
  opportunity_id TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'Other',
  location_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT DEFAULT ''
);

-- Enable Row Level Security
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

-- Create policies for estimates table
CREATE POLICY "Users can view estimates for their location" 
ON public.estimates 
FOR SELECT 
USING (location_id = ( SELECT up.location_id
  FROM user_profiles up
  WHERE (up.id = ( SELECT auth.uid() AS uid))));

CREATE POLICY "Users can create estimates for their location" 
ON public.estimates 
FOR INSERT 
WITH CHECK (location_id = ( SELECT up.location_id
  FROM user_profiles up
  WHERE (up.id = ( SELECT auth.uid() AS uid))));

CREATE POLICY "Users can update estimates for their location" 
ON public.estimates 
FOR UPDATE 
USING (location_id = ( SELECT up.location_id
  FROM user_profiles up
  WHERE (up.id = ( SELECT auth.uid() AS uid))));

CREATE POLICY "Users can delete estimates for their location" 
ON public.estimates 
FOR DELETE 
USING (location_id = ( SELECT up.location_id
  FROM user_profiles up
  WHERE (up.id = ( SELECT auth.uid() AS uid))));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_estimates_updated_at
BEFORE UPDATE ON public.estimates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_estimates_opportunity_id ON public.estimates(opportunity_id);
CREATE INDEX idx_estimates_location_id ON public.estimates(location_id);