-- Create storage bucket for estimate files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('estimate-files', 'estimate-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for estimate files
CREATE POLICY "estimate_files_select_policy"
ON storage.objects FOR SELECT
USING (bucket_id = 'estimate-files');

CREATE POLICY "estimate_files_insert_policy"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'estimate-files');

CREATE POLICY "estimate_files_update_policy"
ON storage.objects FOR UPDATE
USING (bucket_id = 'estimate-files');

CREATE POLICY "estimate_files_delete_policy"
ON storage.objects FOR DELETE
USING (bucket_id = 'estimate-files');

-- Update estimate_sections table to use file references instead of base64 data
ALTER TABLE public.estimate_sections 
ADD COLUMN IF NOT EXISTS file_storage_path text,
ADD COLUMN IF NOT EXISTS file_name text,
ADD COLUMN IF NOT EXISTS file_size integer,
ADD COLUMN IF NOT EXISTS file_type text;

-- Create index for file lookups
CREATE INDEX IF NOT EXISTS idx_estimate_sections_file_storage_path 
ON public.estimate_sections (file_storage_path);

-- Add comment explaining the new structure
COMMENT ON COLUMN public.estimate_sections.file_storage_path IS 'Path to file in Supabase storage bucket';
COMMENT ON COLUMN public.estimate_sections.file_name IS 'Original filename of uploaded file';
COMMENT ON COLUMN public.estimate_sections.file_size IS 'File size in bytes';
COMMENT ON COLUMN public.estimate_sections.file_type IS 'MIME type of the file';
