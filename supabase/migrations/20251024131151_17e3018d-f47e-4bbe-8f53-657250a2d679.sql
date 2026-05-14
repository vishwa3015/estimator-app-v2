-- Add change_request_reason column to estimate_documents_v2 table
ALTER TABLE estimate_documents_v2 
ADD COLUMN IF NOT EXISTS change_request_reason TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_estimate_documents_v2_contact_id 
ON estimate_documents_v2(contact_id);