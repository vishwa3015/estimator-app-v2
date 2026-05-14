# Storage Setup for File Uploads

## Overview
This project now uses Supabase Storage for file uploads instead of storing base64 data in the database. This improves performance and prevents API failures due to large data payloads.

## Database Migration

Run the following SQL commands in your Supabase SQL editor:

```sql
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
```

## Storage Bucket Configuration

The storage bucket `estimate-files` will be created with the following structure:
- **Bucket ID**: `estimate-files`
- **Public Access**: Enabled (files can be accessed via public URLs)
- **File Organization**: Files are organized by `estimate_id/section_id/timestamp.extension`

## File Upload Flow

1. **Upload**: When a user selects a file, it's uploaded to Supabase Storage
2. **Reference Storage**: Only file metadata (path, name, size, type) is stored in the database
3. **Retrieval**: Files are accessed via public URLs generated from storage paths
4. **Cleanup**: When files are removed, they're deleted from both storage and database

## Benefits

- **Performance**: No more large base64 strings in database queries
- **Scalability**: Files are stored efficiently in Supabase Storage
- **Reliability**: Prevents API failures due to payload size limits
- **Cost**: More efficient storage and bandwidth usage

## Migration Notes

- Existing estimates with base64 data will continue to work
- New file uploads will use the storage system
- The `pdfFileDataUrl` field has been removed from the interface
- File references are now stored in dedicated columns for better performance
