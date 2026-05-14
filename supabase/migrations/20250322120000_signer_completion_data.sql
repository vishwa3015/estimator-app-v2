-- DocuSign signer selections and notes captured at completion (JSON for flexible processing)
ALTER TABLE public.estimate_documents_v2
  ADD COLUMN IF NOT EXISTS signer_completion_data JSONB;

COMMENT ON COLUMN public.estimate_documents_v2.signer_completion_data IS
  'DocuSign: { selectedTabId, selectedTabTitle, selectedTotal, customerNotes } after envelope completed';
