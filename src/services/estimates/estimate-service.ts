
import { EstimateDocument } from "@/types/estimate-items";
import type { Json } from "@/integrations/supabase/types";
import { localStorageService } from "./local-storage";
import { locationService } from "./location-service";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { setLocationContext } from "@/hooks/use-location-context";
import { sectionService } from "./section-service";

interface EstimateDocumentRow {
  id: string;
  opportunity_id: string;
  contact_id: string | null;
  title: string;
  number: string;
  date: string;
  expiration_date: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: string;
  created_at: string;
  updated_at: string;
  payload: Partial<EstimateDocument>;
  location_id: string;
}

interface EstimateDocumentDbInsert extends Omit<EstimateDocumentRow, 'payload'> {
  payload: Json;
}

interface EstimateDocumentV2Row {
  id: string;
  opportunity_id: string;
  contact_id: string | null;
  location_id: string | null;
  form_data: Record<string, unknown>;
  config_data: Record<string, unknown> | null;
  config_id: string | null;
  status: string;
  user_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  selected_opportunity_id: string | null;
  change_request_reason: string | null;
  template_id: string | null;
}

export const estimateService = {
  // Clean estimate data for database storage (remove base64 data, large objects)
  cleanEstimateForStorage: (estimate: EstimateDocument): Partial<EstimateDocument> => {

    const cleaned = { ...estimate };

    // Remove base64 data fields that should be stored in storage
    delete cleaned.primaryImageDataUrl;
    delete cleaned.certificationLogoDataUrl;

    // Remove inspection sections with base64 data (these should be handled separately)
    if (cleaned.inspectionSections) {
      cleaned.inspectionSections = cleaned.inspectionSections.map(section => ({
        ...section,
        inputs: section.inputs.map(input => {
          if (input.type === 'file') {
            // Remove base64 data, keep only metadata
            const { dataUrl, ...cleanInput } = input;
            return {
              ...cleanInput,
              dataUrl: '' // Provide default empty dataUrl to satisfy type
            };
          }
          return input;
        })
      }));
    }

    // Remove any other large data fields that might cause issues
    // Keep only essential estimate data in the payload

    return cleaned;
  },

  // Get all estimates
  getEstimates: async (opportunityId?: string): Promise<EstimateDocument[]> => {
    try {
      const locationId = await locationService.getLocationContext();
      if (!locationId) {
        throw new Error("No location context found");
      }

      await setLocationContext(locationId);

      let query = supabase
        .from('estimate_documents')
        .select('*')
        .eq('location_id', locationId);

      if (opportunityId) {
        query = query.eq('opportunity_id', opportunityId);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching estimates from DB:", error);
        const cached = localStorageService.getEstimates();
        return opportunityId ? cached.filter(e => e.opportunityId === opportunityId) : cached;
      }

      const docs: EstimateDocument[] = (data || []).map((row) => {
        const typedRow = row as EstimateDocumentRow;
        const payload = typedRow.payload || {};
        return {
          lineItems: [],
          ...payload,
          id: typedRow.id,
          opportunityId: typedRow.opportunity_id,
          contactId: typedRow.contact_id ?? payload.contactId,
          title: typedRow.title || payload.title || '',
          number: typedRow.number || payload.number || '',
          date: typedRow.date || payload.date || new Date().toISOString(),
          expirationDate: typedRow.expiration_date || payload.expirationDate,
          subtotal: Number(typedRow.subtotal ?? payload.subtotal ?? 0),
          taxRate: Number(typedRow.tax_rate ?? payload.taxRate ?? 0),
          taxAmount: Number(typedRow.tax_amount ?? payload.taxAmount ?? 0),
          total: Number(typedRow.total ?? payload.total ?? 0),
          status: (typedRow.status || payload.status || 'draft') as EstimateDocument['status'],
          createdAt: typedRow.created_at || payload.createdAt || new Date().toISOString(),
          updatedAt: typedRow.updated_at || payload.updatedAt || new Date().toISOString()
        } as EstimateDocument;
      });

      // Cache locally for offline use
      localStorageService.saveEstimates(docs);
      return docs;
    } catch (error) {
      console.error("Error fetching estimates:", error);
      return [];
    }
  },

  // Get estimate by ID
  getEstimateById: async (estimateId: string, bypassLocationContext = false): Promise<EstimateDocument | null> => {
    try {
      if (!bypassLocationContext) {
        const locationId = await locationService.getLocationContext();
        if (!locationId) {
          throw new Error("No location context found");
        }

        await setLocationContext(locationId);
      }

      const { data, error } = await supabase
        .from('estimate_documents_v2')
        .select('*')
        .eq('id', estimateId)
        .maybeSingle();

      if (error) {
        console.error("DB error fetching estimate:", error);
      }

      if (!data) {
        const estimates = localStorageService.getEstimates();
        return estimates.find(est => est.id === estimateId) || null;
      }

      // const payload = (data as any).payload || {};
      // const doc: EstimateDocument = {
      //   ...payload,
      //   id: (data as any).id,
      //   opportunityId: (data as any).opportunity_id,
      //   contactId: (data as any).contact_id ?? payload.contactId,
      //   title: (data as any).title || payload.title || '',
      //   number: (data as any).number || payload.number || '',
      //   date: (data as any).date || payload.date || new Date().toISOString(),
      //   expirationDate: (data as any).expiration_date || payload.expirationDate,
      //   subtotal: Number((data as any).subtotal ?? payload.subtotal ?? 0),
      //   taxRate: Number((data as any).tax_rate ?? payload.taxRate ?? 0),
      //   taxAmount: Number((data as any).tax_amount ?? payload.taxAmount ?? 0),
      //   total: Number((data as any).total ?? payload.total ?? 0),
      //   status: (data as any).status || payload.status || 'draft',
      //   createdAt: (data as any).created_at || payload.createdAt || new Date().toISOString(),
      //   updatedAt: (data as any).updated_at || payload.updatedAt || new Date().toISOString()
      // };
      return data as unknown as EstimateDocument;
    } catch (error) {
      console.error(`Error fetching estimate with ID ${estimateId}:`, error);
      return null;
    }
  },

  // Save estimate
  saveEstimate: async (estimate: EstimateDocument, sections?: import("./section-service").EstimateSection[]): Promise<EstimateDocument> => {
    try {
      const locationId = await locationService.getLocationContext();
      if (!locationId) {
        throw new Error("No location context found");
      }

      await setLocationContext(locationId);

      // Clean the estimate data before saving to remove base64 content
      const cleanedEstimate = estimateService.cleanEstimateForStorage(estimate);

      const row: EstimateDocumentRow = {
        id: estimate.id ?? '',
        location_id: locationId,
        opportunity_id: estimate.opportunityId,
        contact_id: estimate.contactId ?? null,
        title: estimate.title || '',
        number: estimate.number || '',
        status: estimate.status || 'draft',
        date: estimate.date || new Date().toISOString(),
        expiration_date: estimate.expirationDate ?? null,
        subtotal: estimate.subtotal ?? 0,
        tax_rate: estimate.taxRate ?? 0,
        tax_amount: estimate.taxAmount ?? 0,
        total: estimate.total ?? 0,
        created_at: estimate.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        payload: cleanedEstimate
      };
      // if (estimate.id) row.id = estimate.id;

      const dbRow: EstimateDocumentDbInsert = {
        ...row,
        payload: row.payload as unknown as Json,
      };

      const { data, error } = await supabase
        .from('estimate_documents')
        .upsert(dbRow, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error saving estimate to DB, falling back to local cache:', error);
      }

      const typedData = data as EstimateDocumentRow;
      let saved: EstimateDocument;
      if (data) {
        const payload = typedData.payload || {};
        saved = {
          lineItems: [],      
          ...payload,
          id: typedData.id,
          opportunityId: typedData.opportunity_id,
          contactId: typedData.contact_id ?? payload.contactId,
          title: typedData.title || payload.title || '',
          number: typedData.number || payload.number || '',
          date: typedData.date || payload.date || new Date().toISOString(),
          expirationDate: typedData.expiration_date || payload.expirationDate,
          subtotal: Number(typedData.subtotal ?? payload.subtotal ?? 0),
          taxRate: Number(typedData.tax_rate ?? payload.taxRate ?? 0),
          taxAmount: Number(typedData.tax_amount ?? payload.taxAmount ?? 0),
          total: Number(typedData.total ?? payload.total ?? 0),
          status: (typedData.status || payload.status || 'draft') as EstimateDocument['status'],
          createdAt: typedData.created_at || payload.createdAt || new Date().toISOString(),
          updatedAt: typedData.updated_at || payload.updatedAt || new Date().toISOString()
        };

        // Save sections separately if provided
        if (sections && sections.length > 0) {
          try {
            const sectionsSaved = await sectionService.batchSaveSections(saved.id, sections);
            if (sectionsSaved) {
              console.log('Sections saved successfully with estimate');
            } else {
              console.warn('Failed to save sections with estimate');
            }
          } catch (sectionError) {
            console.error('Error saving sections:', sectionError);
          }
        }
      } else {
        // Local fallback
        const estimates = localStorageService.getEstimates();
        const existingIndex = estimates.findIndex(est => est.id === estimate.id);
        const updatedEstimate = {
          ...estimate,
          id: estimate.id || uuidv4(),
          createdAt: existingIndex >= 0 ? estimates[existingIndex].createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        if (existingIndex >= 0) {
          estimates[existingIndex] = updatedEstimate;
        } else {
          estimates.push(updatedEstimate);
        }
        localStorageService.saveEstimates(estimates);
        saved = updatedEstimate;
      }

      // Update cache with saved estimate
      try {
        const cached = localStorageService.getEstimates();
        const idx = cached.findIndex(e => e.id === saved.id);
        if (idx >= 0) cached[idx] = saved; else cached.push(saved);
        localStorageService.saveEstimates(cached);
      } catch { /* noop */ }

      return saved;
    } catch (error) {
      console.error("Error saving estimate:", error);
      throw error;
    }
  },

  // Delete estimate
  deleteEstimate: async (estimateId: string): Promise<void> => {
    try {
      const locationId = await locationService.getLocationContext();
      if (!locationId) {
        throw new Error("No location context found");
      }

      await setLocationContext(locationId);

      // Step 1: Get all sections to find file paths before deleting
      const { data: sections } = await supabase
        .from('estimate_sections')
        .select('file_storage_path')
        .eq('estimate_id', estimateId);

      // Step 2: Delete files from storage bucket
      if (sections && sections.length > 0) {
        const filePaths = sections
          .map(s => s.file_storage_path)
          .filter(path => path != null);

        if (filePaths.length > 0) {
          const { error: storageError } = await supabase
            .storage
            .from('estimate-files')
            .remove(filePaths);

          if (storageError) {
            console.error('Error deleting files from storage:', storageError);
          }
        }
      }

      // Step 3: Delete sections (will cascade or can be explicit)
      const { error: sectionsError } = await supabase
        .from('estimate_sections')
        .delete()
        .eq('estimate_id', estimateId);

      if (sectionsError) {
        console.error('Error deleting estimate sections:', sectionsError);
      }

      // Step 4: Delete the estimate document from v1 table
      const { error: docError } = await supabase
        .from('estimate_documents')
        .delete()
        .eq('id', estimateId);

      if (docError) {
        console.error('Error deleting estimate document:', docError);
      }

      // Step 5: Also handle v2 tables
      const { data: sectionsV2 } = await supabase
        .from('estimate_form_sections_v2')
        .select('document_id')
        .eq('document_id', estimateId);

      if (sectionsV2 && sectionsV2.length > 0) {
        await supabase
          .from('estimate_form_sections_v2')
          .delete()
          .eq('document_id', estimateId);
      }

      const { error: docV2Error } = await supabase
        .from('estimate_documents_v2')
        .delete()
        .eq('id', estimateId);

      if (docV2Error) {
        console.error('Error deleting estimate document v2:', docV2Error);
      }

      // Step 6: Update local cache
      const estimates = localStorageService.getEstimates();
      const updatedEstimates = estimates.filter(est => est.id !== estimateId);
      localStorageService.saveEstimates(updatedEstimates);

      console.log(`Successfully deleted estimate ${estimateId} and all associated records`);
    } catch (error) {
      console.error(`Error deleting estimate with ID ${estimateId}:`, error);
      throw error;
    }
  },

  // Generate estimate link
  generateEstimateLink: (estimateId: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/estimates/${estimateId}`;
  }
};
