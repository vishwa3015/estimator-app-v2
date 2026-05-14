-- Add Eagleview OAuth columns to user_profiles table
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS eagleview_api_client_id TEXT,
  ADD COLUMN IF NOT EXISTS eagleview_api_client_secret TEXT,
  ADD COLUMN IF NOT EXISTS eagleview_api_refresh_token TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN public.user_profiles.eagleview_api_client_id IS 'Eagleview OAuth Client ID for API integration';
COMMENT ON COLUMN public.user_profiles.eagleview_api_client_secret IS 'Eagleview OAuth Client Secret for API integration';
COMMENT ON COLUMN public.user_profiles.eagleview_api_refresh_token IS 'Eagleview OAuth Refresh Token for token renewal';
