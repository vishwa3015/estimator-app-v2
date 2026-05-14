import { supabase } from "@/integrations/supabase/client";
import { EstimateDocument } from "@/types/estimate-items";
import { SECTION_CONFIGS, SectionType } from "@/components/estimates/section-configs";
import { fileUploadService, FileReference } from "./file-upload-service";
import { locationService } from "@/services/estimates/location-service";
import { setLocationContext } from "@/hooks/use-location-context";

export interface EstimateSection {
  id: string;
  estimate_id?: string; // Optional during local state management
  section_type: SectionType;
  title: string;
  enabled: boolean;
  section_order: number;
  custom_page_data?: {
    requireAcknowledgement: boolean;
    pageType: 'myPdfs' | 'sharedPdfs' | 'singleUsePdf' | 'text';
    pdfId?: string;
    textHtml?: string;
  };
  // File reference fields for uploaded files
  file_storage_path?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  created_at?: string;
  updated_at?: string;
  isLocal?: boolean; // Flag to identify local-only sections
}
interface MigrationSection {
  estimate_id: string;
  section_type: SectionType | 'custom';
  title: string;
  enabled: boolean;
  section_order: number;
  custom_page_data: EstimateSection['custom_page_data'] | null;
}
export const sectionService = {
  // Get sections for an estimate (from database)
  getSections: async (estimateId: string): Promise<EstimateSection[]> => {
    try {
      const locationId = await locationService.getLocationContext();
      if (locationId) {
        await setLocationContext(locationId);
      }
      const { data, error } = await supabase
        .from('estimate_sections')
        .select('*')
        .eq('estimate_id', estimateId)
        .order('section_order', { ascending: true });

      if (error) {
        console.error('Error fetching sections:', error);
        return [];
      }

      return (data || []) as EstimateSection[];
    } catch (error) {
      console.error('Error fetching sections:', error);
      return [];
    }
  },

  // Create default sections for local state (no database call)
  createDefaultSectionsForLocalState: (): EstimateSection[] => {
    console.log('🏠 Creating default sections in local state (no database call)');
    const sections = SECTION_CONFIGS.map((config, index) => ({
      id: crypto.randomUUID(),
      section_type: config.type,
      title: config.label,
      enabled: true,
      section_order: index,
      custom_page_data: null,
      isLocal: true
    }));
    console.log('✅ Created', sections.length, 'sections in local state');
    return sections;
  },

  // Add a new custom section to local state (no database call)
  addCustomSectionToLocalState: (
    sections: EstimateSection[],
    title: string,
    customPageData: EstimateSection['custom_page_data']
  ): EstimateSection[] => {
    const newSection: EstimateSection = {
      id: crypto.randomUUID(),
      section_type: 'custom',
      title,
      enabled: true,
      section_order: sections.length,
      custom_page_data: customPageData,
      isLocal: true
    };

    return [...sections, newSection];
  },

  // Update section order in local state (no database call)
  updateSectionOrderInLocalState: (
    sections: EstimateSection[],
    sourceIndex: number,
    destinationIndex: number
  ): EstimateSection[] => {
    if (sourceIndex === destinationIndex) return sections;

    console.log(`🔄 Reordering section from index ${sourceIndex} to ${destinationIndex}`);
    
    const newSections = Array.from(sections);
    const [movedSection] = newSections.splice(sourceIndex, 1);
    newSections.splice(destinationIndex, 0, movedSection);

    // Update order numbers
    const reorderedSections = newSections.map((section, index) => ({
      ...section,
      section_order: index
    }));

    console.log(`✅ Section "${movedSection.title}" moved to position ${destinationIndex}`);
    return reorderedSections;
  },

  // Toggle section enabled state in local state (no database call)
  toggleSectionEnabledInLocalState: (
    sections: EstimateSection[],
    sectionId: string
  ): EstimateSection[] => {
    return sections.map(section => 
      section.id === sectionId 
        ? { ...section, enabled: !section.enabled }
        : section
    );
  },

  // Update section title in local state (no database call)
  updateSectionTitleInLocalState: (
    sections: EstimateSection[],
    sectionId: string,
    newTitle: string
  ): EstimateSection[] => {
    return sections.map(section => 
      section.id === sectionId 
        ? { ...section, title: newTitle }
        : section
    );
  },

  // Update custom page data in local state (no database call)
  updateCustomPageDataInLocalState: (
    sections: EstimateSection[],
    sectionId: string,
    updates: Partial<EstimateSection['custom_page_data']>
  ): EstimateSection[] => {
    return sections.map(section => 
      section.id === sectionId 
        ? { 
            ...section, 
            custom_page_data: { 
              ...section.custom_page_data, 
              ...updates 
            } 
          }
        : section
    );
  },

  // Upload file for a section and update local state
  uploadFileForSection: async (
    sections: EstimateSection[],
    sectionId: string,
    file: File,
    estimateId: string
  ): Promise<EstimateSection[]> => {
    try {
      // Upload file to storage
      const uploadResult = await fileUploadService.uploadFile(file, estimateId, sectionId);
      
      if (!uploadResult.success) {
        console.error('File upload failed:', uploadResult.error);
        return sections;
      }

      // Update section with file reference
      return sections.map(section => 
        section.id === sectionId 
          ? { 
              ...section,
              file_storage_path: uploadResult.storagePath,
              file_name: uploadResult.fileName,
              file_size: uploadResult.fileSize,
              file_type: uploadResult.fileType
            }
          : section
      );
    } catch (error) {
      console.error('Error uploading file for section:', error);
      return sections;
    }
  },

  // Remove file reference from a section
  removeFileFromSection: async (
    sections: EstimateSection[],
    sectionId: string
  ): Promise<EstimateSection[]> => {
    try {
      const section = sections.find(s => s.id === sectionId);
      if (section?.file_storage_path) {
        // Delete file from storage
        await fileUploadService.deleteFile(section.file_storage_path);
      }

      // Remove file reference from section
      return sections.map(s => 
        s.id === sectionId 
          ? {
              ...s,
              file_storage_path: undefined,
              file_name: undefined,
              file_size: undefined,
              file_type: undefined
            }
          : s
      );
    } catch (error) {
      console.error('Error removing file from section:', error);
      return sections;
    }
  },

  // Delete section from local state (no database call)
  deleteSectionFromLocalState: (
    sections: EstimateSection[],
    sectionId: string
  ): EstimateSection[] => {
    const filteredSections = sections.filter(section => section.id !== sectionId);
    
    // Reorder remaining sections
    return filteredSections.map((section, index) => ({
      ...section,
      section_order: index
    }));
  },

  // Batch save all sections to database (called when estimate is saved)
  batchSaveSections: async (
    estimateId: string,
    sections: EstimateSection[]
  ): Promise<boolean> => {
    try {
      const locationId = await locationService.getLocationContext();
      if (locationId) {
        await setLocationContext(locationId);
      }
      // Filter out local-only sections that shouldn't be saved
      const sectionsToSave = sections
        .filter(section => !section.isLocal)
        .map(section => ({
          id: section.id,
          estimate_id: estimateId,
          section_type: section.section_type,
          title: section.title,
          enabled: section.enabled,
          section_order: section.section_order,
          custom_page_data: section.custom_page_data,
          // Include file reference fields
          file_storage_path: section.file_storage_path,
          file_name: section.file_name,
          file_size: section.file_size,
          file_type: section.file_type,
          created_at: section.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

      if (sectionsToSave.length === 0) {
        console.log('No sections to save');
        return true;
      }

      // Delete existing sections for this estimate
      const { error: deleteError } = await supabase
        .from('estimate_sections')
        .delete()
        .eq('estimate_id', estimateId);

      if (deleteError) {
        console.error('Error deleting existing sections:', deleteError);
        return false;
      }

      // Insert all sections at once
      const { error: insertError } = await supabase
        .from('estimate_sections')
        .insert(sectionsToSave);

      if (insertError) {
        console.error('Error inserting sections:', insertError);
        return false;
      }

      console.log(`Successfully saved ${sectionsToSave.length} sections`);
      return true;
    } catch (error) {
      console.error('Error batch saving sections:', error);
      return false;
    }
  },

  // Initialize sections for an existing estimate (from database)
  initializeSectionsForExistingEstimate: async (estimateId: string): Promise<EstimateSection[]> => {
    console.log('🔍 Initializing sections for existing estimate:', estimateId);
    try {
      const locationId = await locationService.getLocationContext();
      if (locationId) {
        await setLocationContext(locationId);
      }
      let existingSections = await sectionService.getSections(estimateId);
      
      // If no sections exist, create default ones
      if (existingSections.length === 0) {
        console.log('📝 No existing sections found, creating default sections in database');
        const defaultSections = SECTION_CONFIGS.map((config, index) => ({
          id: crypto.randomUUID(),
          estimate_id: estimateId,
          section_type: config.type,
          title: config.label,
          enabled: true,
          section_order: index,
          custom_page_data: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { data, error } = await supabase
          .from('estimate_sections')
          .insert(defaultSections)
          .select();

        if (error) {
          console.error('Error initializing default sections:', error);
          return [];
        }

        existingSections = (data || []) as EstimateSection[];
        console.log('✅ Default sections created in database:', existingSections.length);
      } else {
        console.log('✅ Existing sections loaded from database:', existingSections.length);
      }

      return existingSections;
    } catch (error) {
      console.error('Error initializing sections for existing estimate:', error);
      return [];
    }
  },

  // Migrate existing estimate data to use sections (legacy support)
  migrateEstimateToSections: async (estimate: EstimateDocument): Promise<EstimateSection[]> => {
    try {
      const locationId = await locationService.getLocationContext();
      if (locationId) {
        await setLocationContext(locationId);
      }
      const sections: MigrationSection[] = [];
      let order = 0;

      // Add default sections
      for (const config of SECTION_CONFIGS) {
        sections.push({
          estimate_id: estimate.id,
          section_type: config.type,
          title: config.label,
          enabled: true,
          section_order: order++,
          custom_page_data: null
        });
      }

      // Add custom pages if they exist
      if (estimate.customPages) {
        for (const customPage of estimate.customPages) {
          sections.push({
            estimate_id: estimate.id,
            section_type: 'custom',
            title: customPage.title || 'Custom Page',
            enabled: true,
            section_order: order++,
            custom_page_data: {
              requireAcknowledgement: customPage.requireAcknowledgement,
              pageType: customPage.type,
              pdfId: customPage.pdfId,
              textHtml: customPage.textHtml
            }
            // Note: pdfFileDataUrl is no longer supported - files should be uploaded to storage
          });
        }
      }

      // Insert all sections
      const { data, error } = await supabase
        .from('estimate_sections')
        .insert(sections)
        .select();

      if (error) {
        console.error('Error migrating estimate to sections:', error);
        return [];
      }

      return (data || []) as EstimateSection[];
    } catch (error) {
      console.error('Error migrating estimate to sections:', error);
      return [];
    }
  },

  // Clean up old base64 data from existing sections (run after migration)
  cleanupOldBase64Data: async (): Promise<boolean> => {
    try {
      // This would be run after ensuring all files are properly migrated to storage
      console.log('Cleaning up old base64 data from sections...');
      
      // For now, just log that this should be done manually
      // In the future, this could automatically migrate files to storage
      console.log('Manual cleanup required: Check for sections with large custom_page_data and migrate files to storage');
      
      return true;
    } catch (error) {
      console.error('Error cleaning up old base64 data:', error);
      return false;
    }
  }
};
