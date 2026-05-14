-- DocuSign envelope tracking and signed PDF metadata on estimate_documents_v2
ALTER TABLE public.estimate_documents_v2
  ADD COLUMN IF NOT EXISTS docusign_envelope_id TEXT,
  ADD COLUMN IF NOT EXISTS docusign_status TEXT,
  ADD COLUMN IF NOT EXISTS docusign_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_by_email TEXT,
  ADD COLUMN IF NOT EXISTS signed_by_name TEXT,
  ADD COLUMN IF NOT EXISTS signed_pdf_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS ghl_signed_document_url TEXT;

CREATE INDEX IF NOT EXISTS idx_estimate_documents_v2_docusign_envelope_id
  ON public.estimate_documents_v2 (docusign_envelope_id)
  WHERE docusign_envelope_id IS NOT NULL;

COMMENT ON COLUMN public.estimate_documents_v2.docusign_envelope_id IS 'DocuSign envelope id for customer signing';
COMMENT ON COLUMN public.estimate_documents_v2.docusign_status IS 'DocuSign envelope status (e.g. sent, completed, voided)';
COMMENT ON COLUMN public.estimate_documents_v2.signed_pdf_storage_path IS 'Supabase storage path for combined signed PDF';
COMMENT ON COLUMN public.estimate_documents_v2.ghl_signed_document_url IS 'URL returned by GHL after uploading signed PDF to contact';
