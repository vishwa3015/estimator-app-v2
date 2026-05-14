-- Security update for estimate-files bucket
-- Step 1: Update bucket to private and add file size limit (10MB)
UPDATE storage.buckets 
SET 
  public = false,
  file_size_limit = 10485760  -- 10MB in bytes
WHERE id = 'estimate-files';

-- Step 2: Drop existing storage policies
DROP POLICY IF EXISTS "estimate_files_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "estimate_files_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "estimate_files_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "estimate_files_delete_policy" ON storage.objects;

-- Step 3: Create new SELECT policy - Allow anyone to read/download with direct link
CREATE POLICY "estimate_files_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'estimate-files');

-- Step 4: Create INSERT policy - Only authenticated users from their location
CREATE POLICY "estimate_files_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'estimate-files' 
  AND (storage.foldername(name))[2] IN (
    SELECT ed.opportunity_id
    FROM public.estimate_documents_v2 ed
    JOIN public.user_profiles up
    ON ed.location_id = up.location_id
    WHERE up.id = auth.uid() AND up.location_id IS NOT NULL
  )
);

-- Step 5: Create UPDATE policy - Only authenticated users from their location  
CREATE POLICY "estimate_files_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'estimate-files'
  AND (storage.foldername(name))[2] IN (
    SELECT ed.opportunity_id
    FROM public.estimate_documents_v2 ed
    JOIN public.user_profiles up
    ON ed.location_id = up.location_id
    WHERE up.id = auth.uid() AND up.location_id IS NOT NULL
  )
);

-- Step 6: Create DELETE policy - Only authenticated users from their location
CREATE POLICY "estimate_files_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'estimate-files'
  AND (storage.foldername(name))[2] IN (
    SELECT ed.opportunity_id
    FROM public.estimate_documents_v2 ed
    JOIN public.user_profiles up
    ON ed.location_id = up.location_id
    WHERE up.id = auth.uid() AND up.location_id IS NOT NULL
  )
);